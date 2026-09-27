#!/usr/bin/env node
/**
 * Generates assets/img/device-cross-section-v2.svg
 *
 * Why a generator rather than a hand-authored file: the particle motion is an
 * orbit projected onto a cross-section, so every particle needs a cos/sin pair
 * computed per sample point across four animated attributes (cx, cy, r,
 * opacity). That is not something to type by hand, and hand-typed values cannot
 * be re-tuned when the feedback changes.
 *
 * The projection
 * --------------
 * A particle orbiting at azimuth theta sits at horizontal offset R*cos(theta)
 * from the axis, and at depth R*sin(theta) towards or away from the viewer. One
 * revolution therefore gives:
 *
 *   cx      = AXIS + R*cos(theta)     sweeps the full width, side to side
 *   depth   = sin(theta)              +1 nearest the viewer, -1 furthest away
 *   r       = base * (1 + k*depth)    larger when near, smaller when far
 *   opacity = f(depth)                brighter when near, fainter when far
 *
 * cx and depth are 90 degrees out of phase, which is what makes the motion read
 * as a circle rather than a pendulum.
 *
 * Animation is SMIL <animate> on the attributes themselves. Deliberately no CSS
 * transforms and no offset-path: both are resolved through the element CTM,
 * which rescaled geometry between display widths and moved particles clean out
 * of the viewBox. Attribute animation involves no transform at all, so the
 * diagram is identical at every width, and the element's own cx/cy is the
 * fallback if SMIL is unavailable.
 *
 * Usage:  node scripts/generate-device-diagram.mjs
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'assets/img/device-cross-section-v2.svg');

/* ------------------------------------------------------------- geometry -- */

const VB = { w: 880, h: 760 };
const AXIS = 430;
const PLATE_Y = 150;
const CYL_BOTTOM = 300;
const APEX_Y = 500;         // where the cone ends
const APEX_BOTTOM = 545;    // bottom of the apex nozzle
const R_TOP = 120;
const R_APEX = 18;
const WALL_INSET = 11;

/** Vessel radius at a given height. */
function wallR(y) {
  if (y <= CYL_BOTTOM) return R_TOP;
  const t = (y - CYL_BOTTOM) / (APEX_Y - CYL_BOTTOM);
  return Math.max(R_APEX, R_TOP - (R_TOP - R_APEX) * t);
}

/** Radius of the ascending inner core. Narrow in the cone, where the wall is tight. */
function coreR(y) {
  return Math.min(20, wallR(y) * 0.55);
}

/* --------------------------------------------------------------- motion -- */

const SAMPLES = 9;
const BASE_R = 2.75;      // 50% of the previous 5.5
const R_K = 0.45;         // radius swing between far side and near side

/**
 * Fade in at the start of a band and out at the end, so the loop reset is unseen.
 */
function envelope(t) {
  if (t <= 0.12) return 0.05 + (t / 0.12) * 0.95;
  if (t <= 0.82) return 1;
  return Math.max(0.05, 1 - ((t - 0.82) / 0.18) * 0.95);
}

/**
 * Depth cue. A particle on the far side of the vessel is drawn small and faint,
 * a particle on the near side large and bright. This matters more than it looks:
 * at cos(theta) = 0 the particle projects onto the axis, which is where the light
 * fraction belongs, so the far-side particles have to recede convincingly or the
 * two streams become visually confusable.
 */
function depthAlpha(depth) {
  return 0.12 + 0.83 * ((depth + 1) / 2);
}

function buildParticle(o) {
  const cx = [];
  const cy = [];
  const rr = [];
  const op = [];

  for (let i = 0; i < SAMPLES; i += 1) {
    const t = i / (SAMPLES - 1);
    const y = o.yStart + (o.yEnd - o.yStart) * t;
    const R = o.core ? coreR(y) : wallR(y) - WALL_INSET;
    const theta = o.phase + 2 * Math.PI * o.revs * t;
    const depth = Math.sin(theta);

    cx.push((AXIS + R * Math.cos(theta)).toFixed(1));
    cy.push(y.toFixed(1));
    rr.push(Math.max(0.9, BASE_R * (1 + R_K * depth)).toFixed(2));
    op.push(Math.max(0.03, depthAlpha(depth) * envelope(t)).toFixed(2));
  }

  const dur = `${o.dur}s`;
  const anim = (attr, values) =>
    `    <animate attributeName="${attr}" dur="${dur}" repeatCount="indefinite" ` +
    `values="${values.join(';')}"/>\n`;

  return (
    `  <circle class="${o.core ? 'p-light' : 'p-heavy'}" cx="${cx[0]}" cy="${cy[0]}" r="${rr[0]}">\n` +
    anim('cx', cx) +
    anim('cy', cy) +
    anim('r', rr) +
    anim('opacity', op) +
    '  </circle>\n'
  );
}

