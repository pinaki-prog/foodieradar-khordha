// ============================================================
//  FoodieRadar Khordha — overpass.js
//  Fetches real food places from OpenStreetMap (Overpass API)
//
//  KEY IMPROVEMENTS:
//  • localStorage cache (6-hour TTL) — only hits API once per 6hr
//  • 3 mirror servers tried in order if one rate-limits
//  • 429 / network errors handled gracefully — falls back to seeds
// ============================================================

const KHORDHA_BBOX = "19.90,85.50,20.55,86.00";

// Mirror servers — tried in order. If one returns 429, next is used.
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const OSM_CACHE_KEY = "fr_osm_cache";
const OSM_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in ms

// ── CACHE HELPERS ─────────────────────────────────────────────────────────────

function getOSMCache() {
  try {
    const raw = localStorage.getItem(OSM_CACHE_KEY);
    if (!raw) return null;
    const { ts, spots } = JSON.parse(raw);
    if (Date.now() - ts > OSM_CACHE_TTL) {
      localStorage.removeItem(OSM_CACHE_KEY);
      return null;
    }
    return spots;
  } catch (e) {
    return null;
  }
}

function setOSMCache(spots) {
  try {
    localStorage.setItem(OSM_CACHE_KEY, JSON.stringify({ ts: Date.now(), spots }));
  } catch (e) {} // localStorage full or unavailable — skip silently
}

// ── QUERY ─────────────────────────────────────────────────────────────────────

function buildCombinedFoodQuery() {
  return `[out:json][timeout:30];(node["amenity"="restaurant"](${KHORDHA_BBOX});node["amenity"="fast_food"](${KHORDHA_BBOX});node["amenity"="cafe"](${KHORDHA_BBOX});node["amenity"="food_court"](${KHORDHA_BBOX});node["amenity"="street_vendor"](${KHORDHA_BBOX});node["shop"="bakery"](${KHORDHA_BBOX});node["shop"="confectionery"](${KHORDHA_BBOX});node["shop"="organic"](${KHORDHA_BBOX});way["amenity"="restaurant"](${KHORDHA_BBOX});way["amenity"="fast_food"](${KHORDHA_BBOX});way["amenity"="cafe"](${KHORDHA_BBOX}););out center tags;`;
}

// ── FETCH WITH MIRROR FALLBACK ─────────────────────────────────────────────────

async function fetchFromMirror(query) {
  for (const url of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        console.info(`FoodieRadar: ${url} rate-limited, trying next mirror...`);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.elements || [];
    } catch (e) {
      console.info(`FoodieRadar: ${url} failed (${e.message}), trying next...`);
      continue;
    }
  }
  return null; // all mirrors failed
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────

async function fetchOSMSpots() {
  // 1. Return cached data if still fresh (within 6 hours)
  const cached = getOSMCache();
  if (cached) {
    console.info(`FoodieRadar: Using cached OSM data (${cached.length} spots, valid 6hr)`);
    return cached;
  }

  // 2. Try fetching from API with mirror fallback
  try {
    const elements = await fetchFromMirror(buildCombinedFoodQuery());

    if (!elements) {
      console.warn("FoodieRadar: All Overpass mirrors unavailable — using Supabase/seed data");
      return [];
    }

    const spots = normalizeOSMData(elements);

    // 3. Cache for 6 hours so future reloads don't hit the API
    if (spots.length > 0) {
      setOSMCache(spots);
      console.info(`FoodieRadar: Fetched & cached ${spots.length} OSM spots (6hr TTL)`);
    }

    return spots;

  } catch (err) {
    console.warn("FoodieRadar: Overpass fetch error:", err.message);
    return [];
  }
}

// ── NORMALIZE OSM DATA ────────────────────────────────────────────────────────

