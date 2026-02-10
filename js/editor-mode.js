(() => {
  const isAdmin = window.isAdmin === true;
  const toggleButton = document.getElementById('editor-toggle');
  const editorRoot = document.getElementById('editor-root');
  const toolbar = document.querySelector('.toolbar');

  if (!editorRoot || !toggleButton || !toolbar) return;

  let editorOn = false;
  let canvas = null;
  let activeDrag = null;
  let gridOverlay = null;
  let snapOn = true;
  let snapSize = 1;
  let lockAxis = null;
  let zoomLevel = 1;
  const layoutKey = 'layoutDraft:v1';

  function ensureCanvas() {
    if (canvas) return canvas;
    canvas = document.createElement('div');
    canvas.className = 'editor-canvas';
    canvas.style.transformOrigin = '0 0';

    while (editorRoot.firstChild) {
      canvas.appendChild(editorRoot.firstChild);
    }

    editorRoot.appendChild(canvas);
    return canvas;
  }

  function ensureGrid() {
    if (!canvas) return null;
    if (gridOverlay) return gridOverlay;
    gridOverlay = document.createElement('div');
    gridOverlay.className = 'editor-grid';
    gridOverlay.setAttribute('aria-hidden', 'true');
    canvas.appendChild(gridOverlay);
    return gridOverlay;
  }

  function updateGridSize(size) {
    if (!canvas) return;
    canvas.style.setProperty('--grid-size', `${size}px`);
  }

  function applyZoom() {
    if (!canvas) return;
    canvas.style.transform = `scale(${zoomLevel})`;
  }

  function setZoom(nextZoom) {
    zoomLevel = Math.min(3, Math.max(0.25, nextZoom));
    applyZoom();
  }

  function zoomIn() {
    setZoom(Math.round((zoomLevel + 0.1) * 100) / 100);
  }

  function zoomOut() {
    setZoom(Math.round((zoomLevel - 0.1) * 100) / 100);
  }

  function zoomReset() {
    setZoom(1);
  }

  function unwrapCanvas() {
    if (!canvas) return;

    while (canvas.firstChild) {
      editorRoot.appendChild(canvas.firstChild);
    }

    canvas.remove();
    canvas = null;
    gridOverlay = null;
  }

  function cacheOriginalStyle(el) {
    if (!el.dataset.editorOriginalStyle) {
      el.dataset.editorOriginalStyle = el.getAttribute('style') || '';
    }
  }

  function restoreOriginalStyle(el) {
    const original = el.dataset.editorOriginalStyle;
    if (original) {
      el.setAttribute('style', original);
    } else {
      el.removeAttribute('style');
    }
    delete el.dataset.editorOriginalStyle;
  }

  function applyAbsolutePosition(el) {
    if (!canvas) return;
    cacheOriginalStyle(el);
    const rect = el.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const left = (rect.left - canvasRect.left + canvas.scrollLeft) / zoomLevel;
    const top = (rect.top - canvasRect.top + canvas.scrollTop) / zoomLevel;
    const width = rect.width / zoomLevel;

    el.style.position = 'absolute';
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.width = `${width}px`;
  }

  function makeEditableAbsolute() {
    const targets = editorRoot.querySelectorAll('[data-editable="true"]');
    targets.forEach((el) => applyAbsolutePosition(el));
  }

  function ensureEditableIds() {
    const targets = editorRoot.querySelectorAll('[data-editable="true"]');
    targets.forEach((el, index) => {
      if (!el.dataset.editableId) {
        el.dataset.editableId = `editable-${index + 1}`;
      }
    });
  }

  function loadLayout() {
    const raw = localStorage.getItem(layoutKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function saveLayout(layout) {
    localStorage.setItem(layoutKey, JSON.stringify(layout));
  }

  function collectLayout() {
    const layout = {};
    const targets = editorRoot.querySelectorAll('[data-editable="true"]');
    targets.forEach((el) => {
      const id = el.dataset.editableId;
      if (!id) return;
      const rect = el.getBoundingClientRect();
      layout[id] = {
        x: parseFloat(el.style.left) || 0,
        y: parseFloat(el.style.top) || 0,
        width: parseFloat(el.style.width) || rect.width / zoomLevel,
        height: parseFloat(el.style.height) || rect.height / zoomLevel,
        z: parseInt(el.style.zIndex || '0', 10) || 0
      };
    });
    return layout;
  }

  function applySavedLayout() {
    const layout = loadLayout();
    if (!layout) return;
    const targets = editorRoot.querySelectorAll('[data-editable="true"]');
    targets.forEach((el) => {
      const id = el.dataset.editableId;
      if (!id || !layout[id]) return;
      const item = layout[id];
      if (typeof item.x === 'number') el.style.left = `${item.x}px`;
      if (typeof item.y === 'number') el.style.top = `${item.y}px`;
      if (typeof item.width === 'number') el.style.width = `${item.width}px`;
      if (typeof item.height === 'number') el.style.height = `${item.height}px`;
      if (typeof item.z === 'number') el.style.zIndex = String(item.z);
    });
  }

  function restoreEditableStyles() {
    const targets = editorRoot.querySelectorAll('[data-editable="true"]');
    targets.forEach((el) => restoreOriginalStyle(el));
  }

  function onMouseDown(event) {
    if (!editorOn || !canvas) return;
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const originLeft = parseFloat(target.style.left) || 0;
    const originTop = parseFloat(target.style.top) || 0;

    activeDrag = {
      target,
      startX,
      startY,
      originLeft,
      originTop
    };
    lockAxis = null;

    target.style.cursor = 'grabbing';
    event.preventDefault();
  }

  function onMouseMove(event) {
    if (!activeDrag || !canvas) return;
    const { target, startX, startY, originLeft, originTop } = activeDrag;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    const scaledDeltaX = deltaX / zoomLevel;
    const scaledDeltaY = deltaY / zoomLevel;
    const shouldSnap = snapOn && !event.altKey;

    if (event.shiftKey) {
      if (!lockAxis) {
        lockAxis = Math.abs(deltaX) >= Math.abs(deltaY) ? 'x' : 'y';
      }
    } else {
      lockAxis = null;
    }

    const nextLeft = originLeft + (lockAxis === 'y' ? 0 : scaledDeltaX);
    const nextTop = originTop + (lockAxis === 'x' ? 0 : scaledDeltaY);

    if (shouldSnap) {
      target.style.left = `${Math.round(nextLeft / snapSize) * snapSize}px`;
      target.style.top = `${Math.round(nextTop / snapSize) * snapSize}px`;
    } else {
      target.style.left = `${nextLeft}px`;
      target.style.top = `${nextTop}px`;
    }
  }

  function onMouseUp() {
    if (!activeDrag) return;
    activeDrag.target.style.cursor = 'grab';
    activeDrag = null;
    lockAxis = null;
  }

  function bindDragHandlers() {
    const targets = editorRoot.querySelectorAll('[data-editable="true"]');
    targets.forEach((el) => {
      el.addEventListener('mousedown', onMouseDown);
    });
  }

  function unbindDragHandlers() {
    const targets = editorRoot.querySelectorAll('[data-editable="true"]');
    targets.forEach((el) => {
      el.removeEventListener('mousedown', onMouseDown);
    });
  }

  function setEditor(on) {
    if (!isAdmin) return;
    editorOn = on;
    document.body.classList.toggle('editor-active', on);

    if (on) {
      ensureCanvas();
      ensureGrid();
      updateGridSize(snapSize);
      applyZoom();
      ensureEditableIds();
      makeEditableAbsolute();
      applySavedLayout();
      bindDragHandlers();
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      toggleButton.textContent = 'Desactivar editor';
    } else {
      unbindDragHandlers();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      restoreEditableStyles();
      unwrapCanvas();
      toggleButton.textContent = 'Activar editor';
    }
  }

  function onWheel(event) {
    if (!editorOn) return;
    if (!event.ctrlKey) return;
    event.preventDefault();
    if (event.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }

  function buildControls() {
    const controls = document.createElement('div');
    controls.className = 'editor-controls';

    const snapLabel = document.createElement('label');
    const snapCheckbox = document.createElement('input');
    snapCheckbox.type = 'checkbox';
    snapCheckbox.checked = snapOn;
    snapCheckbox.addEventListener('change', () => {
      snapOn = snapCheckbox.checked;
    });
    snapLabel.append(snapCheckbox, document.createTextNode('Snap'));

    const sizeLabel = document.createElement('label');
    sizeLabel.textContent = 'Grid';
    const sizeSelect = document.createElement('select');
    [1, 2, 4, 8, 16].forEach((size) => {
      const option = document.createElement('option');
      option.value = String(size);
      option.textContent = `${size}px`;
      if (size === snapSize) option.selected = true;
      sizeSelect.appendChild(option);
    });
    sizeSelect.addEventListener('change', () => {
      snapSize = Number(sizeSelect.value) || 1;
      updateGridSize(snapSize);
    });
    sizeLabel.appendChild(sizeSelect);

    const zoomInButton = document.createElement('button');
    zoomInButton.type = 'button';
    zoomInButton.textContent = 'Zoom +';
    zoomInButton.addEventListener('click', zoomIn);

    const zoomOutButton = document.createElement('button');
    zoomOutButton.type = 'button';
    zoomOutButton.textContent = 'Zoom -';
    zoomOutButton.addEventListener('click', zoomOut);

    const zoomResetButton = document.createElement('button');
    zoomResetButton.type = 'button';
    zoomResetButton.textContent = 'Reset 100%';
    zoomResetButton.addEventListener('click', zoomReset);

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', () => {
      ensureEditableIds();
      saveLayout(collectLayout());
    });

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.textContent = 'Reset';
    resetButton.addEventListener('click', () => {
      localStorage.removeItem(layoutKey);
      if (editorOn) {
        restoreEditableStyles();
        makeEditableAbsolute();
        applySavedLayout();
      }
    });

    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.textContent = 'Export JSON';
    exportButton.addEventListener('click', () => {
      ensureEditableIds();
      const layout = collectLayout();
      const payload = JSON.stringify(layout, null, 2);
      window.prompt('Layout JSON', payload);
    });

    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.textContent = 'Import JSON';
    importButton.addEventListener('click', () => {
      const raw = window.prompt('Pega el JSON del layout');
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        saveLayout(parsed);
        if (editorOn) {
          applySavedLayout();
        }
      } catch (error) {
        window.alert('JSON inválido');
      }
    });

    controls.append(
      snapLabel,
      sizeLabel,
      zoomOutButton,
      zoomInButton,
      zoomResetButton,
      saveButton,
      resetButton,
      exportButton,
      importButton
    );
    toolbar.appendChild(controls);
  }

  if (!isAdmin) {
    toggleButton.style.display = 'none';
    return;
  }

  buildControls();
  document.addEventListener('wheel', onWheel, { passive: false });
  toggleButton.addEventListener('click', () => {
    setEditor(!editorOn);
  });
})();
