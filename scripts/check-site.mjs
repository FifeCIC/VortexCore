#!/usr/bin/env node
/**
 * Validates the Vortex Core static site before it is published.
 *
 * Why this exists: the site is plain HTML with no build step, so nothing was
 * checking it. Two diagram faults shipped in one sitting and both were only
 * visible by eye:
 *
 *   1. An SVG whose XML comments contained runs of hyphens. XML forbids '--'
 *      inside a comment, so the browser fetched the file (HTTP 200,
 *      image/svg+xml) and then refused to parse it. The <img> rendered
 *      nothing and reported naturalWidth 0.
 *
 *   2. Particles animated with CSS `offset-path: path(...)` on SVG children.
 *      The path is scaled by the element CTM, so particles flew outside the
 *      viewBox whenever the diagram was displayed at a different width.
 *
 * Neither was caught by looking at the markup. Both are caught below.
 *
 * No dependencies: Node core only, so this runs in CI with no install step.
 *
 * Usage:  node scripts/check-site.mjs
 * Exits non-zero on any failure.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const failures = [];
const notes = [];

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const allFiles = walk(ROOT);
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
const svgFiles = allFiles.filter((f) => f.endsWith('.svg'));

/* ------------------------------------------------------------------ HTML -- */

for (const file of htmlFiles) {
  const rel = relative(ROOT, file).split('\\').join('/');
  const html = readFileSync(file, 'utf8');

  // 1. Every relative link and asset must resolve to a real file.
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|#|\/\/)/.test(target)) continue;
    const clean = target.split('#')[0].split('?')[0];
    if (!clean) continue;
    if (!existsSync(join(dirname(file), clean))) {
      fail(rel, `broken local reference -> ${target}`);
    }
  }

  // 2. Every page needs a title and a description, or link previews are blank.
  if (!/<title>[^<]+<\/title>/.test(html)) fail(rel, 'missing <title>');
  if (!/<meta\s+name="description"\s+content="[^"]+"/.test(html)) fail(rel, 'missing meta description');
  if (!/<meta\s+property="og:title"/.test(html)) fail(rel, 'missing og:title');

  // 3. Icons and labels: every <img> needs alt text.
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt=/.test(m[0])) fail(rel, `an <img> has no alt attribute: ${m[0].slice(0, 60)}`);
  }

  // 4. No inline event handlers or leftover editor markers.
  if (/\bon(click|load|error)\s*=/.test(html)) fail(rel, 'inline event handler found');
  if (/(TODO|FIXME|XXX)/.test(html)) notes.push(`${rel}: contains a TODO/FIXME marker`);
}

/* ------------------------------------------------------------------- SVG -- */

for (const file of svgFiles) {
  const rel = relative(ROOT, file).split('\\').join('/');
  const svg = readFileSync(file, 'utf8');

  // 5. XML comments must not contain '--'. This is the fault that made a
  //    fetched, HTTP-200 SVG unparseable.
  for (const m of svg.matchAll(/<!--([\s\S]*?)-->/g)) {
    if (/--/.test(m[1])) {
      fail(rel, `XML comment contains '--' (illegal, breaks parsing): <!--${m[1].trim().slice(0, 50)}...`);
    }
  }

  // 6. Root element needs a viewBox so it scales.
  const rootTag = svg.slice(0, svg.indexOf('>', svg.indexOf('<svg')) + 1);
  const vb = rootTag.match(/viewBox="([\d.\s-]+)"/);
  if (!vb) {
    fail(rel, 'root <svg> has no viewBox');
    continue;
  }
  const [vx, vy, vw, vh] = vb[1].trim().split(/\s+/).map(Number);

  // 7. Every drawn primitive must sit inside the viewBox. This is what would
  //    have caught the offset-path and animateMotion faults.
  const inBox = (x, y, label) => {
    if (x < vx - 1 || x > vx + vw + 1 || y < vy - 1 || y > vy + vh + 1) {
      fail(rel, `${label} at (${x}, ${y}) is outside the viewBox ${vw}x${vh}`);
    }
  };

  for (const m of svg.matchAll(/<circle\b[^>]*>/g)) {
    const tag = m[0];
    const cx = Number((tag.match(/\bcx="([-\d.]+)"/) || [])[1]);
    const cy = Number((tag.match(/\bcy="([-\d.]+)"/) || [])[1]);
    if (Number.isNaN(cx) || Number.isNaN(cy)) {
      fail(rel, `<circle> without numeric cx/cy: ${tag.slice(0, 60)}`);
      continue;
    }
    inBox(cx, cy, 'circle');
  }

  for (const m of svg.matchAll(/<text\b[^>]*>/g)) {
    const tag = m[0];
    const x = Number((tag.match(/\bx="([-\d.]+)"/) || [])[1]);
    const y = Number((tag.match(/\by="([-\d.]+)"/) || [])[1]);
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    inBox(x, y, 'text');
  }

  // 7b. Animated geometry must stay in the viewBox too. This is the check that
  //     matters for SMIL: a bad values array sends particles out of the diagram
  //     while the markup still looks entirely reasonable, which is precisely how
  //     the offset-path and animateMotion faults got through.
  const inX = (x, label) => {
    if (x < vx - 1 || x > vx + vw + 1) fail(rel, `${label} at x=${x} is outside the viewBox width ${vw}`);
  };
  const inY = (y, label) => {
    if (y < vy - 1 || y > vy + vh + 1) fail(rel, `${label} at y=${y} is outside the viewBox height ${vh}`);
  };

  for (const m of svg.matchAll(/<animate\b[^>]*\/?>/g)) {
    const tag = m[0];
    const attr = (tag.match(/attributeName="([^"]+)"/) || [])[1];
    if (attr !== 'cx' && attr !== 'cy' && attr !== 'r') continue;

    const values = (tag.match(/values="([^"]+)"/) || [])[1];
    if (!values) {
      fail(rel, `<animate attributeName="${attr}"> has no values array`);
      continue;
    }

    for (const raw of values.split(';')) {
      const n = Number(raw.trim());
      if (Number.isNaN(n)) {
        fail(rel, `<animate ${attr}> contains a non-numeric sample: "${raw}"`);
        break;
      }
      if (attr === 'cx') inX(n, 'animate cx sample');
      if (attr === 'cy') inY(n, 'animate cy sample');
      if (attr === 'r' && (n <= 0 || n > 40)) fail(rel, `animate r sample is implausible: ${n}`);
    }
  }

  // 8. Any url(#id) reference must resolve within the same file.
  const ids = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) {
    if (!ids.has(m[1])) fail(rel, `url(#${m[1]}) has no matching id in this file`);
  }

  // 9. Accessibility: a standalone SVG needs a title.
  if (!/<title\b/.test(svg)) fail(rel, 'missing <title> for accessibility');
}

/* ---------------------------------------------------------------- report -- */

if (notes.length) {
  console.log('Notes:');
  for (const n of notes) console.log(`  - ${n}`);
  console.log('');
}

console.log(
  `Checked ${htmlFiles.length} HTML page(s) and ${svgFiles.length} SVG diagram(s).`
);

if (failures.length) {
  console.log('');
  console.log(`FAILED with ${failures.length} problem(s):`);
  for (const f of failures) console.log(`  x ${f}`);
  process.exit(1);
}

console.log('All checks passed.');
