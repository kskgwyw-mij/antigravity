/**
 * Automated Test Suite for OSM Overpass Data Science App
 */

import assert from 'node:assert/strict';
import http from 'node:http';

import { CATEGORIES, buildOverpassQL, categorizeElement, normalizeElement } from '../lib/overpass.js';
import { calculateBboxArea, haversineDistance, computeAnalytics, featuresToGeoJSON, featuresToCSV } from '../lib/analytics.js';
import { QueryCache } from '../lib/cache.js';
import { generateCityMockData, remapMockDataToBbox } from '../lib/mockData.js';
import server from '../server.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n--- Running Unit & Integration Tests ---\n');

// Start server on an ephemeral port so tests never collide with a running
// instance or a PORT set in the environment.
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const TEST_PORT = server.address().port;

// 1. Overpass QL & Categorization Tests
test('Categories definition has 8 rich categories', () => {
  const keys = Object.keys(CATEGORIES);
  assert.equal(keys.length, 8);
  assert.ok(keys.includes('food_drink'));
  assert.ok(keys.includes('healthcare'));
  assert.ok(keys.includes('transport'));
});

test('buildOverpassQL generates valid syntax and bbox filter', () => {
  const bbox = [52.36, 4.87, 52.38, 4.91];
  const ql = buildOverpassQL(bbox, ['food_drink', 'healthcare']);
  assert.ok(ql.includes('[out:json]'));
  assert.ok(ql.includes('(52.360000,4.870000,52.380000,4.910000)'));
  assert.ok(ql.includes('amenity'));
});

test('categorizeElement correctly assigns category and tag', () => {
  const el = { tags: { amenity: 'restaurant', name: 'Le Bistro' } };
  const res = categorizeElement(el);
  assert.equal(res.category, 'food_drink');
  assert.equal(res.primaryTag, 'amenity=restaurant');
});

test('normalizeElement extracts center coords from way elements', () => {
  const way = {
    id: 12345,
    type: 'way',
    center: { lat: 52.37, lon: 4.89 },
    tags: { leisure: 'park', name: 'City Park' }
  };
  const norm = normalizeElement(way);
  assert.equal(norm.lat, 52.37);
  assert.equal(norm.lon, 4.89);
  assert.equal(norm.category, 'leisure');
  assert.equal(norm.name, 'City Park');
});

// 2. Spatial Math & Analytics Tests
test('calculateBboxArea calculates valid square kilometers and center point', () => {
  const bbox = [52.3610, 4.8750, 52.3800, 4.9150];
  const spatial = calculateBboxArea(bbox);
  assert.ok(spatial.areaKm2 > 0);
  assert.ok(spatial.widthKm > 0);
  assert.ok(spatial.heightKm > 0);
  assert.equal(spatial.centerLat, 52.3705);
});

test('haversineDistance calculates realistic geographic distance', () => {
  // Distance between Amsterdam and Paris should be ~430 km
  const dist = haversineDistance(52.3702, 4.8952, 48.8566, 2.3522);
  assert.ok(dist > 400 && dist < 460, `Expected ~430km, got ${dist}`);
});

test('computeAnalytics calculates diversity, density, completeness, and quadrants', () => {
  const mock = generateCityMockData('amsterdam');
  const analytics = computeAnalytics(mock.features, mock.bbox);

  assert.ok(analytics.featureCount > 0);
  assert.ok(analytics.spatial.densityPerKm2 > 0);
  assert.ok(analytics.diversity.shannonEntropy > 0);
  assert.ok(analytics.diversity.normalizedScore >= 0 && analytics.diversity.normalizedScore <= 1);
  assert.equal(analytics.quadrants.length, 4);
  assert.ok(analytics.completeness.hasNamePct > 0);
  assert.ok(analytics.topSubtags.length > 0);
});

test('featuresToGeoJSON and featuresToCSV formatting', () => {
  const mock = generateCityMockData('amsterdam');
  const geojson = featuresToGeoJSON(mock.features);
  assert.equal(geojson.type, 'FeatureCollection');
  assert.equal(geojson.features.length, mock.features.length);
  assert.equal(geojson.features[0].geometry.type, 'Point');

  const csv = featuresToCSV(mock.features);
  assert.ok(csv.startsWith('osm_id,type,name,category,primary_tag,latitude,longitude'));
  assert.ok(csv.includes('Cafe de Prins'));
});

// 3. Cache Engine Tests
test('QueryCache stores and retrieves cached query results', () => {
  const cache = new QueryCache(':memory:');
  const key = 'test_key_1';
  const data = { sample: 'result', count: 42 };

  cache.set(key, '0,0,1,1', ['food_drink'], data, 42);
  const retrieved = cache.get(key);
  assert.deepEqual(retrieved, data);

  const stats = cache.stats();
  assert.equal(stats.cachedQueries, 1);

  cache.delete(key);
  assert.equal(cache.get(key), null);
  cache.close();
});

test('QueryCache evicts oldest entries beyond the memory cap', () => {
  const cache = new QueryCache(':memory:', 60 * 60 * 1000, 2);
  cache.set('k1', '0,0,1,1', [], { i: 1 });
  cache.set('k2', '0,0,1,1', [], { i: 2 });
  cache.set('k3', '0,0,1,1', [], { i: 3 });

  assert.equal(cache.memoryCache.size, 2);
  assert.ok(!cache.memoryCache.has('k1'));
  assert.equal(cache.get('k3').i, 3);
  cache.close();
});

