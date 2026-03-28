(function () {
  'use strict';

  var navItem = document.querySelector('.nav-item-projects');
  var dropdown = document.getElementById('projects-dropdown');
  if (!navItem || !dropdown) return;

  var hideTimeout;

  navItem.addEventListener('mouseenter', function () {
    clearTimeout(hideTimeout);
    dropdown.classList.add('show');
  });

  navItem.addEventListener('mouseleave', function () {
    hideTimeout = setTimeout(function () {
      dropdown.classList.remove('show');
    }, 1000);
  });
})();
