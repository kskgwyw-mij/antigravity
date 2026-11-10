/**
 * High-quality offline demo datasets across major cities
 * Realistic coordinates, tags, and category distributions
 */

export const MOCK_CITIES = {
  amsterdam: {
    name: 'Amsterdam (Centrum & Jordaan)',
    center: [52.3702, 4.8952],
    zoom: 15,
    bbox: [52.3610, 4.8750, 52.3800, 4.9150]
  },
  manhattan: {
    name: 'New York (Midtown & Central Park South)',
    center: [40.7580, -73.9855],
    zoom: 15,
    bbox: [40.7480, -73.9980, 40.7680, -73.9700]
  },
  paris: {
    name: 'Paris (Le Marais & Île de la Cité)',
    center: [48.8566, 2.3522],
    zoom: 15,
    bbox: [48.8470, 2.3350, 48.8660, 2.3700]
  },
  tokyo: {
    name: 'Tokyo (Shibuya & Harajuku)',
    center: [35.6595, 139.7004],
    zoom: 15,
    bbox: [35.6500, 139.6900, 35.6700, 139.7150]
  }
};

export function generateCityMockData(cityKey = 'amsterdam') {
  const city = MOCK_CITIES[cityKey] || MOCK_CITIES.amsterdam;
  const [south, west, north, east] = city.bbox;

  const latSpan = north - south;
  const lonSpan = east - west;

  function randomCoord(latRatio = 0.5, lonRatio = 0.5, jitter = 0.3) {
    const lat = south + latSpan * (latRatio + (Math.random() - 0.5) * jitter);
    const lon = west + lonSpan * (lonRatio + (Math.random() - 0.5) * jitter);
    return [Number(lat.toFixed(6)), Number(lon.toFixed(6))];
  }

  const rawPois = [
    // Food & Drink
    { name: 'Cafe de Prins', cat: 'food_drink', tag: 'amenity=cafe', hours: 'Mo-Su 10:00-01:00', wheel: 'yes', web: 'https://deprins.nl', loc: [0.6, 0.4] },
    { name: 'Pancakes Amsterdam', cat: 'food_drink', tag: 'amenity=restaurant', hours: 'Mo-Su 08:00-18:00', wheel: 'yes', web: 'https://pancakes.amsterdam', loc: [0.55, 0.45] },
    { name: 'Winkel 43 (Apple Pie)', cat: 'food_drink', tag: 'amenity=cafe', hours: 'Mo-Su 08:00-01:00', wheel: 'limited', web: 'https://winkel43.nl', loc: [0.7, 0.35] },
    { name: 'Brouwerij \'t IJ Bar', cat: 'food_drink', tag: 'amenity=pub', hours: 'Tu-Su 14:00-20:00', wheel: 'yes', web: 'https://brouwerijtij.nl', loc: [0.4, 0.8] },
    { name: 'The Butcher Burger', cat: 'food_drink', tag: 'amenity=fast_food', hours: 'Mo-Su 11:00-23:00', wheel: 'yes', web: 'https://the-butcher.com', loc: [0.35, 0.5] },
    { name: 'Tales & Spirits Cocktail Bar', cat: 'food_drink', tag: 'amenity=bar', hours: 'We-Su 17:30-01:00', wheel: 'no', web: 'https://talesandspirits.com', loc: [0.52, 0.48] },
    { name: 'Vleminckx Friet', cat: 'food_drink', tag: 'amenity=fast_food', hours: 'Mo-Su 11:00-19:00', wheel: 'yes', loc: [0.45, 0.52] },
    { name: 'Van Stapele Koekmakerij', cat: 'food_drink', tag: 'amenity=cafe', hours: 'Mo-Su 10:00-17:00', wheel: 'limited', loc: [0.44, 0.51] },
    { name: 'Greenwoods Keizersgracht', cat: 'food_drink', tag: 'amenity=restaurant', hours: 'Mo-Su 09:00-16:00', wheel: 'no', web: 'https://greenwoods.eu', loc: [0.48, 0.42] },
    { name: 'Il Tramezzino Italian Deli', cat: 'food_drink', tag: 'amenity=restaurant', hours: 'Tu-Sa 11:00-20:00', wheel: 'yes', loc: [0.65, 0.38] },
    { name: 'Monte Pelmo IJssalon', cat: 'food_drink', tag: 'amenity=ice_cream', hours: 'Mo-Su 12:00-22:00', wheel: 'yes', loc: [0.68, 0.33] },
    { name: 'Cafe Chris (Historic 1624)', cat: 'food_drink', tag: 'amenity=pub', hours: 'Mo-Su 16:00-02:00', wheel: 'no', loc: [0.62, 0.36] },

    // Healthcare
    { name: 'Amsterdam University Medical Center', cat: 'healthcare', tag: 'amenity=hospital', hours: '24/7', wheel: 'yes', phone: '+31 20 566 9111', web: 'https://amsterdamumc.nl', loc: [0.2, 0.7] },
    { name: 'Apotheek De Jordaan', cat: 'healthcare', tag: 'amenity=pharmacy', hours: 'Mo-Fr 08:30-18:00', wheel: 'yes', phone: '+31 20 624 3320', loc: [0.65, 0.36] },
    { name: 'Centrum Huisartsenpraktijk', cat: 'healthcare', tag: 'amenity=doctors', hours: 'Mo-Fr 08:00-17:00', wheel: 'yes', phone: '+31 20 622 4589', loc: [0.48, 0.55] },
    { name: 'Dam Clinic & Dental Care', cat: 'healthcare', tag: 'amenity=dentist', hours: 'Mo-Fr 09:00-17:30', wheel: 'limited', loc: [0.55, 0.52] },
    { name: 'Apotheek Oude Turfmarkt', cat: 'healthcare', tag: 'amenity=pharmacy', hours: 'Mo-Sa 09:00-18:00', wheel: 'yes', loc: [0.42, 0.54] },

    // Education
    { name: 'University of Amsterdam (UvA) Library', cat: 'education', tag: 'amenity=library', hours: 'Mo-Su 08:30-22:00', wheel: 'yes', web: 'https://uba.uva.nl', loc: [0.43, 0.53] },
    { name: 'Barlaeus Gymnasium High School', cat: 'education', tag: 'amenity=school', hours: 'Mo-Fr 08:15-16:30', wheel: 'yes', loc: [0.32, 0.44] },
    { name: 'Jordaan Primary Montessori School', cat: 'education', tag: 'amenity=school', hours: 'Mo-Fr 08:30-15:00', wheel: 'yes', loc: [0.68, 0.32] },
    { name: 'Amsterdam Conservatory Music College', cat: 'education', tag: 'amenity=college', hours: 'Mo-Sa 08:00-21:00', wheel: 'yes', loc: [0.58, 0.85] },
    { name: 'Openbare Bibliotheek Amsterdam (OBA)', cat: 'education', tag: 'amenity=library', hours: 'Mo-Su 10:00-22:00', wheel: 'yes', web: 'https://oba.nl', loc: [0.62, 0.72] },

    // Transport
    { name: 'Amsterdam Centraal Station', cat: 'transport', tag: 'railway=station', hours: '24/7', wheel: 'yes', loc: [0.82, 0.6] },
    { name: 'Rokin Metro 52 Station', cat: 'transport', tag: 'railway=subway_entrance', hours: 'Mo-Su 05:30-01:00', wheel: 'yes', loc: [0.46, 0.52] },
    { name: 'Nieuwmarkt Metro Station', cat: 'transport', tag: 'railway=subway_entrance', hours: 'Mo-Su 05:30-01:00', wheel: 'yes', loc: [0.52, 0.63] },
    { name: 'Westermarkt Tram Stop 13/17', cat: 'transport', tag: 'railway=tram_stop', wheel: 'yes', loc: [0.58, 0.43] },
    { name: 'OV-Fiets Bike Rental Centraal', cat: 'transport', tag: 'amenity=bicycle_rental', hours: '24/7', wheel: 'yes', loc: [0.84, 0.58] },
    { name: 'Q-Park Damrak Underground Parking', cat: 'transport', tag: 'amenity=parking', hours: '24/7', wheel: 'yes', loc: [0.65, 0.56] },
    { name: 'Fastned EV Rapid Charging Hub', cat: 'transport', tag: 'amenity=charging_station', hours: '24/7', wheel: 'yes', loc: [0.75, 0.75] },
    { name: 'Spui Tram Stop 2/12', cat: 'transport', tag: 'railway=tram_stop', wheel: 'yes', loc: [0.42, 0.49] },

    // Leisure & Parks
    { name: 'Vondelpark (North Entrance)', cat: 'leisure', tag: 'leisure=park', hours: '24/7', wheel: 'yes', loc: [0.15, 0.25] },
    { name: 'Westerpark Cultural Garden', cat: 'leisure', tag: 'leisure=park', hours: '24/7', wheel: 'yes', loc: [0.88, 0.2] },
    { name: 'Noorderkerk Children Playground', cat: 'leisure', tag: 'leisure=playground', hours: 'Mo-Su 08:00-20:00', wheel: 'yes', loc: [0.72, 0.38] },
    { name: 'Marnixbad Swimming & Sports Centre', cat: 'leisure', tag: 'leisure=sports_centre', hours: 'Mo-Su 07:00-22:00', wheel: 'yes', web: 'https://hetmarnix.nl', loc: [0.66, 0.28] },
    { name: 'Wertheimpark Memorial Garden', cat: 'leisure', tag: 'leisure=garden', hours: '08:00-sunset', wheel: 'limited', loc: [0.46, 0.74] },

    // Shops & Retail
    { name: 'Albert Heijn XL Supermarket', cat: 'shops', tag: 'shop=supermarket', hours: 'Mo-Su 07:00-22:00', wheel: 'yes', web: 'https://ah.nl', loc: [0.54, 0.48] },
    { name: 'De Bijenkorf Luxury Department Store', cat: 'shops', tag: 'shop=department_store', hours: 'Mo-Su 10:00-20:00', wheel: 'yes', web: 'https://debijenkorf.nl', loc: [0.55, 0.54] },
    { name: 'Waterstones English Books', cat: 'shops', tag: 'shop=books', hours: 'Mo-Sa 10:00-18:30', wheel: 'limited', loc: [0.44, 0.5] },
    { name: 'Marqt Organic Grocer', cat: 'shops', tag: 'shop=supermarket', hours: 'Mo-Su 08:00-21:00', wheel: 'yes', loc: [0.59, 0.41] },
    { name: 'Magna Plaza Shopping Mall', cat: 'shops', tag: 'shop=mall', hours: 'Mo-Su 10:00-19:00', wheel: 'yes', loc: [0.56, 0.49] },
    { name: 'Bakkerij Wolf Artisan Bakery', cat: 'shops', tag: 'shop=bakery', hours: 'Tu-Su 08:00-16:00', wheel: 'yes', loc: [0.51, 0.44] },
    { name: 'Scotch & Soda Flagship', cat: 'shops', tag: 'shop=clothes', hours: 'Mo-Su 10:00-18:30', wheel: 'yes', loc: [0.49, 0.46] },

    // Tourism & Culture
    { name: 'Anne Frank House Museum', cat: 'tourism', tag: 'tourism=museum', hours: 'Mo-Su 09:00-22:00', wheel: 'limited', web: 'https://annefrank.org', loc: [0.61, 0.4] },
    { name: 'Royal Palace of Amsterdam', cat: 'tourism', tag: 'tourism=attraction', hours: 'Tu-Su 10:00-17:00', wheel: 'yes', web: 'https://paleisamsterdam.nl', loc: [0.54, 0.51] },
    { name: 'Rembrandt House Museum', cat: 'tourism', tag: 'tourism=museum', hours: 'Tu-Su 10:00-18:00', wheel: 'limited', web: 'https://rembrandthuis.nl', loc: [0.48, 0.61] },
    { name: 'Pathé Tuschinski Historic Cinema', cat: 'tourism', tag: 'amenity=cinema', hours: 'Mo-Su 12:00-23:30', wheel: 'yes', web: 'https://pathe.nl/tuschinski', loc: [0.38, 0.53] },
    { name: 'De Kleine Komedie Theatre', cat: 'tourism', tag: 'amenity=theatre', hours: 'Tu-Sa 19:00-23:00', wheel: 'yes', web: 'https://dekleinekomedie.nl', loc: [0.42, 0.56] },
    { name: 'Hotel The Dylan Amsterdam', cat: 'tourism', tag: 'tourism=hotel', hours: '24/7', wheel: 'yes', web: 'https://dylanamsterdam.com', loc: [0.48, 0.43] },

    // Public Services
    { name: 'Amsterdam City Hall (Stopera)', cat: 'services', tag: 'amenity=townhall', hours: 'Mo-Fr 09:00-17:00', wheel: 'yes', loc: [0.44, 0.6] },
    { name: 'ING Bank & ATM Service', cat: 'services', tag: 'amenity=bank', hours: 'Mo-Fr 09:30-17:00', wheel: 'yes', loc: [0.53, 0.5] },
    { name: 'PostNL Main Parcel Point', cat: 'services', tag: 'amenity=post_office', hours: 'Mo-Sa 09:00-18:00', wheel: 'yes', loc: [0.5, 0.53] },
    { name: 'Politiebureau Nieuwezijds Voorburgwal', cat: 'services', tag: 'amenity=police', hours: '24/7', wheel: 'yes', phone: '+31 900 8844', loc: [0.57, 0.5] },
    { name: 'Brandweerkazerne Dirk Fire Station', cat: 'services', tag: 'amenity=fire_station', hours: '24/7', wheel: 'yes', loc: [0.35, 0.38] }
  ];

  let idCounter = 100000;
  const features = rawPois.map(p => {
    idCounter++;
    const [lat, lon] = randomCoord(p.loc[0], p.loc[1], 0.08);
    const [tagKey, tagVal] = p.tag.split('=');

    const tags = {
      [tagKey]: tagVal,
      name: p.name,
      'addr:city': 'Amsterdam',
      'addr:country': 'NL'
    };
    if (p.hours) tags.opening_hours = p.hours;
    if (p.wheel) tags.wheelchair = p.wheel;
    if (p.web) tags.website = p.web;
    if (p.phone) tags.phone = p.phone;

    return {
      id: `node/${idCounter}`,
      osmId: idCounter,
      osmType: 'node',
      lat,
      lon,
      name: p.name,
      category: p.cat,
      categoryLabel: p.cat.charAt(0).toUpperCase() + p.cat.slice(1).replace('_', ' & '),
      primaryTag: p.tag,
      tags
    };
  });

  return {
    city: city.name,
    bbox: city.bbox,
    center: city.center,
    zoom: city.zoom,
    features
  };
}
