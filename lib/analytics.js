/**
 * Spatial Analytics & Data Science computations for OSM features
 */

/**
 * Calculate area in square kilometers of a bounding box [south, west, north, east]
 */
export function calculateBboxArea(bbox) {
  const [south, west, north, east] = bbox.map(Number);
  const R = 6371; // Earth's mean radius in km

  const latDiffRad = (north - south) * (Math.PI / 180);
  const lonDiffRad = (east - west) * (Math.PI / 180);
  const meanLatRad = ((north + south) / 2) * (Math.PI / 180);

  const heightKm = latDiffRad * R;
  const widthKm = lonDiffRad * R * Math.cos(meanLatRad);

  const area = Math.abs(heightKm * widthKm);
  return {
    areaKm2: Number(area.toFixed(4)),
    widthKm: Number(widthKm.toFixed(3)),
    heightKm: Number(heightKm.toFixed(3)),
    centerLat: Number(((north + south) / 2).toFixed(6)),
    centerLon: Number(((east + west) / 2).toFixed(6))
  };
}

/**
 * Haversine distance between two coordinates in kilometers
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Compute comprehensive data science metrics on normalized POI features
 */
export function computeAnalytics(features, bbox) {
  const total = features.length;
  const spatial = calculateBboxArea(bbox);
  const density = spatial.areaKm2 > 0 ? Number((total / spatial.areaKm2).toFixed(2)) : 0;

  // 1. Category Distribution
  const categoryCounts = {};
  const subtagCounts = {};
  let namedCount = 0;
  let addressCount = 0;
  let hoursCount = 0;
  let wheelchairCount = 0;
  let contactCount = 0;

  const [south, west, north, east] = bbox.map(Number);
  const midLat = (north + south) / 2;
  const midLon = (east + west) / 2;

  const quadrants = {
    NW: { label: 'North-West', count: 0, bounds: [midLat, west, north, midLon] },
    NE: { label: 'North-East', count: 0, bounds: [midLat, midLon, north, east] },
    SW: { label: 'South-West', count: 0, bounds: [south, west, midLat, midLon] },
    SE: { label: 'South-East', count: 0, bounds: [south, midLon, midLat, east] }
  };

  let totalDistToCenter = 0;

  for (const f of features) {
    // Category tally
    categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;

    // Subtag tally (e.g. amenity=cafe, shop=supermarket)
    const tagKey = f.primaryTag || 'unknown';
    subtagCounts[tagKey] = (subtagCounts[tagKey] || 0) + 1;

    // Metadata completeness
    const tags = f.tags || {};
    if (tags.name || tags['name:en']) namedCount++;
    if (tags['addr:street'] || tags['addr:housenumber'] || tags['addr:city'] || tags['addr:postcode']) addressCount++;
    if (tags.opening_hours) hoursCount++;
    if (tags.wheelchair) wheelchairCount++;
    if (tags.website || tags.phone || tags['contact:phone'] || tags['contact:website']) contactCount++;

    // Spatial quadrant allocation
    const isNorth = f.lat >= midLat;
    const isEast = f.lon >= midLon;
    if (isNorth && !isEast) quadrants.NW.count++;
    else if (isNorth && isEast) quadrants.NE.count++;
    else if (!isNorth && !isEast) quadrants.SW.count++;
    else quadrants.SE.count++;

    // Distance to center
    totalDistToCenter += haversineDistance(spatial.centerLat, spatial.centerLon, f.lat, f.lon);
  }

  // Shannon Entropy and Simpson Diversity
  const catEntries = Object.entries(categoryCounts);
  let shannonEntropy = 0;
  let simpsonSum = 0;

  if (total > 0) {
    for (const [, count] of catEntries) {
      const p = count / total;
      if (p > 0) {
        shannonEntropy -= p * Math.log(p);
        simpsonSum += p * p;
      }
    }
  }

  const numCategories = catEntries.length;
  const maxEntropy = numCategories > 1 ? Math.log(numCategories) : 1;
  const normalizedDiversity = maxEntropy > 0 ? Number((shannonEntropy / maxEntropy).toFixed(3)) : 0;
  const simpsonDiversity = Number((1 - simpsonSum).toFixed(3));

  // Top sub-tags
  const topSubtags = Object.entries(subtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({
      tag,
      display: tag.replace('=', ': '),
      count,
      pct: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
    }));

  // Quadrant distribution percentages and quadrant densities
  const quadrantArea = spatial.areaKm2 / 4;
  const quadrantAnalysis = Object.entries(quadrants).map(([key, q]) => ({
    id: key,
    label: q.label,
    count: q.count,
    pct: total > 0 ? Number(((q.count / total) * 100).toFixed(1)) : 0,
    density: quadrantArea > 0 ? Number((q.count / quadrantArea).toFixed(2)) : 0
  }));

  // Find densest quadrant
  const densestQuadrant = [...quadrantAnalysis].sort((a, b) => b.density - a.density)[0] || null;

  // Metadata completeness report
  const completeness = {
    hasNamePct: total > 0 ? Number(((namedCount / total) * 100).toFixed(1)) : 0,
    hasAddressPct: total > 0 ? Number(((addressCount / total) * 100).toFixed(1)) : 0,
    hasOpeningHoursPct: total > 0 ? Number(((hoursCount / total) * 100).toFixed(1)) : 0,
    hasWheelchairPct: total > 0 ? Number(((wheelchairCount / total) * 100).toFixed(1)) : 0,
    hasContactPct: total > 0 ? Number(((contactCount / total) * 100).toFixed(1)) : 0,
    overallScore: total > 0
      ? Number((((namedCount + addressCount + hoursCount + wheelchairCount + contactCount) / (total * 5)) * 100).toFixed(1))
      : 0
  };

  const avgDistanceToCenterKm = total > 0 ? Number((totalDistToCenter / total).toFixed(3)) : 0;

  return {
    featureCount: total,
    spatial: {
      ...spatial,
      densityPerKm2: density,
      avgDistanceToCenterKm
    },
    diversity: {
      shannonEntropy: Number(shannonEntropy.toFixed(3)),
      normalizedScore: normalizedDiversity, // 0 = monoculture, 1 = perfectly balanced
      simpsonDiversity,
      categoryCount: numCategories
    },
    categoryBreakdown: catEntries.map(([cat, count]) => ({
      category: cat,
      count,
      pct: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.count - a.count),
    topSubtags,
    quadrants: quadrantAnalysis,
    densestQuadrant,
    completeness
  };
}

/**
 * Convert POI features to standard GeoJSON FeatureCollection
 */
export function featuresToGeoJSON(features) {
  return {
    type: 'FeatureCollection',
    features: features.map(f => ({
      type: 'Feature',
      id: f.id,
      geometry: {
        type: 'Point',
        coordinates: [f.lon, f.lat]
      },
      properties: {
        osmId: f.osmId,
        osmType: f.osmType,
        name: f.name,
        category: f.category,
        categoryLabel: f.categoryLabel,
        primaryTag: f.primaryTag,
        ...f.tags
      }
    }))
  };
}

/**
 * Convert POI features to CSV string
 */
export function featuresToCSV(features) {
  if (!features || features.length === 0) return 'osm_id,type,name,category,primary_tag,latitude,longitude\n';

  const headers = ['osm_id', 'type', 'name', 'category', 'primary_tag', 'latitude', 'longitude', 'wheelchair', 'opening_hours', 'phone', 'website'];
  const rows = [headers.join(',')];

  for (const f of features) {
    const tags = f.tags || {};
    const safeStr = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

    const row = [
      f.osmId,
      f.osmType,
      safeStr(f.name),
      f.category,
      safeStr(f.primaryTag),
      f.lat,
      f.lon,
      safeStr(tags.wheelchair),
      safeStr(tags.opening_hours),
      safeStr(tags.phone || tags['contact:phone']),
      safeStr(tags.website || tags['contact:website'])
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}
