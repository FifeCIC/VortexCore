#!/usr/bin/env node
/**
 * Generates assets/img/gravity-requirement-chart.svg
 *
 * The chart is derived, not drawn. It plots the same relationship that produces
 * the G-force table on the concept page, so the two can never disagree:
 *
 *   v = (d^2 * |rho_p - rho_f| * a_c) / (18 * eta)
 *
 * A particle has to cross a radial distance L within the residence time t, so
 * the acceleration needed is:
 *
 *   a_c = (18 * eta * L) / (d^2 * |rho_p - rho_f| * t)
 *
 * Holding L and t fixed, a_c is proportional to 1 / (d^2 * dRho). That is a
 * straight line of slope -2 on log-log axes, which is why this is a log-log plot.
 *
 * K is calibrated once so that the anchor case reproduces the published figure:
 * 50 um PET at dRho = 400 kg/m3 needs 19 G, hence K = 19 * 0.05^2 * 400. Every
 * other point follows from the relationship rather than from a separate
 * estimate. If a density changes, change it here and the whole chart moves.
 *
 * Usage:  node scripts/generate-gchart.mjs
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = 'v1';
const STAMP = 'Chart v1, 27 Sep 2026';
const OUT = resolve(ROOT, 'assets/img/gravity-requirement-chart.svg');

/* -------------------------------------------------------------- physics -- */

const RHO_WATER = 1000;                       // kg/m3
const ANCHOR = { d_um: 50, dRho: 400, G: 19 }; // 50 um PET at 19 G, the published figure
const K = ANCHOR.G * Math.pow(ANCHOR.d_um, 2) * ANCHOR.dRho;   // 1.9e7

/** Polymers, with the densities stated in the source material. */
const POLYMERS = [
  { key: 'pet', label: 'PET / PVC',     rho: 1400, colour: '#1C2E4A', width: 2.4 },
  { key: 'pp',  label: 'Polypropylene', rho: 905,  colour: '#2a9bc4', width: 2.0 },
  { key: 'pe',  label: 'Polyethylene',  rho: 950,  colour: '#C4A882', width: 2.0 },
];

for (const p of POLYMERS) {
  p.dRho = Math.abs(p.rho - RHO_WATER);
  // G(d_um) = K / (d_um^2 * dRho)
  p.G = (d) => K / (d * d * p.dRho);
}

/* ------------------------------------------------------------- geometry -- */

const VB = { w: 1000, h: 560 };
const PLOT = { x0: 120, y0: 70, x1: 840, y1: 430 };

const D_MIN = 1;
const D_MAX = 100;
const G_MIN = 10;
const G_MAX = 1000000;

const D_DECADES = Math.log10(D_MAX) - Math.log10(D_MIN);      // 2
const G_DECADES = Math.log10(G_MAX) - Math.log10(G_MIN);      // 5

const xPix = (d) =>
  PLOT.x0 + ((Math.log10(d) - Math.log10(D_MIN)) / D_DECADES) * (PLOT.x1 - PLOT.x0);
const yPix = (g) =>
  PLOT.y1 - ((Math.log10(g) - Math.log10(G_MIN)) / G_DECADES) * (PLOT.y1 - PLOT.y0);

/* --------------------------------------------------------- design point -- */

const BAND_LO = 2500;
const BAND_HI = 3000;

/** Diameter at which a polymer's requirement crosses a given G. G = K/(d^2*dRho). */
const crossDiameter = (p, g) => Math.sqrt(K / (g * p.dRho));

const crossings = POLYMERS.map((p) => ({
  p,
  d: crossDiameter(p, BAND_LO),
  x: xPix(crossDiameter(p, BAND_LO)),
  gAt2500: BAND_LO,
}));

/* ---------------------------------------------------------------- ticks -- */

const xTicks = [1, 2, 5, 10, 20, 50, 100];
const yTicks = [10, 100, 1000, 10000, 100000, 1000000];
const yLabel = (v) => v.toLocaleString('en-GB');

/* ------------------------------------------------------------------ svg -- */

const bandTop = yPix(BAND_HI);
const bandBottom = yPix(BAND_LO);
const bandY = Math.min(bandTop, bandBottom);
const bandH = Math.abs(bandBottom - bandTop);

