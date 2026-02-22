(() => {
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

  const carousels = Array.from(document.querySelectorAll('[data-screenshot-carousel]'));
  if (!carousels.length) return;

  carousels.forEach((carousel) => {
    const track = carousel.querySelector('.screenshot-carousel__track');
    const prevButton = carousel.querySelector('.screenshot-carousel__control.prev');
    const nextButton = carousel.querySelector('.screenshot-carousel__control.next');

    if (!track || !prevButton || !nextButton) return;

    let index = 0;
    let autoTimer = null;
    const autoInterval = Number(carousel.dataset.autoplayMs) > 0
      ? Number(carousel.dataset.autoplayMs)
      : 4500;
    let pausedByUser = false;

    const getSlides = () => Array.from(track.querySelectorAll('.screenshot-carousel__slide'));
    const isAdminMode = () => document.body.classList.contains('cms-admin-mode');

    const render = () => {
      const slides = getSlides();
      const max = slides.length;
      if (max === 0) {
        prevButton.disabled = true;
        nextButton.disabled = true;
        track.style.transform = 'translateX(0)';
        return;
      }

      if (index >= max) index = max - 1;
      if (index < 0) index = 0;
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle('is-active', slideIndex === index);
      });
      track.style.transform = `translateX(-${index * 100}%)`;
      const disabled = max <= 1;
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
      if (getSlides().length <= 1) return;
      autoTimer = window.setInterval(() => {
        const max = getSlides().length;
        if (max <= 1) return;
        index = (index + 1) % max;
        render();
      }, autoInterval);
    };

    const stopAndPause = () => {
      pausedByUser = true;
      clearAuto();
    };

    const updateAfterInteraction = () => {
      render();
      if (!pausedByUser) startAuto();
    };

    prevButton.addEventListener('click', () => {
      const max = getSlides().length;
      if (max <= 1) return;
      index = (index - 1 + max) % max;
      stopAndPause();
      render();
    });

    nextButton.addEventListener('click', () => {
      const max = getSlides().length;
      if (max <= 1) return;
      index = (index + 1) % max;
      stopAndPause();
      render();
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
        const imageUrl = window.prompt('Paste image URL for this screenshot:');
        if (!imageUrl) return;
        const label = window.prompt('Optional label/caption:', 'Sample Picture') || 'Sample Picture';
        const cleanUrl = imageUrl.trim();
        if (!cleanUrl) return;

        const slide = document.createElement('div');
        slide.className = 'screenshot-carousel__slide';
        slide.innerHTML = `
          <div class="img-placeholder" data-label="${label.replace(/"/g, '&quot;')}" style="height:320px;background-image:url('${cleanUrl.replace(/'/g, '%27')}');"></div>
        `;
        track.appendChild(slide);
        index = getSlides().length - 1;
        updateAfterInteraction();
      };
    };

    const modeObserver = new MutationObserver(() => ensureAddButton());
    modeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    ensureAddButton();
    render();
    startAuto();
  });
})();
