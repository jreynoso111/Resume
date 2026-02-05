(function () {
  const ADMIN_USER = 'jreynoso111';
  const ADMIN_PASS = 'Reynoso';
  const AUTH_KEY = 'resume_admin_auth_v1';
  const EDIT_PREFIX = 'resume_content_edit_v1';

  const css = `
    .admin-fab{position:fixed;right:18px;bottom:18px;z-index:9999;border:1px solid #1f4f7b;background:#1f4f7b;color:#fff;border-radius:999px;padding:10px 16px;font:600 13px Inter,system-ui;cursor:pointer;box-shadow:0 10px 25px rgba(15,23,42,.25)}
    .admin-fab[data-state="on"]{background:#153554}
    .admin-modal{position:fixed;inset:0;background:rgba(17,24,39,.55);display:none;align-items:center;justify-content:center;z-index:10000;padding:16px}
    .admin-modal.show{display:flex}
    .admin-card{width:min(560px,100%);background:#fff;border-radius:12px;border:1px solid #d1d5db;box-shadow:0 20px 45px rgba(15,23,42,.28);overflow:hidden}
    .admin-card h3{margin:0;padding:12px 16px;border-bottom:1px solid #e5e7eb;font:600 15px Inter,system-ui}
    .admin-form{padding:14px 16px;display:grid;gap:10px}
    .admin-form label{font:600 12px Inter,system-ui;color:#374151}
    .admin-form input{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px}
    .admin-row{display:flex;justify-content:flex-end;gap:8px;padding:0 16px 14px}
    .admin-btn{border:1px solid #d1d5db;background:#fff;color:#111827;border-radius:8px;padding:8px 12px;cursor:pointer}
    .admin-btn.primary{background:#1f4f7b;color:#fff;border-color:#1f4f7b}
    .admin-edit-target{outline:2px dashed rgba(31,79,123,.4);outline-offset:4px;position:relative}
    .admin-pencil{position:absolute;top:6px;right:6px;z-index:50;border:none;background:#1f4f7b;color:#fff;border-radius:999px;width:30px;height:30px;cursor:pointer;font-size:14px;display:none;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(15,23,42,.25)}
    body.admin-mode .admin-pencil{display:flex}
    .editor{display:none;position:fixed;inset:0;background:rgba(17,24,39,.55);z-index:10001;align-items:center;justify-content:center;padding:14px}
    .editor.show{display:flex}
    .editor-shell{width:min(1020px,100%);height:min(86vh,860px);background:#fff;border-radius:12px;overflow:hidden;border:1px solid #d1d5db;display:grid;grid-template-rows:auto auto 1fr auto}
    .toolbar{display:flex;gap:6px;flex-wrap:wrap;padding:10px;border-bottom:1px solid #e5e7eb;background:#f9fafb}
    .tool{border:1px solid #d1d5db;background:#fff;padding:6px 9px;border-radius:8px;cursor:pointer;font:500 12px Inter,system-ui}
    .editor-area{padding:12px;overflow:auto}
    .editor-area [contenteditable="true"]{min-height:52vh;border:1px solid #d1d5db;border-radius:8px;padding:14px}
    .editor-actions{display:flex;justify-content:space-between;gap:8px;padding:10px;border-top:1px solid #e5e7eb}
    .admin-status{font:500 12px Inter,system-ui;color:#6b7280;padding:8px 12px;border-bottom:1px solid #e5e7eb}
  `;

  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function keyFor(path, id) { return `${EDIT_PREFIX}:${path}:${id}`; }
  function isAdmin() { return localStorage.getItem(AUTH_KEY) === '1'; }

  function applySavedContent() {
    const path = location.pathname || 'index';
    document.querySelectorAll('[data-admin-edit-id]').forEach((el) => {
      const saved = localStorage.getItem(keyFor(path, el.dataset.adminEditId));
      if (saved) el.innerHTML = saved;
    });
  }

  function markEditableSections() {
    const candidates = document.querySelectorAll('main section, .page section, section, article, .card, .mini-card, .highlight-item');
    let idx = 1;
    candidates.forEach((el) => {
      if (el.closest('.admin-modal,.editor')) return;
      if (el.dataset.adminEditId) return;
      const textLen = (el.textContent || '').trim().length;
      if (textLen < 25) return;
      el.dataset.adminEditId = `sec-${idx++}`;
      el.classList.add('admin-edit-target');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'admin-pencil';
      btn.textContent = '✏️';
      btn.title = 'Editar sección';
      btn.addEventListener('click', () => openEditor(el));
      el.appendChild(btn);
    });
  }

  let currentTarget = null;
  let modal, fab, editorModal, editableArea;

  function closeModal() { modal.classList.remove('show'); }
  function openModal() { modal.classList.add('show'); }

  function setAdminMode(on) {
    if (on) {
      document.body.classList.add('admin-mode');
      fab.textContent = 'Administrador activo';
      fab.dataset.state = 'on';
    } else {
      document.body.classList.remove('admin-mode');
      fab.textContent = 'Acceso administrador';
      fab.dataset.state = 'off';
    }
  }

  function openEditor(target) {
    if (!isAdmin()) return;
    currentTarget = target;
    editableArea.innerHTML = target.innerHTML;
    editorModal.classList.add('show');
  }

  function closeEditor() {
    editorModal.classList.remove('show');
    currentTarget = null;
  }

  function exec(cmd, value) {
    editableArea.focus();
    document.execCommand(cmd, false, value || null);
  }

  function createUI() {
    fab = document.createElement('button');
    fab.className = 'admin-fab';
    fab.type = 'button';
    fab.addEventListener('click', () => {
      if (isAdmin()) {
        localStorage.removeItem(AUTH_KEY);
        setAdminMode(false);
      } else {
        openModal();
      }
    });

    modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.innerHTML = `
      <div class="admin-card">
        <h3>Ingreso administrador</h3>
        <form class="admin-form" id="admin-login-form">
          <div><label>Usuario</label><input name="user" autocomplete="username" required /></div>
          <div><label>Clave</label><input name="pass" type="password" autocomplete="current-password" required /></div>
        </form>
        <div class="admin-row">
          <button class="admin-btn" type="button" id="admin-cancel">Cancelar</button>
          <button class="admin-btn primary" type="button" id="admin-submit">Ingresar</button>
        </div>
      </div>`;

    editorModal = document.createElement('div');
    editorModal.className = 'editor';
    editorModal.innerHTML = `
      <div class="editor-shell">
        <div class="admin-status">Editor de sección (solo administrador). Usa los botones para dar formato y luego guarda.</div>
        <div class="toolbar">
          <button class="tool" data-cmd="bold">Negrita</button>
          <button class="tool" data-cmd="italic">Itálica</button>
          <button class="tool" data-cmd="underline">Subrayado</button>
          <button class="tool" data-cmd="strikeThrough">Tachado</button>
          <button class="tool" data-cmd="insertUnorderedList">Lista •</button>
          <button class="tool" data-cmd="insertOrderedList">Lista 1.</button>
          <button class="tool" data-cmd="justifyLeft">Izq</button>
          <button class="tool" data-cmd="justifyCenter">Centro</button>
          <button class="tool" data-cmd="justifyRight">Der</button>
          <button class="tool" data-cmd="undo">Deshacer</button>
          <button class="tool" data-cmd="redo">Rehacer</button>
          <button class="tool" data-action="h2">H2</button>
          <button class="tool" data-action="h3">H3</button>
          <button class="tool" data-action="p">Párrafo</button>
          <button class="tool" data-action="link">Link</button>
          <button class="tool" data-action="clear">Limpiar formato</button>
        </div>
        <div class="editor-area"><div id="admin-editable" contenteditable="true"></div></div>
        <div class="editor-actions">
          <div>
            <button class="admin-btn" type="button" id="reset-section">Reset sección</button>
            <button class="admin-btn" type="button" id="reset-page">Reset página</button>
          </div>
          <div>
            <button class="admin-btn" type="button" id="editor-close">Cancelar</button>
            <button class="admin-btn primary" type="button" id="editor-save">Guardar cambios</button>
          </div>
        </div>
      </div>`;

    document.body.append(fab, modal, editorModal);
    editableArea = editorModal.querySelector('#admin-editable');

    modal.querySelector('#admin-cancel').addEventListener('click', closeModal);
    modal.querySelector('#admin-submit').addEventListener('click', () => {
      const form = modal.querySelector('#admin-login-form');
      const data = new FormData(form);
      if (data.get('user') === ADMIN_USER && data.get('pass') === ADMIN_PASS) {
        localStorage.setItem(AUTH_KEY, '1');
        setAdminMode(true);
        closeModal();
      } else {
        alert('Credenciales inválidas.');
      }
    });

    editorModal.querySelectorAll('.tool').forEach((button) => {
      button.addEventListener('click', () => {
        const cmd = button.dataset.cmd;
        const action = button.dataset.action;
        if (cmd) return exec(cmd);
        if (action === 'h2') return exec('formatBlock', 'h2');
        if (action === 'h3') return exec('formatBlock', 'h3');
        if (action === 'p') return exec('formatBlock', 'p');
        if (action === 'clear') return exec('removeFormat');
        if (action === 'link') {
          const url = prompt('URL del enlace (https://...)');
          if (url) exec('createLink', url);
        }
      });
    });

    editorModal.querySelector('#editor-close').addEventListener('click', closeEditor);
    editorModal.querySelector('#editor-save').addEventListener('click', () => {
      if (!currentTarget) return;
      currentTarget.innerHTML = editableArea.innerHTML;
      const path = location.pathname || 'index';
      localStorage.setItem(keyFor(path, currentTarget.dataset.adminEditId), currentTarget.innerHTML);
      closeEditor();
      markEditableSections();
    });

    editorModal.querySelector('#reset-section').addEventListener('click', () => {
      if (!currentTarget) return;
      const path = location.pathname || 'index';
      localStorage.removeItem(keyFor(path, currentTarget.dataset.adminEditId));
      location.reload();
    });

    editorModal.querySelector('#reset-page').addEventListener('click', () => {
      const path = location.pathname || 'index';
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(`${EDIT_PREFIX}:${path}:`)) localStorage.removeItem(k);
      });
      location.reload();
    });
  }

  injectCSS();
  markEditableSections();
  applySavedContent();
  createUI();
  setAdminMode(isAdmin());
})();
