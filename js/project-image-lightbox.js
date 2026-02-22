(() => {
  const getImageUrl = (element) => {
    if (!element || !element.classList || !element.classList.contains('img-placeholder')) return '';
    const bg = window.getComputedStyle(element).backgroundImage || '';
    const match = bg.match(/url\((['"]?)(.*?)\1\)/i);
    return match && match[2] ? match[2] : '';
  };

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

  const markExpandable = (element) => {
    if (!element || !element.classList || !element.classList.contains('img-placeholder')) return;
    if (!getImageUrl(element)) return;
    element.classList.add('is-expandable');
    if (element.getAttribute('tabindex') !== '0') element.setAttribute('tabindex', '0');
    if (element.getAttribute('role') !== 'button') element.setAttribute('role', 'button');
    if (element.getAttribute('aria-label') !== 'Expand image') element.setAttribute('aria-label', 'Expand image');
  };

  const markAllExpandable = () => {
    Array.from(document.querySelectorAll('.img-placeholder')).forEach(markExpandable);
  };

  const hasExpandable = () => {
    return Array.from(document.querySelectorAll('.img-placeholder')).some((el) => Boolean(getImageUrl(el)));
  };

  if (!hasExpandable()) return;

  const openModal = (element) => {
    markExpandable(element);
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

  markAllExpandable();

  document.addEventListener('click', (event) => {
    const target = event.target;
    const placeholder = target && target.closest ? target.closest('.img-placeholder') : null;
    if (!placeholder) return;
    if (!getImageUrl(placeholder)) return;
    openModal(placeholder);
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const isPlaceholder = target && target.classList && target.classList.contains('img-placeholder');
    if (!isPlaceholder) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openModal(target);
    }
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

  const observer = new MutationObserver(() => markAllExpandable());
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

  document.body.appendChild(modal);
})();
