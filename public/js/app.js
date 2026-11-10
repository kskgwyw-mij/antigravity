/**
 * OpenStreetMap & Data Science Dashboard Application Controller
 */

import { apiClient } from './api.js';
import { MapManager } from './map.js';
import { SpatialCharts } from './charts.js';

class AppController {
  constructor() {
    this.categories = [];
    this.selectedCategories = new Set();
    this.currentFeatures = [];
    this.currentAnalytics = null;
    this.currentBbox = null;
    this.autoQuery = false;
    this.useMock = false;
    this.categoryColorMap = {};

    this.mapManager = null;
    this.init();
  }

  async init() {
    this.initElements();
    this.initTabs();

    // Initialize Map with viewport and basemap listeners
    this.mapManager = new MapManager(
      'map',
      (bbox) => this.handleViewportChange(bbox),
      (basemapKey) => this.handleBasemapChange(basemapKey)
    );

    if (this.elBasemapSelect) {
      this.elBasemapSelect.value = this.mapManager.currentBasemapKey;
    }

    this.bindEvents();

    this.currentBbox = this.mapManager.getViewportBbox();
    this.updateBboxDisplay(this.currentBbox);

    // Load Categories & Cities
    await Promise.all([
      this.loadCategories(),
      this.loadCities()
    ]);

    // Initial Query (Amsterdam Center by default)
    this.executeQuery();
  }

  initElements() {
    this.elCategoryList = document.getElementById('category-list');
    this.elBtnQuery = document.getElementById('btn-query');
    this.elAutoQueryToggle = document.getElementById('toggle-auto-query');
    this.elMockToggle = document.getElementById('toggle-mock');
    this.elCitySelect = document.getElementById('city-select');
    this.elBasemapSelect = document.getElementById('basemap-select');
    this.elToast = document.getElementById('toast');
    this.elTableSearch = document.getElementById('table-search');
    this.elTableBody = document.getElementById('table-body');
    this.elQlCode = document.getElementById('ql-code');
    this.elBtnCopyQl = document.getElementById('btn-copy-ql');
    this.elBtnExportGeoJSON = document.getElementById('btn-export-geojson');
    this.elBtnExportCSV = document.getElementById('btn-export-csv');

    // KPI Elements
    this.kpiTotal = document.getElementById('kpi-total');
    this.kpiArea = document.getElementById('kpi-area');
    this.kpiDensity = document.getElementById('kpi-density');
    this.kpiDiversity = document.getElementById('kpi-diversity');
    this.kpiCompleteness = document.getElementById('kpi-completeness');
    this.kpiTopCat = document.getElementById('kpi-top-cat');

    // Quadrants
    this.quadrantGrid = document.getElementById('quadrant-grid');
  }

  initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.dataset.tab;
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        // Re-render charts when switching back to analytics tab
        if (targetId === 'tab-analytics' && this.currentAnalytics) {
          this.renderAnalyticsCharts();
        }
      });
    });
  }

  bindEvents() {
    this.elBtnQuery.addEventListener('click', () => this.executeQuery());

    this.elAutoQueryToggle.addEventListener('change', (e) => {
      this.autoQuery = e.target.checked;
      if (this.autoQuery) this.executeQuery();
    });

    this.elMockToggle.addEventListener('change', (e) => {
      this.useMock = e.target.checked;
      this.showToast(this.useMock ? 'Offline Demo Mode enabled' : 'Live Overpass Mode enabled', 'info');
      this.executeQuery();
    });

    if (this.elBasemapSelect) {
      this.elBasemapSelect.addEventListener('change', (e) => {
        const key = e.target.value;
        this.mapManager.setBasemap(key);
        const label = this.elBasemapSelect.options[this.elBasemapSelect.selectedIndex]?.text || key;
        this.showToast(`Basemap switched to ${label}`);
      });
    }

    document.getElementById('btn-select-all').addEventListener('click', () => {
      this.categories.forEach(c => this.selectedCategories.add(c.id));
      this.renderCategoryList();
      this.executeQuery();
    });

    document.getElementById('btn-clear-all').addEventListener('click', () => {
      this.selectedCategories.clear();
      this.renderCategoryList();
      this.executeQuery();
    });

    this.elTableSearch.addEventListener('input', (e) => {
      this.filterTable(e.target.value);
    });

    this.elBtnCopyQl.addEventListener('click', () => {
      navigator.clipboard.writeText(this.elQlCode.textContent);
      this.showToast('Overpass QL copied to clipboard');
    });

    this.elBtnExportGeoJSON.addEventListener('click', () => {
      apiClient.exportGeoJSON(this.currentFeatures);
    });

    this.elBtnExportCSV.addEventListener('click', () => {
      apiClient.exportCSV(this.currentFeatures);
    });

    window.addEventListener('resize', () => {
      if (this.currentAnalytics) {
        this.renderAnalyticsCharts();
      }
    });
  }

  handleBasemapChange(key) {
    if (this.elBasemapSelect && this.elBasemapSelect.value !== key) {
      this.elBasemapSelect.value = key;
    }
  }

  async loadCategories() {
    try {
      const data = await apiClient.getCategories();
      if (data.success) {
        this.categories = data.categories;
        this.categories.forEach(c => {
          this.selectedCategories.add(c.id);
          this.categoryColorMap[c.id] = c.color;
        });
        this.renderCategoryList();
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  async loadCities() {
    try {
      const data = await apiClient.getCities();
      if (data.success && this.elCitySelect) {
        this.elCitySelect.innerHTML = '';
        for (const [key, city] of Object.entries(data.cities)) {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = city.name;
          this.elCitySelect.appendChild(opt);
        }

        this.elCitySelect.addEventListener('change', (e) => {
          const selected = data.cities[e.target.value];
          if (selected) {
            this.mapManager.setViewport(selected.bbox);
          }
        });
      }
    } catch (err) {
      console.error('Failed to load cities:', err);
    }
  }

  renderCategoryList() {
    this.elCategoryList.innerHTML = '';
    const categoryCounts = {};
    if (this.currentFeatures) {
      for (const f of this.currentFeatures) {
        categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
      }
    }

    for (const cat of this.categories) {
      const isSelected = this.selectedCategories.has(cat.id);
      const item = document.createElement('div');
      item.className = `category-item ${isSelected ? 'active' : ''}`;

      const count = categoryCounts[cat.id] || 0;

      item.innerHTML = `
        <div class="category-left">
          <span class="category-color-dot" style="background-color: ${cat.color};"></span>
          <span style="font-size: 14px;">${cat.icon}</span>
          <span class="category-name">${cat.label}</span>
        </div>
        <span class="category-count">${count}</span>
      `;

      item.addEventListener('click', () => {
        if (this.selectedCategories.has(cat.id)) {
          this.selectedCategories.delete(cat.id);
        } else {
          this.selectedCategories.add(cat.id);
        }
        this.renderCategoryList();
        this.executeQuery();
      });

      this.elCategoryList.appendChild(item);
    }
  }

  handleViewportChange(bbox) {
    this.currentBbox = bbox;
    this.updateBboxDisplay(bbox);
    if (this.autoQuery) {
      this.executeQuery();
    }
  }

  updateBboxDisplay(bbox) {
    const [south, west, north, east] = bbox;
    document.getElementById('bbox-south').textContent = south.toFixed(4);
    document.getElementById('bbox-west').textContent = west.toFixed(4);
    document.getElementById('bbox-north').textContent = north.toFixed(4);
    document.getElementById('bbox-east').textContent = east.toFixed(4);

    const latSpanKm = Math.abs(north - south) * 111;
    const lonSpanKm = Math.abs(east - west) * 111 * Math.cos(((north + south) / 2) * Math.PI / 180);
    const approxArea = (latSpanKm * lonSpanKm).toFixed(2);
    document.getElementById('pill-area').textContent = `${approxArea} km²`;
  }

  async executeQuery() {
    if (!this.currentBbox) return;

    this.elBtnQuery.disabled = true;
    this.elBtnQuery.innerHTML = `<span>⏳</span> Querying...`;

    try {
      const res = await apiClient.queryOverpass({
        bbox: this.currentBbox,
        categories: Array.from(this.selectedCategories),
        useMock: this.useMock
      });

      if (res.success) {
        this.currentFeatures = res.features || [];
        this.currentAnalytics = res.analytics;

        // Draw bbox outline & render features on map
        this.mapManager.drawBboxOverlay(this.currentBbox);
        this.mapManager.renderFeatures(this.currentFeatures);

        // Update Overpass QL display
        if (res.qlQuery) {
          this.elQlCode.textContent = res.qlQuery;
        }

        // Update KPIs and Data Science widgets
        this.updateKpis(res.analytics, res.count);
        this.renderAnalyticsCharts();
        this.renderQuadrants(res.analytics?.quadrants);
        this.renderCompleteness(res.analytics?.completeness);
        this.renderTable(this.currentFeatures);
        this.renderCategoryList();

        const timeStr = res.executionTimeMs ? ` in ${res.executionTimeMs}ms` : '';
        const sourceStr = res.cached ? ' [Cached]' : (res.mode === 'offline_fallback' ? ' [Offline Demo]' : '');
        this.showToast(`Loaded ${res.count} features${timeStr}${sourceStr}`);
      } else {
        this.showToast(res.error || 'Query failed', 'error');
      }
    } catch (err) {
      this.showToast(`Query error: ${err.message}`, 'error');
    } finally {
      this.elBtnQuery.disabled = false;
      this.elBtnQuery.innerHTML = `<span>🔍</span> Query Visible Area`;
    }
  }

  updateKpis(analytics, totalCount) {
    if (!analytics) return;

    this.kpiTotal.textContent = totalCount;
    this.kpiArea.textContent = analytics.spatial.areaKm2;
    this.kpiDensity.textContent = analytics.spatial.densityPerKm2;
    this.kpiDiversity.textContent = analytics.diversity.normalizedScore;
    this.kpiCompleteness.textContent = `${analytics.completeness.overallScore}%`;

    const topCat = analytics.categoryBreakdown?.[0]?.category || 'N/A';
    this.kpiTopCat.textContent = topCat.replace('_', ' ');
  }

  renderAnalyticsCharts() {
    if (!this.currentAnalytics) return;
    SpatialCharts.renderCategoryDonut('chart-category', this.currentAnalytics.categoryBreakdown, this.categoryColorMap);
    SpatialCharts.renderSubtagBars('chart-subtags', this.currentAnalytics.topSubtags);
  }

  renderQuadrants(quadrants) {
    if (!quadrants || !this.quadrantGrid) return;
    this.quadrantGrid.innerHTML = '';

    const densest = [...quadrants].sort((a, b) => b.density - a.density)[0];

    for (const q of quadrants) {
      const isDensest = densest && densest.id === q.id && q.count > 0;
      const cell = document.createElement('div');
      cell.className = `quadrant-cell ${isDensest ? 'densest' : ''}`;
      cell.innerHTML = `
        <div class="quadrant-name">${q.label}</div>
        <div class="quadrant-count">${q.count}</div>
        <div class="quadrant-density">${q.density} POIs/km² (${q.pct}%)</div>
      `;
      this.quadrantGrid.appendChild(cell);
    }
  }

  renderCompleteness(completeness) {
    if (!completeness) return;

    const setBar = (id, pct) => {
      const fill = document.getElementById(`comp-fill-${id}`);
      const val = document.getElementById(`comp-val-${id}`);
      if (fill) fill.style.width = `${pct}%`;
      if (val) val.textContent = `${pct}%`;
    };

    setBar('name', completeness.hasNamePct);
    setBar('address', completeness.hasAddressPct);
    setBar('hours', completeness.hasOpeningHoursPct);
    setBar('wheelchair', completeness.hasWheelchairPct);
    setBar('contact', completeness.hasContactPct);
  }

  renderTable(features) {
    if (!this.elTableBody) return;
    this.elTableBody.innerHTML = '';

    for (const f of features) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${f.name}</td>
        <td><span style="color:${f.color}; font-weight: 500;">${f.categoryLabel}</span></td>
        <td style="font-family: monospace; color: #94a3b8;">${f.primaryTag}</td>
        <td style="font-family: monospace;">${f.lat.toFixed(4)}, ${f.lon.toFixed(4)}</td>
      `;

      tr.addEventListener('click', () => {
        this.mapManager.highlightFeature(f.id);
      });

      this.elTableBody.appendChild(tr);
    }
  }

  filterTable(query) {
    const q = (query || '').toLowerCase().trim();
    const rows = this.elTableBody.querySelectorAll('tr');
    rows.forEach(r => {
      const text = r.textContent.toLowerCase();
      r.style.display = text.includes(q) ? '' : 'none';
    });
  }

  showToast(message, type = 'info') {
    if (!this.elToast) return;
    this.elToast.textContent = message;
    this.elToast.className = `toast-msg show ${type}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.elToast.classList.remove('show');
    }, 3500);
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  new AppController();
});
