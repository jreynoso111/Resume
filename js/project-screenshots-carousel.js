(() => {
  const getBackgroundImageUrl = (element) => {
    if (!element || !element.classList || !element.classList.contains('img-placeholder')) return '';
    const bg = window.getComputedStyle(element).backgroundImage || '';
    const match = bg.match(/url\((['"]?)(.*?)\1\)/i);
    return match && match[2] ? match[2] : '';
  };

  const aspectRatioCache = new Map();
  const aspectRatioPending = new Set();

  const markAdaptivePlaceholders = (root = document) => {
    const selectors = [
      '.project-media-main .img-placeholder',
      '.grid-2 > .img-placeholder',
      '.screenshot-carousel__slide .img-placeholder'
    ];
    selectors.forEach((selector) => {
      Array.from(root.querySelectorAll(selector)).forEach((element) => {
        element.classList.add('img-placeholder--adaptive');
      });
    });
  };

  const setPlaceholderAspectRatio = (element, ratio) => {
    if (!element || !ratio) return;
    if (element.style.getPropertyValue('--media-aspect-ratio') !== ratio) {
      element.style.setProperty('--media-aspect-ratio', ratio);
    }
    if (element.getAttribute('data-has-media-ratio') !== '1') {
      element.setAttribute('data-has-media-ratio', '1');
    }
  };

  const applyAdaptiveMedia = () => {
    markAdaptivePlaceholders();
    const placeholders = Array.from(document.querySelectorAll('.img-placeholder.img-placeholder--adaptive'));
    placeholders.forEach((element) => {
      const url = getBackgroundImageUrl(element);
      if (!url) {
        if (element.hasAttribute('data-has-media-ratio')) element.removeAttribute('data-has-media-ratio');
        if (element.style.getPropertyValue('--media-aspect-ratio')) {
          element.style.removeProperty('--media-aspect-ratio');
        }
        return;
      }

      const cachedRatio = aspectRatioCache.get(url);
      if (cachedRatio) {
        setPlaceholderAspectRatio(element, cachedRatio);
        return;
      }

      if (aspectRatioPending.has(url)) return;

      aspectRatioPending.add(url);
      const image = new Image();
      image.onload = () => {
        const width = Number(image.naturalWidth) || 0;
        const height = Number(image.naturalHeight) || 0;
        if (width > 0 && height > 0) {
          const ratio = `${width} / ${height}`;
          aspectRatioCache.set(url, ratio);
        }
        aspectRatioPending.delete(url);
        window.requestAnimationFrame(() => applyAdaptiveMedia());
      };
      image.onerror = () => {
        aspectRatioPending.delete(url);
      };
      image.src = url;
    });
  };

  const ensureStandardSamplePicturesSection = () => {
    const path = String(window.location.pathname || '').toLowerCase();
    const isProjectsIndex = /\/projects\.html$/.test(path);
    const isProjectDetail = /\/projects\/[^/]+\.html$/.test(path);
    if (!isProjectDetail || isProjectsIndex) return;

    const main = document.querySelector('main.page-main, main');
    if (!main) return;
    if (main.querySelector('.project-screenshots')) return;

    const section = document.createElement('section');
    section.className = 'project-screenshots';
    section.innerHTML = `
      <h2 class="standard-h2">Sample Pictures</h2>
      <div class="screenshot-carousel" data-screenshot-carousel data-autoplay-ms="4500" tabindex="0">
        <button class="screenshot-carousel__control prev" type="button" aria-label="Previous screenshot">‹</button>
        <div class="screenshot-carousel__viewport">
          <div class="screenshot-carousel__track">
            <div class="screenshot-carousel__slide">
              <div class="img-placeholder" data-label="Sample Picture 1" style="height:320px;"></div>
            </div>
            <div class="screenshot-carousel__slide">
              <div class="img-placeholder" data-label="Sample Picture 2" style="height:320px;"></div>
            </div>
          </div>
        </div>
        <button class="screenshot-carousel__control next" type="button" aria-label="Next screenshot">›</button>
      </div>
    `;
    main.appendChild(section);
  };

  ensureStandardSamplePicturesSection();
  applyAdaptiveMedia();

  const nodeContainsPlaceholder = (node) => {
    if (!(node instanceof Element)) return false;
    if (node.classList.contains('img-placeholder')) return true;
    return Boolean(node.querySelector('.img-placeholder'));
  };

  const mediaObserver = new MutationObserver((mutations) => {
    const shouldRefresh = mutations.some((mutation) => {
      if (mutation.type === 'childList') {
        const added = Array.from(mutation.addedNodes || []).some(nodeContainsPlaceholder);
        const removed = Array.from(mutation.removedNodes || []).some(nodeContainsPlaceholder);
        return added || removed;
      }
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        return target instanceof Element && target.classList.contains('img-placeholder');
      }
      return false;
    });
    if (!shouldRefresh) return;
    window.requestAnimationFrame(() => applyAdaptiveMedia());
  });
  mediaObserver.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style']
  });

  const carousels = Array.from(document.querySelectorAll('[data-screenshot-carousel]'));
  if (!carousels.length) return;

  carousels.forEach((carousel) => {
    const track = carousel.querySelector('.screenshot-carousel__track');
    const viewport = carousel.querySelector('.screenshot-carousel__viewport');
    const prevButton = carousel.querySelector('.screenshot-carousel__control.prev');
    const nextButton = carousel.querySelector('.screenshot-carousel__control.next');

    if (!track || !viewport || !prevButton || !nextButton) return;

    let index = 0;
    let autoTimer = null;
    const autoInterval = Number(carousel.dataset.autoplayMs) > 0
      ? Number(carousel.dataset.autoplayMs)
      : 4500;
    let pausedByUser = false;

    const getSlides = () => Array.from(track.querySelectorAll('.screenshot-carousel__slide'));
    const getRealSlides = () => getSlides().filter((slide) => slide.getAttribute('data-carousel-clone') !== '1');
    const isAdminMode = () => document.body.classList.contains('cms-admin-mode');

    const rebuildTrackClones = () => {
      const realSlides = getRealSlides();
      realSlides.forEach((slide, slideIndex) => {
        slide.dataset.carouselSourceIndex = String(slideIndex);
        slide.removeAttribute('data-carousel-clone');
      });
      Array.from(track.querySelectorAll('.screenshot-carousel__slide[data-carousel-clone="1"]'))
        .forEach((clone) => clone.remove());

      if (realSlides.length <= 1) return realSlides.length;

      const firstClone = realSlides[0].cloneNode(true);
      firstClone.setAttribute('data-carousel-clone', '1');
      firstClone.dataset.carouselSourceIndex = '0';

      const lastClone = realSlides[realSlides.length - 1].cloneNode(true);
      lastClone.setAttribute('data-carousel-clone', '1');
      lastClone.dataset.carouselSourceIndex = String(realSlides.length - 1);

      track.insertBefore(lastClone, realSlides[0]);
      track.appendChild(firstClone);
      return realSlides.length;
    };

    const setTransformX = (valuePx, skipTransition = false) => {
      if (!skipTransition) {
        track.style.transform = `translateX(${valuePx}px)`;
        return;
      }
      track.style.transition = 'none';
      track.style.transform = `translateX(${valuePx}px)`;
      // Force layout before restoring transition
      void track.offsetWidth;
      track.style.removeProperty('transition');
    };

    const getCenteredTranslate = (visualIndex) => {
      const slides = getSlides();
      const slide = slides[visualIndex];
      if (!slide) return 0;
      const viewportWidth = viewport.clientWidth || 0;
      const slideWidth = slide.getBoundingClientRect().width || 0;
      const targetLeft = Math.max(0, (viewportWidth - slideWidth) / 2);
      return -(slide.offsetLeft - targetLeft);
    };

    const render = (options = {}) => {
      const { skipTransition = false } = options;
      const realCount = rebuildTrackClones();
      const slides = getSlides();

      if (realCount === 0) {
        prevButton.disabled = true;
        nextButton.disabled = true;
        carousel.classList.add('is-single');
        setTransformX(0, skipTransition);
        return;
      }

      index = ((index % realCount) + realCount) % realCount;
      const visualIndex = realCount > 1 ? index + 1 : index;

      slides.forEach((slide) => {
        const sourceIndex = Number(slide.dataset.carouselSourceIndex || '-1');
        slide.classList.toggle('is-active', sourceIndex === index);
      });

      const translateX = getCenteredTranslate(visualIndex);
      setTransformX(translateX, skipTransition);

      const disabled = realCount <= 1;
      carousel.classList.toggle('is-single', disabled);
      prevButton.disabled = disabled;
      nextButton.disabled = disabled;
    };

    const clearAuto = () => {
      if (!autoTimer) return;
      window.clearInterval(autoTimer);
      autoTimer = null;
    };

    const startAuto = () => {
      clearAuto();
      if (pausedByUser) return;
      if (isAdminMode()) return;
      if (getRealSlides().length <= 1) return;
      autoTimer = window.setInterval(() => {
        const max = getRealSlides().length;
        if (max <= 1) return;
        const wrapped = index >= max - 1;
        index = wrapped ? 0 : index + 1;
        render({ skipTransition: wrapped });
      }, autoInterval);
    };

    const stopAndPause = () => {
      pausedByUser = true;
      clearAuto();
    };

    const updateAfterInteraction = () => {
      render({ skipTransition: true });
      if (!pausedByUser) startAuto();
    };

    prevButton.addEventListener('click', () => {
      const max = getRealSlides().length;
      if (max <= 1) return;
      const wrapped = index <= 0;
      index = wrapped ? max - 1 : index - 1;
      stopAndPause();
      render({ skipTransition: wrapped });
    });

    nextButton.addEventListener('click', () => {
      const max = getRealSlides().length;
      if (max <= 1) return;
      const wrapped = index >= max - 1;
      index = wrapped ? 0 : index + 1;
      stopAndPause();
      render({ skipTransition: wrapped });
    });

    track.addEventListener('click', (event) => {
      const target = event.target;
      const placeholder = target && target.closest ? target.closest('.img-placeholder') : null;
      if (!placeholder) return;
      if (!placeholder.closest('.screenshot-carousel__slide')) return;
      const max = getRealSlides().length;
      if (max <= 1) return;
      const wrapped = index >= max - 1;
      index = wrapped ? 0 : index + 1;
      stopAndPause();
      render({ skipTransition: wrapped });
    });

    carousel.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prevButton.click();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextButton.click();
      }
    });

    carousel.addEventListener('mouseenter', clearAuto);
    carousel.addEventListener('mouseleave', startAuto);
    carousel.addEventListener('focusin', clearAuto);
    carousel.addEventListener('focusout', () => {
      if (!carousel.contains(document.activeElement)) startAuto();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearAuto();
      else startAuto();
    });
    window.addEventListener('resize', () => {
      window.requestAnimationFrame(() => render({ skipTransition: true }));
    });

    const ensureAddButton = () => {
      let addButton = carousel.parentElement && carousel.parentElement.querySelector('.screenshot-carousel__add');
      if (!addButton) {
        addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'screenshot-carousel__add cms-ui';
        addButton.setAttribute('data-cms-ui', '1');
        addButton.textContent = '+ Add picture';
        carousel.insertAdjacentElement('afterend', addButton);
      }

      addButton.style.display = isAdminMode() ? 'inline-flex' : 'none';
      addButton.onclick = () => {
        if (!isAdminMode()) return;
        const createSlide = (sourceUrl, labelText) => {
          const slide = document.createElement('div');
          slide.className = 'screenshot-carousel__slide';
          const safeLabel = String(labelText || 'Sample Picture').replace(/"/g, '&quot;');
          const safeUrl = String(sourceUrl || '').replace(/'/g, '%27');
          slide.innerHTML = `
            <div class="img-placeholder" data-label="${safeLabel}" style="height:320px;background-image:url('${safeUrl}');"></div>
          `;
          track.appendChild(slide);
          index = getRealSlides().length - 1;
          applyAdaptiveMedia();
          updateAfterInteraction();
        };

        const openFilePicker = () => {
          const picker = document.createElement('input');
          picker.type = 'file';
          picker.accept = 'image/*';
          picker.multiple = true;
          picker.style.position = 'fixed';
          picker.style.left = '-9999px';
          picker.style.width = '1px';
          picker.style.height = '1px';
          picker.style.opacity = '0';
          picker.setAttribute('aria-hidden', 'true');
          document.body.appendChild(picker);

          picker.addEventListener('change', () => {
            const files = Array.from(picker.files || []);
            picker.remove();
            if (!files.length) return;

            files.forEach((file, fileIndex) => {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = String(reader.result || '');
                if (!dataUrl) return;
                const defaultLabel = file && file.name ? file.name.replace(/\.[a-z0-9]+$/i, '') : `Sample Picture ${fileIndex + 1}`;
                const label = window.prompt('Optional label/caption:', defaultLabel) || defaultLabel;
                createSlide(dataUrl, label);
              };
              reader.readAsDataURL(file);
            });
          }, { once: true });

          picker.click();
        };

        const entry = window.prompt('Paste an image URL, or type "upload" to choose from your device:', 'upload');
        if (entry === null) return;
        const raw = entry.trim();
        if (!raw || raw.toLowerCase() === 'upload') {
          openFilePicker();
          return;
        }

        const label = window.prompt('Optional label/caption:', 'Sample Picture') || 'Sample Picture';
        createSlide(raw, label);
      };
    };

    const modeObserver = new MutationObserver(() => ensureAddButton());
    modeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    ensureAddButton();
    render();
    startAuto();
  });
})();