/* Six particles down the outer wall, bands overlapping so the cone stays populated. */
const heavy = [];
for (let i = 0; i < 6; i += 1) {
  const yStart = 205 + i * 38;
  heavy.push(
    buildParticle({
      yStart,
      yEnd: Math.min(yStart + 122, APEX_Y - 8),
      revs: 1.75,
      phase: i * 1.05,
      core: false,
      dur: 9 + i * 1.3,
    })
  );
}

/* Five particles ascending the core and out through the vortex finder. */
const light = [];
for (let i = 0; i < 5; i += 1) {
  const yStart = 482 - i * 66;
  light.push(
    buildParticle({
      yStart,
      yEnd: Math.max(yStart - 132, 88),
      revs: 2.25,
      phase: 0.6 + i * 1.3,
      core: true,
      dur: 7.5 + i * 1.1,
    })
  );
}

/* ---------------------------------------------------------------- notes -- */

const NOTE_HEAD = 'Why the water goes up as well as down';
const NOTE_LINES = [
  'Inside the chamber the flow reverses: down the outer wall, then back up the core and out of the top.',
  'This is how a hydrocyclone works. It is pressurised, so the flow is set by the pressure field, not by gravity.',
  'The product water therefore leaves by the top outlet and must be piped back down the riser to reach the floors.',
];

const noteText = [
  `    <text class="note-head" x="62" y="620">${NOTE_HEAD}</text>`,
  ...NOTE_LINES.map((line, i) => `    <text class="note" x="62" y="${639 + i * 17}">${line}</text>`),
].join('\n');

