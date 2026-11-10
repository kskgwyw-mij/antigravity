/**
 * Overpass API Client & Query Builder
 */

export const CATEGORIES = {
  food_drink: {
    id: 'food_drink',
    label: 'Food & Drink',
    icon: '🍽️',
    color: '#f59e0b',
    description: 'Restaurants, cafes, bars, pubs, fast food & bakeries',
    queryFragment: 'nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten|food_court)$"]'
  },
  healthcare: {
    id: 'healthcare',
    label: 'Healthcare',
    icon: '🏥',
    color: '#ef4444',
    description: 'Hospitals, clinics, pharmacies, doctors & dentists',
    queryFragment: 'nwr["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist)$"]'
  },
  education: {
    id: 'education',
    label: 'Education',
    icon: '🎓',
    color: '#3b82f6',
    description: 'Schools, universities, colleges, kindergartens & libraries',
    queryFragment: 'nwr["amenity"~"^(school|university|college|kindergarten|library)$"]'
  },
  transport: {
    id: 'transport',
    label: 'Transport',
    icon: '🚆',
    color: '#8b5cf6',
    description: 'Bus stops, train/metro stations, bike rental & parking',
    queryFragment: '(nwr["highway"="bus_stop"]; nwr["amenity"~"^(bicycle_rental|parking|charging_station)$"]; nwr["railway"~"^(station|subway_entrance|tram_stop)$"];)'
  },
  leisure: {
    id: 'leisure',
    label: 'Leisure & Parks',
    icon: '🌳',
    color: '#10b981',
    description: 'Parks, playgrounds, sports centres, pitches & fitness',
    queryFragment: 'nwr["leisure"~"^(park|playground|sports_centre|pitch|fitness_centre|garden|nature_reserve)$"]'
  },
  shops: {
    id: 'shops',
    label: 'Shops & Retail',
    icon: '🛍️',
    color: '#06b6d4',
    description: 'Supermarkets, convenience, fashion, malls & bookshops',
    queryFragment: 'nwr["shop"~"^(supermarket|convenience|bakery|clothes|mall|department_store|books|chemist|electronics)$"]'
  },
  tourism: {
    id: 'tourism',
    label: 'Tourism & Culture',
    icon: '🏛️',
    color: '#ec4899',
    description: 'Museums, hotels, viewpoints, attractions, theatres & cinemas',
    queryFragment: '(nwr["tourism"~"^(museum|hotel|attraction|artwork|gallery|viewpoint)$"]; nwr["amenity"~"^(theatre|cinema|arts_centre)$"];)'
  },
  services: {
    id: 'services',
    label: 'Public Services',
    icon: '⚡',
    color: '#eab308',
    description: 'Banks, ATMs, post offices, police & fire stations',
    queryFragment: 'nwr["amenity"~"^(bank|atm|post_office|police|fire_station|townhall|courthouse)$"]'
  }
};

export const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

/**
 * Builds an Overpass QL string for the given bounding box and category keys
 * bbox = [south, west, north, east]
 */
export function buildOverpassQL(bbox, categoryKeys = [], options = {}) {
  const [south, west, north, east] = bbox.map(n => Number(n).toFixed(6));
  const timeout = options.timeout || 25;
  const limit = options.limit || 1500;

  const validCategories = (categoryKeys.length === 0 ? Object.keys(CATEGORIES) : categoryKeys)
    .filter(k => CATEGORIES[k]);

  if (validCategories.length === 0) {
    throw new Error('No valid categories selected');
  }

  const bboxFilter = `(${south},${west},${north},${east})`;
  const parts = [];

  for (const catKey of validCategories) {
    const cat = CATEGORIES[catKey];
    if (cat.queryFragment.startsWith('(') && cat.queryFragment.endsWith(';)')) {
      // composite sub-queries
      const inner = cat.queryFragment.slice(1, -2);
      const subQueries = inner.split(';').map(s => s.trim()).filter(Boolean);
      for (const sq of subQueries) {
        parts.push(`  ${sq}${bboxFilter};`);
      }
    } else {
      parts.push(`  ${cat.queryFragment}${bboxFilter};`);
    }
  }

  return `[out:json][timeout:${timeout}];
(
${parts.join('\n')}
);
out center ${limit} tags;`;
}

