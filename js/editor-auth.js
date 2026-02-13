(function () {
  const AUTH_KEY = 'resume_admin_auth_v2';
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
    imageControls: new Map(),
    imageRepositionRaf: null,
    serverMode: false,
    serverModeChecked: false
  };

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

  init();

  function init() {
    // Always start anonymous. Editor can be enabled via the admin (gear) link.
    setAdminFlag(false);
    loadSettings();
    injectCSS();
    createUI();
    disableAdminMode();
    lockEditingForNonAdmin();
    bindGlobalEvents();
    watchForAdminLink();
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
    return localStorage.getItem(AUTH_KEY) === '1';
  }

  function setAdminFlag(value) {
    if (value) localStorage.setItem(AUTH_KEY, '1');
    else localStorage.removeItem(AUTH_KEY);
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
    state.panel.innerHTML = `
      <h3>Editor</h3>
      <div class="cms-muted">Edita el texto y guarda los cambios en el HTML.</div>

      <div class="cms-row">
        <button type="button" class="cms-btn" id="cms-save-now">Save</button>
        <button type="button" class="cms-btn-secondary" id="cms-exit">Close</button>
      </div>

      <label class="cms-inline">
        <input id="cms-autosave" type="checkbox" />
        <span id="cms-autosave-label">Auto-save changes to code</span>
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

    state.sectionLabel = state.panel.querySelector('#cms-section-label');
    if (!supportsFileSystemAccessApi()) {
      const saveButton = state.panel.querySelector('#cms-save-now');
      const muted = state.panel.querySelector('.cms-muted');
      const autosaveLabel = state.panel.querySelector('#cms-autosave-label');
      if (saveButton) saveButton.textContent = 'Download updated HTML';
      if (muted) muted.textContent = 'Your browser cannot write project files directly. Save now downloads the edited HTML so changes are not lost.';
      if (autosaveLabel) autosaveLabel.textContent = 'Auto-save local backup';
    }

    const autosaveToggle = state.panel.querySelector('#cms-autosave');
    autosaveToggle.checked = state.autosaveEnabled;
    autosaveToggle.addEventListener('change', () => {
      state.autosaveEnabled = autosaveToggle.checked;
      saveSettings();
      notify(state.autosaveEnabled ? 'Auto-save enabled.' : 'Auto-save disabled.', 'success');
    });

    state.panel.querySelector('#cms-save-now').addEventListener('click', () => {
      if (!isAdmin()) {
        setAdminFlag(true);
        enableAdminMode();
        syncAdminLinkState();
      }
      saveCurrentPage({ silent: false, reason: 'manual' });
    });

    state.panel.querySelector('#cms-exit').addEventListener('click', () => {
      setAdminFlag(false);
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

  function openLoginModal() {
    setAdminFlag(true);
    enableAdminMode();
    syncAdminLinkState();
    notify(
      supportsFileSystemAccessApi()
        ? 'Editor enabled. You can now edit and save directly to code.'
        : 'Editor enabled. Use "Download updated HTML" to keep file changes.',
      'success'
    );
  }

  function closeLoginModal() {
    return;
  }

  function bindGlobalEvents() {
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const adminLink = target.closest('.admin-link');
      if (adminLink) {
        event.preventDefault();
        if (document.body.classList.contains('cms-admin-mode')) {
          setAdminFlag(false);
          disableAdminMode();
          syncAdminLinkState();
          notify('Editor disabled.', 'success');
        } else {
          setAdminFlag(true);
          enableAdminMode();
          syncAdminLinkState();
          notify('Editor enabled.', 'success');
        }
        return;
      }

      if (!isAdmin()) return;
      if (target.closest('[data-cms-ui="1"]')) return;

      const anchor = target.closest('a[href]');
      if (anchor) event.preventDefault();

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
      scheduleAutosave('text-change');
    });

    document.addEventListener('blur', (event) => {
      if (!isAdmin()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const editable = target.closest('[data-cms-editable="1"]');
      if (!editable) return;
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
      if (event.key !== AUTH_KEY) return;
      if (isAdmin()) {
        enableAdminMode();
      } else {
        disableAdminMode();
      }
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
  }

  function disableAdminMode() {
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
      const text = compactText(element.textContent || '');
      return text.length >= 12;
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
    return toPageAssetPath('assets/images/placeholders/placeholder.png');
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
      handleImageUpload(target, kind);
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

  async function handleImageUpload(target, kind) {
    if (!isAdmin()) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.addEventListener('change', async () => {
      const file = (input.files || [])[0];
      if (!file) return;

      try {
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
          applyImageValue(target, kind, pageAssetPath);
          requestImageControlPositionUpdate();

          if (state.autosaveEnabled) {
            scheduleAutosave('image-upload');
            notify(`Image saved to ${destination}.`, 'success');
          } else {
            notify(`Image saved to ${destination}. Click "Save" to persist HTML changes.`, 'success');
          }
          return;
        }

        if (!supportsFileSystemAccessApi()) {
          const dataUrl = await fileToDataUrl(file);
          applyImageValue(target, kind, dataUrl);
          requestImageControlPositionUpdate();

          if (state.autosaveEnabled) {
            scheduleAutosave('image-upload-inline');
            notify('Image embedded. Use "Download updated HTML" to keep this change.', 'success');
          } else {
            notify('Image embedded. Click "Download updated HTML" to keep this change.', 'success');
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
        applyImageValue(target, kind, pageAssetPath);
        requestImageControlPositionUpdate();

        if (state.autosaveEnabled) {
          scheduleAutosave('image-upload');
          notify(`Image uploaded and applied from ${destination}.`, 'success');
        } else {
          notify(`Image uploaded from ${destination}. Click \"Save now\" to persist HTML changes.`, 'success');
        }
      } catch (error) {
        console.error(error);
        notify(`Image upload failed: ${error.message}`, 'error');
      }
    });

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
    requestImageControlPositionUpdate();
    if (target instanceof HTMLElement) {
      delete target.dataset.assetPath;
    }

    if (state.autosaveEnabled) {
      scheduleAutosave('image-link');
      notify(
        supportsFileSystemAccessApi()
          ? 'Image URL applied and queued for save.'
          : 'Image URL applied and queued for local backup.',
        'success'
      );
    } else {
      notify(
        supportsFileSystemAccessApi()
          ? 'Image URL applied. Click "Save now" to persist HTML changes.'
          : 'Image URL applied. Click "Download updated HTML" to keep this change.',
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

  function isEditableTextElement(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.closest('[data-cms-ui="1"]')) return false;

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

    const text = compactText(element.textContent || '');
    if (!text) return false;

    if (element.querySelector('img, video, audio, canvas, iframe, form, table')) {
      return false;
    }

    const children = Array.from(element.children);
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
      if (!silent) notify('Enable editor mode to edit and save.', 'warn');
      return;
    }

    if (state.saveInFlight) {
      state.saveQueued = true;
      return;
    }

    state.saveInFlight = true;

    try {
      const html = buildCleanHtmlSnapshot();

      if (await detectServerMode()) {
        const relativePath = getPreferredCurrentPagePath();
        const res = await fetch('/__cms/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: relativePath, html })
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload || payload.ok !== true) {
          throw new Error(payload && payload.error ? payload.error : 'Save failed');
        }
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

    root.querySelectorAll('#cms-admin-style, .cms-ui, [data-cms-ui="1"]').forEach((el) => el.remove());
    root.querySelectorAll('#bg-canvas, #particle-canvas, #theme-toggle').forEach((el) => el.remove());

    root.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');

      Array.from(el.attributes).forEach((attribute) => {
        if (attribute.name.startsWith('data-cms-')) {
          el.removeAttribute(attribute.name);
        }
      });

      el.classList.remove('cms-admin-mode', 'cms-text-target', 'cms-section-target', 'cms-section-selected');

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

  function inferTargetAssetPath(target, kind, ext) {
    if (target instanceof HTMLElement) {
      const preset = String(target.dataset.assetPath || '').trim();
      if (preset && preset.startsWith('assets/')) return preset;
    }

    const existing = resolveTargetAssetPath(target, kind);
    if (existing) {
      if (target instanceof HTMLElement) target.dataset.assetPath = existing;
      return existing;
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
      if (!sameOrigin) return '';

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

  function getPreferredCurrentPagePath() {
    const htmlCandidates = buildRelativePathCandidates()
      .filter((candidate) => candidate.endsWith('.html'))
      .sort((a, b) => a.length - b.length);
    return htmlCandidates[0] || 'index.html';
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

    if (compact === 'index.html') {
      addCandidate('index.html');
    }

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
