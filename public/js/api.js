/**
 * API Client with backend caching & direct browser Overpass fallback
 */

const OVERPASS_PUBLIC_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

export const apiClient = {
  async getCategories() {
    const res = await fetch('/api/categories');
    return res.json();
  },

  async getCities() {
    const res = await fetch('/api/cities');
    return res.json();
  },

  async queryOverpass({ bbox, categories, useMock = false, customQL = null }) {
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox, categories, useMock, customQL })
      });
      return await res.json();
    } catch (err) {
      console.warn('Backend query error, attempting direct browser query:', err);
      return this.directBrowserQuery(bbox, categories);
    }
  },

  /**
   * Browser-direct Overpass query as fallback if backend is sandboxed
   */
  async directBrowserQuery(bbox, categories) {
    const [south, west, north, east] = bbox;
    const catQuery = `
      [out:json][timeout:25];
      (
        nwr["amenity"](${south},${west},${north},${east});
        nwr["shop"](${south},${west},${north},${east});
        nwr["leisure"](${south},${west},${north},${east});
        nwr["tourism"](${south},${west},${north},${east});
      );
      out center 500 tags;
    `;

    for (const mirror of OVERPASS_PUBLIC_MIRRORS) {
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: 'data=' + encodeURIComponent(catQuery)
        });
        if (res.ok) {
          const json = await res.json();
          // Send to backend for analytics processing
          const analyticsRes = await fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ features: json.elements, bbox })
          });
          const analytics = (await analyticsRes.json()).analytics;
          return {
            success: true,
            mode: 'browser_direct',
            elements: json.elements,
            count: json.elements.length,
            analytics,
            qlQuery: catQuery
          };
        }
      } catch (e) {
        // next mirror
      }
    }
    throw new Error('Could not query Overpass API from browser or backend');
  },

  async exportGeoJSON(features) {
    const res = await fetch('/api/export/geojson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features })
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osm_features_${Date.now()}.geojson`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async exportCSV(features) {
    const res = await fetch('/api/export/csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features })
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osm_features_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
