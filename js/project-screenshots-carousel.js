(() => {
  const carousels = Array.from(document.querySelectorAll('[data-screenshot-carousel]'));
  if (!carousels.length) return;

  carousels.forEach((carousel) => {
    const track = carousel.querySelector('.screenshot-carousel__track');
    const prevButton = carousel.querySelector('.screenshot-carousel__control.prev');
    const nextButton = carousel.querySelector('.screenshot-carousel__control.next');

    if (!track || !prevButton || !nextButton) return;

    let index = 0;

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
      track.style.transform = `translateX(-${index * 100}%)`;
      const disabled = max <= 1;
      prevButton.disabled = disabled;
      nextButton.disabled = disabled;
    };

    prevButton.addEventListener('click', () => {
      const max = getSlides().length;
      if (max <= 1) return;
      index = (index - 1 + max) % max;
      render();
    });

    nextButton.addEventListener('click', () => {
      const max = getSlides().length;
      if (max <= 1) return;
      index = (index + 1) % max;
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
        const slide = document.createElement('div');
        slide.className = 'screenshot-carousel__slide';
        slide.innerHTML = `
          <div class="img-placeholder" data-label="New Picture" style="height:320px;"></div>
        `;
        track.appendChild(slide);
        index = getSlides().length - 1;
        render();
      };
    };

    const modeObserver = new MutationObserver(() => ensureAddButton());
    modeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    ensureAddButton();
    render();
  });
})();
