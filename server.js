/**
 * OpenStreetMap Viewer & Data Science Dashboard Server
 * Pure Node.js (ES Modules, zero external npm dependencies)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { queryCache } from './lib/cache.js';
import {
  CATEGORIES,
  buildOverpassQL,
  normalizeElement,
  executeOverpassQuery
} from './lib/overpass.js';
import {
  computeAnalytics,
  featuresToGeoJSON,
  featuresToCSV
} from './lib/analytics.js';
import { MOCK_CITIES, generateCityMockData } from './lib/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, 'public');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        // 5MB safeguard
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  let reqPath;
  try {
    reqPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('400 Bad Request');
  }

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  // Strip null bytes to guard against poison null byte attacks
  const sanitizedPath = reqPath.replace(/\0/g, '');

  // Resolve target absolute path within PUBLIC_DIR
  const resolvedPublicDir = path.resolve(PUBLIC_DIR);
  const resolvedPath = path.resolve(resolvedPublicDir, '.' + path.normalize('/' + sanitizedPath));

  // Strict containment verification: path must reside strictly within PUBLIC_DIR
  if (!resolvedPath.startsWith(resolvedPublicDir + path.sep) && resolvedPath !== resolvedPublicDir) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(resolvedPath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    });
    stream.pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  try {
    // 1. Get Categories
    if (pathname === '/api/categories' && method === 'GET') {
      return sendJson(res, 200, {
        success: true,
        categories: Object.values(CATEGORIES)
      });
    }

    // 2. Predefined Demo Cities
    if (pathname === '/api/cities' && method === 'GET') {
      return sendJson(res, 200, {
        success: true,
        cities: MOCK_CITIES
      });
    }

    // 3. Cache Stats & Clear
    if (pathname === '/api/cache/stats' && method === 'GET') {
      return sendJson(res, 200, {
        success: true,
        stats: queryCache.stats()
      });
    }

    if (pathname === '/api/cache/clear' && method === 'POST') {
      queryCache.clear();
      return sendJson(res, 200, { success: true, message: 'Cache cleared' });
    }

    // 4. Overpass Query Endpoint
    if (pathname === '/api/query' && method === 'POST') {
      const startTime = Date.now();
      const body = await parseJsonBody(req);
      const { bbox, categories = [], useMock = false, customQL = null } = body;

      if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) {
        return sendJson(res, 400, { success: false, error: 'bbox array [south, west, north, east] is required' });
      }

      // Check Cache
      const cacheKey = customQL
        ? `custom:${customQL}`
        : `${bbox.map(n => Number(n).toFixed(5)).join(',')}:${categories.sort().join(',')}`;

      if (!useMock) {
        const cached = queryCache.get(cacheKey);
        if (cached) {
          return sendJson(res, 200, {
            ...cached,
            cached: true,
            executionTimeMs: Date.now() - startTime
          });
        }
      }

      let qlQuery = customQL;
      if (!qlQuery) {
        try {
          qlQuery = buildOverpassQL(bbox, categories, { timeout: 25, limit: 1200 });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      // If mock mode is requested
      if (useMock) {
        const mockResult = generateCityMockData('amsterdam');
        const analytics = computeAnalytics(mockResult.features, bbox);
        const result = {
          success: true,
          mode: 'mock',
          features: mockResult.features,
          count: mockResult.features.length,
          analytics,
          qlQuery,
          cached: false,
          executionTimeMs: Date.now() - startTime
        };
        return sendJson(res, 200, result);
      }

      // Execute live Overpass query
      try {
        const overpassRes = await executeOverpassQuery(qlQuery);
        const rawElements = overpassRes.elements || [];

        // Normalize elements into POIs
        const features = [];
        for (const el of rawElements) {
          const norm = normalizeElement(el);
          if (norm) {
            // Apply category filter if custom query didn't restrict it
            if (categories.length === 0 || categories.includes(norm.category)) {
              features.push(norm);
            }
          }
        }

        const analytics = computeAnalytics(features, bbox);
        const result = {
          success: true,
          mode: 'live',
          mirror: overpassRes.mirror,
          features,
          count: features.length,
          analytics,
          qlQuery,
          cached: false,
          executionTimeMs: Date.now() - startTime
        };

        // Cache the successful result
        queryCache.set(cacheKey, bbox.join(','), categories, result, features.length);

        return sendJson(res, 200, result);
      } catch (err) {
        console.warn('Overpass live query failed:', err.message);
        // Fall back gracefully with clear message and sample data
        const mock = generateCityMockData('amsterdam');
        const analytics = computeAnalytics(mock.features, bbox);

        return sendJson(res, 200, {
          success: true,
          mode: 'offline_fallback',
          warning: `Live Overpass mirror unreachable (${err.message}). Showing offline demonstration data. You can also run direct client-side queries or retry.`,
          features: mock.features,
          count: mock.features.length,
          analytics,
          qlQuery,
          cached: false,
          executionTimeMs: Date.now() - startTime
        });
      }
    }

    // 5. Analytics Endpoint
    if (pathname === '/api/analytics' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { features = [], bbox } = body;
      if (!bbox) {
        return sendJson(res, 400, { success: false, error: 'bbox is required' });
      }
      const analytics = computeAnalytics(features, bbox);
      return sendJson(res, 200, { success: true, analytics });
    }

    // 6. Export GeoJSON
    if (pathname === '/api/export/geojson' && method === 'POST') {
      const body = await parseJsonBody(req);
      const features = body.features || [];
      const geojson = featuresToGeoJSON(features);
      const payload = JSON.stringify(geojson, null, 2);

      res.writeHead(200, {
        'Content-Type': 'application/geo+json',
        'Content-Disposition': 'attachment; filename="osm_features.geojson"',
        'Content-Length': Buffer.byteLength(payload)
      });
      return res.end(payload);
    }

    // 7. Export CSV
    if (pathname === '/api/export/csv' && method === 'POST') {
      const body = await parseJsonBody(req);
      const features = body.features || [];
      const csv = featuresToCSV(features);

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=UTF-8',
        'Content-Disposition': 'attachment; filename="osm_features.csv"',
        'Content-Length': Buffer.byteLength(csv)
      });
      return res.end(csv);
    }

    // Serve static frontend files
    return serveStatic(req, res);
  } catch (err) {
    console.error('Unhandled server error:', err);
    return sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
  }
});

const isMainProcess = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainProcess) {
  server.listen(PORT, () => {
    console.log(`\n===========================================================`);
    console.log(`🚀 OpenStreetMap Data Science Dashboard is running!`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📡 Overpass categories and spatial analytics engine active.`);
    console.log(`===========================================================\n`);
  });
}

export default server;
