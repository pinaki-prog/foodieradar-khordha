// ============================================================
//  FoodieRadar Khordha — config.js
//  ⚠ THE ONLY FILE YOU EDIT — all keys live here
//  ──────────────────────────────────────────────────────────
//  Steps:
//  1. Go to supabase.com → your project → Settings → API
//     Copy "Project URL" and "anon public" key below
//  2. Go to cloudinary.com → Dashboard → copy cloud name
//     (optional — only needed for photo reviews)
// ============================================================

const FR_CONFIG = {
  // ── SUPABASE ──────────────────────────────────────────────
  SUPABASE_URL:  "https://evcbzxlbqdmoxqidrgef.supabase.co",
  SUPABASE_ANON: "sb_publishable_PttmGADsMmOkWukKaliNQw_9Shg_o7o",

  // ── CLOUDINARY (optional — for photo uploads) ─────────────
  CLOUDINARY_CLOUD:  "YOUR_CLOUDINARY_NAME",
  CLOUDINARY_PRESET: "foodieradar_unsigned",

  // ── SITE INFO ─────────────────────────────────────────────
  SITE_NAME:   "FoodieRadar Khordha",
  SITE_REGION: "Khordha District, Odisha",
  SITE_URL:    "https://foodieradar.vercel.app",
};

// ── SUPABASE CLIENT ───────────────────────────────────────
const { createClient } = supabase;
const db = createClient(FR_CONFIG.SUPABASE_URL, FR_CONFIG.SUPABASE_ANON);

// ── CLOUDINARY GLOBALS (used by reviews.js) ───────────────
const CLOUDINARY_CLOUD  = FR_CONFIG.CLOUDINARY_CLOUD;
const CLOUDINARY_PRESET = FR_CONFIG.CLOUDINARY_PRESET;

// ── DEV HELPER ────────────────────────────────────────────
// Open browser console to see config status
console.log(
  `%cFoodieRadar Config Loaded`,
  'color:#E8670A;font-weight:bold;font-size:14px'
);
if (FR_CONFIG.SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
  console.warn('⚠ Supabase URL not set in config.js — using seed data only');
}

// ── SAFE localStorage — single source of truth for all files ─────────────────
const LS = {
  // get raw string (or fallback)
  getRaw(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch { return fallback; }
  },
  // set raw string
  setRaw(key, v) {
    try { localStorage.setItem(key, v); } catch {}
  },
  // get parsed JSON (or fallback)
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  getJSON(key, fallback = null) { return this.get(key, fallback); },
  // set: auto-serialises objects/arrays
  set(key, value) {
    try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) {
    try { localStorage.removeItem(key); return true; }
    catch { return false; }
  },
};