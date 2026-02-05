(function () {
  const projectLinks = [
    { href: 'fleet-maintenance-analytics.html', label: 'Fleet Maintenance Analytics System', key: 'fleet-maintenance-analytics' },
    { href: 'inventory-control-dashboard.html', label: 'Inventory Control Dashboard', key: 'inventory-control-dashboard' },
    { href: 'repossession-risk-monitoring.html', label: 'Repo & Risk Monitoring System', key: 'repossession-risk-monitoring' },
    { href: 'gps-movement-analytics.html', label: 'GPS Tracking & Movement Analysis', key: 'gps-movement-analytics' },
    { href: 'techloc-fleet-service-control.html', label: 'TechLoc Fleet & Service Control Platform', key: 'techloc-fleet-service-control' }
  ];

  function withActiveClass(activeKey, key, className = 'active') {
    return activeKey === key ? ` class="${className}"` : '';
  }

  function renderProjectDropdown(prefix) {
    return projectLinks
      .map((item) => `<a href="${prefix}${item.href}">${item.label}</a>`)
      .join('');
  }

  function renderProjectsSidebar(activeProject) {
    return `<h3>Projects</h3>${projectLinks
      .map((item) => `<a href="${item.href}"${withActiveClass(activeProject, item.key)}>${item.label}</a>`)
      .join('')}`;
  }

  function renderHeader(variant, activePage) {
    if (variant === 'home') {
      return `
      <div class="shell">
        <nav class="nav">
          <div class="logo-wrap">
            <div class="logo-mark"><div class="logo-inner">JR</div></div>
            <div class="logo-text-block">
              <div class="logo-title" id="profile-name">Juan R. Reynoso</div>
              <div class="logo-sub">Data, Operations & Fleet Analytics</div>
            </div>
          </div>

          <div class="nav-links">
            <a href="index.html"${withActiveClass(activePage, 'overview', 'nav-active')}>Overview</a>
            <a href="pages/experience.html"${withActiveClass(activePage, 'experience')}>Experience</a>
            <div class="nav-item nav-item-projects">
              <a href="pages/projects/"${withActiveClass(activePage, 'projects')}>Projects ▾</a>
              <div class="nav-dropdown" id="projects-dropdown">${renderProjectDropdown('pages/projects/')}</div>
            </div>
            <a href="pages/about.html"${withActiveClass(activePage, 'about')}>About Me</a>
          </div>

          <div class="nav-cta">
            <a href="mailto:jreynoso111@gmail.com" class="btn-primary">Send email<span class="chevron">→</span></a>
          </div>
        </nav>
      </div>`;
    }

    if (variant === 'inner') {
      return `
      <div class="shell">
        <nav class="nav">
          <div class="logo-wrap">
            <div class="logo-mark"><div class="logo-inner">JR</div></div>
            <div class="logo-text-block">
              <div class="logo-title">Juan R. Reynoso</div>
              <div class="logo-sub">Data, Operations &amp; Fleet Analytics</div>
            </div>
          </div>
          <div class="nav-main">
            <div class="nav-links">
              <a href="../index.html"${withActiveClass(activePage, 'overview')}>Overview</a>
              <a href="experience.html"${withActiveClass(activePage, 'experience')}>Experience</a>
              <div class="dropdown">
                <a href="projects/" class="dropbtn"${withActiveClass(activePage, 'projects')}>Projects ▾</a>
                <div class="dropdown-content">${renderProjectDropdown('projects/')}</div>
              </div>
              <a href="about.html"${withActiveClass(activePage, 'about')}>About Me</a>
            </div>
          </div>
          <a href="mailto:jreynoso111@gmail.com" class="nav-cta">Send email <span aria-hidden="true">→</span></a>
        </nav>
      </div>`;
    }

    if (variant === 'projects-index') {
      return `
      <div class="nav">
        <div class="profile-block">
          <div class="avatar-circle">JR</div>
          <div class="profile-main">
            <div class="profile-name">Juan R. Reynoso</div>
            <div class="profile-subtitle">Data, Operations &amp; Fleet Analytics</div>
          </div>
        </div>
        <nav class="nav-tabs">
          <a href="../../index.html"${withActiveClass(activePage, 'overview')}>Overview</a>
          <a href="../experience.html"${withActiveClass(activePage, 'experience')}>Experience</a>
          <div class="nav-item projects-menu">
            <a href="./"${withActiveClass(activePage, 'projects')}>Projects</a>
            <div class="projects-dropdown">${renderProjectDropdown('')}</div>
          </div>
          <a href="../about.html"${withActiveClass(activePage, 'about')}>About Me</a>
        </nav>
        <div class="header-cta"><a href="mailto:jreynoso111@gmail.com" class="email-btn">Send email →</a></div>
      </div>`;
    }

    if (variant === 'project-detail') {
      return `
      <div class="container header-row">
        <div class="header-left">
          <div class="header-avatar">JR</div>
          <div>
            <div class="header-title">Juan R. Reynoso</div>
            <div class="header-subtitle">Data, Operations & Fleet Analytics</div>
          </div>
        </div>

        <nav class="header-nav">
          <a href="../../index.html"${withActiveClass(activePage, 'overview')}>Overview</a>
          <a href="../experience.html"${withActiveClass(activePage, 'experience')}>Experience</a>
          <a href="./"${withActiveClass(activePage, 'projects')}>Projects</a>
          <a href="../about.html"${withActiveClass(activePage, 'about')}>About Me</a>
        </nav>

        <a href="mailto:jreynoso111@gmail.com" class="header-cta">Send email →</a>
      </div>`;
    }

    return '';
  }

  function init() {
    const headerHost = document.getElementById('site-header');
    if (headerHost) {
      const variant = headerHost.dataset.variant || 'project-detail';
      const activePage = headerHost.dataset.active || '';
      headerHost.innerHTML = renderHeader(variant, activePage);
    }

    const sidebarHost = document.getElementById('projects-sidebar');
    if (sidebarHost) {
      const activeProject = sidebarHost.dataset.activeProject || '';
      sidebarHost.innerHTML = renderProjectsSidebar(activeProject);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
