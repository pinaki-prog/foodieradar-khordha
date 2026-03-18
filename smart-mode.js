// ============================================================
//  FoodieRadar Khordha — smart-mode.js
//  Handles: Weather mode, Time mode, Pakhala season,
//           Student budget mode, Queue expiry, Flash sale expiry
//  Loaded after config.js on every page that needs it
// ============================================================

// LS is defined in config.js (loaded before this file on every page)

const SmartMode = (() => {

  // ── CONSTANTS ──────────────────────────────────────────────
  // Bhubaneswar coordinates for weather
  const BBSR_LAT = 20.2961;
  const BBSR_LNG = 85.8245;

  // Open-Meteo — free, no API key needed
  const WEATHER_URL =
    `https://api.open-meteo.com/v1/forecast?latitude=${BBSR_LAT}&longitude=${BBSR_LNG}` +
    `&current=weather_code,temperature_2m,precipitation&timezone=Asia%2FKolkata`;

  // WMO weather codes that mean rain
  const RAIN_CODES = new Set([51,53,55,61,63,65,80,81,82,95,96,99]);

  // Pakhala season: March 1 – July 31
  const PAKHALA_START_MONTH = 2; // 0-indexed
  const PAKHALA_END_MONTH   = 6;

  // ── STATE ──────────────────────────────────────────────────
  let _weather   = null; // cached weather response
  let _callbacks = [];   // subscribers

  // ── INTERNAL: fetch weather once per session ───────────────
  async function _fetchWeather() {
    if (_weather !== null) return _weather;
    try {
      const r = await fetch(WEATHER_URL);
      const d = await r.json();
      _weather = {
        code:   d.current?.weather_code ?? 0,
        temp:   d.current?.temperature_2m ?? 30,
        precip: d.current?.precipitation ?? 0,
        isRain: RAIN_CODES.has(d.current?.weather_code ?? 0),
      };
    } catch (e) {
      _weather = { code: 0, temp: 30, precip: 0, isRain: false };
    }
    return _weather;
  }

  // ── TIME HELPERS ───────────────────────────────────────────
  function currentHour() {
    return new Date().getHours();
  }

  function isMidnightHours() {
    const h = currentHour();
    return h >= 22 || h < 4;
  }

  function isAfternoonLull() {
    const h = currentHour();
    return h >= 15 && h < 19;
  }

  function isBreakfastHour() {
    const h = currentHour();
    return h >= 6 && h < 11;
  }

  function isLunchHour() {
    const h = currentHour();
    return h >= 11 && h < 15;
  }

  // ── SEASON HELPERS ─────────────────────────────────────────
  function isPakhalaSeason() {
    const m = new Date().getMonth();
    return m >= PAKHALA_START_MONTH && m <= PAKHALA_END_MONTH;
  }

  function currentSeason() {
    const m = new Date().getMonth();
    if (m >= 2 && m <= 5)  return 'summer';  // Mar–Jun
    if (m >= 6 && m <= 8)  return 'monsoon'; // Jul–Sep
    if (m >= 9 && m <= 10) return 'autumn';  // Oct–Nov
    return 'winter';
  }

  // ── STUDENT MODE ───────────────────────────────────────────
  // Persisted in localStorage so it survives navigation
  function isStudentMode() {
    return LS.getRaw('fr_student_mode') === '1';
  }
  function setStudentMode(on) {
    LS.setRaw('fr_student_mode', on ? '1' : '0');
    _notify();
  }
  function toggleStudentMode() {
    setStudentMode(!isStudentMode());
  }

  // ── ACTIVE MODES: returns array of active mode objects ─────
  async function getActiveModes() {
    const weather = await _fetchWeather();
    const modes   = [];

    if (isMidnightHours()) modes.push({
      id: 'midnight', icon: '🌙', label: 'Midnight Radar',
      desc: 'Showing spots open after 10 PM',
      color: '#1A237E', bg: 'rgba(26,35,126,.12)',
      filterFn: s => (s.hours_open_late === true || s.tags?.includes('late-night') ||
                      s.tags?.includes('24hr') || s.category === 'Dhaba'),
    });

    if (isAfternoonLull()) modes.push({
      id: 'lull', icon: '🕒', label: 'Afternoon Lull',
      desc: 'Open 3–7 PM — avoiding the dead zone',
      color: '#E65100', bg: 'rgba(230,81,0,.1)',
      filterFn: s => (s.hours_open_afternoon === true ||
                      s.tags?.includes('all-day') || s.category === 'Chai & Snacks'),
    });

    if (weather.isRain) modes.push({
      id: 'rain', icon: '🌧️', label: 'Rainy Day Radar',
      desc: `It's raining in BBSR — showing pakoda, chai & comfort food`,
      color: '#0D47A1', bg: 'rgba(13,71,161,.1)',
      filterFn: s => s.tags?.some(t =>
        ['pakoda','chai','maggi','gupchup','rainy-day','bhajia'].includes(t.toLowerCase())
      ) || ['Chai & Snacks','Street Food'].includes(s.category),
    });

    if (isPakhalaSeason()) modes.push({
      id: 'pakhala', icon: '🌿', label: 'Pakhala Season',
      desc: 'March–July: showing spots that serve Pakhala',
      color: '#1B5E20', bg: 'rgba(27,94,32,.1)',
      filterFn: s => s.tags?.some(t => t.toLowerCase().includes('pakhala')) ||
                     s.serves_pakhala === true,
    });

    if (isStudentMode()) modes.push({
      id: 'student', icon: '🎒', label: 'Student Mode ON',
      desc: 'Budget ₹50 & under — KIIT / ITER / SOA approved',
      color: '#6A1B9A', bg: 'rgba(106,27,154,.1)',
      filterFn: s => s.price_range === '₹' && (s.avg_price == null || s.avg_price <= 100),
    });

    return modes;
  }

  // ── SMART BANNER ───────────────────────────────────────────
  // Injects a dismissable banner into containerId
  async function renderBanner(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const modes = await getActiveModes();
    if (modes.length === 0) { el.innerHTML = ''; return; }

    const m = modes[0]; // show the most relevant one
    el.innerHTML = `
      <div style="
        background:${m.bg};border:1px solid ${m.color}33;
        border-left:4px solid ${m.color};border-radius:12px;
        padding:12px 18px;display:flex;align-items:center;
        gap:12px;margin-bottom:20px;animation:fadeIn .4s ease;
      ">
        <span style="font-size:1.4rem">${m.icon}</span>
        <div style="flex:1">
          <div style="font-weight:700;font-size:.9rem;color:${m.color}">${m.label}</div>
          <div style="font-size:.78rem;color:#555;margin-top:2px">${m.desc}</div>
        </div>
        ${modes.length > 1
          ? `<span style="background:${m.color};color:#fff;font-size:.7rem;font-weight:700;
              padding:2px 8px;border-radius:20px">${modes.length} active</span>` : ''}
        <button onclick="SmartMode.dismissBanner('${containerId}')"
          style="background:none;border:none;cursor:pointer;font-size:1.1rem;
          color:#999;padding:0 4px;line-height:1">✕</button>
      </div>`;
    el.style.display = 'block';
  }

  function dismissBanner(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '';
  }

  // ── QUEUE STATUS ───────────────────────────────────────────
  // Stored in localStorage, auto-expires after 2 hours
  function getQueueStatus(spotId) {
    try {
      const raw = LS.get('fr_queue_' + spotId);
      if (!raw) return null;
      const { status, ts } = JSON.parse(raw);
      const ageHours = (Date.now() - ts) / 3600000;
      if (ageHours > 2) { LS.remove('fr_queue_' + spotId); return null; }
      return status; // 'low' | 'medium' | 'high'
    } catch { return null; }
  }

  function setQueueStatus(spotId, status) {
    LS.set('fr_queue_' + spotId, { status, ts: Date.now() });
    _notify();
  }

  function queueBadgeHtml(spotId) {
    const s = getQueueStatus(spotId);
    if (!s) return '';
    const map = {
      low:    { emoji: '🟢', label: 'No queue',     color: '#1B5E20' },
      medium: { emoji: '🟡', label: 'Medium queue', color: '#E65100' },
      high:   { emoji: '🔴', label: 'Long queue',   color: '#B71C1C' },
    };
    const m = map[s];
    return `<span style="background:${m.color}12;border:1px solid ${m.color}40;
      color:${m.color};font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:20px">
      ${m.emoji} ${m.label}</span>`;
  }

  // ── FLASH SALES ────────────────────────────────────────────
  // Stored in localStorage, auto-expires after 3 hours
  const FLASH_KEY = 'fr_flash_sales';

  function getFlashSales() {
    try {
      const raw = LS.getJSON(FLASH_KEY, []);
      const now = Date.now();
      // Filter expired (> 3 hours)
      return raw.filter(f => (now - f.ts) < 10800000);
    } catch { return []; }
  }

  function addFlashSale({ spotName, area, deal, contact }) {
    const sales = getFlashSales();
    sales.unshift({
      id: Date.now().toString(36),
      spotName, area, deal, contact,
      ts: Date.now(),
    });
    // Keep max 20 flash sales
    LS.set(FLASH_KEY, sales.slice(0, 20));
    _notify();
  }

  function timeAgo(ts) {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return mins + 'm ago';
    return Math.floor(mins / 60) + 'h ago';
  }

  function flashSaleExpiryMins(ts) {
    return Math.max(0, 180 - Math.floor((Date.now() - ts) / 60000));
  }

  // ── SUBSCRIBER NOTIFY ──────────────────────────────────────
  function subscribe(fn) { _callbacks.push(fn); }
  function _notify()     { _callbacks.forEach(fn => fn()); }

  // ── PUBLIC API ─────────────────────────────────────────────
  return {
    getActiveModes,
    renderBanner,
    dismissBanner,
    isMidnightHours,
    isAfternoonLull,
    isPakhalaSeason,
    isPakhalaSeaon: isPakhalaSeason, // backward-compat alias
    isStudentMode,
    setStudentMode,
    toggleStudentMode,
    currentSeason,
    isBreakfastHour,
    isLunchHour,
    getQueueStatus,
    setQueueStatus,
    queueBadgeHtml,
    getFlashSales,
    addFlashSale,
    timeAgo,
    flashSaleExpiryMins,
    subscribe,
    fetchWeather: _fetchWeather,
  };

})();