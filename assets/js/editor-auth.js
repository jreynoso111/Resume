(function () {
  const ADMIN_USER = 'jreynoso111';
  const ADMIN_PASS = 'Reynoso';
  const AUTH_KEY = 'resume_admin_auth_v2';
  const EDIT_PREFIX = 'resume_content_edit_v2';

  const css = `
    .admin-login-btn{border:1px solid #1f4f7b;background:#1f4f7b;color:#fff;border-radius:999px;padding:8px 14px;font:600 12px Inter,system-ui;cursor:pointer;white-space:nowrap}
    .admin-login-btn[data-state="on"]{background:#153554;border-color:#153554}
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

    .editable-section{position:relative}
    .edit-toggle{position:absolute;top:8px;right:8px;z-index:50;border:none;background:#1f4f7b;color:#fff;border-radius:999px;width:30px;height:30px;cursor:pointer;font-size:14px;display:none;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(15,23,42,.25)}
    body.admin-mode .edit-toggle{display:flex}
    .editable-section.is-editing{outline:2px dashed rgba(31,79,123,.45);outline-offset:4px}

    .editor-panel{display:none;position:absolute;left:8px;right:8px;top:46px;background:#fff;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 10px 25px rgba(15,23,42,.2);z-index:70;overflow:hidden}
    .editable-section.is-editing .editor-panel{display:block}
    .toolbar{display:flex;gap:6px;flex-wrap:wrap;padding:10px;border-bottom:1px solid #e5e7eb;background:#f9fafb}
    .tool{border:1px solid #d1d5db;background:#fff;padding:6px 9px;border-radius:8px;cursor:pointer;font:500 12px Inter,system-ui}
    .editor-area{padding:10px}
    .editor-content{min-height:190px;max-height:42vh;overflow:auto;border:1px solid #d1d5db;border-radius:8px;padding:12px}
    .editor-actions{display:flex;justify-content:space-between;gap:8px;padding:10px;border-top:1px solid #e5e7eb;background:#fff}

    @media (max-width:900px){
      .editor-panel{position:fixed;left:10px;right:10px;top:100px;max-height:78vh;overflow:auto}
      .editor-content{max-height:40vh}
    }
  `;

  let loginBtn;

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
      if (saved) {
        const contentRoot = el.querySelector(':scope > .editable-content');
        if (contentRoot) contentRoot.innerHTML = saved;
      }
    });
  }

  function setAdminMode(on) {
    document.body.classList.toggle('admin-mode', on);
    if (!loginBtn) return;
    loginBtn.textContent = on ? 'Admin On (Logout)' : 'Admin Login';
    loginBtn.dataset.state = on ? 'on' : 'off';
  }

  function closeLoginModal() {
    const modal = document.querySelector('.admin-modal');
    if (modal) modal.classList.remove('show');
  }

  function openLoginModal() {
    const modal = document.querySelector('.admin-modal');
    if (modal) modal.classList.add('show');
  }

  function exec(content, cmd, value) {
    content.focus();
    document.execCommand(cmd, false, value || null);
  }

  function attachEditor(section) {
    const editToggle = document.createElement('button');
    editToggle.type = 'button';
    editToggle.className = 'edit-toggle';
    editToggle.title = 'Edit section';
    editToggle.textContent = '✏️';

    const panel = document.createElement('div');
    panel.className = 'editor-panel';
    panel.innerHTML = `
      <div class="toolbar">
        <button class="tool" data-cmd="bold">Bold</button>
        <button class="tool" data-cmd="italic">Italic</button>
        <button class="tool" data-cmd="underline">Underline</button>
        <button class="tool" data-cmd="strikeThrough">Strike</button>
        <button class="tool" data-cmd="insertUnorderedList">Bullets</button>
        <button class="tool" data-cmd="insertOrderedList">Numbered</button>
        <button class="tool" data-cmd="justifyLeft">Left</button>
        <button class="tool" data-cmd="justifyCenter">Center</button>
        <button class="tool" data-cmd="justifyRight">Right</button>
        <button class="tool" data-cmd="undo">Undo</button>
        <button class="tool" data-cmd="redo">Redo</button>
        <button class="tool" data-action="h2">H2</button>
        <button class="tool" data-action="h3">H3</button>
        <button class="tool" data-action="p">Paragraph</button>
        <button class="tool" data-action="link">Link</button>
        <button class="tool" data-action="clear">Clear</button>
      </div>
      <div class="editor-area">
        <div class="editor-content" contenteditable="true"></div>
      </div>
      <div class="editor-actions">
        <div>
          <button class="admin-btn" type="button" data-action="reset-section">Reset Section</button>
          <button class="admin-btn" type="button" data-action="reset-page">Reset Page</button>
        </div>
        <div>
          <button class="admin-btn" type="button" data-action="cancel">Cancel</button>
          <button class="admin-btn primary" type="button" data-action="save">Save</button>
        </div>
      </div>`;

    section.append(editToggle, panel);

    const contentRoot = section.querySelector(':scope > .editable-content');
    const editorContent = panel.querySelector('.editor-content');

    const closeEditor = () => {
      section.classList.remove('is-editing');
    };

    editToggle.addEventListener('click', () => {
      if (!isAdmin()) return;
      document.querySelectorAll('.editable-section.is-editing').forEach((node) => {
        if (node !== section) node.classList.remove('is-editing');
      });
      editorContent.innerHTML = contentRoot.innerHTML;
      section.classList.add('is-editing');
    });

    panel.querySelectorAll('.tool').forEach((button) => {
      button.addEventListener('click', () => {
        const cmd = button.dataset.cmd;
        const action = button.dataset.action;
        if (cmd) return exec(editorContent, cmd);
        if (action === 'h2') return exec(editorContent, 'formatBlock', 'h2');
        if (action === 'h3') return exec(editorContent, 'formatBlock', 'h3');
        if (action === 'p') return exec(editorContent, 'formatBlock', 'p');
        if (action === 'clear') return exec(editorContent, 'removeFormat');
        if (action === 'link') {
          const url = prompt('Link URL (https://...)');
          if (url) exec(editorContent, 'createLink', url);
        }
      });
    });

    panel.addEventListener('click', (event) => {
      const action = event.target && event.target.dataset ? event.target.dataset.action : '';
      if (!action) return;

      const path = location.pathname || 'index';

      if (action === 'cancel') {
        closeEditor();
      } else if (action === 'save') {
        contentRoot.innerHTML = editorContent.innerHTML;
        localStorage.setItem(keyFor(path, section.dataset.adminEditId), contentRoot.innerHTML);
        closeEditor();
      } else if (action === 'reset-section') {
        localStorage.removeItem(keyFor(path, section.dataset.adminEditId));
        location.reload();
      } else if (action === 'reset-page') {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith(`${EDIT_PREFIX}:${path}:`)) localStorage.removeItem(k);
        });
        location.reload();
      }
    });
  }

  function markEditableSections() {
    const candidates = document.querySelectorAll('main section, .page section, section, article, .card, .mini-card, .highlight-item');
    let idx = 1;

    candidates.forEach((el) => {
      if (el.closest('.admin-modal')) return;
      if (el.classList.contains('editable-section')) return;
      if ((el.textContent || '').trim().length < 25) return;

      el.dataset.adminEditId = `sec-${idx++}`;
      el.classList.add('editable-section');

      const wrapper = document.createElement('div');
      wrapper.className = 'editable-content';
      while (el.firstChild) wrapper.appendChild(el.firstChild);
      el.appendChild(wrapper);

      attachEditor(el);
    });
  }

  function createLoginButton() {
    const header = document.querySelector('header');
    if (!header) return;

    let rightArea = header.querySelector('.nav-cta, .header-row, .nav, .container, .shell') || header;
    if (rightArea && ['A','BUTTON'].includes(rightArea.tagName) && rightArea.parentElement) rightArea = rightArea.parentElement;
    loginBtn = document.createElement('button');
    loginBtn.type = 'button';
    loginBtn.className = 'admin-login-btn';
    loginBtn.addEventListener('click', () => {
      if (isAdmin()) {
        localStorage.removeItem(AUTH_KEY);
        setAdminMode(false);
      } else {
        openLoginModal();
      }
    });

    rightArea.appendChild(loginBtn);
  }

  function createLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.innerHTML = `
      <div class="admin-card">
        <h3>Admin Login</h3>
        <form class="admin-form" id="admin-login-form">
          <div><label>Username</label><input name="user" autocomplete="username" required /></div>
          <div><label>Password</label><input name="pass" type="password" autocomplete="current-password" required /></div>
        </form>
        <div class="admin-row">
          <button class="admin-btn" type="button" id="admin-cancel">Cancel</button>
          <button class="admin-btn primary" type="button" id="admin-submit">Login</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    modal.querySelector('#admin-cancel').addEventListener('click', closeLoginModal);
    modal.querySelector('#admin-submit').addEventListener('click', () => {
      const data = new FormData(modal.querySelector('#admin-login-form'));
      if (data.get('user') === ADMIN_USER && data.get('pass') === ADMIN_PASS) {
        localStorage.setItem(AUTH_KEY, '1');
        setAdminMode(true);
        closeLoginModal();
      } else {
        alert('Invalid credentials.');
      }
    });
  }

  injectCSS();
  markEditableSections();
  applySavedContent();
  createLoginButton();
  createLoginModal();
  setAdminMode(isAdmin());
})();