function normalizeOSMData(elements) {
  return elements
    .filter(el => el.tags && (el.tags.name || el.tags["name:en"]))
    .map(el => {
      const tags = el.tags;
      const lat  = el.lat != null ? el.lat : (el.center ? el.center.lat : null);
      const lng  = el.lon != null ? el.lon : (el.center ? el.center.lon : null);
      if (!lat || !lng) return null;
      return {
        id:            `osm-${el.id}`,
        name:          tags.name || tags["name:en"] || "Unnamed Spot",
        category:      mapOSMCategory(tags),
        area:          tags["addr:suburb"] || tags["addr:city"] || guessArea(lat, lng),
        address:       buildAddress(tags),
        food_type:     mapFoodType(tags),
        price_range:   mapPriceRange(tags),
        tags:          extractFoodTags(tags),
        latitude:      lat,
        longitude:     lng,
        status:        "approved",
        source:        "osm",
        rating:        null,
        review_count:  0,
        is_gem:        false,
        is_featured:   false,
        phone:         tags.phone || tags["contact:phone"] || null,
        website:       tags.website || tags["contact:website"] || null,
        opening_hours: tags.opening_hours || null,
        cuisine:       tags.cuisine || null,
      };
    })
    .filter(Boolean);
}

function mapOSMCategory(tags) {
  const amenity = tags.amenity;
  const shop    = tags.shop;
  const cuisine = (tags.cuisine || "").toLowerCase();
  if (shop === "organic")          return "Organic Store";
  if (shop === "bakery")           return "Tiffin Centre";
  if (shop === "confectionery")    return "Sweet Shop";
  if (amenity === "cafe")          return "Chai & Snacks";
  if (amenity === "fast_food")     return "Street Food";
  if (amenity === "food_court")    return "Odia Thali";
  if (amenity === "street_vendor") return "Street Food";
  if (cuisine.includes("indian") || cuisine.includes("odia")) return "Odia Thali";
  if (amenity === "restaurant")    return "Dhaba";
  return "Eatery";
}

function mapFoodType(tags) {
  if (tags.diet === "vegan" || tags.diet === "vegetarian") return "veg";
  if (tags["diet:vegetarian"] === "yes")    return "veg";
  if (tags["diet:non_vegetarian"] === "yes") return "nonveg";
  return "both";
}

function mapPriceRange(tags) {
  const level = parseInt(tags["price:range"] || tags.stars || "0");
  if (level <= 1) return "₹";
  if (level === 2) return "₹₹";
  return "₹₹₹";
}

function extractFoodTags(tags) {
  const result = [];
  if (tags.cuisine) tags.cuisine.split(";").forEach(c => result.push(c.trim().replace(/_/g, " ")));
  if (tags["diet:vegetarian"] === "yes") result.push("Veg Friendly");
  if (tags.takeaway === "yes")           result.push("Takeaway");
  if (tags.delivery === "yes")           result.push("Delivery");
  if (tags.outdoor_seating === "yes")    result.push("Outdoor Seating");
  return result.slice(0, 4);
}

function buildAddress(tags) {
  return [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"]]
    .filter(Boolean).join(", ") || null;
}

function guessArea(lat, lng) {
  if (lat > 20.34)                 return "Patia, BBSR";
  if (lat > 20.31 && lng > 85.82) return "Saheed Nagar, BBSR";
  if (lat > 20.29 && lat < 20.31) return "Old Town, BBSR";
  if (lat > 20.30 && lng < 85.81) return "Nayapalli, BBSR";
  if (lat > 20.27 && lng > 85.83) return "Jatni";
  if (lat < 20.20)                 return "Khordha Town";
  if (lng < 85.65)                 return "Balipatna";
  return "Bhubaneswar";
}

function mergeSpots(supabaseSpots, osmSpots) {
  const merged = [...supabaseSpots];
  osmSpots.forEach(osmSpot => {
    const isDuplicate = supabaseSpots.some(s => {
      if (!s.latitude || !s.longitude) return false;
      return getDistanceMeters(s.latitude, s.longitude, osmSpot.latitude, osmSpot.longitude) < 100;
    });
    if (!isDuplicate) merged.push(osmSpot);
  });
  return merged;
}

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}