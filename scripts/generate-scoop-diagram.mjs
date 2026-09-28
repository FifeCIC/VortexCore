#!/usr/bin/env node
/**
 * Generates assets/img/device-with-collection-scoops.svg
 *
 * Origin: the supplied fragment `hydrocyclone_with_collection_scoop.html`. It is
 * reproduced here - same geometry, same labels, same particle paths - with three
 * changes that are forced by where it is being published:
 *
 * 1. THE HOST'S CSS VARIABLES ARE GONE.
 *    The fragment drew the vessel with `fill="var(--bg-accent)"`, the vortex
 *    finder with `var(--surface-2)` and every outline with `var(--t)`. Those were
 *    supplied by whatever page it was previewed in, so in isolation the fills
 *    resolve to nothing and the diagram renders as an empty outline. They are
 *    resolved here to this site's own palette, which is also why the vessel is
 *    light rather than the dark navy it appeared in preview.
 *
 * 2. JAVASCRIPT DOES NOT RUN.
 *    The fragment built its particles in a <script> with animateMotion. An SVG
 *    loaded through <img> never executes script, so the particle set is emitted
 *    here as static markup. Same paths, same radii, same stagger.
 *
 * 3. MOTION NEEDS A FALLBACK.
 *    Each particle carries `cx="0" cy="0"` as a real, numeric position and
 *    `opacity="0"` as its base value. Where SMIL runs, the motion path moves it
 *    and the animation overrides the opacity. Where SMIL does not, the particle
 *    has a defined position and stays invisible, instead of having no position at
 *    all. Omitting cx/cy is the more common idiom but leaves the element
 *    unpositioned, and the repository's checker rejects exactly that.
 *
 * Under `prefers-reduced-motion: reduce` nothing moves and nothing is lost: the
 * dash animation stops, the travelling particles are swapped for a still set
 * placed on the same paths, and every label remains.
 *
 * Usage:  node scripts/generate-scoop-diagram.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Bump when the drawing changes; stamped into the artwork itself. */
const VERSION = 'v1';
const STAMP = `Scoop variant, ${VERSION} - 28 Sep 2026`;
const OUT = resolve(ROOT, 'assets/img/device-with-collection-scoops.svg');

/* ------------------------------------------------------------------ palette */

const NAVY = '#1C2E4A';   // outlines and text - the site's vessel outline colour
const BLUE = '#44B8E0';   // flow - matches the sibling cross-section
const VESSEL = '#eaf4fa'; // chamber fill - matches the sibling cross-section
const DUCT = '#ffffff';   // vortex finder and overflow, as the sibling uses
const SCOOP = '#AFA9EC';  // collection scoop bodies, as supplied
const HEAVY = '#534AB7';  // PET, PVC
const LIGHT = '#EF9F27';  // PE, PP
const MUTED = '#6c6c7e';
const LEADER = '#b8c2ce';

/* ------------------------------------------------------------- the geometry
 * Copied verbatim from the fragment. Coordinates are the source's own and are
 * deliberately not "tidied" - the labels are positioned around them.
 */

const VESSEL_PATH = '190,130 420,130 420,220 320,400 290,400 190,220';

const OUTLINES = [
  'M190 220 L190 186 M190 156 L190 130 L420 130 L420 220',
  'M190 220 L232 296 M244 318 L290 400 L290 430',
  'M420 220 L378 296 M366 318 L320 400 L320 430',
  'M190 156 L40 156 M40 186 L190 186',
  'M275 212 L275 58 L560 58 M560 92 L335 92 L335 212',
];

const SCOOPS = [
  'M232 296 L198 296 L198 344 L259 344 L244 318',
  'M378 296 L412 296 L412 344 L351 344 L366 318',
];

const LIPS = ['M252 292 L244.5 318', 'M358 292 L365.5 318'];

/** Arrow shaft endpoints, drawn with the shared arrowhead marker. */
const ARROWS = [
  [198, 322, 46, 322],
  [412, 322, 560, 322],
  [560, 75, 606, 75],
  [305, 430, 305, 460],
];

