(function () {
  const SUPABASE_VENDOR_PATH = 'assets/vendor/supabase/supabase-js.v2.js';
  const THREE_VENDOR_PATH = 'assets/vendor/three/three.r128.min.js';


  function init() {
    initImageFallbacks();
    initThemeManager();
    initBackgroundAnimation();
    initWebAnalytics();
  }

  function initBackgroundAnimation() {
    // 1. Inject Canvases if missing
    if (!document.getElementById('bg-canvas')) {
      const cvs = document.createElement('canvas');
      cvs.id = 'bg-canvas';
      cvs.style.position = 'fixed';
      cvs.style.top = '0';
      cvs.style.left = '0';
      cvs.style.width = '100%';
      cvs.style.height = '100%';
      cvs.style.zIndex = '0';
      cvs.style.pointerEvents = 'none';
      document.body.prepend(cvs);
    }

    if (!document.getElementById('particle-canvas')) {
      const cvs = document.createElement('canvas');
      cvs.id = 'particle-canvas';
      cvs.style.position = 'fixed';
      cvs.style.top = '0';
      cvs.style.left = '0';
      cvs.style.width = '100%';
      cvs.style.height = '100%';
      // Avoid negative z-index: it can render behind the document background (invisible).
      // The WebGL canvas above is transparent, so particles still show through.
      cvs.style.zIndex = '0';
      cvs.style.pointerEvents = 'none';
      document.body.prepend(cvs);
    }

    // 2. Determine base path
    let basePath = '';
    const shellScript = document.querySelector('script[src*="site-shell.js"]');
    if (shellScript) {
      const src = shellScript.getAttribute('src');
      const idx = src.lastIndexOf('js/site-shell.js');
      if (idx !== -1) {
        basePath = src.substring(0, idx);
      }
    }

    // 3. Load 3D Satellites Script
    if (!window.BG_ANIMATION_INITIALIZED && !document.querySelector('script[src*="background-animation.js"]')) {
      const load3D = () => {
        const s = document.createElement('script');
        // Cache-bust so mobile clients don't get stuck with an older touch model.
        s.src = basePath + 'js/background-animation.js?v=4';
        document.body.appendChild(s);
      };

      if (typeof THREE === 'undefined') {
        const s3 = document.createElement('script');
        s3.src = basePath + THREE_VENDOR_PATH;
        s3.onload = load3D;
        document.body.appendChild(s3);
      } else {
        load3D();
      }
    }

    // 4. Load 2D Constellation Script
    if (!window.PARTICLES_INITIALIZED && !document.querySelector('script[src*="particles.js"]')) {
      const s = document.createElement('script');
      s.src = basePath + 'js/particles.js';
      document.body.appendChild(s);
    }
  }

  function getShellBasePath() {
    const shellScript = document.querySelector('script[src*="site-shell.js"]');
    if (!shellScript) return '';
    const src = String(shellScript.getAttribute('src') || '');
    const idx = src.lastIndexOf('js/site-shell.js');
    if (idx === -1) return '';
    return src.substring(0, idx);
  }

  function loadScriptOnce(src, checkReady) {
    if (typeof checkReady === 'function' && checkReady()) {
      return Promise.resolve();
    }

    const existing = Array.from(document.scripts || []).find((s) => {
      const cur = String(s.getAttribute('src') || s.src || '');
      return cur === src || cur.split('?')[0] === src.split('?')[0];
    });
    if (existing && (!checkReady || checkReady())) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const scriptSrc = existing ? `${src}${src.includes('?') ? '&' : '?'}cb=${Date.now()}` : src;
      script.src = scriptSrc;
      script.async = true;
      script.addEventListener(
        'load',
        () => {
          if (!checkReady || checkReady()) resolve();
          else reject(new Error(`Script loaded but dependency is still unavailable: ${src}`));
        },
        { once: true }
      );
      script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), {
        once: true
      });
      document.head.appendChild(script);
    });
  }

  function normalizeAssetPath(rawPath) {
    const value = String(rawPath || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    return value.startsWith('assets/') ? value : '';
  }

  function toLocalAssetUrl(assetPath) {
    const clean = normalizeAssetPath(assetPath);
    if (!clean) return '';
    return `${getShellBasePath()}${clean}`;
  }

  function resolveSupabasePublicAssetPath(rawUrl) {
    const value = String(rawUrl || '').trim();
    if (!value || /^data:/i.test(value)) return '';
    try {
      const parsed = new URL(value, location.href);
      const marker = '/storage/v1/object/public/';
      const path = String(parsed.pathname || '');
      const idx = path.indexOf(marker);
      if (idx === -1) return '';
      const remainder = path.slice(idx + marker.length).replace(/^\/+/, '');
      const slash = remainder.indexOf('/');
      if (slash === -1) return '';
      const objectPath = remainder.slice(slash + 1).replace(/^\/+/, '');
      if (!objectPath) return '';
      return normalizeAssetPath(`assets/${objectPath}`);
    } catch (_e) {
      return '';
    }
  }

  function applyImageFallback(img, fallback) {
    if (!(img instanceof HTMLImageElement)) return;
    const next = String(fallback || '').trim();
    if (!next) return;
    if (img.dataset.fallbackApplied === '1') return;
    if (img.currentSrc === next || img.src === next) return;
    img.dataset.fallbackApplied = '1';
    img.src = next;
  }

  function bindImageFallback(img) {
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.resumeFallbackBound === '1') return;

    const explicitFallback = String(img.getAttribute('data-fallback-src') || '').trim();
    const assetPathFallback = normalizeAssetPath(img.getAttribute('data-asset-path') || '');
    const supabaseAssetPath = resolveSupabasePublicAssetPath(
      img.getAttribute('src') || img.currentSrc || img.src || ''
    );

    const fallback = explicitFallback
      || toLocalAssetUrl(assetPathFallback)
      || toLocalAssetUrl(supabaseAssetPath);
    if (!fallback) return;

    img.dataset.resumeFallbackBound = '1';
    if (!img.getAttribute('data-fallback-src')) {
      img.setAttribute('data-fallback-src', fallback);
    }

    const onError = () => applyImageFallback(img, fallback);
    img.addEventListener('error', onError);

    // Guard against stalled CDN image loads that never paint.
    const timeoutId = window.setTimeout(() => {
      if (img.dataset.fallbackApplied === '1') return;
      if (!img.complete || img.naturalWidth === 0) onError();
    }, 7000);

    const clearTimer = () => window.clearTimeout(timeoutId);
    img.addEventListener('load', clearTimer, { once: true });
    img.addEventListener('error', clearTimer, { once: true });

    if (img.complete && img.naturalWidth === 0) onError();
  }

  function initImageFallbacks() {
    const images = Array.from(document.querySelectorAll('img'));
    images.forEach((img) => bindImageFallback(img));
  }

  function randomId(prefix) {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return `${prefix}${window.crypto.randomUUID()}`;
      }
    } catch (_e) {}
    const rand = Math.random().toString(36).slice(2, 10);
    const now = Date.now().toString(36);
    return `${prefix}${now}${rand}`;
  }

  function readStorage(storage, key) {
    try {
      return storage.getItem(key) || '';
    } catch (_e) {
      return '';
    }
  }

  function writeStorage(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (_e) {}
  }

  function getOrCreateVisitorId() {
    const key = 'resume_analytics_visitor_id';
    let current = readStorage(window.localStorage, key);
    if (!current) {
      current = randomId('v_');
      writeStorage(window.localStorage, key, current);
    }
    return current;
  }

  function getOrCreateSessionId() {
    const key = 'resume_analytics_session_id';
    let current = readStorage(window.sessionStorage, key);
    if (!current) {
      current = randomId('s_');
      writeStorage(window.sessionStorage, key, current);
    }
    return current;
  }

  function detectDeviceType() {
    const width = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    if (width <= 767) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  function firstFilledText(...values) {
    for (const value of values) {
      const text = String(value || '').trim();
      if (text) return text;
    }
    return '';
  }

  function buildGeoMetadata(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const country = firstFilledText(raw.country, raw.country_name, raw.countryName);
    const countryCode = firstFilledText(raw.country_code, raw.countryCode, raw.countryCodeIso3).toUpperCase();
    const region = firstFilledText(raw.region, raw.region_name, raw.state, raw.state_prov, raw.province);
    const regionCode = firstFilledText(raw.region_code, raw.regionCode, raw.state_code, raw.region_iso_code).toUpperCase();
    const city = firstFilledText(raw.city, raw.city_name);
    const timezone = firstFilledText(
      raw.timezone && raw.timezone.id,
      raw.timezone,
      raw.time_zone && raw.time_zone.name
    );

    if (!country && !region && !city) return null;
    return {
      country: country || null,
      country_name: country || null,
      country_code: countryCode || null,
      region: region || null,
      region_name: region || null,
      region_code: regionCode || null,
      state: region || null,
      state_code: regionCode || null,
      city: city || null,
      geo_timezone: timezone || null
    };
  }

  async function fetchJsonWithTimeout(url, timeoutMs) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = window.setTimeout(() => {
      if (controller) controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller ? controller.signal : undefined,
        headers: {
          Accept: 'application/json'
        }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (_e) {
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function fetchGeoMetadata() {
    const analyticsConfig = window.__SITE_ANALYTICS_CONFIG__;
    if (!analyticsConfig || analyticsConfig.enableGeoLookup !== true) return null;

    const cacheKey = 'resume_analytics_geo_v1';
    const cached = readStorage(window.sessionStorage, cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (_e) {}
    }

    if (typeof window.fetch !== 'function') return null;

    const sources = [
      async () => {
        const data = await fetchJsonWithTimeout('https://ipwho.is/', 1800);
        if (!data || data.success === false) return null;
        return data;
      },
      async () => {
        const data = await fetchJsonWithTimeout('https://ipapi.co/json/', 1800);
        if (!data || data.error) return null;
        return data;
      }
    ];

    for (const load of sources) {
      const data = await load();
      const geo = buildGeoMetadata(data);
      if (geo) {
        writeStorage(window.sessionStorage, cacheKey, JSON.stringify(geo));
        return geo;
      }
    }

    return null;
  }

  async function ensurePublicSupabaseConfig() {
    const cfg = window.__SUPABASE_CONFIG__;
    if (cfg && cfg.url && cfg.anonKey) return cfg;
    const basePath = getShellBasePath();
    await loadScriptOnce(`${basePath}js/supabase-config.js?v=2`, () => {
      const c = window.__SUPABASE_CONFIG__;
      return Boolean(c && c.url && c.anonKey);
    });
    return window.__SUPABASE_CONFIG__ || null;
  }

  async function ensureSupabaseLibrary() {
    if (window.supabase && typeof window.supabase.createClient === 'function') return;
    const basePath = getShellBasePath();
    await loadScriptOnce(
      `${basePath}${SUPABASE_VENDOR_PATH}`,
      () => window.supabase && typeof window.supabase.createClient === 'function'
    );
  }

  async function buildAnalyticsPayload() {
    const params = new URLSearchParams(window.location.search || '');
    const referrer = String(document.referrer || '').trim();
    const path = String(window.location.pathname || '/');
    const geo = await fetchGeoMetadata();
    const payload = {
      event_type: 'page_view',
      page_path: path || '/',
      page_title: String(document.title || '').trim() || null,
      referrer: referrer || null,
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
      device_type: detectDeviceType(),
      session_id: getOrCreateSessionId(),
      visitor_id: getOrCreateVisitorId(),
      language: String(navigator.language || '').trim() || null,
      screen_width: Number(window.screen && window.screen.width ? window.screen.width : 0) || null,
      screen_height: Number(window.screen && window.screen.height ? window.screen.height : 0) || null,
      timezone:
        typeof Intl !== 'undefined' && Intl.DateTimeFormat
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || null
          : null,
      user_agent: String(navigator.userAgent || '').slice(0, 500) || null,
      metadata: {
        search: String(window.location.search || ''),
        hash: String(window.location.hash || ''),
        ...(geo || {})
      }
    };
    return payload;
  }

  async function sendPageView() {
    if (window.__resumeAnalyticsSent) return;
    window.__resumeAnalyticsSent = true;

    const cfg = await ensurePublicSupabaseConfig();
    if (!cfg || !cfg.url || !cfg.anonKey) return;

    await ensureSupabaseLibrary();
    if (!window.supabase || typeof window.supabase.createClient !== 'function') return;

    const client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const payload = await buildAnalyticsPayload();
    const { error } = await client.from('site_analytics_events').insert([payload]);
    if (error) {
      // Keep this non-fatal for visitors.
      console.warn('[analytics] page_view insert failed:', error.message || error);
    }
  }

  function initWebAnalytics() {
    const path = String(window.location.pathname || '').toLowerCase();
    if (window.location.protocol === 'file:') return;
    if (path.startsWith('/admin/') || path === '/admin' || path.includes('/admin/')) return;
    sendPageView().catch(() => {
      // Silent fail by design; analytics should never block rendering.
    });
  }

  // --- THEME MANAGER ---
  const themes = [
    {
      name: 'Light',
      vars: {
        '--bg': '#f5f5f5',
        '--bg-soft': 'rgba(255, 255, 255, 0.85)',
        '--bg-alt': '#f0f2f5',
        '--accent': '#1f4f7b',
        '--accent-rgb': '31, 79, 123',
        '--accent-soft': '#e0ecf7',
        '--accent-strong': '#153554',
        '--text-main': '#111827',
        '--text-muted': '#6b7280',
        '--border-subtle': '#d1d5db',
        '--chip-bg': '#e5e7eb',
        '--header-bg': 'rgba(255, 255, 255, 0.85)',
        '--text-on-accent': '#ffffff'
      }
    },
    {
      name: 'Dark',
      vars: {
        '--bg': '#050505',
        '--bg-soft': 'rgba(15, 15, 15, 0.88)',
        '--bg-alt': '#151515',
        '--accent': '#d1d5db',
        '--accent-rgb': '209, 213, 219',
        '--accent-soft': '#242424',
        '--accent-strong': '#f9fafb',
        '--text-main': '#ffffff',
        '--text-muted': '#d1d5db',
        '--border-subtle': '#2f2f2f',
        '--chip-bg': 'rgba(24, 24, 24, 0.9)',
        '--header-bg': 'rgba(8, 8, 8, 0.9)',
        '--text-on-accent': '#0a0a0a'
      }
    },
    {
      name: 'Gray Mode',
      vars: {
        '--bg': '#171717',   /* Neutral-900, deep gray/black */
        '--bg-soft': 'rgba(38, 38, 38, 0.85)', /* Neutral-800 with opacity */
        '--bg-alt': '#404040',
        '--accent': '#a3a3a3', /* Neutral-400 */
        '--accent-rgb': '163, 163, 163',
        '--accent-soft': '#404040',
        '--accent-strong': '#ffffff',
        '--text-main': '#f5f5f5', /* Neutral-100 */
        '--text-muted': '#a3a3a3', /* Neutral-400 */
        '--border-subtle': '#404040',
        '--chip-bg': 'rgba(38, 38, 38, 0.85)',
        '--header-bg': 'rgba(23, 23, 23, 0.85)',
        '--text-on-accent': '#171717'
      }
    }
  ];

  function initThemeManager() {
    // Remove any previously injected toggle to avoid stale icon buttons
    document.querySelectorAll('#theme-toggle').forEach((el) => el.remove());
    document.querySelectorAll('#theme-toggle-label').forEach((el) => el.remove());

    // 1. Create Button
    const btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.textContent = '';
    btn.title = 'Switch Theme';
    btn.style.cssText = `
      position: fixed; 
      bottom: 20px; 
      left: 20px; 
      width: 34px; 
      height: 34px; 
      border-radius: 50%; 
      background: var(--accent); 
      color: #fff; 
      border: 2px solid white; 
      font-size: 0; 
      line-height: 0;
      padding: 0;
      background-image: none;
      cursor: pointer; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, background 0.2s ease;
    `;

    // Hover effect
    btn.onmouseover = () => { btn.style.transform = 'scale(1.1)'; };
    btn.onmouseout = () => { btn.style.transform = 'scale(1.0)'; };

    document.body.appendChild(btn);

    // 1b. Create helper label with arrow pointing to the theme button
    const label = document.createElement('div');
    label.id = 'theme-toggle-label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = '↙ Color';
    label.style.cssText = `
      position: fixed;
      bottom: 66px;
      left: 28px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--bg-soft);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.01em;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9998;
      pointer-events: none;
      user-select: none;
      backdrop-filter: blur(6px);
    `;
    document.body.appendChild(label);

    // 2. Load saved theme or default
    let currentThemeIndex = parseInt(localStorage.getItem('themeIndex')) || 0;
    applyTheme(themes[currentThemeIndex]);

    // 3. Toggle Logic
    btn.onclick = () => {
      currentThemeIndex = (currentThemeIndex + 1) % themes.length;
      applyTheme(themes[currentThemeIndex]);
      localStorage.setItem('themeIndex', currentThemeIndex);

      // Notify user visually (optional)
      const themeName = themes[currentThemeIndex].name;
      btn.title = `Current: ${themeName}`;
    };
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