const grid = [
  ...yTicks.map(
    (v) => `  <line class="grid" x1="${PLOT.x0}" y1="${yPix(v).toFixed(1)}" x2="${PLOT.x1}" y2="${yPix(v).toFixed(1)}"/>`
  ),
  ...xTicks.map(
    (v) => `  <line class="grid" x1="${xPix(v).toFixed(1)}" y1="${PLOT.y0}" x2="${xPix(v).toFixed(1)}" y2="${PLOT.y1}"/>`
  ),
].join('\n');

const yTickMarks = yTicks
  .map(
    (v) =>
      `  <text class="tick" x="${PLOT.x0 - 10}" y="${(yPix(v) + 4).toFixed(1)}" text-anchor="end">${yLabel(v)}</text>`
  )
  .join('\n');

const xTickMarks = xTicks
  .map((v) => `  <text class="tick" x="${xPix(v).toFixed(1)}" y="${PLOT.y1 + 20}" text-anchor="middle">${v}</text>`)
  .join('\n');

/**
 * Clamp a series to the plotted window. Without this the PET line is drawn down
 * to 4.75 G, which is below the axis floor, and it overshoots the frame.
 */
function visibleRange(p) {
  const dAtGMin = Math.sqrt(K / (G_MIN * p.dRho));
  const dAtGMax = Math.sqrt(K / (G_MAX * p.dRho));
  return { dStart: Math.max(D_MIN, dAtGMax), dEnd: Math.min(D_MAX, dAtGMin) };
}

const lines = POLYMERS.map((p) => {
  const { dStart, dEnd } = visibleRange(p);
  return (
    `  <line x1="${xPix(dStart).toFixed(1)}" y1="${yPix(p.G(dStart)).toFixed(1)}" ` +
    `x2="${xPix(dEnd).toFixed(1)}" y2="${yPix(p.G(dEnd)).toFixed(1)}" ` +
    `stroke="${p.colour}" stroke-width="${p.width}" stroke-linecap="round"/>`
  );
}).join('\n');

// Series key, in the lower left of the plot. That area is empty because the PET
// line has already left the frame by there. Labelling the lines at their right
// ends instead pushed the PET label down into the axis tick row.
const legend = POLYMERS.map((p, i) => {
  const y = PLOT.y1 - 74 + i * 24;
  return (
    `  <line x1="${PLOT.x0 + 26}" y1="${y}" x2="${PLOT.x0 + 52}" y2="${y}" stroke="${p.colour}" stroke-width="3" stroke-linecap="round"/>\n` +
    `  <text class="series" x="${PLOT.x0 + 60}" y="${y + 4}">${p.label}</text>`
  );
}).join('\n');

