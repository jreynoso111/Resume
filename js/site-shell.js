(function () {


  function init() {
    initThemeManager();
    initBackgroundAnimation();
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
      cvs.style.zIndex = '-1'; // Place constellation behind satellites
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
        s.src = basePath + 'js/background-animation.js';
        document.body.appendChild(s);
      };

      if (typeof THREE === 'undefined') {
        const s3 = document.createElement('script');
        s3.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
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

  // --- THEME MANAGER ---
  const themes = [
    {
      name: 'Light',
      vars: {
        '--bg': '#f5f5f5',
        '--bg-soft': 'rgba(255, 255, 255, 0.85)',
        '--bg-alt': '#f0f2f5',
        '--accent': '#1f4f7b',
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
        '--bg': '#020617', /* Slate-950, very deep black-blue */
        '--bg-soft': 'rgba(15, 23, 42, 0.85)', /* Slate-900 with opacity */
        '--bg-alt': '#1e293b',
        '--accent': '#38bdf8', /* Sky-400 */
        '--accent-soft': '#0c4a6e',
        '--accent-strong': '#e0f2fe',
        '--text-main': '#f8fafc',
        '--text-muted': '#94a3b8',
        '--border-subtle': '#1e293b',
        '--chip-bg': 'rgba(15, 23, 42, 0.85)',
        '--header-bg': 'rgba(2, 6, 23, 0.85)',
        '--text-on-accent': '#020617'
      }
    },
    {
      name: 'Gray Mode',
      vars: {
        '--bg': '#171717',   /* Neutral-900, deep gray/black */
        '--bg-soft': 'rgba(38, 38, 38, 0.85)', /* Neutral-800 with opacity */
        '--bg-alt': '#404040',
        '--accent': '#a3a3a3', /* Neutral-400 */
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
    // 1. Create Button
    const btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.innerHTML = '';
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
      font-size: 14px; 
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
