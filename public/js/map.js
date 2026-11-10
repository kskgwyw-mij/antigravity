/**
 * Leaflet Map Controller with POI rendering, viewport management, and multi-basemap support
 */

export const BASEMAPS = {
  dark: {
    id: 'dark',
    name: 'CARTO Dark Matter',
    label: '🌙 Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }
  },
  voyager: {
    id: 'voyager',
    name: 'CARTO Voyager',
    label: '🧭 Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }
  },
  light: {
    id: 'light',
    name: 'CARTO Positron Light',
    label: '☀️ Positron Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap Standard',
    label: '🌍 OSM Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }
  },
  satellite: {
    id: 'satellite',
    name: 'Esri World Imagery',
    label: '🛰️ Satellite (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19
    }
  },
  topo: {
    id: 'topo',
    name: 'OpenTopoMap',
    label: '⛰️ Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    options: {
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17
    }
  }
};

export class MapManager {
  constructor(mapContainerId, onViewportChange, onBasemapChange = null) {
    this.mapContainerId = mapContainerId;
    this.onViewportChange = onViewportChange;
    this.onBasemapChange = onBasemapChange;
    this.map = null;
    this.markersLayer = null;
    this.bboxLayer = null;
    this.features = [];
    this.markerMap = new Map();

    const savedBasemap = typeof localStorage !== 'undefined' ? localStorage.getItem('osm_dashboard_basemap') : null;
    this.currentBasemapKey = (savedBasemap && BASEMAPS[savedBasemap]) ? savedBasemap : 'dark';
    this.activeTileLayer = null;
    this.tileLayers = {};
    this.layerControl = null;

    this.initMap();
  }

  initMap() {
    // Default to Amsterdam center
    this.map = L.map(this.mapContainerId, {
      center: [52.3702, 4.8952],
      zoom: 15,
      zoomControl: true
    });

    // Initialize all basemap tile layers
    for (const [key, cfg] of Object.entries(BASEMAPS)) {
      this.tileLayers[key] = L.tileLayer(cfg.url, cfg.options);
    }

    // Add active basemap layer
    this.activeTileLayer = this.tileLayers[this.currentBasemapKey];
    this.activeTileLayer.addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.bboxLayer = L.layerGroup().addTo(this.map);

    // Setup Leaflet standard Layer Control
    const baseLayersControl = {};
    for (const [key, cfg] of Object.entries(BASEMAPS)) {
      baseLayersControl[cfg.label] = this.tileLayers[key];
    }
    const overlayLayersControl = {
      '<span style="color:#38bdf8; font-weight:600;">Analysis Bounding Box</span>': this.bboxLayer,
      '<span style="font-weight:600;">POI Markers</span>': this.markersLayer
    };

    this.layerControl = L.control.layers(baseLayersControl, overlayLayersControl, {
      position: 'topright',
      collapsed: true
    }).addTo(this.map);

    // Sync when user changes basemap via Leaflet layer control
    this.map.on('baselayerchange', (e) => {
      for (const [key, layer] of Object.entries(this.tileLayers)) {
        if (layer === e.layer) {
          this.currentBasemapKey = key;
          this.activeTileLayer = layer;
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('osm_dashboard_basemap', key);
          }
          if (typeof this.onBasemapChange === 'function') {
            this.onBasemapChange(key);
          }
          break;
        }
      }
    });