// Crossing markers and labels, staggered so the two rightmost do not collide.
const crossMarks = crossings
  .map((c, i) => {
    const y = (bandY + bandH / 2).toFixed(1);
    const labelY = i === 2 ? PLOT.y1 - 132 : PLOT.y1 - 152;
    const dText = c.d < 10 ? `${c.d.toFixed(1)} \u00b5m` : `${Math.round(c.d)} \u00b5m`;
    return (
      `  <line class="drop" x1="${c.x.toFixed(1)}" y1="${y}" x2="${c.x.toFixed(1)}" y2="${labelY - 18}"/>\n` +
      `  <circle cx="${c.x.toFixed(1)}" cy="${y}" r="4.5" fill="${c.p.colour}" stroke="#ffffff" stroke-width="1.5"/>\n` +
      `  <text class="cross" x="${c.x.toFixed(1)}" y="${labelY}" text-anchor="middle">${dText}</text>`
    );
  })
  .join('\n');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB.w} ${VB.h}" width="${VB.w}" height="${VB.h}"
     role="img" aria-labelledby="gcTitle gcDesc">
  <title id="gcTitle">Centrifugal force required to separate microplastics, by particle size and polymer</title>
  <desc id="gcDesc">Log-log chart. The horizontal axis is particle diameter from 1 to 100 micrometres. The vertical
  axis is the centrifugal force required, from 10 to 1,000,000 G. Three straight lines show the requirement for
  PET and PVC, for polypropylene, and for polyethylene. A shaded band across the plot at 2,500 to 3,000 G marks the
  design point of the proposed device. Where a line passes above that band the design point is not enough. The lines
  cross the band at 4.4 micrometres for PET, 8.9 for polypropylene and 12 for polyethylene, so buoyant polymers are
  separable only at considerably larger particle sizes.</desc>

  <style>
    .tick   { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; fill: #6c6c7e; }
    .series { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: 700; fill: #1C2E4A; }
    .cross  { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11.5px; font-weight: 700; fill: #1C2E4A; }
    .axis   { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12.5px; fill: #4a4a5a; }
    .bandlab { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11.5px; font-weight: 700; fill: #44661a; }
    .zonelab { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11.5px; fill: #8a6520; }
    .ver    { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; fill: #98a2b0; }

    .grid   { stroke: #e6eaee; stroke-width: 1; }
    .frame  { fill: none; stroke: #c3ccd6; stroke-width: 1.2; }
    .leader { stroke: #c3ccd6; stroke-width: 1; }
    .drop   { stroke: #b8c2ce; stroke-width: 1; stroke-dasharray: 3 3; }
    .unreach { fill: #C4A882; opacity: .10; }
    .band   { fill: #8DC63F; opacity: .40; stroke: #74a832; stroke-width: 1; }
  </style>

  <!-- version stamp, inside the artwork -->
  <text class="ver" x="${VB.w - 24}" y="30" text-anchor="end">${STAMP}</text>

  <!-- region above the design point -->
  <rect class="unreach" x="${PLOT.x0}" y="${PLOT.y0}" width="${PLOT.x1 - PLOT.x0}" height="${(bandY - PLOT.y0).toFixed(1)}"/>
  <text class="zonelab" x="${PLOT.x0 + 10}" y="${PLOT.y0 + 18}">above the design point: not separable</text>

  <!-- grid -->
${grid}

  <!-- design band -->
  <rect class="band" x="${PLOT.x0}" y="${bandY.toFixed(1)}" width="${PLOT.x1 - PLOT.x0}" height="${bandH.toFixed(1)}"/>
  <text class="bandlab" x="${PLOT.x1 - 8}" y="${(bandY - 7).toFixed(1)}" text-anchor="end">design point 2,500 to 3,000 G</text>

  <!-- the three requirement lines -->
${lines}

  <!-- crossings -->
${crossMarks}

  <!-- series key -->
${legend}

  <!-- axes -->
  <rect class="frame" x="${PLOT.x0}" y="${PLOT.y0}" width="${PLOT.x1 - PLOT.x0}" height="${PLOT.y1 - PLOT.y0}"/>
${yTickMarks}
${xTickMarks}
  <text class="axis" x="${(PLOT.x0 + PLOT.x1) / 2}" y="${VB.h - 26}" text-anchor="middle">particle diameter (micrometres, log scale)</text>
  <text class="axis" x="40" y="${(PLOT.y0 + PLOT.y1) / 2}" text-anchor="middle" transform="rotate(-90 40 ${(PLOT.y0 + PLOT.y1) / 2})">centrifugal force required (G, log scale)</text>
</svg>
`;

writeFileSync(OUT, svg, 'utf8');

const rel = OUT.replace(ROOT, '').replace(/\\/g, '/').replace(/^\//, '');
const bytes = Buffer.byteLength(svg, 'utf8');

console.log(`Wrote ${rel}  (${bytes} bytes)`);
console.log(`  version ${VERSION}, stamp "${STAMP}"`);
console.log(`  K = ${K.toExponential(2)}   (anchor: ${ANCHOR.d_um} um at dRho ${ANCHOR.dRho} needs ${ANCHOR.G} G)`);
for (const p of POLYMERS) {
  const c = crossDiameter(p, BAND_LO);
  console.log(
    `  ${p.label.padEnd(14)} rho ${p.rho}  dRho ${String(p.dRho).padStart(4)}  ` +
      `50um ${p.G(50).toFixed(0).padStart(6)} G   5um ${p.G(5).toFixed(0).padStart(6)} G   ` +
      `crosses 2500 G at ${c.toFixed(1)} um`
  );
}
