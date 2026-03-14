# 🍛 FoodieRadar Khordha

> Discover the best street food, dhabas, sweet shops, and hidden gems across Khordha district — the food map Zomato never built.

**Live site:** https://foodieradar-khordha.vercel.app/

---

## What is this?

FoodieRadar Khordha is a hyperlocal food discovery platform for Bhubaneswar and Khordha district, Odisha. It covers the spots that never make it onto Zomato — roadside stalls, weekly haats, temple prasad counters, midnight student joints, and seasonal Pakhala houses.

Built by a local, for locals.

---

## Features

- 🗺️ **Spot Radar** — 50+ real food spots with ratings, hygiene scores, queue status
- 📍 **Near Me** — geolocation filter within 5km
- 🌿 **Smart Mode** — auto-suggests spots based on time, weather, and Pakhala season
- 🎪 **Food Events** — festivals, cook-offs, weekly haats, pop-ups
- 🥾 **Food Trails** — 8 curated walking routes through food zones
- 📖 **Food Dictionary** — 35 Odia dishes explained
- 🏅 **FoodiePassport** — XP and badges for eating across the district
- 🛒 **Haat Tracker** — live weekly market schedule with map
- 🥊 **Cook-Off Battles** — live voting on best dishes
- 🍱 **Home Tiffin** — directory of home cooks and tiffin services
- ⚡ **Flash Sales** — vendor deals with 3-hour expiry
- 💬 **Reviews** — photo reviews, no login needed

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Plain HTML, CSS, JavaScript — no framework |
| Database | [Supabase](https://supabase.com) (PostgreSQL, free tier) |
| Map | [Leaflet.js](https://leafletjs.com) + OpenStreetMap |
| Live spots | OpenStreetMap Overpass API |
| Image uploads | [Cloudinary](https://cloudinary.com) (free tier) |
| Hosting | [Vercel](https://vercel.com) (free tier) |
| Weather | Open-Meteo (free, no key needed) |

---

## Project Structure

```
FoodieRadar Khordha/
├── index.html          # Main radar — all spots, filters, map
├── events.html         # Food events calendar
├── food-trails.html    # Walking food routes
├── food-dictionary.html# 35 Odia dishes
├── passport.html       # FoodiePassport XP system
├── spot.html           # Individual spot detail page
├── cook-off.html       # Live cook-off voting
├── haat-festival.html  # Weekly haat tracker
├── tiffin.html         # Home tiffin listings
├── thali-week.html     # Weekly thali voting
├── admin.html          # Admin panel (Supabase Auth protected)
├── config.js           # ⚠️ Keys go here — see Setup
├── smart-mode.js       # Weather, time, and season detection
├── overpass.js         # OpenStreetMap live data fetcher
├── schema.sql          # Database schema + 50 seed spots
└── manifest.json       # PWA manifest
```

---


## Why not Zomato?

Zomato covers restaurants with formal addresses and GST numbers. It misses:
- Street stalls with no address
- Weekly haats that move location
- Temple prasad counters
- Seasonal dishes (Pakhala only exists March–June)
- Midnight student spots under ₹50
- Hygiene ratings for open-air stalls

That gap is exactly what FoodieRadar fills.

---

## Roadmap

- [ ] Abadha / Temple Prasad tracker
- [ ] Dahibara Aludam leaderboard
- [ ] Mati Handi clay pot restaurant map
- [ ] Vendor of the Week spotlight
- [ ] Live food heatmap (at 10K+ DAU)
- [ ] WhatsApp Business API integration for vendors

---

## Contributing

Found a spot that should be listed? Use the **Submit a Spot** form on the site. All submissions go through admin review before publishing.

---

## License

MIT — free to use, fork, and adapt for other districts.

---

*Built with 🧡 for Khordha. Jai Jagannath.*