/**
 * Categorize a raw OSM element based on its tags
 */
export function categorizeElement(element) {
  const tags = element.tags || {};
  const amenity = tags.amenity || '';
  const shop = tags.shop || '';
  const leisure = tags.leisure || '';
  const tourism = tags.tourism || '';
  const highway = tags.highway || '';
  const railway = tags.railway || '';

  if (/^(restaurant|cafe|fast_food|bar|pub|ice_cream|biergarten|food_court)$/.test(amenity)) {
    return { category: 'food_drink', primaryTag: `amenity=${amenity}` };
  }
  if (/^(hospital|clinic|pharmacy|doctors|dentist)$/.test(amenity)) {
    return { category: 'healthcare', primaryTag: `amenity=${amenity}` };
  }
  if (/^(school|university|college|kindergarten|library)$/.test(amenity)) {
    return { category: 'education', primaryTag: `amenity=${amenity}` };
  }
  if (highway === 'bus_stop' || /^(bicycle_rental|parking|charging_station)$/.test(amenity) || /^(station|subway_entrance|tram_stop)$/.test(railway)) {
    const tag = railway ? `railway=${railway}` : (highway ? `highway=${highway}` : `amenity=${amenity}`);
    return { category: 'transport', primaryTag: tag };
  }
  if (/^(park|playground|sports_centre|pitch|fitness_centre|garden|nature_reserve)$/.test(leisure)) {
    return { category: 'leisure', primaryTag: `leisure=${leisure}` };
  }
  if (shop) {
    return { category: 'shops', primaryTag: `shop=${shop}` };
  }
  if (tourism || /^(theatre|cinema|arts_centre)$/.test(amenity)) {
    const tag = tourism ? `tourism=${tourism}` : `amenity=${amenity}`;
    return { category: 'tourism', primaryTag: tag };
  }
  if (/^(bank|atm|post_office|police|fire_station|townhall|courthouse)$/.test(amenity)) {
    return { category: 'services', primaryTag: `amenity=${amenity}` };
  }

  // Fallback
  return { category: 'services', primaryTag: Object.keys(tags)[0] ? `${Object.keys(tags)[0]}=${Object.values(tags)[0]}` : 'osm=feature' };
}

/**
 * Standardize an Overpass raw element into a clean POI feature
 */
export function normalizeElement(elem) {
  const lat = elem.lat !== undefined ? elem.lat : (elem.center ? elem.center.lat : null);
  const lon = elem.lon !== undefined ? elem.lon : (elem.center ? elem.center.lon : null);

  if (lat === null || lon === null) return null;

  const tags = elem.tags || {};
  const { category, primaryTag } = categorizeElement(elem);
  const catDef = CATEGORIES[category] || CATEGORIES.services;

  const name = tags.name || tags['name:en'] || tags.operator || tags.brand || `${catDef.label} (${primaryTag.split('=')[1] || 'POI'})`;

  return {
    id: `${elem.type}/${elem.id}`,
    osmId: elem.id,
    osmType: elem.type,
    lat,
    lon,
    name,
    category,
    categoryLabel: catDef.label,
    icon: catDef.icon,
    color: catDef.color,
    primaryTag,
    tags
  };
}

/**
 * Execute Overpass query across mirrors with failover
 */
export async function executeOverpassQuery(qlQuery, signal = null) {
  let lastError = null;

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const res = await fetch(mirror, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'OpenStreetMap-DataScience-Dashboard/1.0 (Node.js)'
        },
        body: 'data=' + encodeURIComponent(qlQuery),
        signal: signal || controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Mirror ${mirror} responded with HTTP ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      return {
        mirror,
        elements: json.elements || [],
        timestamp: json.osm3s?.timestamp_osm_base || new Date().toISOString()
      };
    } catch (err) {
      lastError = err;
      // Try next mirror
    }
  }

  throw lastError || new Error('All Overpass mirrors failed or timed out');
}
