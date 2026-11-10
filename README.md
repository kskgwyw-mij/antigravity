# OpenStreetMap Overpass Data Science Dashboard

An interactive **OpenStreetMap viewer** and **spatial data science dashboard** built with modern **Node.js (ES Modules)**. It enables real-time querying, visual exploration, and spatial statistical analysis of OpenStreetMap points of interest (POIs) across visible Overpass categories.

---

## ✨ Features

### 1. Interactive Map & Viewport Querying
- **Dynamic Bounding Box Tracking**: Automatically captures the visible map viewport (`[south, west, north, east]`) as you pan and zoom.
- **Multiple Basemap Styles**: Seamlessly switch between 6 distinct map layer styles:
  - 🌙 **CARTO Dark Matter** (modern dark-theme basemap)
  - 🧭 **CARTO Voyager** (crisp, colorful cartography)
  - ☀️ **CARTO Positron Light** (clean, high-contrast light theme)
  - 🌍 **OpenStreetMap Standard** (official detailed community styling)
  - 🛰️ **Esri World Imagery** (high-resolution satellite & aerial photography)
  - ⛰️ **OpenTopoMap** (topographic contours, relief shading & elevation)
- **Categorized Overpass QL Generator**: Generates optimized Overpass queries filtered by bounding box and selected categories.
- **Custom Map Markers**: Rendered with distinct category colors and SVG icons, spiderfy/popups containing full OSM metadata, address, contact, and direct links to OpenStreetMap.
- **Predefined Cities**: Instant navigation to Amsterdam, New York (Manhattan), Paris, and Tokyo.
- **Auto-Query Mode**: Automatically re-queries when panning or zooming completes.

### 2. Supported Overpass Categories
- 🍽️ **Food & Drink**: Restaurants, cafes, bars, pubs, fast food, bakeries, ice cream.
- 🏥 **Healthcare**: Hospitals, clinics, pharmacies, doctors, dentists.
- 🎓 **Education**: Schools, universities, colleges, kindergartens, libraries.
- 🚆 **Transport**: Train & metro stations, bus stops, tram stops, bicycle rental, EV charging stations.
- 🌳 **Leisure & Parks**: Parks, playgrounds, sports centres, fitness centres, gardens.
- 🛍️ **Shops & Retail**: Supermarkets, convenience stores, department stores, malls, clothes, bookshops.
- 🏛️ **Tourism & Culture**: Museums, hotels, attractions, artworks, galleries, theatres, cinemas.
- ⚡ **Public Services**: Banks, ATMs, post offices, police stations, fire stations, town halls.

### 3. Spatial Data Science & Statistical Metrics
- **Spatial Area & Density**: Calculates viewport surface area in $\text{km}^2$ using spherical geometry and computes POI density ($\text{POIs} / \text{km}^2$).
- **Shannon Diversity Index & Entropy**:
  $$H = -\sum_{i=1}^K p_i \ln(p_i)$$
  Quantifies the functional mix of urban amenities in the visible area (normalized $0.00$ to $1.00$).
- **Spatial Quadrant Heatmap**: Partitions the bounding box into North-West, North-East, South-West, and South-East sectors to identify clustering and urban activity cores.
- **OSM Metadata Completeness Index**: Evaluates data quality by tracking coverage of names, addresses, opening hours, wheelchair accessibility, and websites/phones.
- **Sub-tag Frequency Distribution**: Renders high-performance Canvas charts of the top amenities in the area.

### 4. High-Performance Architecture
- **Pure Node.js**: Built entirely with Node.js built-in modules (`node:http`, `node:sqlite`, `node:fs`, `node:path`, `node:url`). Zero external npm dependencies required!
- **Persistent SQLite Caching**: Caches Overpass query results with TTL using native `node:sqlite` to prevent rate-limiting and eliminate redundant requests.
- **Multi-Mirror Overpass Failover**: Automatically cascades between public Overpass instances (`overpass-api.de`, `overpass.kumi.systems`, `maps.mail.ru`).
- **Offline / Sandbox Resilience**: Includes offline demo datasets and direct-in-browser querying fallback.
- **Data Export**: One-click export to **GeoJSON** (for QGIS, Kepler.gl, GeoPandas) and **CSV** (for Pandas, Excel, R).

---

## 🚀 Quick Start

### Prerequisites
- Node.js **v22+** (tested on Node v26.12.0)

### Run the App
```bash
# Start the server
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

### Run Tests
```bash
npm test
```

---

## 📁 Project Structure

```
antigravity/
├── package.json              # App configuration and scripts
├── server.js                 # HTTP REST API server & static file routing
├── cache.sqlite              # SQLite cache database (created automatically)
├── lib/
│   ├── overpass.js           # Overpass QL generator & multi-mirror API client
│   ├── cache.js              # Native SQLite caching engine (`node:sqlite`)
│   ├── analytics.js          # Spatial math, Shannon entropy, and completeness stats
│   └── mockData.js           # Offline demo datasets for Amsterdam, NYC, Paris, Tokyo
├── public/
│   ├── index.html            # Dashboard SPA layout
│   ├── css/
│   │   └── style.css         # Modern dark-mode UI stylesheet
│   └── js/
│       ├── app.js            # Main application controller
│       ├── map.js            # Leaflet map manager, multi-basemap support & markers
│       ├── charts.js         # Zero-dependency Canvas charts (Donut & Bar)
│       └── api.js            # REST API client & browser fallback
└── tests/
    └── test_server.js        # Automated unit and integration tests
```

---

## 📡 REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/categories` | `GET` | List all available Overpass categories, colors, and icons |
| `GET /api/cities` | `GET` | List predefined demo cities and bounding boxes |
| `POST /api/query` | `POST` | Execute Overpass query with caching and analytics computation |
| `POST /api/analytics` | `POST` | Compute spatial metrics and Shannon diversity for a POI array |
| `POST /api/export/geojson` | `POST` | Convert POIs to downloadable GeoJSON FeatureCollection |
| `POST /api/export/csv` | `POST` | Convert POIs to downloadable CSV |
| `GET /api/cache/stats` | `GET` | Return cache size and hit counts |
| `POST /api/cache/clear` | `POST` | Invalidate all cached queries |
