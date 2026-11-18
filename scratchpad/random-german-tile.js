import { buildOverpassQL, normalizeElement, executeOverpassQuery } from '../lib/overpass.js';

// Random point in Germany's bounding box (lat 47.3-55.0, lon 6.0-15.0)
const pick = (min, max) => min + Math.random() * (max - min);
const lat = pick(47.4, 54.9);
const lon = pick(6.0, 14.9);

// Web Mercator tile (z12) containing the point -> bbox
const z = 12, n = 2 ** z;
const xTile = Math.floor((lon + 180) / 360 * n);
const latRad = lat * Math.PI / 180;
const yTile = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
const tile2lon = t => t / n * 360 - 180;
const tile2lat = t => Math.atan(Math.sinh(Math.PI * (1 - 2 * t / n))) * 180 / Math.PI;
const bbox = [tile2lat(yTile + 1), tile2lon(xTile), tile2lat(yTile), tile2lon(xTile + 1)];

console.log(`Ziel-Tile: z${z}/${xTile}/${yTile}`);
console.log(`BBox [S,W,N,E]: ${bbox.map(v => v.toFixed(5)).join(', ')}`);
console.log('Frage live Overpass ab...\n');

const ql = buildOverpassQL(bbox, ['food_drink', 'transport', 'shops', 'leisure', 'services', 'healthcare', 'education', 'tourism'], { limit: 500 });

try {
  const res = await executeOverpassQuery(ql);
  const features = [];
  for (const el of res.elements) {
    const f = normalizeElement(el);
    if (f) features.push(f);
  }
  console.log(`Mirror: ${res.mirror}${res.cached ? ' (cached)' : ''}`);
  console.log(`Features geladen: ${features.length}`);

  const counts = {};
  for (const f of features) counts[f.categoryLabel] = (counts[f.categoryLabel] || 0) + 1;
  console.log('\nKategorien:');
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }

  console.log('\nBeispiel-Features (max 8):');
  for (const f of features.slice(0, 8)) {
    console.log(`  - ${f.name} [${f.categoryLabel}] @ ${f.lat.toFixed(5)}, ${f.lon.toFixed(5)}`);
  }
} catch (err) {
  console.log('FAILED:', err.message);
}
