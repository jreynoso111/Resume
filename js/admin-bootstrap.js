(function () {
  'use strict';

  const script = document.currentScript || Array.from(document.scripts || []).find((item) => {
    const src = String(item.getAttribute('src') || item.src || '');
    return /(?:^|\/)js\/admin-bootstrap\.js(?:$|[?#])/.test(src);
  });
  const rawSrc = script ? String(script.getAttribute('src') || script.src || '') : '';
  const cleanSrc = rawSrc.split('?', 1)[0].split('#', 1)[0];
  const marker = cleanSrc.lastIndexOf('js/admin-bootstrap.js');
  const rootPath = marker === -1 ? '' : cleanSrc.slice(0, marker);
  const HYDRATION_SENTINEL = 'resume-cms-public-hydrated-v2';
  let editorLoaded = false;
  let wasAuthorized = false;

  function loadScript(src, readyCheck) {
    if (typeof readyCheck === 'function' && readyCheck()) return Promise.resolve();

    const existing = Array.from(document.scripts || []).find((item) => {
      const current = String(item.getAttribute('src') || item.src || '').split('?', 1)[0];
      return current === src.split('?', 1)[0];
    });

    // A CMS document replacement can preserve inert script tags. Replace them
    // instead of waiting forever for a load event that already happened.
    if (existing) existing.remove();

    return new Promise((resolve, reject) => {
      const element = document.createElement('script');
      element.src = src;
      element.async = true;
      element.addEventListener('load', () => {
        element.dataset.loaded = '1';
        if (typeof readyCheck === 'function' && !readyCheck()) {
          reject(new Error(`Script loaded without its expected API: ${src}`));
          return;
        }
        resolve();
      }, { once: true });
      element.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
      document.head.appendChild(element);
    });
  }

  async function getConfig() {
    if (!window.__SUPABASE_CONFIG__) {
      await loadScript(`${rootPath}js/supabase-config.js?v=3`, () => {
        const cfg = window.__SUPABASE_CONFIG__;
        return Boolean(cfg && cfg.url && cfg.anonKey);
      });
    }
    const cfg = window.__SUPABASE_CONFIG__;
    return cfg && cfg.url && cfg.anonKey ? cfg : null;
  }

  function removeAdminMarkup() {
    document
      .querySelectorAll('#cms-admin-style, #cms-error-overlay, .cms-ui, [data-cms-ui="1"], .admin-link')
      .forEach((element) => element.remove());
    if (document.body) document.body.classList.remove('cms-admin-mode');
  }

  function getPagePathCandidates() {
    let path = '';
    try {
      path = decodeURIComponent(String(window.location.pathname || '/'));
    } catch (_e) {
      path = String(window.location.pathname || '/');
    }
    path = path.replace(/^\/+/, '');
    if (!path || path.endsWith('/')) path = `${path}index.html`;
    return Array.from(new Set([path, `/${path}`]));
  }

  function isDynamicDataPage(path) {
    const clean = String(path || '').replace(/^\/+/, '').toLowerCase();
    return clean === 'pages/projects.html'
      || clean === 'pages/blog.html'
      || clean === 'pages/blog-post.html'
      || /^pages\/blog\/[a-z0-9][a-z0-9-]*\.html$/.test(clean);
  }

  function shouldSkipHydration() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const noCms = String(params.get('nocms') || '').toLowerCase();
      if (noCms === '1' || noCms === 'true') return true;
    } catch (_e) {
      // Ignore malformed query strings.
    }
    return window.location.protocol === 'file:';
  }

  function preparePublicSnapshot(rawHtml) {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(String(rawHtml || ''), 'text/html');
    if (!parsed.documentElement || !parsed.head || !parsed.body) return '';
    const snapshotMeta = parsed.querySelector('meta[name="cms-snapshot"]');
    if (!snapshotMeta || snapshotMeta.getAttribute('content') !== '2') return '';

    parsed
      .querySelectorAll('#cms-admin-style, #cms-error-overlay, .cms-ui, [data-cms-ui="1"], .admin-link')
      .forEach((element) => element.remove());
    parsed.querySelectorAll('script[src]').forEach((element) => {
      const src = String(element.getAttribute('src') || '').split('?', 1)[0].split('#', 1)[0];
      if (src.endsWith('assets/js/auth.js') || src.endsWith('js/editor-auth.js')) element.remove();
    });
    parsed.querySelectorAll('script[src*="js/admin-bootstrap.js"]').forEach((element) => {
      const src = String(element.getAttribute('src') || '');
      element.setAttribute('src', src.replace(/(?:\?v=\d+)?$/, '?v=6'));
    });

    const header = parsed.getElementById('site-header');
    if (header) header.innerHTML = '';
    const footer = parsed.getElementById('site-footer');
    if (footer) footer.innerHTML = '';
    parsed.body.classList.remove('cms-admin-mode');
    parsed.documentElement.removeAttribute('style');

    return `<!DOCTYPE html>\n${parsed.documentElement.outerHTML}`;
  }

  async function fetchPublishedSnapshot(cfg, path) {
    const base = String(cfg.url || '').replace(/\/$/, '');
    const table = String(cfg.cms.pagesTable || 'cms_pages');
    const endpoint = `${base}/rest/v1/${encodeURIComponent(table)}`
      + `?select=path,html,updated_at&path=eq.${encodeURIComponent(path)}&limit=1`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: String(cfg.anonKey || ''),
        Authorization: `Bearer ${String(cfg.anonKey || '')}`
      }
    });
    if (!response.ok) return null;
    const rows = await response.json().catch(() => []);
    return Array.isArray(rows) && rows[0] && rows[0].html ? rows[0] : null;
  }

  async function maybeHydratePublishedPage() {
    if (shouldSkipHydration()) return false;

    try {
      if (sessionStorage.getItem(HYDRATION_SENTINEL) === '1') {
        sessionStorage.removeItem(HYDRATION_SENTINEL);
        return false;
      }
    } catch (_e) {
      // Continue without a sentinel when sessionStorage is unavailable.
    }

    const cfg = await getConfig();
    if (!cfg || !cfg.cms || cfg.cms.autoHydrate !== true || !cfg.cms.pagesTable) return false;
    const candidates = getPagePathCandidates();
    if (isDynamicDataPage(candidates[0])) return false;

    let row = null;
    for (const path of candidates) {
      row = await fetchPublishedSnapshot(cfg, path).catch(() => null);
      if (row) break;
    }
    if (!row) return false;

    const html = preparePublicSnapshot(row.html);
    if (!html) return false;

    try { sessionStorage.setItem(HYDRATION_SENTINEL, '1'); } catch (_e) {}
    document.open();
    document.write(html);
    document.close();
    return true;
  }

  async function getClient() {
    await loadScript(`${rootPath}assets/js/auth.js?v=4`, () => {
      return Boolean(window.ResumeAuth && typeof window.ResumeAuth.getClient === 'function');
    });
    return window.ResumeAuth.getClient();
  }

  async function hasAuthorizedSession(client) {
    if (!client) return false;
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData || !sessionData.session) return false;

    // Authorization is decided by the database, not by email, CSS, or browser flags.
    const { data, error } = await client.rpc('is_admin_user');
    return !error && data === true;
  }

  function createAdminLink() {
    if (!wasAuthorized) return false;
    const footer = document.getElementById('site-footer');
    const host = footer && footer.querySelector('.footer-row > div:first-child');
    if (!host) return false;

    const current = host.querySelector('button.admin-link');
    if (current) return true;
    document.querySelectorAll('.admin-link').forEach((element) => element.remove());
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'admin-link';
    link.setAttribute('aria-label', 'Enable editor');
    link.title = 'Enable editor';
    link.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    host.appendChild(link);
    return true;
  }

  function installAdminLink() {
    if (createAdminLink()) return;
    const observer = new MutationObserver(() => {
      if (createAdminLink()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function activateEditor() {
    if (editorLoaded && window.__resumeCmsEditorAuthLoaded === true) {
      installAdminLink();
      return;
    }

    wasAuthorized = true;
    window.__resumeCmsAdminAuthorized = true;
    document.dispatchEvent(new CustomEvent('resume:admin-authorized'));
    await loadScript(`${rootPath}js/editor-auth.js?v=73`, () => {
      return window.__resumeCmsEditorAuthLoaded === true
        && typeof window.__resumeCmsToggleEditor === 'function';
    });
    if (window.__resumeCmsEditorReady) await window.__resumeCmsEditorReady;
    editorLoaded = true;
    installAdminLink();
  }

  async function evaluateAccess(client) {
    const authorized = await hasAuthorizedSession(client).catch(() => false);
    if (authorized) {
      await activateEditor();
      return;
    }

    window.__resumeCmsAdminAuthorized = false;
    removeAdminMarkup();
    if (wasAuthorized) window.location.reload();
  }

  async function init() {
    removeAdminMarkup();
    if (await maybeHydratePublishedPage()) return;

    const client = await getClient().catch(() => null);
    if (!client) return;
    await evaluateAccess(client);
    client.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void evaluateAccess(client);
      }, 0);
    });
  }

  void init();
})();