/* --------------------------------------------------------------- particles
 * (path, colour, radius, count, duration) - the fragment's `add()` calls.
 * Particles are spread by negative begin offsets so they are evenly distributed
 * along the path from the first frame. Duration is the whole journey, so the
 * slow descending run takes longer than the rising one.
 */
const RUNS = [
  ['M50 171 L205 171 Q198 200 200 225 L238 288 L243 304 L214 326', HEAVY, 4.5, 4, 6],
  ['M410 145 Q416 190 412 225 L372 288 L367 304 L396 326', HEAVY, 4.5, 4, 6],
  ['M50 171 L205 171 C235 185 250 240 305 250 L305 80 Q305 75 320 75 L590 75', LIGHT, 3.5, 4, 7],
];

/** Still positions used when reduced motion is requested, one set on the same paths. */
const STILL = [
  [205, 171, HEAVY, 4.5],
  [239, 292, HEAVY, 4.5],
  [410, 145, HEAVY, 4.5],
  [370, 293, HEAVY, 4.5],
  [170, 171, LIGHT, 3.5],
  [305, 150, LIGHT, 3.5],
  [420, 75, LIGHT, 3.5],
];

/* ------------------------------------------------------------- label tables */

const CALLOUTS = [
  ['Feed inlet', 'tangential, 2-5 m/s', 40, 118, 40, 134, null],
  [null, 'Overflow: water + light fraction', null, null, 345, 46, null],
  [null, 'Heavy fraction out', null, null, 40, 310, null],
  [null, 'Heavy fraction out', null, null, 470, 310, null],
  ['Vortex finder', null, 476, 124, null, null, [335, 120, 468, 120]],
  ['Outer vortex', 'water descending', 476, 209, 476, 225, [416, 205, 468, 205]],
  ['Inner vortex', 'water rising, carries light', 476, 266, 476, 282, [312, 262, 468, 262]],
  ['Collection scoop', 'lip diverts the outer stream', 476, 376, 476, 392, [385, 344, 468, 372]],
  ['Underflow', 'water reject, few solids', 476, 440, 476, 456, [322, 415, 468, 436]],
];

/* ------------------------------------------------------------------ emitters */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The travelling particles: circle at the origin, moved by an absolute path. */
function animatedParticles() {
  const out = [];
  for (const [d, fill, r, n, dur] of RUNS) {
    for (let i = 0; i < n; i++) {
      const begin = (-(i * dur) / n).toFixed(2) + 's';
      out.push(
        `    <circle cx="0" cy="0" r="${r}" fill="${fill}" stroke="#fff" stroke-width="0.6" opacity="0">\n` +
        `      <animateMotion dur="${dur}s" begin="${begin}" repeatCount="indefinite" path="${d}"/>\n` +
        `      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.92;1" ` +
        `dur="${dur}s" begin="${begin}" repeatCount="indefinite"/>\n` +
        `    </circle>`
      );
    }
  }
  return out.join('\n');
}

function stillParticles() {
  return STILL.map(([x, y, fill, r]) =>
    `    <circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="0.6"/>`
  ).join('\n');
}

function outlines() {
  return OUTLINES.map((d) => `  <path d="${d}"/>`).join('\n');
}

function callouts() {
  return CALLOUTS.map(([head, small, hx, hy, sx, sy, leader]) => {
    const bits = [];
    if (leader) bits.push(`  <line class="leader" x1="${leader[0]}" y1="${leader[1]}" x2="${leader[2]}" y2="${leader[3]}"/>`);
    if (head) bits.push(`  <text class="th" x="${hx}" y="${hy}">${esc(head)}</text>`);
    if (small) bits.push(`  <text class="ts" x="${sx}" y="${sy}">${esc(small)}</text>`);
    return bits.join('\n');
  }).join('\n');
}

/* ---------------------------------------------------------------------- css */

