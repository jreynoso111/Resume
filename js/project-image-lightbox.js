(() => {
  const placeholders = Array.from(document.querySelectorAll('.img-placeholder'));
  if (!placeholders.length) return;

  const getImageUrl = (element) => {
    const bg = window.getComputedStyle(element).backgroundImage || '';
    const match = bg.match(/url\((['"]?)(.*?)\1\)/i);
    return match && match[2] ? match[2] : '';
  };

  const zoomable = placeholders.filter((el) => Boolean(getImageUrl(el)));
  if (!zoomable.length) return;

  const modal = document.createElement('div');
  modal.className = 'project-lightbox';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <button type="button" class="project-lightbox__close" aria-label="Close expanded image">×</button>
    <img class="project-lightbox__image" alt="Expanded project image" />
  `;

  const modalImage = modal.querySelector('.project-lightbox__image');
  const closeButton = modal.querySelector('.project-lightbox__close');
  let opener = null;

  const openModal = (element) => {
    const src = getImageUrl(element);
    if (!src) return;
    opener = element;
    modalImage.src = src;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
  };

  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modalImage.src = '';
    document.body.classList.remove('lightbox-open');
    if (opener && typeof opener.focus === 'function') opener.focus();
    opener = null;
  };

  zoomable.forEach((element) => {
    element.classList.add('is-expandable');
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', 'Expand image');

    element.addEventListener('click', () => openModal(element));
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(element);
      }
    });
  });

  closeButton.addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  document.body.appendChild(modal);
})();
