// ============================================================
//  FoodieRadar Khordha — overpass.js
//  TIER 2: Fetch real food places from OpenStreetMap (free)
//  Uses Overpass API — no key needed, 100% free
// ============================================================

// Bounding box for Khordha district (south, west, north, east)
const KHORDHA_BBOX = "19.90,85.50,20.55,86.00";

// Overpass API endpoint (free, no key)
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// ── QUERY BUILDERS ───────────────────────────────────────────────────────────

/**
 * Build Overpass QL query for a given amenity/shop type in Khordha bbox
 */
function buildQuery(type, value) {
  return `
    [out:json][timeout:25];
    (
      node["${type}"="${value}"](${KHORDHA_BBOX});
      way["${type}"="${value}"](${KHORDHA_BBOX});
    );
    out center tags;
  `;
}

/**
 * Build a combined query for all food-related OSM tags at once
 * This reduces API calls by batching into one request
 */
function buildCombinedFoodQuery() {
  return `
    [out:json][timeout:30];
    (
      node["amenity"="restaurant"](${KHORDHA_BBOX});
      node["amenity"="fast_food"](${KHORDHA_BBOX});
      node["amenity"="cafe"](${KHORDHA_BBOX});
      node["amenity"="food_court"](${KHORDHA_BBOX});
      node["amenity"="street_vendor"](${KHORDHA_BBOX});
      node["shop"="bakery"](${KHORDHA_BBOX});
      node["shop"="confectionery"](${KHORDHA_BBOX});
      node["shop"="organic"](${KHORDHA_BBOX});
      way["amenity"="restaurant"](${KHORDHA_BBOX});
      way["amenity"="fast_food"](${KHORDHA_BBOX});
      way["amenity"="cafe"](${KHORDHA_BBOX});
    );
    out center tags;
  `;
}

// ── FETCH FROM OVERPASS ───────────────────────────────────────────────────────

/**
 * Fetch all food spots from OpenStreetMap for Khordha region
 * Returns normalized array of spot objects
 */
async function fetchOSMSpots() {
  try {
    const query = buildCombinedFoodQuery();
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);

    const data = await response.json();
    return normalizeOSMData(data.elements);

  } catch (err) {
    console.warn("Overpass API unavailable, using Supabase data only:", err.message);
    return []; // Graceful fallback — Supabase data still shows
  }
}

// ── NORMALIZE OSM DATA ────────────────────────────────────────────────────────

/**
 * Map raw OSM element to FoodieRadar spot format
 */
function normalizeOSMData(elements) {
  return elements
    .filter(el => el.tags && (el.tags.name || el.tags["name:en"]))
    .map(el => {
      const tags = el.tags;
      const lat  = el.lat ?? el.center?.lat;
      const lng  = el.lon ?? el.center?.lon;

      if (!lat || !lng) return null;

      return {
        id:           `osm-${el.id}`,
        name:         tags.name || tags["name:en"] || "Unnamed Spot",
        category:     mapOSMCategory(tags),
        area:         tags["addr:suburb"] || tags["addr:city"] || guessArea(lat, lng),
        address:      buildAddress(tags),
        food_type:    mapFoodType(tags),
        price_range:  mapPriceRange(tags),
        tags:         extractFoodTags(tags),
        latitude:     lat,
        longitude:    lng,
        status:       "approved",
        source:       "osm",
        // OSM spots don't have ratings — show as unrated
        rating:       null,
        review_count: 0,
        is_gem:       false,
        is_featured:  false,
        phone:        tags.phone || tags["contact:phone"] || null,
        website:      tags.website || tags["contact:website"] || null,
        opening_hours: tags.opening_hours || null,
        cuisine:      tags.cuisine || null,
      };
    })
    .filter(Boolean); // Remove nulls
}

// ── HELPER MAPPERS ────────────────────────────────────────────────────────────

function mapOSMCategory(tags) {
  const amenity = tags.amenity;
  const shop    = tags.shop;
  const cuisine = tags.cuisine || "";

  if (shop === "organic")         return "Organic Store";
  if (shop === "bakery")          return "Bakery";
  if (shop === "confectionery")   return "Sweet Shop";
  if (amenity === "cafe")         return "Chai & Snacks";
  if (amenity === "fast_food")    return "Street Food";
  if (amenity === "food_court")   return "Food Court";
  if (amenity === "street_vendor")return "Street Food";
  if (cuisine.includes("indian")) return "Odia Thali";
  if (amenity === "restaurant")   return "Restaurant";
  return "Eatery";
}

function mapFoodType(tags) {
  const diet = tags.diet;
  if (diet === "vegan" || diet === "vegetarian") return "veg";
  if (tags["diet:vegetarian"] === "yes")         return "veg";
  if (tags["diet:non_vegetarian"] === "yes")     return "nonveg";
  return "both"; // default — unknown
}

function mapPriceRange(tags) {
  const level = parseInt(tags["price:range"] || tags.stars || "0");
  if (level <= 1) return "₹";
  if (level === 2) return "₹₹";
  return "₹₹₹";
}

function extractFoodTags(tags) {
  const result = [];
  if (tags.cuisine) {
    tags.cuisine.split(";").forEach(c =>
      result.push(c.trim().replace(/_/g, " "))
    );
  }
  if (tags["diet:vegetarian"] === "yes") result.push("Veg Friendly");
  if (tags.takeaway === "yes")           result.push("Takeaway");
  if (tags.delivery === "yes")           result.push("Delivery");
  if (tags.outdoor_seating === "yes")    result.push("Outdoor Seating");
  return result.slice(0, 4); // max 4 tags
}

function buildAddress(tags) {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
  ].filter(Boolean);
  return parts.join(", ") || null;
}

/**
 * Rough area name based on lat/lng within Khordha district
 */
function guessArea(lat, lng) {
  if (lat > 20.34)                      return "Patia, BBSR";
  if (lat > 20.31 && lng > 85.82)       return "Saheed Nagar, BBSR";
  if (lat > 20.29 && lat < 20.31)       return "Old Town, BBSR";
  if (lat > 20.30 && lng < 85.81)       return "Nayapalli, BBSR";
  if (lat > 20.27 && lng > 85.83)       return "Jatni";
  if (lat < 20.20)                      return "Khordha Town";
  if (lng < 85.65)                      return "Balipatna";
  return "Bhubaneswar";
}

// ── MERGE: OSM + SUPABASE ─────────────────────────────────────────────────────

/**
 * Merge Supabase spots (community submitted + curated) with OSM spots.
 * Supabase spots take priority. OSM fills in gaps.
 * Deduplicate by proximity (within ~100m = same place)
 */
function mergeSpots(supabaseSpots, osmSpots) {
  const merged = [...supabaseSpots];

  osmSpots.forEach(osmSpot => {
    const isDuplicate = supabaseSpots.some(s => {
      if (!s.latitude || !s.longitude) return false;
      const dist = getDistanceMeters(
        s.latitude, s.longitude,
        osmSpot.latitude, osmSpot.longitude
      );
      return dist < 100; // within 100 metres = same place
    });

    if (!isDuplicate) merged.push(osmSpot);
  });

  return merged;
}

/**
 * Haversine distance in metres between two lat/lng points
 */
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Functions available globally: fetchOSMSpots(), mergeSpots(), getDistanceMeters()