test('remapMockDataToBbox scales mock features into the requested bbox', () => {
  const mock = generateCityMockData('amsterdam');
  const bbox = [35.6500, 139.6900, 35.6700, 139.7150];
  const remapped = remapMockDataToBbox(mock, bbox);

  assert.deepEqual(remapped.bbox, bbox);
  assert.equal(remapped.features.length, mock.features.length);
  for (const f of remapped.features) {
    assert.ok(f.lat > 35 && f.lat < 36, `lat ${f.lat} outside Tokyo bbox`);
    assert.ok(f.lon > 139 && f.lon < 140, `lon ${f.lon} outside Tokyo bbox`);
  }
});

// 4. Server API Integration Tests
async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

await asyncTest('GET /api/categories returns valid category list', async () => {
  const res = await makeRequest('/api/categories');
  assert.equal(res.statusCode, 200);
  const json = JSON.parse(res.body);
  assert.ok(json.success);
  assert.equal(json.categories.length, 8);
});

await asyncTest('GET /api/cities returns predefined demo cities', async () => {
  const res = await makeRequest('/api/cities');
  assert.equal(res.statusCode, 200);
  const json = JSON.parse(res.body);
  assert.ok(json.success);
  assert.ok(json.cities.amsterdam);
  assert.ok(json.cities.manhattan);
});

await asyncTest('POST /api/query rejects invalid bbox values', async () => {
  const res1 = await makeRequest('/api/query', 'POST', { bbox: [9999, -9999, 0, 0], useMock: true });
  assert.equal(res1.statusCode, 400);

  const res2 = await makeRequest('/api/query', 'POST', { bbox: ['a', 'b', 'c', 'd'], useMock: true });
  assert.equal(res2.statusCode, 400);

  const res3 = await makeRequest('/api/query', 'POST', { bbox: [52.38, 4.87, 52.36, 4.91], useMock: true });
  assert.equal(res3.statusCode, 400);
});

await asyncTest('POST /api/query mock mode returns features within the requested bbox', async () => {
  const bbox = [35.6500, 139.6900, 35.6700, 139.7150];
  const res = await makeRequest('/api/query', 'POST', { bbox, categories: [], useMock: true });
  assert.equal(res.statusCode, 200);
  const json = JSON.parse(res.body);
  assert.ok(json.features.length > 0);
  for (const f of json.features) {
    assert.ok(f.lat >= bbox[0] && f.lat <= bbox[2]);
    assert.ok(f.lon >= bbox[1] && f.lon <= bbox[3]);
  }
});

await asyncTest('POST /api/analytics rejects invalid bbox', async () => {
  const res1 = await makeRequest('/api/analytics', 'POST', { features: [], bbox: null });
  assert.equal(res1.statusCode, 400);

  const res2 = await makeRequest('/api/analytics', 'POST', { features: [], bbox: [52.38, 4.87, 52.36, 4.91] });
  assert.equal(res2.statusCode, 400);
});

await asyncTest('POST /api/query returns features and data science analytics', async () => {
  const payload = {
    bbox: [52.3610, 4.8750, 52.3800, 4.9150],
    categories: ['food_drink', 'healthcare', 'leisure'],
    useMock: true
  };
  const res = await makeRequest('/api/query', 'POST', payload);
  assert.equal(res.statusCode, 200);
  const json = JSON.parse(res.body);
  assert.ok(json.success);
  assert.ok(json.features.length > 0);
  assert.ok(json.analytics.spatial.densityPerKm2 > 0);
  assert.ok(json.analytics.diversity.shannonEntropy > 0);
});

await asyncTest('POST /api/export/geojson returns valid GeoJSON attachment', async () => {
  const mock = generateCityMockData('amsterdam');
  const res = await makeRequest('/api/export/geojson', 'POST', { features: mock.features });
  assert.equal(res.statusCode, 200);
  assert.ok(res.headers['content-type'].includes('geo+json'));
  const geojson = JSON.parse(res.body);
  assert.equal(geojson.type, 'FeatureCollection');
});

await asyncTest('POST /api/export/csv returns valid CSV attachment', async () => {
  const mock = generateCityMockData('amsterdam');
  const res = await makeRequest('/api/export/csv', 'POST', { features: mock.features });
  assert.equal(res.statusCode, 200);
  assert.ok(res.headers['content-type'].includes('text/csv'));
  assert.ok(res.body.includes('osm_id,type,name'));
});

await asyncTest('GET / serves frontend index.html', async () => {
  const res = await makeRequest('/');
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.includes('OpenStreetMap Overpass Data Science Dashboard'));
});

await asyncTest('Strict path containment prevents directory traversal', async () => {
  const res1 = await makeRequest('/../package.json');
  assert.ok(res1.statusCode === 403 || res1.statusCode === 404);
  assert.ok(!res1.body.includes('"osm-overpass-dashboard"'));

  const res2 = await makeRequest('/%2e%2e/server.js');
  assert.ok(res2.statusCode === 403 || res2.statusCode === 404);
  assert.ok(!res2.body.includes('PUBLIC_DIR'));

  const res3 = await makeRequest('/..%2F..%2Fpackage.json');
  assert.ok(res3.statusCode === 403 || res3.statusCode === 404 || res3.statusCode === 400);
});

console.log(`\nTests completed: ${passed} passed, ${failed} failed.\n`);

await new Promise(resolve => server.close(resolve));
process.exit(failed > 0 ? 1 : 0);
