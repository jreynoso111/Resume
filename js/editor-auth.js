(function () {
  installErrorOverlay();

  const EDITOR_ENABLED_KEY = 'resume_cms_editor_enabled_v1';
  const SETTINGS_KEY = 'resume_admin_settings_v2';
  const DRAFT_KEY_PREFIX = 'resume_admin_draft_v2:';

  const SECTION_SELECTOR = [
    'main section',
    'main article',
    'main .card',
    'main .mini-card',
    'main .project-card',
    'main .experience-card',
    'main .highlight-item',
    'main .hero-card'
  ].join(',');

  const BLOCK_TAGS = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'CANVAS', 'DD', 'DIV', 'DL', 'DT',
    'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY',
    'THEAD', 'TFOOT', 'TR', 'TD', 'TH', 'UL'
  ]);
  const EMPTY_EDITABLE_TAGS = new Set([
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'SPAN', 'A', 'STRONG', 'EM', 'SMALL', 'LABEL', 'FIGCAPTION', 'BLOCKQUOTE'
  ]);

	  const state = {
	    rootDirHandle: null,
	    panel: null,
	    loginModal: null,
	    toast: null,
	    sectionLabel: null,
	    selectedSection: null,
	    autosaveEnabled: true,
		    autosaveTimer: null,
		    saveInFlight: false,
		    saveQueued: false,
		    uploadsInFlight: 0,
		    editorDomObserver: null,
		    editorDomRefreshTimer: null,
		    imageControls: new Map(),
		    imageRepositionRaf: null,
	    serverMode: false,
	    serverModeChecked: false,
	    supabaseClient: null,
    supabaseInitPromise: null,
    authSession: null,
    authEmail: '',
    authIsAdmin: false,
    cmsHydrated: false
  };

  // Marker for smoke tests / footer loader. If this isn't set after the script loads,
  // the browser likely received non-JS content (HTML fallback) or hit a parse error.
  window.__resumeCmsEditorAuthLoaded = true;

  // Expose a stable controller early so the footer gear can always toggle the editor,
  // even if later async init work fails.
  window.__resumeCmsToggleEditor = async function () {
    if (document.body && document.body.classList.contains('cms-admin-mode')) {
      setEditorEnabledFlag(false);
      disableAdminMode();
      syncAdminLinkState();
      updateStatusLine();
      notify('Editor disabled.', 'success');
      return;
    }

    setEditorEnabledFlag(true);
    await openLoginModal();
  };

  function installErrorOverlay() {
    const ensureBox = () => {
      let box = document.getElementById('cms-error-overlay');
      if (box) return box;
      box = document.createElement('div');
      box.id = 'cms-error-overlay';
      box.style.position = 'fixed';
      box.style.left = '12px';
      box.style.bottom = '12px';
      box.style.zIndex = '10080';
      box.style.maxWidth = 'min(92vw, 720px)';
      box.style.padding = '10px 12px';
      box.style.borderRadius = '10px';
      box.style.background = 'rgba(153, 27, 27, 0.92)';
      box.style.color = '#fff';
      box.style.font = '12px/1.35 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      box.style.display = 'none';
      box.style.whiteSpace = 'pre-wrap';
      box.style.boxShadow = '0 10px 25px rgba(0,0,0,0.25)';
      box.style.cursor = 'pointer';
      box.title = 'Click to dismiss';
      box.addEventListener('click', () => {
        box.style.display = 'none';
        box.textContent = '';
      });
      const attach = () => (document.body || document.documentElement).appendChild(box);
      if (document.body) attach();
      else document.addEventListener('DOMContentLoaded', attach, { once: true });
      return box;
    };

    const show = (label, message) => {
      const box = ensureBox();
      box.textContent = `${label}\n${String(message || '').slice(0, 2000)}`;
      box.style.display = 'block';
    };

    window.addEventListener('error', (event) => {
      const msg = event && (event.message || (event.error && event.error.message))
        ? (event.message || event.error.message)
        : 'Unknown error';
      show('JS error', msg);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event && event.reason ? event.reason : 'Unknown rejection';
      const msg = reason && reason.message ? reason.message : String(reason);
      show('Unhandled rejection', msg);
    });
  }

  const css = `
    body.cms-admin-mode {
      --cms-accent: #0b5fff;
      --cms-border: rgba(11,95,255,0.45);
    }

    .cms-ui {
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      box-sizing: border-box;
    }

    .cms-panel {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 10040;
      width: min(280px, calc(100vw - 32px));
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.2);
      padding: 10px;
      display: none;
      color: #111827;
    }

    body.cms-admin-mode .cms-panel {
      display: block;
    }

    .cms-panel h3 {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }

    .cms-panel .cms-muted {
      font-size: 11px;
      color: #4b5563;
      margin-bottom: 10px;
      line-height: 1.45;
    }

    .cms-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }

    .cms-btn,
    .cms-btn-secondary,
    .cms-btn-danger {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #fff;
      color: #111827;
      cursor: pointer;
      padding: 7px 9px;
      font-size: 11px;
      font-weight: 600;
    }

    .cms-btn {
      background: #0b5fff;
      border-color: #0b5fff;
      color: #fff;
    }

    .cms-btn-secondary:hover,
    .cms-btn:hover {
      filter: brightness(0.97);
    }

    .cms-btn-danger {
      background: #fff;
      color: #b91c1c;
      border-color: #fecaca;
    }

    .cms-inline {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      margin-bottom: 10px;
      color: #374151;
    }

    .cms-inline input[type="checkbox"] {
      margin: 0;
      accent-color: #0b5fff;
    }

    .cms-section-box {
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      padding: 10px;
      margin-bottom: 10px;
      background: #f8fafc;
    }

    .cms-details {
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
      margin-top: 6px;
    }

    .cms-details summary {
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      user-select: none;
      list-style: none;
      margin-bottom: 8px;
    }

    .cms-details summary::-webkit-details-marker {
      display: none;
    }

    .cms-section-title {
      font-size: 12px;
      color: #475569;
      margin-bottom: 6px;
      font-weight: 600;
    }

    .cms-section-label {
      font-size: 12px;
      color: #0f172a;
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 8px;
      background: #fff;
      min-height: 32px;
      display: flex;
      align-items: center;
      line-height: 1.2;
    }

    .cms-login-modal {
      position: fixed;
      inset: 0;
      z-index: 10045;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(15, 23, 42, 0.58);
    }

    .cms-login-modal.show {
      display: flex;
    }

    .cms-login-card {
      width: min(420px, 100%);
      background: #fff;
      border-radius: 12px;
      border: 1px solid #d1d5db;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.26);
      overflow: hidden;
    }

    .cms-login-card h4 {
      margin: 0;
      padding: 12px 14px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
      color: #0f172a;
    }

    .cms-login-body {
      padding: 12px 14px;
      display: grid;
      gap: 10px;
    }

    .cms-login-body label {
      font-size: 12px;
      color: #334155;
      font-weight: 600;
      display: grid;
      gap: 4px;
    }

    .cms-login-body input {
      width: 100%;
      padding: 10px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
    }

    .cms-login-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 0 14px 14px;
    }

    .cms-toast {
      position: fixed;
      left: 50%;
      bottom: 14px;
      transform: translateX(-50%);
      z-index: 10050;
      background: #111827;
      color: #fff;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      display: none;
      max-width: min(90vw, 800px);
      line-height: 1.3;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
    }

    .cms-toast.show {
      display: block;
    }

    .cms-toast.warn {
      background: #92400e;
    }

    .cms-toast.error {
      background: #991b1b;
    }

    .cms-toast.success {
      background: #065f46;
    }

    body.cms-admin-mode [data-cms-editable="1"] {
      outline: 1px dashed var(--cms-border);
      outline-offset: 2px;
      transition: outline-color 0.15s ease;
      border-radius: 4px;
    }

    body.cms-admin-mode [data-cms-editable="1"]:focus {
      outline: 2px solid var(--cms-accent);
      outline-offset: 2px;
      background: rgba(11, 95, 255, 0.04);
    }

    body.cms-admin-mode [data-cms-section="1"] {
      position: relative;
      outline: 1px dashed rgba(11, 95, 255, 0.25);
      outline-offset: 4px;
    }

    body.cms-admin-mode [data-cms-section="1"].cms-section-selected {
      outline: 2px solid #0b5fff;
      outline-offset: 4px;
    }

    .cms-image-actions {
      position: fixed;
      z-index: 10043;
      display: none;
      gap: 6px;
      padding: 4px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.6);
      background: rgba(15, 23, 42, 0.84);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.24);
      transform: translateX(-100%);
    }

    body.cms-admin-mode .cms-image-actions {
      display: flex;
    }

    .cms-image-btn {
      border: none;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      color: #0f172a;
      background: #ffffff;
      min-width: 54px;
      line-height: 1;
    }

    .cms-image-btn:hover {
      filter: brightness(0.96);
    }

    @media (max-width: 720px) {
      .cms-panel {
        top: auto;
        bottom: 12px;
        right: 12px;
        left: 12px;
        width: auto;
      }
    }
  `;

  void init();

  async function init() {
    // If a CMS snapshot exists for this page, render it and stop.
    try {
      const hydrated = await maybeHydrateFromSupabase();
      if (hydrated) return;
    } catch (error) {
      // Ignore hydration failures; the page can still load normally.
    }

    loadSettings();
    injectCSS();
    createUI();
    disableAdminMode();
    lockEditingForNonAdmin();
    bindGlobalEvents();
    watchForAdminLink();

    await initSupabase();
    updateStatusLine();

    // Always start with the editor disabled. Even if the admin session still exists,
    // editing UI (and admin-only controls on dynamic sections) should only appear
    // after clicking the gear and validating as admin.
    setEditorEnabledFlag(false);

    syncAdminLinkState();
  }

  async function detectServerMode() {
    if (state.serverModeChecked) return state.serverMode;
    state.serverModeChecked = true;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('/__cms/ping', { method: 'GET', signal: controller.signal });
      clearTimeout(timer);
      state.serverMode = Boolean(res && res.ok);
      return state.serverMode;
    } catch (e) {
      state.serverMode = false;
      return false;
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts || []).find((s) => (s.getAttribute('src') || s.src || '') === src);
      if (existing) {
        if (existing.dataset.loaded === '1') return resolve();
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.addEventListener('load', () => {
        script.dataset.loaded = '1';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function getSupabaseConfig() {
    if (window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.url && window.__SUPABASE_CONFIG__.anonKey) {
      return window.__SUPABASE_CONFIG__;
    }

    // Try loading config from the site root based on current page depth.
    try {
      await loadScript(toPageAssetPath('js/supabase-config.js'));
    } catch (error) {
      return null;
    }

    if (window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.url && window.__SUPABASE_CONFIG__.anonKey) {
      return window.__SUPABASE_CONFIG__;
    }
    return null;
  }

  async function ensureSupabaseLibrary() {
    if (window.supabase && typeof window.supabase.createClient === 'function') return;
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
  }

  async function getSupabaseClient() {
    if (state.supabaseClient) return state.supabaseClient;
    const cfg = await getSupabaseConfig();
    if (!cfg) return null;
    await ensureSupabaseLibrary();
    if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;
    state.supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    return state.supabaseClient;
  }

  async function uploadFileViaSupabaseFunction(sb, cfg, functionName, { bucket, path, file }) {
    const fn = String(functionName || '').trim();
    if (!fn) throw new Error('Missing upload function name.');

    const { data } = await sb.auth.getSession();
    const token = data && data.session && data.session.access_token ? String(data.session.access_token) : '';
    if (!token) throw new Error('Not signed in.');

    // Trim a trailing slash from the Supabase URL so the Functions endpoint is well-formed.
    const endpoint = `${String(cfg.url || '').replace(/\/$/, '')}/functions/v1/${encodeURIComponent(fn)}`;
    const form = new FormData();
    form.append('bucket', String(bucket || 'resume-cms'));
    form.append('path', String(path || ''));
    form.append('file', file, file && file.name ? file.name : 'upload');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: String(cfg.anonKey || ''),
        Authorization: `Bearer ${token}`
      },
      body: form
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload || payload.ok !== true) {
      const msg = payload && payload.error ? payload.error : `Upload failed (HTTP ${res.status})`;
      throw new Error(msg);
    }

    const publicUrl = payload && payload.publicUrl ? String(payload.publicUrl) : '';
    if (!publicUrl) throw new Error('Upload succeeded but no public URL was returned.');
    return publicUrl;
  }

  async function initSupabase() {
    const unsafe = window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.unsafeNoAuth === true;
    if (unsafe) return;
    if (state.supabaseInitPromise) return state.supabaseInitPromise;
    state.supabaseInitPromise = (async () => {
      const sb = await getSupabaseClient();
      if (!sb) return;

      sb.auth.onAuthStateChange((_event, session) => {
        state.authSession = session || null;
        state.authEmail = (session && session.user && session.user.email) ? String(session.user.email) : '';
        void refreshAdminFlag();
        updateStatusLine();
      });

      const { data } = await sb.auth.getSession();
      state.authSession = (data && data.session) ? data.session : null;
      state.authEmail = (state.authSession && state.authSession.user && state.authSession.user.email)
        ? String(state.authSession.user.email)
        : '';
      await refreshAdminFlag();
    })();
    return state.supabaseInitPromise;
  }

  async function refreshAdminFlag() {
    const unsafe = window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.unsafeNoAuth === true;
    if (unsafe) {
      state.authIsAdmin = false;
      return;
    }
    const cfg = await getSupabaseConfig();
    const adminEmail = cfg && cfg.adminEmail ? String(cfg.adminEmail).trim().toLowerCase() : '';
    const currentEmail = String(state.authEmail || '').trim().toLowerCase();
    state.authIsAdmin = Boolean(adminEmail && currentEmail && adminEmail === currentEmail);
  }

	  function updateStatusLine() {
	    const statusLine = state.panel ? state.panel.querySelector('#cms-status-line') : null;
	    if (!statusLine) return;

	    const unsafe = window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.unsafeNoAuth === true;
	    const busy = (state.uploadsInFlight || 0) > 0;
	    let line = '';
	    if (unsafe) {
	      line = 'UNSAFE mode: no login required. Anyone can edit and publish.';
	    } else {
	      const email = String(state.authEmail || '');
	      if (!email) {
	        line = 'Not signed in. Sign in to edit and publish changes.';
	      } else if (state.authIsAdmin) {
	        line = `Signed in as ${email}. Edit outlined text, then Publish to save. (Cmd/Ctrl+Click links to open.)`;
	      } else {
	        line = `Signed in as ${email} (no edit access).`;
	      }
	    }
	    if (busy) line = `${line} Uploading image...`;
	    statusLine.textContent = line;

	    const publishBtn = state.panel.querySelector('#cms-save-now');
	    const signOutBtn = state.panel.querySelector('#cms-sign-out');
	    const autosaveToggle = state.panel.querySelector('#cms-autosave');

	    if (unsafe) {
	      if (publishBtn) publishBtn.disabled = busy;
	      if (autosaveToggle) autosaveToggle.disabled = busy;
	      if (signOutBtn) signOutBtn.disabled = true;
	      return;
	    }

	    const email = String(state.authEmail || '');
	    if (publishBtn) publishBtn.disabled = !state.authIsAdmin || busy;
	    if (autosaveToggle) autosaveToggle.disabled = !state.authIsAdmin || busy;
	    if (signOutBtn) signOutBtn.disabled = !email;
	  }

  async function handleLoginSubmit() {
    const sb = await getSupabaseClient();
    if (!sb) {
      showLoginError('Supabase is not configured. Check js/supabase-config.js.');
      return;
    }

    const emailInput = state.loginModal.querySelector('#cms-login-email');
    const passInput = state.loginModal.querySelector('#cms-login-password');
    const submitBtn = state.loginModal.querySelector('#cms-login-submit');
    const email = String(emailInput.value || '').trim();
    const password = String(passInput.value || '');

    if (!email || !password) {
      showLoginError('Email and password are required.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;

      await initSupabase();
      await refreshAdminFlag();
      updateStatusLine();

      if (!state.authIsAdmin) {
        showLoginError('Signed in, but this user does not have admin access.');
        return;
      }

      closeLoginModal();
      setEditorEnabledFlag(true);
      enableAdminMode();
      syncAdminLinkState();
      notify('Editor enabled.', 'success');
    } catch (error) {
      showLoginError(error && error.message ? error.message : 'Sign-in failed.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    }
  }

  function showLoginError(message) {
    if (!state.loginModal) return;
    const errBox = state.loginModal.querySelector('#cms-login-error');
    if (!errBox) return;
    errBox.textContent = String(message || 'Sign-in failed.');
    errBox.style.display = 'block';
  }

  async function signOut() {
    try {
      const sb = await getSupabaseClient();
      if (sb) await sb.auth.signOut();
    } catch (error) {
      // Ignore sign-out failures; still lock the editor.
    }

    state.authSession = null;
    state.authEmail = '';
    state.authIsAdmin = false;
    setEditorEnabledFlag(false);
    disableAdminMode();
    syncAdminLinkState();
    updateStatusLine();
    notify('Signed out.', 'success');
  }

	  async function maybeHydrateFromSupabase() {
	    if (state.cmsHydrated) return false;

	    // If we already loaded a CMS snapshot (document.write), do not re-hydrate or we'll loop.
	    const snapshotMeta = document.querySelector('meta[name="cms-snapshot"][content="1"]');
	    if (snapshotMeta) {
	      state.cmsHydrated = true;
	      return false;
	    }

		    // Default: do NOT hydrate public pages from Supabase CMS snapshots (static HTML is source of truth).
		    // Add `?cms=1` to force hydration, set `cms.autoHydrate = true` to enable it globally,
		    // or add `?nocms=1` to disable hydration on any host.
		    let forced = false;
		    try {
		      const params = new URLSearchParams(location.search || '');
		      const noCms = String(params.get('nocms') || '').toLowerCase();
		      if (noCms === '1' || noCms === 'true') return false;

		      const forceCms = String(params.get('cms') || '').toLowerCase();
		      forced = forceCms === '1' || forceCms === 'true';
		    } catch (_e) {
		      // Ignore URL parsing failures; hydrate if configured.
		    }

		    // Avoid hydrating when the page is opened directly from disk (file://).
		    if (location.protocol === 'file:') return false;

		    const path = getPreferredCurrentPagePath();
		    if (path.startsWith('admin/')) return false;

	    const cfg = await getSupabaseConfig();
	    if (!cfg || !cfg.cms || !cfg.cms.pagesTable) return false;
	    const cmsCfg = cfg && cfg.cms ? cfg.cms : {};
	    const autoHydrateSetting = cmsCfg.autoHydrate ?? cmsCfg.autoHydratePages ?? cmsCfg.hydratePages;
	    // Opt-in only: prevent Supabase CMS snapshots from "taking over" a static deploy.
	    // To enable auto-hydration, set `cms.autoHydrate = true` in js/supabase-config.js.
	    const autoHydrate = autoHydrateSetting === true;
	    if (!forced && !autoHydrate) return false;

    const sb = await getSupabaseClient();
    if (!sb) return false;

    const table = String(cfg.cms.pagesTable || 'cms_pages');
    const pathCandidates = buildCmsPagePathCandidates(path);
    const { data, error } = await sb
      .from(table)
      .select('path,html,updated_at')
      .in('path', pathCandidates)
      .limit(200);

    if (error) return false;

    const rankByPath = new Map(pathCandidates.map((candidate, index) => [candidate, index]));
    const rows = (Array.isArray(data) ? data : [])
      .filter((item) => item && item.path && item.html)
      .sort((a, b) => {
        const aTime = Date.parse(String(a.updated_at || ''));
        const bTime = Date.parse(String(b.updated_at || ''));
        const aHasTime = Number.isFinite(aTime);
        const bHasTime = Number.isFinite(bTime);
        if (aHasTime && bHasTime && aTime !== bTime) return bTime - aTime;
        if (aHasTime !== bHasTime) return bHasTime ? 1 : -1;
        const aRank = rankByPath.has(String(a.path)) ? rankByPath.get(String(a.path)) : Number.MAX_SAFE_INTEGER;
        const bRank = rankByPath.has(String(b.path)) ? rankByPath.get(String(b.path)) : Number.MAX_SAFE_INTEGER;
        return aRank - bRank;
      });

    const row = rows[0] || null;

		    const html = row && row.html ? String(row.html) : '';
		    if (!html) return false;

	    const resolvedPagePath = row && row.path ? String(row.path) : path;
	    const patchSnapshotShell = (rawHtml, pagePath) => {
	      const safeHtml = String(rawHtml || '');
	      const parts = String(pagePath || '').split('/').filter(Boolean);
      const depth = Math.max(0, parts.length - 1);
      const rootPrefix = '../'.repeat(depth);
      const footerHost = `<footer id="site-footer" data-root-path="${rootPrefix}"></footer>`;
	      const STYLES_V = 33;
	      const HEADER_V = 9;
	      const FOOTER_V = 20;
	      const EDITOR_V = 35;
	      const SHELL_V = 6;
	      const PROJECT_LIGHTBOX_V = 1;
	      const PROJECT_CAROUSEL_V = 5;
	      const COURSES_CERTS_V = 11;
	      const PROJECTS_V = 4;
	      const PROJECT_DETAIL_LAYOUT_V = 4;
      const footerScript = `<script src="${rootPrefix}js/footer.js?v=${FOOTER_V}"></script>`;
      const headerScript = `<script src="${rootPrefix}js/header.js?v=${HEADER_V}"></script>`;
      const editorScript = `<script src="${rootPrefix}js/editor-auth.js?v=${EDITOR_V}"></script>`;
      const shellScript = `<script src="${rootPrefix}js/site-shell.js?v=${SHELL_V}"></script>`;
      const lightboxScript = `<script src="${rootPrefix}js/project-image-lightbox.js?v=${PROJECT_LIGHTBOX_V}"></script>`;
      const carouselScript = `<script src="${rootPrefix}js/project-screenshots-carousel.js?v=${PROJECT_CAROUSEL_V}"></script>`;

      let out = safeHtml;

      // Ensure the snapshot marker exists so the client can avoid infinite hydration loops.
      if (!/<meta\b[^>]*\bname=(['"])cms-snapshot\1/i.test(out)) {
        out = out.replace(
          /<head\b[^>]*>/i,
          (m) => `${m}\n  <meta name="cms-snapshot" content="1">`
        );
      }

	      // Repair a previously-published broken script tag (`src="js/"`, `src="../js/"`, etc.).
	      out = out.replace(/<script\b[^>]*\bsrc=(['"])(?:\.\.\/)*js\/\1[^>]*>\s*<\/script>/gi, '');

	      // Strip dynamic background scripts that should remain code-driven.
	      // These can get frozen into CMS snapshots via DOM cloning and cause double-init.
	      out = out.replace(/<script\b[^>]*\bsrc=(['"])[^'"]*three\.min\.js\1[^>]*>\s*<\/script>/gi, '');
	      out = out.replace(/<script\b[^>]*\bsrc=(['"])(?:\.\.\/)*js\/particles\.js\1[^>]*>\s*<\/script>/gi, '');
	      out = out.replace(/<script\b[^>]*\bsrc=(['"])(?:\.\.\/)*js\/background-animation\.js\1[^>]*>\s*<\/script>/gi, '');

	      // Force current cache busters even if the snapshot already has older v= values.
	      out = out.replace(/(assets\/css\/styles\.css\?v=)\d+/gi, `$1${STYLES_V}`);
	      out = out.replace(/(js\/header\.js\?v=)\d+/gi, `$1${HEADER_V}`);
	      out = out.replace(/(js\/footer\.js\?v=)\d+/gi, `$1${FOOTER_V}`);
	      out = out.replace(/(js\/editor-auth\.js\?v=)\d+/gi, `$1${EDITOR_V}`);
	      out = out.replace(/(js\/site-shell\.js\?v=)\d+/gi, `$1${SHELL_V}`);
	      out = out.replace(/(js\/project-image-lightbox\.js\?v=)\d+/gi, `$1${PROJECT_LIGHTBOX_V}`);
	      out = out.replace(/(js\/project-screenshots-carousel\.js\?v=)\d+/gi, `$1${PROJECT_CAROUSEL_V}`);
	      out = out.replace(/(assets\/js\/courses-certifications\.js\?v=)\d+/gi, `$1${COURSES_CERTS_V}`);
	      out = out.replace(/(js\/projects-page\.js\?v=)\d+/gi, `$1${PROJECTS_V}`);
	      out = out.replace(/project-detail-layout\.css(?:\?v=\d+)?/gi, `project-detail-layout.css?v=${PROJECT_DETAIL_LAYOUT_V}`);

      // Ensure the footer host exists (some snapshots were saved without it).
      if (!/\bid=(['"])site-footer\1/i.test(out)) {
        out = out.replace(/<\/body>/i, `${footerHost}\n</body>`);
        if (out === safeHtml) out = `${out}\n${footerHost}\n`;
      } else {
        // Ensure root path attribute exists when the host is present.
        out = out.replace(
          /<footer\b([^>]*\bid=(['"])site-footer\2)(?![^>]*\bdata-root-path=)([^>]*)>/i,
          `<footer$1 data-root-path="${rootPrefix}"$3>`
        );
      }

      // Ensure footer rendering script exists.
      if (!/js\/footer\.js/i.test(out)) {
        out = out.replace(/<\/body>/i, `${footerScript}\n</body>`);
        if (!/js\/footer\.js/i.test(out)) out = `${out}\n${footerScript}\n`;
      }

      // Ensure header script exists so nav renders when the snapshot omitted it.
      if (!/js\/header\.js/i.test(out)) {
        out = out.replace(/<\/body>/i, `${headerScript}\n</body>`);
        if (!/js\/header\.js/i.test(out)) out = `${out}\n${headerScript}\n`;
      }

      // Ensure editor script exists so the gear button can always load.
      if (!/js\/editor-auth\.js/i.test(out)) {
        out = out.replace(/<\/body>/i, `${editorScript}\n</body>`);
        if (!/js\/editor-auth\.js/i.test(out)) out = `${out}\n${editorScript}\n`;
      }

      // Ensure the site shell exists so dynamic theme + background can re-initialize after hydration.
      if (!/js\/site-shell\.js/i.test(out)) {
        out = out.replace(/<\/body>/i, `${shellScript}\n</body>`);
        if (!/js\/site-shell\.js/i.test(out)) out = `${out}\n${shellScript}\n`;
      }

      // Ensure project detail image expansion script exists after hydration.
      if (!/js\/project-image-lightbox\.js/i.test(out)) {
        out = out.replace(/<\/body>/i, `${lightboxScript}\n</body>`);
        if (!/js\/project-image-lightbox\.js/i.test(out)) out = `${out}\n${lightboxScript}\n`;
      }

      // Ensure project screenshots carousel script exists after hydration.
      if (!/js\/project-screenshots-carousel\.js/i.test(out)) {
        out = out.replace(/<\/body>/i, `${carouselScript}\n</body>`);
        if (!/js\/project-screenshots-carousel\.js/i.test(out)) out = `${out}\n${carouselScript}\n`;
      }

      return out;
    };

    state.cmsHydrated = true;
    // `document.write()` replaces the document but keeps the same Window object.
    // Reset background init flags so the new document can re-initialize canvases/scripts.
    try {
      window.BG_ANIMATION_INITIALIZED = false;
      window.PARTICLES_INITIALIZED = false;
    } catch (_e) {
      // ignore
    }
    document.open();
    document.write(patchSnapshotShell(html, resolvedPagePath));
    document.close();
    return true;
  }

  function injectCSS() {
    const style = document.createElement('style');
    style.id = 'cms-admin-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function loadSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      if (typeof parsed.autosaveEnabled === 'boolean') {
        state.autosaveEnabled = parsed.autosaveEnabled;
      }
    } catch (error) {
      state.autosaveEnabled = true;
    }
  }

  function saveSettings() {
    const payload = { autosaveEnabled: state.autosaveEnabled };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  }

  function isAdmin() {
    const unsafe = window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.unsafeNoAuth === true;
    if (unsafe) return isEditorEnabledFlag();
    return state.authIsAdmin === true;
  }

  function isEditorEnabledFlag() {
    return localStorage.getItem(EDITOR_ENABLED_KEY) === '1';
  }

  function setEditorEnabledFlag(value) {
    if (value) localStorage.setItem(EDITOR_ENABLED_KEY, '1');
    else localStorage.removeItem(EDITOR_ENABLED_KEY);
  }

  let toastTimer = null;
  function notify(message, tone) {
    if (!state.toast) return;
    state.toast.textContent = message;
    state.toast.className = `cms-toast show ${tone || ''}`.trim();
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      state.toast.className = 'cms-toast';
    }, 5000);
  }

  function createUI() {
    state.panel = document.createElement('aside');
    state.panel.className = 'cms-panel cms-ui';
    state.panel.setAttribute('data-cms-ui', '1');
    const unsafe = window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.unsafeNoAuth === true;
    state.panel.innerHTML = `
      <h3>Editor</h3>
      <div class="cms-muted" id="cms-status-line">${unsafe ? 'UNSAFE mode: no login required. Anyone can edit and publish.' : 'Sign in to edit and publish changes.'}</div>

      <div class="cms-row">
        <button type="button" class="cms-btn" id="cms-save-now">Publish</button>
        <button type="button" class="cms-btn-secondary" id="cms-open-dashboard">Dashboard</button>
      </div>

      <div class="cms-row">
        <button type="button" class="cms-btn-secondary" id="cms-sign-out">Sign out</button>
        <button type="button" class="cms-btn-secondary" id="cms-exit">Close</button>
      </div>

      <label class="cms-inline">
        <input id="cms-autosave" type="checkbox" />
        <span id="cms-autosave-label">Auto-publish changes</span>
      </label>

      <details class="cms-details">
        <summary>Section tools</summary>
        <div class="cms-section-box">
          <div class="cms-section-title">Selected</div>
          <div class="cms-section-label" id="cms-section-label">Click a section to edit structure</div>

          <div class="cms-row">
            <button type="button" class="cms-btn-secondary" id="cms-move-up">Up</button>
            <button type="button" class="cms-btn-secondary" id="cms-move-down">Down</button>
          </div>

          <div class="cms-row">
            <button type="button" class="cms-btn-secondary" id="cms-duplicate">Duplicate</button>
            <button type="button" class="cms-btn-danger" id="cms-delete">Delete</button>
          </div>

          <button type="button" class="cms-btn-secondary" id="cms-add-section" style="width:100%;">Add section</button>
        </div>
      </details>
    `;

    state.toast = document.createElement('div');
    state.toast.className = 'cms-toast cms-ui';
    state.toast.setAttribute('data-cms-ui', '1');

    document.body.append(state.panel, state.toast);
    if (!unsafe) createLoginModal();

    state.sectionLabel = state.panel.querySelector('#cms-section-label');

    const autosaveToggle = state.panel.querySelector('#cms-autosave');
    autosaveToggle.checked = state.autosaveEnabled;
    autosaveToggle.addEventListener('change', () => {
      state.autosaveEnabled = autosaveToggle.checked;
      saveSettings();
      notify(state.autosaveEnabled ? 'Auto-publish enabled.' : 'Auto-publish disabled.', 'success');
    });

    state.panel.querySelector('#cms-save-now').addEventListener('click', () => {
      if (!isAdmin()) {
        void openLoginModal();
        return;
      }
      saveCurrentPage({ silent: false, reason: 'manual' });
    });

    state.panel.querySelector('#cms-open-dashboard').addEventListener('click', () => {
      window.location.href = toPageAssetPath('admin/dashboard.html');
    });

    state.panel.querySelector('#cms-sign-out').addEventListener('click', () => {
      const unsafe = window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.unsafeNoAuth === true;
      if (unsafe) return;
      void signOut();
    });

    state.panel.querySelector('#cms-exit').addEventListener('click', () => {
      setEditorEnabledFlag(false);
      disableAdminMode();
      syncAdminLinkState();
      notify('Editor disabled.', 'success');
    });

    state.panel.querySelector('#cms-move-up').addEventListener('click', () => moveSelectedSection('up'));
    state.panel.querySelector('#cms-move-down').addEventListener('click', () => moveSelectedSection('down'));
    state.panel.querySelector('#cms-duplicate').addEventListener('click', duplicateSelectedSection);
    state.panel.querySelector('#cms-delete').addEventListener('click', deleteSelectedSection);
    state.panel.querySelector('#cms-add-section').addEventListener('click', addNewSection);
  }

  function createLoginModal() {
    if (state.loginModal) return;

    state.loginModal = document.createElement('div');
    state.loginModal.className = 'cms-login-modal cms-ui';
    state.loginModal.setAttribute('data-cms-ui', '1');
    state.loginModal.innerHTML = `
      <div class="cms-login-card" role="dialog" aria-modal="true" aria-label="Sign in to edit">
        <h4>Sign in</h4>
        <form class="cms-login-body" id="cms-login-form">
          <label>
            Email
            <input type="email" id="cms-login-email" autocomplete="email" required />
          </label>
          <label>
            Password
            <input type="password" id="cms-login-password" autocomplete="current-password" required />
          </label>
          <div id="cms-login-error" style="display:none; color:#991b1b; font-size:12px; line-height:1.35;"></div>
        </form>
        <div class="cms-login-actions">
          <button type="button" class="cms-btn-secondary" id="cms-login-cancel">Cancel</button>
          <button type="submit" form="cms-login-form" class="cms-btn" id="cms-login-submit">Sign in</button>
        </div>
      </div>
    `;

    state.loginModal.addEventListener('click', (event) => {
      if (event.target === state.loginModal) closeLoginModal();
    });

    document.body.appendChild(state.loginModal);

    const cancelBtn = state.loginModal.querySelector('#cms-login-cancel');
    cancelBtn.addEventListener('click', () => closeLoginModal());

    const form = state.loginModal.querySelector('#cms-login-form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void handleLoginSubmit();
    });
  }

  async function openLoginModal() {
    // Always load config before deciding between UNSAFE vs Auth-gated mode.
    const cfg = await getSupabaseConfig();
    const unsafe = cfg && cfg.unsafeNoAuth === true;

    if (unsafe) {
      setEditorEnabledFlag(true);
      enableAdminMode();
      syncAdminLinkState();
      updateStatusLine();
      notify('Editor enabled (UNSAFE mode).', 'success');
      return;
    }

    // If already signed in as admin, just enable.
    if (state.authIsAdmin) {
      setEditorEnabledFlag(true);
      enableAdminMode();
      syncAdminLinkState();
      updateStatusLine();
      notify('Editor enabled.', 'success');
      return;
    }

    createLoginModal();
    const emailInput = state.loginModal.querySelector('#cms-login-email');
    if (cfg && cfg.adminEmail && !emailInput.value) emailInput.value = cfg.adminEmail;

    const errBox = state.loginModal.querySelector('#cms-login-error');
    errBox.style.display = 'none';
    errBox.textContent = '';

    state.loginModal.classList.add('show');
    setTimeout(() => emailInput.focus(), 0);
  }

  function closeLoginModal() {
    if (!state.loginModal) return;
    state.loginModal.classList.remove('show');
  }

	  function bindGlobalEvents() {
	    document.addEventListener('click', (event) => {
	      const target = event.target;
	      if (!(target instanceof Element)) return;

      const adminLink = target.closest('.admin-link');
      if (adminLink) {
        // Allow normal navigation when using modifier keys (open in new tab, etc.).
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button === 1) return;

        event.preventDefault();
        void (async () => {
          if (document.body.classList.contains('cms-admin-mode')) {
            setEditorEnabledFlag(false);
            disableAdminMode();
            syncAdminLinkState();
            notify('Editor disabled.', 'success');
            return;
          }

          setEditorEnabledFlag(true);
          await openLoginModal();
        })();
	        return;
	      }

	      // Only hijack clicks while the editor UI is active. Otherwise admins can't navigate the site.
	      if (!document.body.classList.contains('cms-admin-mode')) return;
	      if (!isAdmin()) return;
	      if (target.closest('[data-cms-ui="1"]')) return;

	      const anchor = target.closest('a[href]');
	      if (anchor) {
	        // In edit mode, prevent navigation so link text is editable.
	        // Use modifier keys (Cmd/Ctrl/Shift/Alt) or middle click to open links intentionally.
	        if (!(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button === 1)) {
	          event.preventDefault();
	        }
	        return;
	      }

	      const section = target.closest('[data-cms-section="1"]');
	      if (section) {
	        selectSection(section);
	      }
	    }, true);

    document.addEventListener('input', (event) => {
      if (!isAdmin()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const editable = target.closest('[data-cms-editable="1"]');
      if (!editable) return;
      if (shouldDeferAutosaveForEmptyEditable(editable)) return;
      scheduleAutosave('text-change');
    });

    document.addEventListener('blur', (event) => {
      if (!isAdmin()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const editable = target.closest('[data-cms-editable="1"]');
      if (!editable) return;
      if (shouldDeferAutosaveForEmptyEditable(editable)) return;
      scheduleAutosave('text-blur');
    }, true);

    document.addEventListener('keydown', (event) => {
      if (!isAdmin()) return;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 's') {
        event.preventDefault();
        saveCurrentPage({ silent: false, reason: 'shortcut' });
        return;
      }

      if (key === 'escape') {
        return;
      }
    });

    document.addEventListener('focusin', (event) => {
      if (isAdmin()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const editable = target.closest('[contenteditable]');
      if (!editable || editable.closest('[data-cms-ui="1"]')) return;
      lockEditingForNonAdmin();
      if (editable instanceof HTMLElement) editable.blur();
    });

    window.addEventListener('storage', (event) => {
      if (event.key !== EDITOR_ENABLED_KEY) return;
      const shouldEnable = event.newValue === '1';
      if (shouldEnable && isAdmin()) enableAdminMode();
      else disableAdminMode();
      syncAdminLinkState();
    });

    window.addEventListener('resize', () => {
      requestImageControlPositionUpdate();
    });

    window.addEventListener('scroll', () => {
      requestImageControlPositionUpdate();
    }, true);
  }

  function watchForAdminLink() {
    if (!document.body) return;
    const observer = new MutationObserver(() => syncAdminLinkState());
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(syncAdminLinkState, 300);
    setTimeout(syncAdminLinkState, 900);
  }

  function syncAdminLinkState() {
    const link = document.querySelector('.admin-link');
    if (!link) return;
    const on = document.body.classList.contains('cms-admin-mode');
    link.dataset.state = on ? 'on' : 'off';
    link.title = on ? 'Editor active (click to disable)' : 'Enable editor';
    link.setAttribute('aria-label', on ? 'Editor active, click to disable' : 'Enable editor');
  }

	  function enableAdminMode() {
	    if (!isAdmin()) {
	      lockEditingForNonAdmin();
	      return;
	    }
	    document.body.classList.add('cms-admin-mode');
	    detectServerMode();
	    refreshEditorTargets();
	    startEditorDomObserver();
	  }

	  function disableAdminMode() {
	    stopEditorDomObserver();
	    if (state.autosaveTimer) {
	      clearTimeout(state.autosaveTimer);
	      state.autosaveTimer = null;
	    }

    if (state.selectedSection) {
      state.selectedSection.classList.remove('cms-section-selected');
      state.selectedSection = null;
    }

    document.body.classList.remove('cms-admin-mode');

    lockEditingForNonAdmin();

    updateSectionLabel();
  }

	  function lockEditingForNonAdmin() {
	    clearImageControls();

	    document.querySelectorAll('[contenteditable], [data-cms-editable="1"]').forEach((el) => {
      if (el.closest('[data-cms-ui="1"]')) return;
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      el.removeAttribute('data-cms-editable');
      el.classList.remove('cms-text-target');
    });

    document.querySelectorAll('[data-cms-section="1"]').forEach((el) => {
      el.removeAttribute('data-cms-section');
      el.classList.remove('cms-section-target');
      el.classList.remove('cms-section-selected');
    });

	    document.querySelectorAll('[data-cms-image-id], [data-cms-image-kind]').forEach((el) => {
	      el.removeAttribute('data-cms-image-id');
	      el.removeAttribute('data-cms-image-kind');
	    });
	  }

	  function startEditorDomObserver() {
	    if (state.editorDomObserver) return;
	    if (typeof MutationObserver !== 'function') return;

	    const schedule = () => {
	      if (!document.body.classList.contains('cms-admin-mode')) return;
	      if (state.editorDomRefreshTimer) clearTimeout(state.editorDomRefreshTimer);
	      state.editorDomRefreshTimer = setTimeout(() => {
	        state.editorDomRefreshTimer = null;
	        if (!document.body.classList.contains('cms-admin-mode')) return;
	        refreshEditorTargets();
	      }, 180);
	    };

	    state.editorDomObserver = new MutationObserver((mutations) => {
	      // Only refresh when something structural changes (nodes added/removed).
	      for (const m of mutations || []) {
	        if ((m.addedNodes && m.addedNodes.length) || (m.removedNodes && m.removedNodes.length)) {
	          schedule();
	          break;
	        }
	      }
	    });

	    const roots = [];
	    const main = document.querySelector('main');
	    if (main) roots.push(main);
	    const header = document.getElementById('site-header');
	    if (header) roots.push(header);
	    const footer = document.getElementById('site-footer');
	    if (footer) roots.push(footer);
	    if (roots.length === 0) roots.push(document.body);

	    roots.forEach((root) => {
	      try {
	        state.editorDomObserver.observe(root, { childList: true, subtree: true });
	      } catch (_e) {}
	    });
	  }

	  function stopEditorDomObserver() {
	    if (state.editorDomRefreshTimer) {
	      clearTimeout(state.editorDomRefreshTimer);
	      state.editorDomRefreshTimer = null;
	    }
	    if (state.editorDomObserver) {
	      try { state.editorDomObserver.disconnect(); } catch (_e) {}
	      state.editorDomObserver = null;
	    }
	  }

	  function refreshEditorTargets() {
	    clearImageControls();

	    document.querySelectorAll('[data-cms-editable="1"]').forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      el.removeAttribute('data-cms-editable');
      el.classList.remove('cms-text-target');
    });

    document.querySelectorAll('[data-cms-section="1"]').forEach((el) => {
      el.removeAttribute('data-cms-section');
      el.classList.remove('cms-section-target');
      el.classList.remove('cms-section-selected');
    });

    const rawEditable = Array.from(document.querySelectorAll('body *')).filter(isEditableTextElement);
    const picked = [];

    rawEditable.forEach((element) => {
      if (picked.some((parent) => parent.contains(element))) return;
      picked.push(element);
    });

    picked.forEach((element) => {
      element.setAttribute('data-cms-editable', '1');
      element.setAttribute('contenteditable', 'true');
      element.setAttribute('spellcheck', 'true');
      element.classList.add('cms-text-target');
    });

    const sections = Array.from(document.querySelectorAll(SECTION_SELECTOR)).filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element.closest('[data-cms-ui="1"]')) return false;
      if (element.closest('[data-resume-dynamic="1"]')) return false;
      return true;
    });

    sections.forEach((element) => {
      element.setAttribute('data-cms-section', '1');
      element.classList.add('cms-section-target');
    });

    if (state.selectedSection && document.contains(state.selectedSection)) {
      state.selectedSection.classList.add('cms-section-selected');
    } else {
      state.selectedSection = null;
    }

    markEditableImages();
    requestImageControlPositionUpdate();
    updateSectionLabel();
  }

  function clearImageControls() {
    state.imageControls.forEach((control) => {
      if (control && control.panel) control.panel.remove();
    });
    state.imageControls.clear();

    if (state.imageRepositionRaf) {
      cancelAnimationFrame(state.imageRepositionRaf);
      state.imageRepositionRaf = null;
    }
  }

  function requestImageControlPositionUpdate() {
    if (!isAdmin() || state.imageControls.size === 0) return;
    if (state.imageRepositionRaf) return;

    state.imageRepositionRaf = requestAnimationFrame(() => {
      state.imageRepositionRaf = null;
      updateImageControlPositions();
    });
  }

  function updateImageControlPositions() {
    if (!isAdmin()) return;

    const viewportW = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;

    state.imageControls.forEach((control, controlId) => {
      const { target, panel } = control;
      if (!(target instanceof HTMLElement) || !document.contains(target)) {
        panel.remove();
        state.imageControls.delete(controlId);
        return;
      }

      const rect = target.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) {
        panel.style.display = 'none';
        return;
      }

      const outsideViewport = rect.bottom < 0 || rect.top > viewportH || rect.right < 0 || rect.left > viewportW;
      if (outsideViewport) {
        panel.style.display = 'none';
        return;
      }

      panel.style.display = 'flex';

      const top = Math.min(Math.max(8, rect.top + 8), Math.max(8, viewportH - 42));
      const left = Math.min(Math.max(8, rect.right - 8), Math.max(8, viewportW - 8));
      panel.style.top = `${top}px`;
      panel.style.left = `${left}px`;
    });
  }

  function markEditableImages() {
    if (!isAdmin()) return;

    let imgIdx = 1;
    const images = Array.from(document.querySelectorAll('img')).filter((el) => {
      if (!(el instanceof HTMLImageElement)) return false;
      if (el.closest('[data-cms-ui="1"]')) return false;
      if (el.closest('[data-resume-dynamic="1"]')) return false;
      return true;
    });

    images.forEach((img) => {
      if (!img.getAttribute('src')) {
        img.setAttribute('src', getDefaultPlaceholderPagePath());
      }

      img.dataset.cmsImageId = `img-${imgIdx++}`;
      img.dataset.cmsImageKind = 'img';
      ensureAssetSlot(img, 'img');
      createImageControlsForTarget(img, 'img');
      if (!img.complete) {
        img.addEventListener('load', () => requestImageControlPositionUpdate(), { once: true });
      }
    });

    let bgIdx = 1;
    const backgroundTargets = Array.from(document.querySelectorAll('body *')).filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.closest('[data-cms-ui="1"]')) return false;
      if (el.closest('[data-resume-dynamic="1"]')) return false;
      if (el.tagName === 'IMG') return false;
      const bgUrl = getBackgroundImageUrl(el);
      const className = typeof el.className === 'string' ? el.className : '';
      const forcedPlaceholder = /(?:^|\s)img-placeholder(?:\s|$)/.test(className);
      if (!bgUrl && !forcedPlaceholder) return false;
      const rect = el.getBoundingClientRect();
      return rect.width >= 24 && rect.height >= 24;
    });

    backgroundTargets.forEach((el) => {
      el.dataset.cmsImageId = `bg-${bgIdx++}`;
      el.dataset.cmsImageKind = 'bg';
      ensureAssetSlot(el, 'bg');
      createImageControlsForTarget(el, 'bg');
    });
  }

	  function getDefaultPlaceholderPagePath() {
	    const cfg = window.__SUPABASE_CONFIG__ || {};
	    const bucket = cfg && cfg.cms && cfg.cms.assetsBucket ? String(cfg.cms.assetsBucket) : '';
	    const url = cfg && cfg.url ? String(cfg.url) : '';
	    if (bucket && url) {
	      const base = `${url.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/`;
	      return `${base}images/placeholders/placeholder.png`;
	    }
	    return toPageAssetPath('assets/images/placeholders/placeholder.png');
	  }

	  function isPlaceholderAssetPath(assetPath) {
	    const value = String(assetPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
	    return value.startsWith('assets/images/placeholders/');
	  }

  function ensureAssetSlot(target, kind) {
    if (!(target instanceof HTMLElement)) return '';
    if (target.dataset.assetSlot) return target.dataset.assetSlot;

    const fingerprint = computeDomFingerprint(target);
    const short = hashString(fingerprint).slice(0, 10);
    const slot = `${kind}-${short}`;
    target.dataset.assetSlot = slot;
    return slot;
  }

  function computeDomFingerprint(element) {
    const parts = [];
    let node = element;
    while (node && node.nodeType === 1 && node !== document.body && parts.length < 10) {
      const el = node;
      const tag = (el.tagName || '').toLowerCase();
      if (!tag) break;
      if (el.id) {
        parts.push(`${tag}#${el.id}`);
      } else {
        let idx = 1;
        let sib = el;
        while ((sib = sib.previousElementSibling)) {
          if (sib.tagName === el.tagName) idx++;
        }
        parts.push(`${tag}:nth-of-type(${idx})`);
      }
      node = el.parentElement;
    }
    parts.push('body');
    return parts.reverse().join('>');
  }

  function hashString(value) {
    // FNV-1a 32-bit
    let h = 0x811c9dc5;
    const str = String(value || '');
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function createImageControlsForTarget(target, kind) {
    if (!(target instanceof HTMLElement)) return;
    const controlId = target.dataset.cmsImageId || `${kind}-${Date.now()}`;

    const panel = document.createElement('div');
    panel.className = 'cms-image-actions cms-ui';
    panel.setAttribute('data-cms-ui', '1');
    panel.dataset.cmsImageControl = controlId;

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'cms-image-btn';
    uploadBtn.textContent = 'Upload';
    uploadBtn.title = 'Upload image from device';
	    uploadBtn.addEventListener('click', (event) => {
	      event.preventDefault();
	      event.stopPropagation();
	      handleImageUpload(target, kind, uploadBtn);
	    });

    const linkBtn = document.createElement('button');
    linkBtn.type = 'button';
    linkBtn.className = 'cms-image-btn';
    linkBtn.textContent = 'Link';
    linkBtn.title = 'Use image URL';
    linkBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleImageLink(target, kind);
    });

    panel.append(uploadBtn, linkBtn);
    panel.addEventListener('click', (event) => event.stopPropagation());
    document.body.appendChild(panel);

    state.imageControls.set(controlId, { target, kind, panel });
  }

  function getBackgroundImageUrl(target) {
    if (!(target instanceof HTMLElement)) return '';
    const inline = extractUrlFromBackground(target.style.backgroundImage || '');
    if (inline) return inline;
    const computed = window.getComputedStyle(target).backgroundImage || '';
    return extractUrlFromBackground(computed);
  }

  function extractUrlFromBackground(value) {
    const match = String(value || '').match(/url\((['"]?)(.*?)\1\)/i);
    return match ? String(match[2] || '').trim() : '';
  }

		  async function handleImageUpload(target, kind, triggerBtn) {
		    if (!isAdmin()) {
		      notify('Sign in to upload images.', 'warn');
		      try { void openLoginModal(); } catch (_e) {}
		      return;
		    }

	    const input = document.createElement('input');
	    input.type = 'file';
	    input.accept = 'image/*';
	    // Some browsers are picky about triggering the file picker from detached inputs.
	    input.style.position = 'fixed';
	    input.style.left = '-9999px';
	    input.style.width = '1px';
	    input.style.height = '1px';
	    input.style.opacity = '0';
	    input.setAttribute('aria-hidden', 'true');
	    document.body.appendChild(input);

	    const uploadBtn = (triggerBtn instanceof HTMLElement) ? triggerBtn : null;
	    const uploadBtnLabel = uploadBtn ? String(uploadBtn.textContent || '') : '';
	    const setUploadBusy = (busy) => {
	      if (!uploadBtn) return;
	      uploadBtn.disabled = Boolean(busy);
	      uploadBtn.textContent = busy ? 'Uploading...' : (uploadBtnLabel || 'Upload');
	    };

	    input.addEventListener('change', async () => {
	      const file = (input.files || [])[0];
	      input.remove();
	      if (!file) return;

	      // Snapshot current value so we can revert if upload fails.
	      const previousRef = getCurrentImageReference(target, kind) || '';
	      const previousAssetPath = (target instanceof HTMLElement) ? String(target.dataset.assetPath || '') : '';

	      let previewUrl = '';
	      try {
	        if (typeof URL === 'object' && typeof URL.createObjectURL === 'function') {
	          previewUrl = URL.createObjectURL(file);
	        }
	      } catch (_e) {
	        previewUrl = '';
	      }

	      let cfg = null;
	      let uploadFunctionName = 'cms-upload';

	      try {
	        state.uploadsInFlight = (state.uploadsInFlight || 0) + 1;
	        updateStatusLine();
	        setUploadBusy(true);

	        if (previewUrl) {
	          applyImageValue(target, kind, previewUrl);
	          requestImageControlPositionUpdate();
	        }
	        notify('Uploading image...', 'warn');

	        // Preferred path: Supabase Storage (works on static hosting).
	        cfg = await getSupabaseConfig();
	        if (cfg && cfg.cms && cfg.cms.uploadFunction) {
	          uploadFunctionName = String(cfg.cms.uploadFunction || uploadFunctionName);
	        }
	        const sb = await getSupabaseClient();
	        const supabaseConfigured = Boolean(cfg && cfg.url && cfg.anonKey && cfg.cms && cfg.cms.assetsBucket);
	        if (supabaseConfigured) {
	          if (!sb) throw new Error('Supabase client is not available (failed to load supabase-js).');
	          const bucket = String(cfg.cms.assetsBucket || 'resume-cms');
	          const ext = extensionFromFile(file);
	          let destination = inferTargetAssetPath(target, kind, ext);
	          destination = normalizeDestinationExtension(destination, ext);
	          const objectPath = destination.replace(/^assets\//, '');
	          if (target instanceof HTMLElement) target.dataset.assetPath = destination;

	          const fn = cfg.cms && cfg.cms.uploadFunction ? String(cfg.cms.uploadFunction) : 'cms-upload';
	          const publicUrl = await uploadFileViaSupabaseFunction(sb, cfg, fn, { bucket, path: objectPath, file });

	          applyImageValue(target, kind, withAssetVersion(publicUrl));
	          await syncProjectPreviewImageRecord(target, kind, publicUrl);
	          requestImageControlPositionUpdate();

	          if (state.autosaveEnabled) {
	            scheduleAutosave('image-upload');
	            notify('Image uploaded to Supabase and queued for publish.', 'success');
	          } else {
	            notify('Image uploaded to Supabase. Click "Publish" to save page changes.', 'success');
	          }
	          return;
	        }

	        if (await detectServerMode()) {
	          const ext = extensionFromFile(file);
	          let destination = inferTargetAssetPath(target, kind, ext);
	          destination = normalizeDestinationExtension(destination, ext);
	          target.dataset.assetPath = destination;

          const form = new FormData();
          form.append('path', destination);
          form.append('file', file, file.name || `upload.${ext || 'jpg'}`);

          const res = await fetch('/__cms/upload', { method: 'POST', body: form });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok || !payload || payload.ok !== true) {
            throw new Error(payload && payload.error ? payload.error : 'Upload failed');
          }

	          const pageAssetPath = toPageAssetPath(destination);
	          applyImageValue(target, kind, withAssetVersion(pageAssetPath));
	          await syncProjectPreviewImageRecord(target, kind, pageAssetPath);
	          requestImageControlPositionUpdate();

          if (state.autosaveEnabled) {
            scheduleAutosave('image-upload');
            notify(`Image saved to ${destination}.`, 'success');
          } else {
            notify(`Image saved to ${destination}. Click "Publish" to persist HTML changes.`, 'success');
          }
          return;
        }

        if (!supportsFileSystemAccessApi()) {
          const dataUrl = await fileToDataUrl(file);
          applyImageValue(target, kind, dataUrl);
          await syncProjectPreviewImageRecord(target, kind, dataUrl);
          requestImageControlPositionUpdate();

          if (state.autosaveEnabled) {
            scheduleAutosave('image-upload-inline');
            notify('Image embedded and queued for local backup.', 'success');
          } else {
            notify('Image embedded. Click "Publish" to keep this change.', 'success');
          }
          return;
        }

        const rootHandle = await ensureProjectRootHandle(true);
        if (!rootHandle) return;

	        const ext = extensionFromFile(file);
	        let destination = inferTargetAssetPath(target, kind, ext);
	        destination = normalizeDestinationExtension(destination, ext);
	        target.dataset.assetPath = destination;
	        await writeBlobToRepo(rootHandle, destination, file);

	        const pageAssetPath = toPageAssetPath(destination);
	        applyImageValue(target, kind, withAssetVersion(pageAssetPath));
	        await syncProjectPreviewImageRecord(target, kind, pageAssetPath);
	        requestImageControlPositionUpdate();

        if (state.autosaveEnabled) {
          scheduleAutosave('image-upload');
          notify(`Image uploaded and applied from ${destination}.`, 'success');
        } else {
          notify(`Image uploaded from ${destination}. Click \"Publish\" to persist HTML changes.`, 'success');
        }
	      } catch (error) {
	        console.error(error);
	        const msg = error && error.message ? error.message : String(error);
	        // Revert preview on failure.
	        if (previousRef) {
	          applyImageValue(target, kind, previousRef);
	        } else if (kind === 'img' && target instanceof HTMLElement) {
	          target.setAttribute('src', getDefaultPlaceholderPagePath());
	        }
	        if (target instanceof HTMLElement) {
	          if (previousAssetPath) target.dataset.assetPath = previousAssetPath;
	          else delete target.dataset.assetPath;
	        }
	        requestImageControlPositionUpdate();
	        notify(`Image upload failed: ${msg}`, 'error');

	        // Make failures obvious (users often miss toasts behind fixed elements).
	        window.alert(
	          `Image upload failed.\\n\\n${msg}\\n\\nTip: sign in as the admin user and ensure the Supabase Edge Function \"${uploadFunctionName}\" has SUPABASE_SERVICE_ROLE_KEY configured.`
	        );
	      } finally {
	        try {
	          if (previewUrl && typeof URL === 'object' && typeof URL.revokeObjectURL === 'function') {
	            URL.revokeObjectURL(previewUrl);
	          }
	        } catch (_e) {}
	        state.uploadsInFlight = Math.max(0, (state.uploadsInFlight || 1) - 1);
	        updateStatusLine();
	        setUploadBusy(false);
	      }
	    }, { once: true });

	    input.click();
	  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read the selected image file.'));
      reader.readAsDataURL(file);
    });
  }

  function handleImageLink(target, kind) {
    if (!isAdmin()) return;

    const current = getCurrentImageReference(target, kind);
    const initial = /^https?:\/\//i.test(current) ? current : 'https://';
    const entered = window.prompt('Paste image URL (http:// or https://)', initial);
    if (!entered) return;

    const url = entered.trim();
    if (!isValidHttpUrl(url)) {
      notify('Invalid URL. Use a full http:// or https:// image URL.', 'warn');
      return;
    }

    applyImageValue(target, kind, url);
    void syncProjectPreviewImageRecord(target, kind, url);
    requestImageControlPositionUpdate();
    if (target instanceof HTMLElement) {
      delete target.dataset.assetPath;
    }

    if (state.autosaveEnabled) {
      scheduleAutosave('image-link');
      notify(
        'Image URL applied and queued for publish.',
        'success'
      );
    } else {
      notify(
        'Image URL applied. Click "Publish" to persist page changes.',
        'success'
      );
    }
  }

  function getCurrentImageReference(target, kind) {
    if (!(target instanceof HTMLElement)) return '';
    if (kind === 'img') {
      return target.getAttribute('src') || '';
    }
    return getBackgroundImageUrl(target);
  }

  function applyImageValue(target, kind, value) {
    if (!(target instanceof HTMLElement)) return;
    if (kind === 'img') {
      target.setAttribute('src', value);
      return;
    }

    const safeValue = String(value || '').replace(/"/g, '%22');
    target.style.backgroundImage = `url("${safeValue}")`;
  }

  function extractProjectSlugFromHref(rawHref) {
    const href = String(rawHref || '').trim();
    if (!href) return '';
    const clean = href.split('#', 1)[0].split('?', 1)[0];
    const last = clean.split('/').filter(Boolean).pop() || '';
    return last.replace(/\.html$/i, '');
  }

  function normalizeProjectHref(rawHref) {
    const href = String(rawHref || '').trim();
    if (!href) return '';
    const clean = href
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/^\/+/, '')
      .replace(/^\.\/+/, '')
      .replace(/^(\.\.\/)+/, '')
      .split('#', 1)[0]
      .split('?', 1)[0];
    return clean;
  }

  async function syncProjectPreviewImageRecord(target, kind, nextValue) {
    if (!(target instanceof HTMLElement)) return;
    if (kind !== 'img') return;

    const grid = target.closest('#projects-grid');
    const card = target.closest('.project-card');
    if (!grid || !card) return;

    const primaryLink = card.querySelector('a.project-img-frame') || card.querySelector('a.project-link') || card.querySelector('a[href]');
    const hrefRaw = primaryLink ? (primaryLink.getAttribute('href') || '') : '';
    const href = normalizeProjectHref(hrefRaw);
    const slug = extractProjectSlugFromHref(href);
    if (!href && !slug) return;

    const cfg = await getSupabaseConfig();
    const sb = await getSupabaseClient();
    if (!cfg || !cfg.url || !cfg.anonKey || !sb) return;

    const imageRef = String(nextValue || target.getAttribute('src') || target.src || '').trim();
    const imagePath = resolveAssetPath(imageRef);
    const imageUrlForDb = imagePath || imageRef;
    if (!imageUrlForDb) return;

    const findByHref = async () => {
      if (!href) return null;
      const { data, error } = await sb
        .from('projects')
        .select('id,href')
        .eq('href', href)
        .limit(1);
      if (error) return null;
      return Array.isArray(data) && data[0] ? data[0] : null;
    };

    const findBySlug = async () => {
      if (!slug) return null;
      const { data, error } = await sb
        .from('projects')
        .select('id,href')
        .ilike('href', `%${slug}.html`)
        .limit(10);
      if (error || !Array.isArray(data) || data.length === 0) return null;
      const preferred = data.find((row) => normalizeProjectHref(row && row.href) === href);
      return preferred || data[0] || null;
    };

    const row = (await findByHref()) || (await findBySlug());
    if (!row || !row.id) return;

    const { error: updateError } = await sb
      .from('projects')
      .update({ image_url: imageUrlForDb })
      .eq('id', row.id);

    if (updateError) {
      notify(`Preview image sync failed: ${updateError.message || String(updateError)}`, 'warn');
      return;
    }

    notify('Project preview image saved to server.', 'success');
  }

  function withAssetVersion(rawUrl) {
    const value = String(rawUrl || '').trim();
    if (!value) return value;
    if (/^(data:|blob:)/i.test(value)) return value;

    const hashIndex = value.indexOf('#');
    const base = hashIndex === -1 ? value : value.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : value.slice(hashIndex);

    const qIndex = base.indexOf('?');
    const path = qIndex === -1 ? base : base.slice(0, qIndex);
    const query = qIndex === -1 ? '' : base.slice(qIndex + 1);

    const kept = query
      ? query
        .split('&')
        .filter(Boolean)
        .filter((part) => {
          const key = part.split('=', 1)[0];
          return key !== 'v' && key !== 'cb';
        })
      : [];

    kept.push(`v=${Date.now()}`);
    return `${path}?${kept.join('&')}${hash}`;
  }

  function isValidHttpUrl(value) {
    try {
      const parsed = new URL(String(value || '').trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  function compactText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function shouldDeferAutosaveForEmptyEditable(element) {
    if (!(element instanceof HTMLElement)) return false;
    return compactText(element.textContent || '') === '';
  }

	  function isEditableTextElement(element) {
	    if (!(element instanceof HTMLElement)) return false;
	    if (element.closest('[data-cms-ui="1"]')) return false;
	    if (element.closest('[data-resume-dynamic="1"]')) return false;

	    const tag = element.tagName;
	    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'META' || tag === 'SVG' || tag === 'PATH') {
	      return false;
	    }

    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION' || tag === 'BUTTON') {
      return false;
    }

    if (tag === 'IMG' || tag === 'VIDEO' || tag === 'AUDIO' || tag === 'CANVAS' || tag === 'IFRAME') {
      return false;
    }

	    if (element.querySelector('img, video, audio, canvas, iframe, form, table')) {
	      return false;
	    }

    const children = Array.from(element.children);
    const text = compactText(element.textContent || '');
    if (!text) {
      if (!EMPTY_EDITABLE_TAGS.has(tag)) return false;
      if (children.length === 0) return true;
      const hasNonBreakChild = children.some((child) => child.tagName !== 'BR');
      return !hasNonBreakChild;
    }

    if (children.length === 0) return true;

    const hasBlockChild = children.some((child) => BLOCK_TAGS.has(child.tagName));
    return !hasBlockChild;
  }

  function selectSection(section) {
    if (!(section instanceof HTMLElement)) return;

    if (state.selectedSection && state.selectedSection !== section) {
      state.selectedSection.classList.remove('cms-section-selected');
    }

    state.selectedSection = section;
    state.selectedSection.classList.add('cms-section-selected');
    updateSectionLabel();
  }

  function updateSectionLabel() {
    if (!state.sectionLabel) return;
    if (!state.selectedSection || !document.contains(state.selectedSection)) {
      state.sectionLabel.textContent = 'Click a section to edit structure';
      return;
    }

    const tag = state.selectedSection.tagName.toLowerCase();
    const classes = Array.from(state.selectedSection.classList)
      .filter((c) => c !== 'cms-section-target' && c !== 'cms-section-selected')
      .slice(0, 3)
      .join('.');

    const label = classes ? `<${tag}> .${classes}` : `<${tag}>`;
    state.sectionLabel.textContent = label;
  }

  function moveSelectedSection(direction) {
    if (!isAdmin()) return;
    if (!state.selectedSection || !state.selectedSection.parentElement) {
      notify('Select a section first.', 'warn');
      return;
    }

    const parent = state.selectedSection.parentElement;
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(state.selectedSection);

    if (index < 0) return;

    if (direction === 'up') {
      if (index === 0) return;
      parent.insertBefore(state.selectedSection, siblings[index - 1]);
      scheduleAutosave('section-move-up');
      notify('Section moved up.', 'success');
      return;
    }

    if (direction === 'down') {
      if (index >= siblings.length - 1) return;
      parent.insertBefore(siblings[index + 1], state.selectedSection);
      scheduleAutosave('section-move-down');
      notify('Section moved down.', 'success');
    }
  }

  function duplicateSelectedSection() {
    if (!isAdmin()) return;
    if (!state.selectedSection || !state.selectedSection.parentElement) {
      notify('Select a section to duplicate.', 'warn');
      return;
    }

    const clone = state.selectedSection.cloneNode(true);
    clone.classList.remove('cms-section-selected', 'cms-section-target');
    clone.removeAttribute('data-cms-section');

    state.selectedSection.insertAdjacentElement('afterend', clone);
    refreshEditorTargets();
    selectSection(clone);
    scheduleAutosave('section-duplicate');
    notify('Section duplicated.', 'success');
  }

  function deleteSelectedSection() {
    if (!isAdmin()) return;
    if (!state.selectedSection || !state.selectedSection.parentElement) {
      notify('Select a section to delete.', 'warn');
      return;
    }

    const ok = window.confirm('You are about to delete this section. This action cannot be automatically undone. Continue?');
    if (!ok) return;

    const parent = state.selectedSection.parentElement;
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(state.selectedSection);
    state.selectedSection.remove();

    const next = siblings[index + 1] || siblings[index - 1] || null;
    refreshEditorTargets();

    if (next && document.contains(next)) {
      selectSection(next);
    } else {
      state.selectedSection = null;
      updateSectionLabel();
    }

    scheduleAutosave('section-delete');
    notify('Section deleted.', 'success');
  }

  function addNewSection() {
    if (!isAdmin()) return;
    const main = document.querySelector('main');
    if (!main) {
      notify('No <main> element found to insert the section.', 'error');
      return;
    }

    const title = window.prompt('Title for the new section:', 'New section');
    if (title === null) return;

    const text = window.prompt('Initial text for the new section:', 'Write the content for this section here.');
    if (text === null) return;

    const section = document.createElement('section');
    section.innerHTML = `
      <h2>${escapeHTML(title)}</h2>
      <p>${escapeHTML(text)}</p>
    `;

    if (state.selectedSection && state.selectedSection.parentElement) {
      state.selectedSection.insertAdjacentElement('afterend', section);
    } else {
      main.appendChild(section);
    }

    refreshEditorTargets();
    selectSection(section);
    scheduleAutosave('section-add');
    notify('New section created.', 'success');
  }

  function escapeHTML(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function scheduleAutosave(reason) {
    if (!isAdmin() || !state.autosaveEnabled) return;

    if (state.autosaveTimer) clearTimeout(state.autosaveTimer);
    state.autosaveTimer = setTimeout(() => {
      saveCurrentPage({ silent: true, reason, allowPicker: false });
    }, 900);
  }

  async function ensureProjectRootHandle(allowPicker) {
    if (!supportsFileSystemAccessApi()) return null;

    if (!state.rootDirHandle) {
      if (!allowPicker) return null;
      state.rootDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    }

    let permission = 'prompt';
    if (typeof state.rootDirHandle.queryPermission === 'function') {
      permission = await state.rootDirHandle.queryPermission({ mode: 'readwrite' });
    }

    if (permission !== 'granted') {
      if (!allowPicker) return null;
      if (typeof state.rootDirHandle.requestPermission === 'function') {
        permission = await state.rootDirHandle.requestPermission({ mode: 'readwrite' });
      }
    }

    if (permission !== 'granted') {
      throw new Error('Write permission denied for the selected folder.');
    }

    return state.rootDirHandle;
  }

  async function saveCurrentPage(options) {
    const { silent = false, reason = 'manual', allowPicker = true } = options || {};
    if (!isAdmin()) {
      if (!silent) notify('Sign in to edit and publish changes.', 'warn');
      return;
    }

    if (state.saveInFlight) {
      state.saveQueued = true;
      return;
    }

    state.saveInFlight = true;

    try {
      const html = buildCleanHtmlSnapshot();
      const persistToLocalServer = async (relativePath) => {
        if (!(await detectServerMode())) return false;
        const res = await fetch('/__cms/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: relativePath, html })
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload || payload.ok !== true) {
          throw new Error(payload && payload.error ? payload.error : 'Local save failed');
        }
        return true;
      };

      // Primary: publish to Supabase (CMS snapshots).
      const cfg = await getSupabaseConfig();
      const sb = await getSupabaseClient();
      if (sb && cfg && cfg.cms && cfg.cms.pagesTable) {
        const table = String(cfg.cms.pagesTable || 'cms_pages');
        const path = getPreferredCurrentPagePath();
        if (path.startsWith('admin/')) {
          if (!silent) notify('Publishing admin pages is disabled.', 'warn');
          return;
        }
        const { error } = await sb.from(table).upsert({ path, html }, { onConflict: 'path' });
        if (error) throw error;
        let localSynced = false;
        try {
          localSynced = await persistToLocalServer(path);
        } catch (localError) {
          console.warn('Local mirror save failed after Supabase publish:', localError);
        }
        persistLocalDraft(html, reason);
        if (!silent) {
          notify(
            localSynced
              ? `Published: ${path} (Supabase + local file)`
              : `Published: ${path}`,
            'success'
          );
        }
        return;
      }

      if (await detectServerMode()) {
        const relativePath = getPreferredCurrentPagePath();
        await persistToLocalServer(relativePath);
        if (!silent) notify(`Changes saved to ${relativePath}`, 'success');
        return;
      }

      if (!supportsFileSystemAccessApi()) {
        persistLocalDraft(html, reason);
        if (!silent) {
          const preferredPath = getPreferredCurrentPagePath();
          downloadHtmlSnapshot(preferredPath, html);
          notify('Browser fallback active: downloaded updated HTML with your latest edits.', 'success');
        }
        return;
      }

      const rootHandle = await ensureProjectRootHandle(allowPicker);
      if (!rootHandle) return;

      const { fileHandle, relativePath } = await resolveCurrentFileHandle(rootHandle);

      const writable = await fileHandle.createWritable();
      await writable.write(html);
      await writable.close();

      if (!silent) {
        notify(`Changes saved to ${relativePath}`, 'success');
      }
    } catch (error) {
      console.error(error);
      if (!silent) notify(`Save error: ${error.message}`, 'error');
    } finally {
      state.saveInFlight = false;
      if (state.saveQueued) {
        state.saveQueued = false;
        saveCurrentPage({ silent: true, reason: `${reason}-queued`, allowPicker: false });
      }
    }
  }

	  function buildCleanHtmlSnapshot() {
	    const root = document.documentElement.cloneNode(true);

	    const head = root.querySelector('head');
	    if (head && !head.querySelector('meta[name="cms-snapshot"]')) {
	      const meta = document.createElement('meta');
	      meta.setAttribute('name', 'cms-snapshot');
	      meta.setAttribute('content', '1');
	      head.appendChild(meta);
		    }

		    root.querySelectorAll('#cms-admin-style, .cms-ui, [data-cms-ui="1"]').forEach((el) => el.remove());
		    root.querySelectorAll('#bg-canvas, #particle-canvas, #theme-toggle, #theme-toggle-label').forEach((el) => el.remove());
		    root.querySelectorAll('script[src]').forEach((el) => {
		      const src = String(el.getAttribute('src') || '');
		      if (!src) return;
		      if (src.includes('three.min.js')) return el.remove();
		      // These are injected by js/site-shell.js at runtime.
		      const cleaned = src.split('?', 1)[0].split('#', 1)[0].replace(/\\\\/g, '/');
		      if (cleaned.endsWith('js/particles.js')) return el.remove();
		      if (cleaned.endsWith('js/background-animation.js')) return el.remove();
		    });

	    // Avoid freezing dynamic/global UI into the CMS snapshot.
	    // These elements are rendered by scripts (header/footer/site shell) and should stay code-driven.
	    root.removeAttribute('style'); // theme variables are applied at runtime (localStorage)
	    const headerHost = root.querySelector('#site-header');
	    if (headerHost) headerHost.innerHTML = '';
	    const footerHost = root.querySelector('#site-footer');
	    if (footerHost) footerHost.innerHTML = '';
	    const projectsSidebar = root.querySelector('#projects-sidebar');
	    if (projectsSidebar) projectsSidebar.innerHTML = '';

		    root.querySelectorAll('*').forEach((el) => {
		      el.removeAttribute('contenteditable');
		      el.removeAttribute('spellcheck');

      Array.from(el.attributes).forEach((attribute) => {
        if (attribute.name.startsWith('data-cms-')) {
          el.removeAttribute(attribute.name);
        }
      });

      el.classList.remove('cms-admin-mode', 'cms-text-target', 'cms-section-target', 'cms-section-selected', 'cc-modal-open');

      if (el.classList && el.classList.contains('cc-modal-overlay')) {
        el.classList.remove('is-open');
      }

      if ((el.getAttribute('class') || '').trim() === '') {
        el.removeAttribute('class');
      }
    });

    const body = root.querySelector('body');
    if (body) body.classList.remove('cms-admin-mode');

	    return `<!DOCTYPE html>\n${root.outerHTML}`;
	  }

	  function supportsFileSystemAccessApi() {
	    return typeof window.showDirectoryPicker === 'function';
	  }

  function persistLocalDraft(html, reason) {
    try {
      const path = getPreferredCurrentPagePath();
      const payload = {
        path,
        savedAt: new Date().toISOString(),
        reason: reason || 'manual',
        html: String(html || '')
      };
      localStorage.setItem(`${DRAFT_KEY_PREFIX}${path}`, JSON.stringify(payload));
    } catch (error) {
      // Ignore storage failures; manual download still preserves edits.
    }
  }

  function downloadHtmlSnapshot(relativePath, html) {
    const filename = String(relativePath || 'index.html').split('/').pop() || 'index.html';
    const outputName = `${filename.replace(/\.html$/i, '')}.edited.html`;
    const blob = new Blob([String(html || '')], { type: 'text/html;charset=utf-8' });
    triggerBlobDownload(blob, outputName);
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'download.bin';
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function extensionFromFile(file) {
    const fallback = 'jpg';
    const allowed = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'svg']);

    const name = String((file && file.name) || '').toLowerCase();
    const rawExt = name.includes('.') ? name.split('.').pop() : '';
    if (rawExt && allowed.has(rawExt)) return rawExt === 'jpeg' ? 'jpg' : rawExt;

    const type = String((file && file.type) || '').toLowerCase();
    if (type === 'image/png') return 'png';
    if (type === 'image/webp') return 'webp';
    if (type === 'image/gif') return 'gif';
    if (type === 'image/bmp') return 'bmp';
    if (type === 'image/avif') return 'avif';
    if (type === 'image/svg+xml') return 'svg';
    if (type === 'image/jpeg') return 'jpg';
    return fallback;
  }

  function slugify(value) {
    return String(value || 'image')
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image';
  }

  function getProjectPreviewTargetAssetPath(target, ext) {
    if (!(target instanceof HTMLElement)) return '';
    if (target.tagName !== 'IMG') return '';

    const grid = target.closest('#projects-grid');
    const card = target.closest('.project-card');
    if (!grid || !card) return '';

    const link = card.querySelector('a.project-img-frame') || card.querySelector('a.project-link') || card.querySelector('a[href]');
    const hrefRaw = link ? (link.getAttribute('href') || '') : '';
    const slug = extractProjectSlugFromHref(hrefRaw);
    if (!slug) return '';

    const safeExt = extensionFromFile({ name: `file.${ext || 'jpg'}` });
    return `assets/images/projects/previews/${slug}.${safeExt}`;
  }

	  function inferTargetAssetPath(target, kind, ext) {
	    const projectPreviewPath = getProjectPreviewTargetAssetPath(target, ext);
	    if (projectPreviewPath) {
	      if (target instanceof HTMLElement) target.dataset.assetPath = projectPreviewPath;
	      return projectPreviewPath;
	    }

	    if (target instanceof HTMLElement) {
	      const preset = String(target.dataset.assetPath || '').trim();
	      if (preset && preset.startsWith('assets/') && !isPlaceholderAssetPath(preset)) return preset;
	    }

	    const existing = resolveTargetAssetPath(target, kind);
	    if (existing) {
	      if (existing.startsWith('assets/') && isPlaceholderAssetPath(existing)) {
	        // Never overwrite the shared placeholder asset when the page hasn't set a real image yet.
	      } else {
	        if (target instanceof HTMLElement) target.dataset.assetPath = existing;
	        return existing;
	      }
	    }

    const safeExt = extensionFromFile({ name: `file.${ext || 'jpg'}` });
    const slot = target instanceof HTMLElement ? ensureAssetSlot(target, kind) : slugify(`${kind}-slot`);
    return buildDedicatedImagePath(target, kind, safeExt, slot);
  }

  function buildDedicatedImagePath(target, kind, ext, slotOverride) {
    const pagePath = getPreferredCurrentPagePath().replace(/\\/g, '/');
    const pageSlug = pagePath
      .replace(/\.html$/i, '')
      .split('/')
      .filter(Boolean)
      .join('-') || 'home';

    const slotId = slugify(String(slotOverride || (target && target.dataset && target.dataset.assetSlot) || `${kind}-slot`));
    const fileName = `${slotId}.${ext || 'jpg'}`;
    return `assets/images/cms/${pageSlug}/${fileName}`;
  }

  function resolveTargetAssetPath(target, kind) {
    if (!(target instanceof HTMLElement)) return '';
    if (kind === 'img') {
      return resolveAssetPath(target.getAttribute('src') || target.src || '');
    }
    return resolveAssetPath(getBackgroundImageUrl(target));
  }

  function normalizeDestinationExtension(destination, ext) {
    const safeDest = String(destination || '').replace(/^\/+/, '');
    const safeExt = extensionFromFile({ name: `file.${ext || 'jpg'}` });
    if (!safeDest.startsWith('assets/')) return safeDest;
    const m = safeDest.match(/\.([a-z0-9]+)$/i);
    const currentExt = m ? m[1].toLowerCase() : '';
    if (!currentExt) return `${safeDest}.${safeExt}`;
    if (currentExt === safeExt) return safeDest;
    return safeDest.replace(/\.[a-z0-9]+$/i, `.${safeExt}`);
  }

  function resolveAssetPath(rawPath) {
    const raw = String(rawPath || '').trim();
    if (!raw || /^data:/i.test(raw)) return '';

    try {
      const parsed = new URL(raw, location.href);
      const sameOrigin = parsed.origin === location.origin || parsed.protocol === 'file:' || location.protocol === 'file:';
      if (!sameOrigin) {
        const supabasePath = resolveSupabasePublicAssetPath(raw);
        return supabasePath || '';
      }

      let pathname = decodeURIComponent(parsed.pathname || '').replace(/\\/g, '/');
      const scriptRoot = normalizeDirectoryPath(getScriptRootPathname());

      if (pathname.startsWith(scriptRoot)) {
        pathname = pathname.slice(scriptRoot.length);
      }

      pathname = pathname.replace(/^\/+/, '');
      if (!pathname.startsWith('assets/')) {
        const marker = pathname.lastIndexOf('/assets/');
        if (marker !== -1) pathname = pathname.slice(marker + 1);
      }

      return pathname.startsWith('assets/') ? pathname : '';
    } catch (error) {
      return '';
    }
  }

  function getConfiguredAssetsBucket() {
    const cfg = window.__SUPABASE_CONFIG__ || {};
    const bucket = cfg && cfg.cms && cfg.cms.assetsBucket ? String(cfg.cms.assetsBucket) : 'resume-cms';
    return bucket || 'resume-cms';
  }

  function resolveSupabasePublicAssetPath(rawUrl) {
    const expectedBucket = getConfiguredAssetsBucket();
    const value = String(rawUrl || '').trim();
    if (!value) return '';
    try {
      const parsed = new URL(value, location.href);
      const pathname = String(parsed.pathname || '');
      const marker = '/storage/v1/object/public/';
      const idx = pathname.indexOf(marker);
      if (idx === -1) return '';
      const remainder = pathname.slice(idx + marker.length).replace(/^\/+/, '');
      const slash = remainder.indexOf('/');
      if (slash === -1) return '';
      const bucket = remainder.slice(0, slash);
      if (!bucket || bucket !== expectedBucket) return '';
      const objectPath = remainder.slice(slash + 1).replace(/^\/+/, '');
      if (!objectPath) return '';
      return `assets/${objectPath}`;
    } catch (_e) {
      return '';
    }
  }

  function getPreferredCurrentPagePath() {
    const fullPath = normalizeWebPath(location.pathname || '/index.html');
    const scriptRoot = normalizeDirectoryPath(getScriptRootPathname());

    if (fullPath.startsWith(scriptRoot)) {
      const relative = fullPath.slice(scriptRoot.length).replace(/^\/+/, '');
      if (relative) return relative;
    }

    return fullPath.replace(/^\/+/, '') || 'index.html';
  }

  function buildCmsPagePathCandidates(preferredPath) {
    const ordered = [];
    const seen = new Set();

    const add = (value) => {
      const clean = String(value || '')
        .replace(/^\/+/, '')
        .replace(/\?.*$/, '')
        .replace(/#.*$/, '');
      if (!clean || seen.has(clean)) return;
      seen.add(clean);
      ordered.push(clean);
    };

    add(preferredPath);
    buildRelativePathCandidates().forEach(add);

    const base = String(preferredPath || '').replace(/^\/+/, '');
    if (base.startsWith('pages/')) add(base.slice('pages/'.length));
    else add(`pages/${base}`);

    if (base.startsWith('pages/projects/')) add(base.slice('pages/'.length));
    if (base.startsWith('projects/')) add(`pages/${base}`);

    if (base === 'index.html') add('pages/index.html');
    if (base === 'pages/index.html') add('index.html');

    return ordered;
  }

  function toPageAssetPath(assetPath) {
    const cleanAsset = String(assetPath || '').replace(/^\/+/, '');
    const currentPage = getPreferredCurrentPagePath();
    const depth = Math.max(0, currentPage.split('/').filter(Boolean).length - 1);
    return `${'../'.repeat(depth)}${cleanAsset}`;
  }

  async function writeBlobToRepo(rootDirHandle, relativePath, blob) {
    const cleanPath = String(relativePath || '').replace(/^\/+/, '');
    if (!cleanPath.startsWith('assets/')) {
      throw new Error('Image destination must be inside assets/.');
    }

    const parts = cleanPath.split('/').filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) throw new Error(`Invalid image path: ${cleanPath}`);

    let dirHandle = rootDirHandle;
    for (const part of parts) {
      dirHandle = await dirHandle.getDirectoryHandle(part, { create: true });
    }

    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  function normalizeWebPath(path) {
    let value = decodeURIComponent(path || '/');
    if (!value.startsWith('/')) value = `/${value}`;
    if (value.endsWith('/')) value = `${value}index.html`;
    if (value === '/') value = '/index.html';
    return value;
  }

  function normalizeDirectoryPath(path) {
    let value = decodeURIComponent(path || '/');
    if (!value.startsWith('/')) value = `/${value}`;
    if (!value.endsWith('/')) value = `${value}/`;
    return value;
  }

  function getScriptRootPathname() {
    const script = document.currentScript || Array.from(document.scripts || []).find((item) => {
      const src = String(item.getAttribute('src') || item.src || '');
      return /(?:^|\/)js\/editor-auth\.js(?:$|[?#])/.test(src);
    });

    if (!script) return '/';

    try {
      const srcAttr = script.getAttribute('src') || script.src || '';
      const parsed = new URL(srcAttr, location.href);
      const pathname = parsed.pathname;
      const marker = pathname.lastIndexOf('js/editor-auth.js');
      if (marker === -1) return '/';
      const rootPath = pathname.slice(0, marker);
      return rootPath.endsWith('/') ? rootPath : `${rootPath}/`;
    } catch (error) {
      return '/';
    }
  }

  function buildRelativePathCandidates() {
    const candidates = new Set();
    const fullPath = normalizeWebPath(location.pathname || '/index.html');

    const addCandidate = (candidate) => {
      const clean = String(candidate || '')
        .replace(/^\/+/, '')
        .replace(/\?.*$/, '')
        .replace(/#.*$/, '');
      if (!clean) return;
      candidates.add(clean);
    };

    addCandidate(fullPath);

    const scriptRoot = normalizeDirectoryPath(getScriptRootPathname());
    if (fullPath.startsWith(scriptRoot)) {
      addCandidate(fullPath.slice(scriptRoot.length));
    }

    const rootPieces = scriptRoot.split('/').filter(Boolean);
    const workspaceName = rootPieces[rootPieces.length - 1] || '';
    const compact = fullPath.replace(/^\/+/, '');

    if (workspaceName && compact.startsWith(`${workspaceName}/`)) {
      addCandidate(compact.slice(workspaceName.length + 1));
    }

    if (!compact.endsWith('.html')) {
      addCandidate(`${compact}/index.html`);
    }

    if (compact === 'index.html') addCandidate('index.html');

    if (compact.startsWith('pages/')) addCandidate(compact.slice('pages/'.length));
    else addCandidate(`pages/${compact}`);

    if (compact.startsWith('pages/projects/')) addCandidate(compact.slice('pages/'.length));
    if (compact.startsWith('projects/')) addCandidate(`pages/${compact}`);

    return Array.from(candidates);
  }

  async function openFileHandle(rootDirHandle, relativePath) {
    const parts = relativePath.split('/').filter(Boolean);
    const filename = parts.pop();
    if (!filename) {
      throw new Error(`Invalid path: ${relativePath}`);
    }

    let dirHandle = rootDirHandle;
    for (const part of parts) {
      dirHandle = await dirHandle.getDirectoryHandle(part, { create: false });
    }

    return dirHandle.getFileHandle(filename, { create: false });
  }

  async function resolveCurrentFileHandle(rootDirHandle) {
    const candidates = buildRelativePathCandidates();

    for (const candidate of candidates) {
      try {
        const fileHandle = await openFileHandle(rootDirHandle, candidate);
        return { fileHandle, relativePath: candidate };
      } catch (error) {
        continue;
      }
    }

    throw new Error(`Could not find the current HTML file inside the selected folder. Paths tried: ${candidates.join(', ')}`);
  }
})();