    // Viewport change debouncer
    let timeout = null;
    this.map.on('moveend', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (typeof this.onViewportChange === 'function') {
          this.onViewportChange(this.getViewportBbox());
        }
      }, 350);
    });
  }

  setBasemap(key) {
    if (!BASEMAPS[key] || !this.tileLayers[key]) return;
    if (this.currentBasemapKey === key && this.map.hasLayer(this.tileLayers[key])) return;

    if (this.activeTileLayer && this.map.hasLayer(this.activeTileLayer)) {
      this.map.removeLayer(this.activeTileLayer);
    }

    this.currentBasemapKey = key;
    this.activeTileLayer = this.tileLayers[key];
    this.activeTileLayer.addTo(this.map);
    this.activeTileLayer.bringToBack();

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('osm_dashboard_basemap', key);
    }

    if (typeof this.onBasemapChange === 'function') {
      this.onBasemapChange(key);
    }
  }

  getViewportBbox() {
    const bounds = this.map.getBounds();
    return [
      Number(bounds.getSouth().toFixed(6)),
      Number(bounds.getWest().toFixed(6)),
      Number(bounds.getNorth().toFixed(6)),
      Number(bounds.getEast().toFixed(6))
    ];
  }

  setViewport(bbox, zoom = null) {
    const [south, west, north, east] = bbox;
    const bounds = L.latLngBounds([south, west], [north, east]);
    if (zoom) {
      this.map.setView([(south + north) / 2, (west + east) / 2], zoom);
    } else {
      this.map.fitBounds(bounds, { padding: [30, 30] });
    }
  }

  drawBboxOverlay(bbox) {
    this.bboxLayer.clearLayers();
    const [south, west, north, east] = bbox;
    const rect = L.rectangle([[south, west], [north, east]], {
      color: '#38bdf8',
      weight: 2,
      opacity: 0.8,
      fillColor: '#38bdf8',
      fillOpacity: 0.04,
      dashArray: '5, 5'
    });
    this.bboxLayer.addLayer(rect);
  }

  renderFeatures(features) {
    this.features = features || [];
    this.markersLayer.clearLayers();
    this.markerMap.clear();

    for (const f of this.features) {
      if (!f.lat || !f.lon) continue;

      const marker = this.createPoiMarker(f);
      this.markersLayer.addLayer(marker);
      this.markerMap.set(f.id, marker);
    }
  }

  createPoiMarker(f) {
    const iconHtml = `<div class="custom-poi-marker" style="background-color: ${f.color || '#38bdf8'}; width: 26px; height: 26px;">
      <span style="font-size: 13px;">${f.icon || '📍'}</span>
    </div>`;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'poi-div-icon',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -14]
    });

    const marker = L.marker([f.lat, f.lon], { icon });

    const popupContent = this.buildPopupHtml(f);
    marker.bindPopup(popupContent, { maxWidth: 320 });

    return marker;
  }

  buildPopupHtml(f) {
    const tags = f.tags || {};
    const osmUrl = `https://www.openstreetmap.org/${f.osmType}/${f.osmId}`;

    let details = '';
    if (tags.opening_hours) {
      details += `<div class="popup-tag-row"><span class="popup-tag-key">Hours:</span><span class="popup-tag-val">${tags.opening_hours}</span></div>`;
    }
    if (tags.wheelchair) {
      details += `<div class="popup-tag-row"><span class="popup-tag-key">Wheelchair:</span><span class="popup-tag-val">${tags.wheelchair}</span></div>`;
    }
    if (tags.phone || tags['contact:phone']) {
      details += `<div class="popup-tag-row"><span class="popup-tag-key">Phone:</span><span class="popup-tag-val">${tags.phone || tags['contact:phone']}</span></div>`;
    }
    if (tags.website || tags['contact:website']) {
      const site = tags.website || tags['contact:website'];
      details += `<div class="popup-tag-row"><span class="popup-tag-key">Website:</span><span class="popup-tag-val"><a href="${site}" target="_blank" style="color:#38bdf8;">Link</a></span></div>`;
    }

    return `
      <div style="font-family: sans-serif; line-height: 1.4;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
          <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #fff;">${f.name}</h4>
          <span style="background: ${f.color}22; color: ${f.color}; border: 1px solid ${f.color}66; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
            ${f.categoryLabel}
          </span>
        </div>
        <div style="font-size: 11px; color: #94a3b8; font-family: monospace; margin-bottom: 8px;">
          ${f.primaryTag}
        </div>
        ${details ? `<div style="margin: 6px 0; background: #0f172a; padding: 6px 8px; border-radius: 4px;">${details}</div>` : ''}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 11px; color: #64748b;">
          <span>Coords: ${f.lat.toFixed(4)}, ${f.lon.toFixed(4)}</span>
          <a href="${osmUrl}" target="_blank" style="color: #38bdf8; text-decoration: none; font-weight: 600;">View on OSM &rarr;</a>
        </div>
      </div>
    `;
  }

  highlightFeature(featureId) {
    const marker = this.markerMap.get(featureId);
    if (marker) {
      this.map.panTo(marker.getLatLng(), { animate: true });
      marker.openPopup();
    }
  }
}
