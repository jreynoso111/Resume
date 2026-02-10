(function () {
  const ADMIN_USER = 'jreynoso111';
  const ADMIN_PASS = 'Reynoso';
  const ORDER_PREFIX = 'resume_order_v1';
  const AUTH_KEY = 'resume_admin_auth_v1';
  const EDIT_PREFIX = 'resume_content_edit_v1';
  const IMAGE_PREFIX = 'resume_image_edit_v1';
  let repoRootHandle = null;

  const css = `
    .admin-fab{position:fixed;right:18px;bottom:18px;z-index:9999;border:1px solid #1f4f7b;background:#1f4f7b;color:#fff;border-radius:999px;padding:8px 14px;font:600 12px Inter,system-ui;cursor:pointer;box-shadow:0 6px 15px rgba(15,23,42,.2)}
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
    .admin-pencil{position:absolute;right:10px;bottom:10px;z-index:90;border:none;background:#1f4f7b;color:#fff;border-radius:999px;width:30px;height:30px;cursor:pointer;font-size:14px;display:none;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(15,23,42,.25)}
    body.admin-mode .admin-pencil{display:flex}
    .admin-image-wrap{position:relative;display:block;max-width:100%}
    .admin-image-target{position:relative}
    .admin-image-btn{position:absolute;right:10px;bottom:10px;z-index:90;border:none;background:#1f4f7b;color:#fff;border-radius:999px;width:32px;height:32px;cursor:pointer;font-size:14px;display:none;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(15,23,42,.25)}
    body.admin-mode .admin-image-btn{display:flex}
    
    .admin-move-handle{position:absolute;top:10px;left:10px;z-index:100;cursor:grab;background:#1f4f7b;color:#fff;border-radius:4px;width:24px;height:24px;display:none;align-items:center;justify-content:center;border:none;box-shadow:0 2px 5px rgba(0,0,0,0.2);font-size:14px}
    .admin-move-handle:active{cursor:grabbing}
    body.admin-mode .admin-move-handle{display:flex}
    .sortable-item{position:relative}
    .sortable-dragging{opacity:0.4;border:2px dashed #1f4f7b}

    .editor{display:none;position:fixed;inset:0;background:rgba(17,24,39,.55);z-index:10001;align-items:center;justify-content:center;padding:14px}
    .editor.show{display:flex}
    .editor-shell{width:min(1020px,100%);height:min(86vh,860px);background:#fff;border-radius:12px;overflow:hidden;border:1px solid #d1d5db;display:grid;grid-template-rows:auto auto 1fr auto}
    .toolbar{display:flex;gap:6px;flex-wrap:wrap;padding:10px;border-bottom:1px solid #e5e7eb;background:#f9fafb}
    .tool{border:1px solid #d1d5db;background:#fff;padding:6px 9px;border-radius:8px;cursor:pointer;font:500 12px Inter,system-ui}
    .editor-area{padding:12px;overflow:auto}
    .editor-area [contenteditable="true"]{min-height:52vh;border:1px solid #d1d5db;border-radius:8px;padding:14px}
    .editor-actions{display:flex;justify-content:space-between;gap:8px;padding:10px;border-top:1px solid #e5e7eb}
    .admin-status{font:500 12px Inter,system-ui;color:#6b7280;padding:8px 12px;border-bottom:1px solid #e5e7eb}
    .admin-toast{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:10050;background:#111827;color:#fff;padding:10px 14px;border-radius:10px;font:500 12px Inter,system-ui;box-shadow:0 8px 20px rgba(0,0,0,.25);display:none;max-width:min(92vw,760px)}
    .admin-toast.show{display:block}
    .admin-toast.warn{background:#92400e}
    .admin-toast.error{background:#991b1b}
    .admin-toast.success{background:#065f46}
  `;

  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function keyFor(path, id) { return `${EDIT_PREFIX}:${path}:${id}`; }
  function imageKeyFor(path, id) { return `${IMAGE_PREFIX}:${path}:${id}`; }
  function keyForOrder(path, containerId) { return `${ORDER_PREFIX}:${path}:${containerId}`; }
  function isAdmin() { return localStorage.getItem(AUTH_KEY) === '1'; }

  function applySavedContent() {
    const path = location.pathname || 'index';
    document.querySelectorAll('[data-admin-edit-id]').forEach((el) => {
      const saved = localStorage.getItem(keyFor(path, el.dataset.adminEditId));
      if (saved) el.innerHTML = saved;
    });
  }

  async function getRepoRootHandle() {
    if (!window.showDirectoryPicker) {
      throw new Error('File System Access API no disponible en este navegador.');
    }
    if (!repoRootHandle) {
      repoRootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    }
    return repoRootHandle;
  }

  async function savePage() {
    if (!window.showDirectoryPicker) {
      alert('File System Access API not supported.');
      return;
    }

    try {
      const rootDir = await getRepoRootHandle();
      // Determine file path based on location
      let fileName = 'index.html';
      const path = location.pathname;
      if (path.includes('projects.html')) fileName = 'pages/projects.html';
      else if (path.includes('experience.html')) fileName = 'pages/experience.html';
      else if (path.endsWith('/') || path.endsWith('index.html')) fileName = 'index.html';
      else {
        // Simple heuristic for other pages
        fileName = path.substring(1);
      }

      // Handle nested paths if needed, but assuming flat or simple structure for now based on known files
      // Start from root, drill down if needed
      let dirHandle = rootDir;
      const parts = fileName.split('/');
      const actualFileName = parts.pop();

      for (const part of parts) {
        dirHandle = await dirHandle.getDirectoryHandle(part, { create: false });
      }

      const fileHandle = await dirHandle.getFileHandle(actualFileName, { create: false });
      const writable = await fileHandle.createWritable();

      // Prepare content for saving
      // 1. Clone document
      const doc = document.documentElement.cloneNode(true);

      // 2. Remove Admin UI elements
      const toRemove = [
        '.admin-fab', '.admin-modal', '.editor', '.admin-toast',
        'style', // Remove injected admin CSS? Be careful not to remove site CSS. 
        // Our admin CSS is injected via JS creating a style tag. 
        // Usually it's the last one or has specific content. 
        // Best rely on class removal.
        '.admin-move-handle', '.admin-image-btn', '.admin-pencil', '.admin-image-wrap > button'
      ];

      // We need to identify *our* injected style tag. 
      // In injectCSS we just did document.head.appendChild(style); 
      // Often strictly last.
      // Let's remove elements by class first.

      function clean(root) {
        root.querySelectorAll(toRemove.join(',')).forEach(el => el.remove());

        // Unwrap admin-image-wrap
        root.querySelectorAll('.admin-image-wrap').forEach(wrap => {
          const img = wrap.querySelector('img');
          if (img) {
            wrap.replaceWith(img);
            img.style.display = ''; // Remove display:block added by wrapper
          } else {
            wrap.remove();
          }
        });

        // Remove admin attributes and classes
        root.querySelectorAll('*').forEach(el => {
          el.removeAttribute('contenteditable');
          el.draggable = false;
          el.classList.remove('admin-mode', 'admin-editing', 'sortable-item', 'sortable-dragging', 'admin-image-target');

          if (el.dataset.adminEditId) delete el.dataset.adminEditId;
          if (el.dataset.adminImageId) delete el.dataset.adminImageId;
          if (el.dataset.adminImageKind) delete el.dataset.adminImageKind;
          if (el.dataset.adminImageBtn) delete el.dataset.adminImageBtn;
          if (el.dataset.sortId) delete el.dataset.sortId;

          if (el.getAttribute('class') === '') el.removeAttribute('class');
        });
      }

      clean(doc);

      // Remove the specific admin CSS style element. 
      // It's hard to identify perfectly without an ID, but it contains "admin-fab".
      doc.querySelectorAll('head style').forEach(s => {
        if (s.textContent.includes('.admin-fab')) s.remove();
      });

      // Remove the admin script tags?
      // "js/editor-auth.js" - User might want to keep the script for future logins.
      // YES, we must keep the script tag so functionality persists.

      // Serialize
      const htmlContent = `<!DOCTYPE html>\n${doc.outerHTML}`;

      await writable.write(htmlContent);
      await writable.close();

      alert(`File saved successfully to ${fileName}!`);

    } catch (err) {
      console.error(err);
      alert('Error saving file: ' + err.message);
    }
  }

  // --- SORTING LOGIC ---
  function enableSorting() {
    const path = location.pathname || 'index';
    const containers = new Set(document.querySelectorAll(
      '.highlight-list, .mini-grid, .experience-list, .story-grid, .hero-grid, .experience-layout, .experience-shell, aside, .project-grid, .summary-card ul, .exp-details ul, .exp-tags, .tags'
    ));
    const movableSelectors = [
      'p',
      'article',
      '.card',
      '.mini-card',
      '.highlight-item',
      '.experience-card',
      '.project-card',
      '.summary-card',
      '.hero-card',
      '.logo-title',
      '.logo-sub',
      '.profile-name',
      '.profile-subtitle',
      '.header-title',
      '.header-subtitle'
    ];

    document.querySelectorAll(movableSelectors.join(',')).forEach((el) => {
      if (!el || el.closest('.admin-modal,.editor')) return;
      if (el.parentElement) containers.add(el.parentElement);
    });

    Array.from(containers).forEach((container, cIdx) => {
      if (!container.id) container.id = `sort-container-${cIdx}`;
      const cId = container.id;

      // Assign stable IDs to children (assuming initial HTML order is stable enough for now)
      Array.from(container.children).forEach((child, i) => {
        if (!child.dataset.sortId) child.dataset.sortId = `${cId}-item-${i}`;
        child.classList.add('sortable-item');
      });

      // Apply saved order
      const savedOrder = JSON.parse(localStorage.getItem(keyForOrder(path, cId)) || '[]');
      if (savedOrder.length) {
        const itemMap = new Map();
        Array.from(container.children).forEach(child => itemMap.set(child.dataset.sortId, child));

        // Clear and re-append in order
        savedOrder.forEach(sortId => {
          const item = itemMap.get(sortId);
          if (item) container.appendChild(item);
        });

        // Append any new items not in saved order
        Array.from(container.children).forEach(child => {
          if (!savedOrder.includes(child.dataset.sortId) && child.parentNode !== container) {
            container.appendChild(child);
          }
        });
      }
    });
  }

  function saveOrder(container) {
    const path = location.pathname || 'index';
    const order = Array.from(container.children)
      .map(child => child.dataset.sortId)
      .filter(Boolean);
    localStorage.setItem(keyForOrder(path, container.id), JSON.stringify(order));
  }

  function markSortableItems() {
    document.querySelectorAll('.sortable-item').forEach(item => {
      if (item.querySelector('.admin-move-handle')) return; // Already has handle

      const handle = document.createElement('button');
      handle.className = 'admin-move-handle';
      handle.innerHTML = '✥'; // Four arrows symbol roughly
      handle.title = 'Move item';
      handle.type = 'button';

      // Make handle draggable? Actually better to make item draggable but handle is the trigger
      // simpler: use HTML5 drag on the item, but maybe only allow start if handle is grabbed?
      // easy way: handle sets draggable=true on mousedown

      item.draggable = false;
      item.dataset.dragEnabled = '0';

      handle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isEnabled = item.dataset.dragEnabled === '1';
        item.dataset.dragEnabled = isEnabled ? '0' : '1';
        item.draggable = !isEnabled;
        handle.classList.toggle('active', !isEnabled);
      });

      item.addEventListener('dragstart', e => {
        if (!isAdmin()) { e.preventDefault(); return; }
        if (item.dataset.dragEnabled !== '1') { e.preventDefault(); return; }
        e.dataTransfer.effectAllowed = 'move';
        item.classList.add('sortable-dragging');
        window.dragSource = item;
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('sortable-dragging');
        item.dataset.dragEnabled = '0';
        item.draggable = false;
        handle.classList.remove('active');
        window.dragSource = null;
        saveOrder(item.parentElement);
      });

      item.addEventListener('dragover', e => {
        e.preventDefault();
        const source = window.dragSource;
        if (!source || source === item || source.parentElement !== item.parentElement) return;

        const rect = item.getBoundingClientRect();
        // Determine insertion direction
        const next = (e.clientY - rect.top) > (rect.height / 2);
        if (next) {
          item.parentElement.insertBefore(source, item.nextSibling);
        } else {
          item.parentElement.insertBefore(source, item);
        }
      });

      item.appendChild(handle);
    });
  }
  // --- END SORTING LOGIC ---

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

  function getRootRelativePrefix() {
    const script = document.currentScript
      || Array.from(document.scripts || []).find((s) => /(?:^|\/)js\/editor-auth\.js(?:$|[?#])/.test(String(s.src || s.getAttribute('src') || '')));

    const srcAttr = script ? String(script.getAttribute('src') || script.src || '') : '';
    const match = srcAttr.match(/^(.*?)(?:js\/editor-auth\.js)(?:[?#].*)?$/);
    const prefix = match ? match[1] : '';
    return prefix || '';
  }


  function toPageAssetPath(assetPath) {
    return `${getRootRelativePrefix()}${assetPath}`;
  }

  function cleanPath(rawPath) {
    return String(rawPath || '').replace(/^\/+/, '').replace(/\?.*$/, '').replace(/#.*$/, '');
  }

  function resolveAssetPath(rawPath) {
    if (!rawPath) return '';
    const base = location.href;
    let absolutePath = '';
    try {
      absolutePath = new URL(rawPath, base).pathname;
    } catch (err) {
      return '';
    }

    const cleaned = cleanPath(absolutePath);
    if (cleaned.startsWith('assets/')) return cleaned;
    return '';
  }

  function parseBackgroundUrl(value) {
    const match = String(value || '').match(/url\((['"]?)(.*?)\1\)/i);
    return match ? match[2] : '';
  }

  function inferTargetAssetPath(target, ext) {
    if (target.dataset.adminImageKind === 'img') {
      const rawSrc = target.getAttribute('src') || target.src || '';
      const existing = resolveAssetPath(rawSrc);
      if (existing) return existing;
    }

    const inlineBg = parseBackgroundUrl(target.style.backgroundImage || target.getAttribute('style') || '');
    const computedBg = parseBackgroundUrl(window.getComputedStyle(target).backgroundImage || '');
    const existing = resolveAssetPath(inlineBg || computedBg);
    if (existing) return existing;

    const fallbackName = `${Date.now()}-${slugify(target.dataset.adminImageId || 'image')}.${ext}`;
    return `assets/uploads/${fallbackName}`;
  }

  async function saveReducedImageToRepo(blob, relativeAssetPath) {
    const rootDir = await getRepoRootHandle();
    const cleanRelativePath = cleanPath(relativeAssetPath);
    if (!cleanRelativePath.startsWith('assets/')) {
      throw new Error('Ruta destino inválida para guardar imagen.');
    }

    const parts = cleanRelativePath.split('/');
    const filename = parts.pop();
    let dirHandle = rootDir;
    for (const part of parts) {
      dirHandle = await dirHandle.getDirectoryHandle(part, { create: true });
    }
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    return cleanRelativePath;
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
      const storageKey = imageKeyFor(path, el.dataset.adminImageId);
      const saved = localStorage.getItem(storageKey);
      const kind = el.dataset.adminImageKind;
      applyImageFit(el, kind);
      if (!saved) return;
      if (saved.startsWith('data:')) {
        localStorage.removeItem(storageKey);
        return;
      }

      if (kind === 'img') {
        el.src = saved;
      } else {
        el.style.backgroundImage = `url("${saved}")`;
      }
    });
  }

  function notify(message, tone) {
    if (!adminToast) return;
    adminToast.textContent = message;
    adminToast.className = `admin-toast show ${tone || ''}`.trim();
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      adminToast.className = 'admin-toast';
    }, 5200);
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
        const assetPath = inferTargetAssetPath(target, reduced.ext);
        const storedRelativePath = await saveReducedImageToRepo(reduced.blob, assetPath);
        const storedPath = toPageAssetPath(storedRelativePath);

        const key = imageKeyFor(path, target.dataset.adminImageId);
        try {
          localStorage.setItem(key, storedPath);
        } catch (storageErr) {
          console.warn('No se pudo persistir la ruta en localStorage, se mantiene enlace aplicado en el DOM.', storageErr);
        }

        if (target.dataset.adminImageKind === 'img') {
          target.src = storedPath;
        } else {
          target.style.backgroundImage = `url("${storedPath}")`;
        }

        applyImageFit(target, target.dataset.adminImageKind);
        notify(`Imagen reemplazada en ${storedRelativePath} y aplicada correctamente.`, 'success');
      } catch (err) {
        console.error(err);
        notify('No se pudo reemplazar la imagen en el repositorio. Verifica permisos de carpeta y vuelve a intentar.', 'error');
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
      if (el.classList.contains('admin-image-wrap') || el.classList.contains('admin-image-target')) return false;
      const styleAttr = el.getAttribute('style') || '';
      const inlineHasBg = /background-image\s*:/.test(styleAttr);
      const computedBg = window.getComputedStyle(el).backgroundImage || 'none';
      const computedHasBg = computedBg !== 'none';
      if (!inlineHasBg && !computedHasBg) return false;
      const rect = el.getBoundingClientRect();
      return rect.width >= 40 && rect.height >= 40;
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
    const candidates = new Set(document.querySelectorAll('main section, .page section, section, article, .card, .mini-card, .highlight-item'));
    document.querySelectorAll('.hero, .hero-grid, #top > section:first-of-type').forEach((el) => candidates.add(el));

    let idx = 1;

    // First pass: assign IDs if missing
    Array.from(candidates).forEach((el) => {
      if (!el || el.closest('.admin-modal,.editor')) return;

      // Assign ID if missing
      if (!el.dataset.adminEditId) {
        const textLen = (el.textContent || '').trim().length;
        const forced = el.matches('.hero, .hero-grid, #top > section:first-of-type');
        if (!forced && textLen < 25) return;
        el.dataset.adminEditId = `sec-${idx++}`;
      }

      // Always ensure class is present
      el.classList.add('admin-edit-target');

      // Check for button, add if missing
      if (!el.querySelector(':scope > .admin-pencil')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'admin-pencil';
        btn.textContent = '✏️';
        btn.title = 'Edit section';
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent triggering parent clicks
          openEditor(el);
        });
        el.appendChild(btn);
      }
    });
  }

  let currentTarget = null;
  let modal, fab, resetFab, editorModal, editableArea, adminToast, toastTimer;

  function closeModal() { modal.classList.remove('show'); }
  function openModal() { modal.classList.add('show'); }

  function setAdminMode(on) {
    if (on) {
      document.body.classList.add('admin-mode');
      fab.textContent = 'Admin mode: on';
      fab.dataset.state = 'on';
      if (resetFab) resetFab.style.display = 'block';
    } else {
      document.body.classList.remove('admin-mode');
      fab.textContent = 'Admin login';
      fab.dataset.state = 'off';
      if (resetFab) resetFab.style.display = 'none';
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
    fab.textContent = 'Admin login';
    fab.addEventListener('click', () => {
      if (isAdmin()) {
        localStorage.removeItem(AUTH_KEY);
        setAdminMode(false);
      } else {
        openModal();
      }
    });

    // Reset Configuration FAB (Only shows when Admin)
    resetFab = document.createElement('button');
    resetFab.className = 'admin-reset-fab';
    resetFab.type = 'button';
    resetFab.textContent = 'Reset Config';
    resetFab.title = 'Restore layout & content to original files';
    resetFab.addEventListener('click', () => {
      if (!isAdmin()) return;
      const confirmReset = confirm('Are you sure? This will discard ALL edits (layout, text, images) for this page by clearing local storage and reloading.');
      if (confirmReset) {
        const path = location.pathname || 'index';
        // Remove Edits
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith(`${EDIT_PREFIX}:${path}:`)) localStorage.removeItem(k);
          if (k.startsWith(`${IMAGE_PREFIX}:${path}:`)) localStorage.removeItem(k);
          if (k.startsWith(`${ORDER_PREFIX}:${path}:`)) localStorage.removeItem(k);
        });
        location.reload();
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
          <button class="admin-btn" type="button" id="admin-save-code">Save Page</button>
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

    adminToast = document.createElement('div');
    adminToast.className = 'admin-toast';
    document.body.append(fab, resetFab, modal, editorModal, adminToast);
    editableArea = editorModal.querySelector('#admin-editable');

    modal.querySelector('#admin-cancel').addEventListener('click', closeModal);

    modal.querySelector('#admin-save-code').addEventListener('click', () => {
      savePage();
    });

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

  // Initialize sorting BEFORE other edits to ensure DOM stability
  enableSorting();

  markEditableSections();
  markEditableImages();
  markSortableItems(); // Add handles

  applySavedContent();
  applySavedImages();
  createUI();

  setAdminMode(isAdmin());
  window.addEventListener('load', () => {
    enableSorting();
    markEditableSections();
    markEditableImages();
    markSortableItems();
  }, { once: true });
  setTimeout(() => {
    enableSorting();
    markEditableSections();
    markEditableImages();
    markSortableItems();
  }, 900);
})();