const CSS = `
    .th { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12.5px; font-weight: 700; fill: ${NAVY}; }
    .ts { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; fill: ${MUTED}; }
    .ver { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; fill: #98a2b0; }

    .body  { fill: ${VESSEL}; }
    .duct  { fill: ${DUCT}; }
    .wall  { fill: none; stroke: ${NAVY}; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
    .scoop { fill: ${SCOOP}; fill-opacity: 0.35; stroke: ${NAVY}; stroke-width: 1.5; stroke-linejoin: round; }
    .lip   { stroke: ${NAVY}; stroke-width: 3.5; stroke-linecap: round; }
    .arr   { stroke: ${NAVY}; stroke-width: 1.5; fill: none; }
    .leader{ stroke: ${LEADER}; stroke-width: 1; fill: none; }
    .swirl { fill: none; stroke: ${BLUE}; stroke-width: 0.9; opacity: 0.65; stroke-dasharray: 4 4; }

    .dn { fill: none; stroke: ${BLUE}; stroke-width: 1.6; }
    .up { fill: none; stroke: ${BLUE}; stroke-width: 1.6; }

    /* The still set exists only for readers who ask for less motion. */
    #p-static { display: none; }

    @keyframes fl { to { stroke-dashoffset: -16 } }
    @keyframes fu { to { stroke-dashoffset: 16 } }
    @media (prefers-reduced-motion: no-preference) {
      .dn { stroke-dasharray: 5 4; animation: fl 1.1s linear infinite; }
      .up { stroke-dasharray: 5 4; animation: fu 0.9s linear infinite; }
    }
    @media (prefers-reduced-motion: reduce) {
      #p { display: none; }
      #p-static { display: block; }
    }
`;

/* ------------------------------------------------------------------- output */

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 510" width="680" height="510"
     role="img" aria-labelledby="csTitle csDesc">
  <title id="csTitle">Hydrocyclone with wall-mounted collection scoops</title>
  <desc id="csDesc">Cross-section of a hydrocyclone. Water spirals down the outer wall carrying dense plastics,
  which are caught by a scoop and slot on each side of the cone and collected in troughs. Light plastics ride the
  rising inner vortex out through the vortex finder.</desc>

  <style>${CSS}  </style>

  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>

  <!-- vessel, feed duct and underflow stub -->
  <polygon class="body" points="${VESSEL_PATH}"/>
  <rect class="body" x="40" y="156" width="150" height="30"/>
  <rect class="body" x="290" y="400" width="30" height="30"/>

  <!-- vortex finder and overflow duct -->
  <polygon class="duct" points="275,58 560,58 560,92 335,92 335,212 275,212"/>

  <!-- one swirl plane per turn of the descending spiral -->
  <ellipse class="swirl" cx="305" cy="185" rx="105" ry="13"/>
  <ellipse class="swirl" cx="305" cy="262" rx="82" ry="10"/>
  <ellipse class="swirl" cx="305" cy="350" rx="38" ry="7"/>

  <!-- direct routes, as supplied: the descending outer stream and the rising core -->
  <path class="dn" d="M208 190 L240 284" marker-end="url(#arrow)"/>
  <path class="dn" d="M402 190 L370 284" marker-end="url(#arrow)"/>
  <path class="up" d="M305 300 L305 100" marker-end="url(#arrow)"/>

  <!-- vessel wall -->
  <g class="wall">
${outlines()}
  </g>

  <!-- collection scoops and their lips -->
  <path class="scoop" d="${SCOOPS[0]}"/>
  <path class="scoop" d="${SCOOPS[1]}"/>
  <path class="lip" d="${LIPS[0]}"/>
  <path class="lip" d="${LIPS[1]}"/>

  <!-- outlet arrows -->
${ARROWS.map(([x1, y1, x2, y2]) => `  <line class="arr" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#arrow)"/>`).join('\n')}

  <!-- particles: travelling set, then a still set for reduced-motion readers -->
  <g id="p">
${animatedParticles()}
  </g>
  <g id="p-static">
${stillParticles()}
  </g>

  <!-- labels -->
${callouts()}

  <!-- legend -->
  <circle cx="60" cy="490" r="5" fill="${HEAVY}"/>
  <text class="ts" x="72" y="494">Heavy: PET, PVC</text>
  <circle cx="230" cy="490" r="5" fill="${LIGHT}"/>
  <text class="ts" x="242" y="494">Light: PE, PP</text>
  <text class="ver" x="470" y="494">${esc(STAMP)}</text>
</svg>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg, 'utf8');
console.log(`wrote ${OUT} (${svg.length} bytes)`);