/* ------------------------------------------------------------------ svg -- */

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB.w} ${VB.h}" width="${VB.w}" height="${VB.h}"
     role="img" aria-labelledby="dsTitle dsDesc">
  <title id="dsTitle">Cross-section of the proposed separation chamber, showing both outlets</title>
  <desc id="dsDesc">A hydrocyclone cross-section. Feed enters tangentially and spirals down the outer wall. The
  flow then reverses at the cone, travels back up the core and leaves through the vortex finder at the top,
  carrying the light fraction. Particles denser than water continue down to the apex and leave as the underflow.
  Because the product water leaves by the top outlet, it has to be piped back down to reach the floors below.</desc>

  <style>
    .lbl-strong { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; font-weight: 700; fill: #1C2E4A; }
    .lbl-small  { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; fill: #6c6c7e; }
    .note       { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; fill: #4a4a5a; }
    .note-head  { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12.5px; font-weight: 700; fill: #1C2E4A; }
    .legend     { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12.5px; fill: #4a4a5a; }

    .leader   { stroke: #b8c2ce; stroke-width: 1; fill: none; }
    .body     { fill: #eaf4fa; stroke: #1C2E4A; stroke-width: 2; stroke-linejoin: round; }
    .finder   { fill: #ffffff; stroke: #1C2E4A; stroke-width: 2; }
    .pipe     { fill: #d6e9f4; stroke: #1C2E4A; stroke-width: 2; }
    .outlet   { fill: #cfe3f0; stroke: #1C2E4A; stroke-width: 2; }
    .swirl    { fill: none; stroke: #44B8E0; stroke-width: 1.4; stroke-dasharray: 5 5; opacity: .8; }
    .pathline { fill: none; stroke: #44B8E0; stroke-width: 1.6; stroke-dasharray: 6 4; opacity: .8; }
    .notebox  { fill: #f6f8fa; stroke: #e2e6ea; stroke-width: 1; }

    .p-heavy { fill: #1C2E4A; }
    .p-light { fill: #C4A882; stroke: #8a7452; stroke-width: .6; }
  </style>

  <defs>
    <marker id="arrowBlue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#44B8E0"/>
    </marker>
    <marker id="arrowNavy" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#1C2E4A"/>
    </marker>
  </defs>

  <!-- ==================================================== vessel ============= -->
  <path class="body" d="M310,${PLATE_Y} L550,${PLATE_Y} L550,${CYL_BOTTOM} L448,${APEX_Y} L448,${APEX_BOTTOM} L412,${APEX_BOTTOM} L412,${APEX_Y} L310,${CYL_BOTTOM} Z"/>

  <!-- swirl planes, one per turn of the descending spiral -->
  <ellipse class="swirl" cx="${AXIS}" cy="214" rx="120" ry="22"/>
  <ellipse class="swirl" cx="${AXIS}" cy="290" rx="120" ry="20"/>
  <ellipse class="swirl" cx="${AXIS}" cy="380" rx="79" ry="16"/>
  <ellipse class="swirl" cx="${AXIS}" cy="455" rx="41" ry="11"/>

  <!-- vortex finder, continuing above the vessel as the overflow pipe -->
  <rect class="finder" x="398" y="40" width="64" height="230" rx="3"/>
  <path class="outlet" d="M462,40 L770,40 L770,74 L462,74 Z"/>
  <line x1="770" y1="57" x2="812" y2="57" stroke="#1C2E4A" stroke-width="2" marker-end="url(#arrowNavy)"/>

  <!-- tangential feed inlet -->
  <path class="pipe" d="M180,196 L310,196 L310,232 L180,232 Z"/>
  <ellipse cx="310" cy="214" rx="14" ry="18" fill="#d6e9f4" stroke="#1C2E4A" stroke-width="2"/>

  <!-- underflow -->
  <path class="outlet" d="M412,${APEX_BOTTOM} L448,${APEX_BOTTOM} L448,576 L412,576 Z"/>
  <line x1="430" y1="576" x2="430" y2="588" stroke="#1C2E4A" stroke-width="2" marker-end="url(#arrowNavy)"/>
  <!-- =============================================== flow guide paths ======= -->
  <path class="pathline" d="M322,228 C316,270 328,320 348,368 C368,414 392,452 408,486"
        marker-end="url(#arrowBlue)"/>
  <path class="pathline" d="M436,488 C446,440 438,390 430,340 L430,70"
        marker-end="url(#arrowBlue)"/>

  <!-- =================================================== particles ========== -->
  <!-- Generated by scripts/generate-device-diagram.mjs. cx, cy, r and opacity
       are each animated by SMIL on the attribute itself, so no transform is
       involved and nothing can be rescaled by the display size. -->
${heavy.join('').trimEnd()}

${light.join('').trimEnd()}

  <!-- ====================================================== labels ========== -->
  <text class="lbl-strong" x="170" y="186" text-anchor="end">Feed inlet</text>
  <text class="lbl-small"  x="170" y="202" text-anchor="end">tangential, 2&#8211;5 m/s</text>

  <text class="lbl-strong" x="400" y="28">Overflow</text>
  <text class="lbl-small"  x="620" y="92" text-anchor="middle">water + light fraction leave here</text>

  <line class="leader" x1="304" y1="390" x2="352" y2="390"/>
  <text class="lbl-strong" x="298" y="394" text-anchor="end">Outer vortex</text>
  <text class="lbl-small"  x="298" y="410" text-anchor="end">descending, carrying the heavy fraction</text>

  <line class="leader" x1="596" y1="350" x2="456" y2="350"/>
  <text class="lbl-strong" x="602" y="354">Inner vortex</text>
  <text class="lbl-small"  x="602" y="370">ascending, carrying the light fraction</text>

  <line class="leader" x1="596" y1="470" x2="470" y2="470"/>
  <text class="lbl-strong" x="602" y="474">Apex / underflow</text>
  <text class="lbl-small"  x="602" y="490">heavy fraction collected</text>

  <text class="lbl-strong" x="470" y="570">heavy fraction out</text>

  <!-- ====================================================== legend ========== -->
  <circle class="p-heavy" cx="52" cy="716" r="3.5"/>
  <text class="legend" x="66" y="720">Heavy fraction &#8212; PET, PVC. Denser than water: thrown outward, falls to the apex.</text>
  <circle class="p-light" cx="52" cy="740" r="3.5"/>
  <text class="legend" x="66" y="744">Light fraction &#8212; PE, PP. Buoyant: drawn into the core, exits through the finder.</text>

  <!-- ======================================================== note ========== -->
  <rect class="notebox" x="44" y="598" width="792" height="84" rx="8"/>
${noteText}
</svg>
`;

writeFileSync(OUT, svg, 'utf8');

const bytes = Buffer.byteLength(svg, 'utf8');
console.log(`Wrote assets/img/device-cross-section-v2.svg  (${bytes} bytes)`);
console.log(`  particles: ${heavy.length} heavy + ${light.length} light, ${SAMPLES} samples per cycle`);
console.log(`  base radius ${BASE_R} (was 5.5)   viewBox ${VB.w}x${VB.h}`);
