(function () {
  const ADMIN_USER = 'jreynoso111';
  const ADMIN_PASS = 'Reynoso';
  const AUTH_KEY = 'resume_admin_auth_v1';
  const EDIT_PREFIX = 'resume_content_edit_v1';
  const IMAGE_PREFIX = 'resume_image_edit_v1';

  const css = `
    .admin-fab{z-index:9999;border:1px solid #1f4f7b;background:#1f4f7b;color:#fff;border-radius:999px;padding:8px 14px;font:600 12px Inter,system-ui;cursor:pointer;box-shadow:0 6px 15px rgba(15,23,42,.2)}
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
    .admin-edit-target{position:relative}
    .admin-edit-target.admin-editing{outline:2px dashed rgba(31,79,123,.4);outline-offset:4px}
    .admin-pencil{position:absolute;top:6px;right:6px;z-index:50;border:none;background:#1f4f7b;color:#fff;border-radius:999px;width:30px;height:30px;cursor:pointer;font-size:14px;display:none;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(15,23,42,.25)}
    body.admin-mode .admin-pencil{display:flex}
    .admin-image-wrap{position:relative;display:block;max-width:100%}
    .admin-image-target{position:relative}
    .admin-image-btn{position:absolute;top:8px;right:8px;z-index:60;border:none;background:#1f4f7b;color:#fff;border-radius:999px;width:32px;height:32px;cursor:pointer;font-size:14px;display:none;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(15,23,42,.25)}
    body.admin-mode .admin-image-btn{display:flex}
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
  function imageKeyFor(path, id) { return `${IMAGE_PREFIX}:${path}:${id}`; }
  function isAdmin() { return localStorage.getItem(AUTH_KEY) === '1'; }

  function applySavedContent() {
    const path = location.pathname || 'index';
    document.querySelectorAll('[data-admin-edit-id]').forEach((el) => {
      const saved = localStorage.getItem(keyFor(path, el.dataset.adminEditId));
      if (saved) el.innerHTML = saved;
    });
  }

  function extensionFromType(type) {
    if (type === 'image/png') return 'png';
    if (type === 'image/webp') return 'webp';
    return 'jpg';
  }

  function slugify(input) {
    return String(input || 'image')
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'image';
  }

  function toDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  }

  async function reduceImage(file) {
    const image = await loadImageFromFile(file);
    const maxW = 1920;
    const maxH = 1920;
    const ratio = Math.min(1, maxW / image.width, maxH / image.height);
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const quality = outputType === 'image/jpeg' ? 0.84 : undefined;

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) reject(new Error('No se pudo reducir la imagen.'));
        else resolve(result);
      }, outputType, quality);
    });

    return {
      blob,
      ext: extensionFromType(blob.type),
      baseName: slugify(file.name)
    };
  }

  function pathDepth(pathname) {
    const segments = String(pathname || '/').split('/').filter(Boolean);
    return Math.max(0, segments.length - 1);
  }

  function toCurrentPageRelative(rootPath) {
    const depth = pathDepth(location.pathname || '/');
    const prefix = '../'.repeat(depth);
    return `${prefix}${rootPath}`;
  }

  async function saveReducedImageToRepo(blob, baseName, ext) {
    if (!window.showDirectoryPicker) {
      throw new Error('File System Access API no disponible en este navegador.');
    }

    const rootDir = await window.showDirectoryPicker({ mode: 'readwrite' });
    const assetsDir = await rootDir.getDirectoryHandle('assets', { create: true });
    const uploadsDir = await assetsDir.getDirectoryHandle('uploads', { create: true });

    const filename = `${Date.now()}-${baseName}.${ext}`;
    const fileHandle = await uploadsDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    return toCurrentPageRelative(`assets/uploads/${filename}`);
  }

  function applyImageFit(target, kind) {
    if (kind === 'img') {
      target.style.maxWidth = '100%';
      target.style.width = target.style.width || '100%';
      if (!target.style.height) target.style.height = 'auto';
      target.style.objectFit = 'cover';
      target.style.objectPosition = 'center';
      return;
    }

    target.style.backgroundSize = 'cover';
    target.style.backgroundPosition = 'center';
    target.style.backgroundRepeat = 'no-repeat';
  }

  function applySavedImages() {
    const path = location.pathname || 'index';
    document.querySelectorAll('[data-admin-image-id]').forEach((el) => {
      const saved = localStorage.getItem(imageKeyFor(path, el.dataset.adminImageId));
      const kind = el.dataset.adminImageKind;
      applyImageFit(el, kind);
      if (!saved) return;

      if (kind === 'img') {
        el.src = saved;
      } else {
        el.style.backgroundImage = `url("${saved}")`;
      }
    });
  }

  async function handleImageUpload(target) {
    if (!isAdmin()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.addEventListener('change', async () => {
      const [file] = input.files || [];
      if (!file) return;

      try {
        const reduced = await reduceImage(file);
        const path = location.pathname || 'index';
        let storedPath;

        try {
          storedPath = await saveReducedImageToRepo(reduced.blob, reduced.baseName, reduced.ext);
        } catch (repoError) {
          const dataUrl = await toDataURL(reduced.blob);
          storedPath = dataUrl;
          console.warn('No se pudo guardar en carpeta del repo, se usa fallback localStorage.', repoError);
          alert('⚠️ No se pudo escribir en assets/uploads automáticamente. Se aplicó un fallback local temporal en este navegador. Para guardarlo en el repo, abre la web en Chrome/Edge y concede acceso a la carpeta del proyecto.');
        }

        const key = imageKeyFor(path, target.dataset.adminImageId);
        localStorage.setItem(key, storedPath);

        if (target.dataset.adminImageKind === 'img') {
          target.src = storedPath;
        } else {
          target.style.backgroundImage = `url("${storedPath}")`;
        }

        applyImageFit(target, target.dataset.adminImageKind);
      } catch (err) {
        console.error(err);
        alert('Error procesando la imagen. Intenta con otro archivo.');
      }
    });

    input.click();
  }

  function addImageButton(target) {
    if (target.dataset.adminImageBtn === '1') return;
    target.dataset.adminImageBtn = '1';

    let mount = target;
    if (target.tagName === 'IMG') {
      const wrapper = document.createElement('div');
      wrapper.className = 'admin-image-wrap';
      target.parentNode.insertBefore(wrapper, target);
      wrapper.appendChild(target);
      mount = wrapper;
      target.style.display = 'block';
    }

    mount.classList.add('admin-image-target');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'admin-image-btn';
    btn.textContent = '🖼️';
    btn.title = 'Reemplazar imagen';
    btn.addEventListener('click', () => handleImageUpload(target));
    mount.appendChild(btn);
  }

  function markEditableImages() {
    const imageCandidates = Array.from(document.querySelectorAll('img')).filter((el) => {
      if (el.closest('.admin-modal,.editor')) return false;
      return Boolean(el.getAttribute('src'));
    });

    const backgroundCandidates = Array.from(document.querySelectorAll('*')).filter((el) => {
      if (el.closest('.admin-modal,.editor')) return false;
      const styleAttr = el.getAttribute('style') || '';
      return /background-image\s*:/.test(styleAttr);
    });

    let imgIdx = 1;
    imageCandidates.forEach((img) => {
      if (!img.dataset.adminImageId) img.dataset.adminImageId = `img-${imgIdx++}`;
      img.dataset.adminImageKind = 'img';
      applyImageFit(img, 'img');
      addImageButton(img);
    });

    let bgIdx = 1;
    backgroundCandidates.forEach((el) => {
      if (!el.dataset.adminImageId) el.dataset.adminImageId = `bg-${bgIdx++}`;
      el.dataset.adminImageKind = 'bg';
      applyImageFit(el, 'bg');
      addImageButton(el);
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
      btn.title = 'Edit section';
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
      fab.textContent = 'Admin mode: on';
      fab.dataset.state = 'on';
    } else {
      document.body.classList.remove('admin-mode');
      fab.textContent = 'Admin login';
      fab.dataset.state = 'off';
    }
  }

  function openEditor(target) {
    if (!isAdmin()) return;
    if (currentTarget) {
      currentTarget.classList.remove('admin-editing');
    }
    currentTarget = target;
    currentTarget.classList.add('admin-editing');
    editableArea.innerHTML = target.innerHTML;
    editorModal.classList.add('show');
  }

  function closeEditor() {
    editorModal.classList.remove('show');
    if (currentTarget) {
      currentTarget.classList.remove('admin-editing');
    }
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
        <h3>Admin access</h3>
        <form class="admin-form" id="admin-login-form">
          <div><label>Username</label><input name="user" autocomplete="username" required /></div>
          <div><label>Password</label><input name="pass" type="password" autocomplete="current-password" required /></div>
        </form>
        <div class="admin-row">
          <button class="admin-btn" type="button" id="admin-cancel">Cancel</button>
          <button class="admin-btn primary" type="button" id="admin-submit">Login</button>
        </div>
      </div>`;

    editorModal = document.createElement('div');
    editorModal.className = 'editor';
    editorModal.innerHTML = `
      <div class="editor-shell">
        <div class="admin-status">Section editor (admin only). Use the tools and save when done.</div>
        <div class="toolbar">
          <button class="tool" data-cmd="bold">Bold</button>
          <button class="tool" data-cmd="italic">Italic</button>
          <button class="tool" data-cmd="underline">Underline</button>
          <button class="tool" data-cmd="strikeThrough">Strikethrough</button>
          <button class="tool" data-cmd="insertUnorderedList">Bullets</button>
          <button class="tool" data-cmd="insertOrderedList">Numbered list</button>
          <button class="tool" data-cmd="justifyLeft">Left</button>
          <button class="tool" data-cmd="justifyCenter">Center</button>
          <button class="tool" data-cmd="justifyRight">Right</button>
          <button class="tool" data-cmd="undo">Undo</button>
          <button class="tool" data-cmd="redo">Redo</button>
          <button class="tool" data-action="h2">H2</button>
          <button class="tool" data-action="h3">H3</button>
          <button class="tool" data-action="p">Paragraph</button>
          <button class="tool" data-action="link">Link</button>
          <button class="tool" data-action="clear">Clear format</button>
        </div>
        <div class="editor-area"><div id="admin-editable" contenteditable="true"></div></div>
        <div class="editor-actions">
          <div>
            <button class="admin-btn" type="button" id="reset-section">Reset section</button>
            <button class="admin-btn" type="button" id="reset-page">Reset page</button>
          </div>
          <div>
            <button class="admin-btn" type="button" id="editor-close">Cancel</button>
            <button class="admin-btn primary" type="button" id="editor-save">Save changes</button>
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
        alert('Invalid credentials.');
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
          const url = prompt('Link URL (https://...)');
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
        if (k.startsWith(`${IMAGE_PREFIX}:${path}:`)) localStorage.removeItem(k);
      });
      location.reload();
    });
  }

  injectCSS();
  markEditableSections();
  markEditableImages();
  applySavedContent();
  applySavedImages();
  createUI();

  const headerMountPoint = document.querySelector('header .nav-cta, header .nav-links, header .nav, header');
  if (headerMountPoint) {
    headerMountPoint.appendChild(fab);
  } else {
    fab.style.position = 'fixed';
    fab.style.right = '18px';
    fab.style.top = '18px';
  }

  setAdminMode(isAdmin());
})();
