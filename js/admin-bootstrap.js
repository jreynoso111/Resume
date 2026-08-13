(function () {
  const script = document.currentScript || Array.from(document.scripts || []).find((item) => {
    const src = String(item.getAttribute('src') || item.src || '');
    return /(?:^|\/)js\/admin-bootstrap\.js(?:$|[?#])/.test(src);
  });
  const rawSrc = script ? String(script.getAttribute('src') || script.src || '') : '';
  const cleanSrc = rawSrc.split('?', 1)[0].split('#', 1)[0];
  const marker = cleanSrc.lastIndexOf('js/admin-bootstrap.js');
  const rootPath = marker === -1 ? '' : cleanSrc.slice(0, marker);
  let editorLoaded = false;
  let wasAuthorized = false;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts || []).find((item) => {
        const current = String(item.getAttribute('src') || item.src || '').split('?', 1)[0];
        return current === src.split('?', 1)[0];
      });
      if (existing) {
        if (existing.dataset.loaded === '1' || existing.readyState === 'complete') {
          resolve();
          return;
        }
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const element = document.createElement('script');
      element.src = src;
      element.async = true;
      element.addEventListener('load', () => {
        element.dataset.loaded = '1';
        resolve();
      }, { once: true });
      element.addEventListener('error', reject, { once: true });
      document.head.appendChild(element);
    });
  }

  async function getConfig() {
    if (!window.__SUPABASE_CONFIG__) {
      await loadScript(`${rootPath}js/supabase-config.js?v=2`);
    }
    const cfg = window.__SUPABASE_CONFIG__;
    return cfg && cfg.url && cfg.anonKey ? cfg : null;
  }

  async function getClient() {
    const cfg = await getConfig();
    if (!cfg) return null;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      await loadScript(`${rootPath}assets/vendor/supabase/supabase-js.v2.js`);
    }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;
    if (!window.__resumeAdminBootstrapClient) {
      window.__resumeAdminBootstrapClient = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      });
    }
    return window.__resumeAdminBootstrapClient;
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
    if (!wasAuthorized || document.querySelector('.admin-link')) return true;
    const footer = document.getElementById('site-footer');
    const host = footer && footer.querySelector('.footer-row > div:first-child');
    if (!host) return false;

    const link = document.createElement('a');
    link.href = '#';
    link.className = 'admin-link';
    link.setAttribute('aria-label', 'Enable editor');
    link.title = 'Enable editor';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '3');
    svg.append(path, circle);
    link.appendChild(svg);
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
    if (editorLoaded) return;
    editorLoaded = true;
    wasAuthorized = true;
    window.__resumeCmsAdminAuthorized = true;
    document.dispatchEvent(new CustomEvent('resume:admin-authorized'));
    await loadScript(`${rootPath}js/editor-auth.js?v=62`);
    if (window.__resumeCmsEditorReady) await window.__resumeCmsEditorReady;
    installAdminLink();
  }

  async function evaluateAccess(client) {
    const authorized = await hasAuthorizedSession(client).catch(() => false);
    if (authorized) {
      await activateEditor();
      return;
    }

    window.__resumeCmsAdminAuthorized = false;
    document.querySelectorAll('.admin-link').forEach((element) => element.remove());
    if (wasAuthorized) window.location.reload();
  }

  async function init() {
    const client = await getClient();
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
