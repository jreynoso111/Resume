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

    function renderProjectDropdown(prefix, className = '') {
        return `<div${className ? ` class="${className}"` : ''}>${projectLinks
            .map((item) => `<a href="${prefix}${item.href}">${item.label}</a>`)
            .join('')}</div>`;
    }

    function renderProjectsSidebar(activeProject) {
        return `<h3>Projects</h3>${projectLinks
            .map((item) => `<a href="${item.href}"${withActiveClass(activeProject, item.key)}>${item.label}</a>`)
            .join('')}`;
    }

    function renderMainNavLinks(activePage, config) {
        const linksClass = config.linksClass || 'nav-links';
        const activeClass = config.activeClass || 'active';
        const projectsWrapperClass = config.projectsWrapperClass || 'nav-item projects-menu';
        const projectsAnchorClass = config.projectsAnchorClass || '';
        const projectsDropdownClass = config.projectsDropdownClass || 'projects-dropdown';
        const projectsLabel = config.projectsLabel || 'Projects ▾';

        // HEADER LINKS DEFINITION
        // Excludes 'Experience' and 'About Me'
        return `
      <div class="${linksClass}">
        <a href="${config.overviewHref}"${withActiveClass(activePage, 'overview', activeClass)}>Overview</a>

        <div class="${projectsWrapperClass}">
          <a href="${config.projectsHref}"${projectsAnchorClass ? ` class="${projectsAnchorClass}"` : ''}${withActiveClass(activePage, 'projects', activeClass)}>${projectsLabel}</a>
          ${renderProjectDropdown(config.projectsDropdownPrefix, projectsDropdownClass)}
        </div>
        <a href="${config.aboutHref}"${withActiveClass(activePage, 'about', activeClass)}>About Me</a>
      </div>`;
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
              <div class="logo-sub">Maintenance & Inventory Management</div>
            </div>
          </div>

          ${renderMainNavLinks(activePage, {
                activeClass: 'nav-active',
                overviewHref: 'index.html',

                projectsHref: 'pages/projects.html',
                projectsDropdownPrefix: 'pages/projects/',
                projectsWrapperClass: 'nav-item nav-item-projects',
                projectsDropdownClass: 'nav-dropdown',
                aboutHref: 'pages/about.html'
            })}

          <div class="nav-cta">
            <a href="mailto:jreynoso111@gmail.com" class="btn-primary">Contact<span class="chevron">→</span></a>
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
              <div class="logo-sub">Maintenance &amp; Inventory Management</div>
            </div>
          </div>
          <div class="nav-main">
            ${renderMainNavLinks(activePage, {
                overviewHref: '../index.html',

                projectsHref: 'projects.html',
                projectsDropdownPrefix: 'projects/',
                projectsWrapperClass: 'dropdown',
                projectsAnchorClass: 'dropbtn',
                projectsDropdownClass: 'dropdown-content',
                aboutHref: 'about.html'
            })}
          </div>
          <a href="mailto:jreynoso111@gmail.com" class="nav-cta">Contact <span aria-hidden="true">→</span></a>
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
            <div class="profile-subtitle">Maintenance &amp; Inventory Management</div>
          </div>
        </div>
        <nav class="nav-tabs">
          ${renderMainNavLinks(activePage, {
                linksClass: 'nav-tabs-links',
                overviewHref: '../index.html',

                projectsHref: 'projects.html',
                projectsDropdownPrefix: 'projects/',
                aboutHref: 'about.html',
                projectsLabel: 'Projects'
            })}
        </nav>
        <div class="header-cta"><a href="mailto:jreynoso111@gmail.com" class="email-btn">Contact →</a></div>
      </div>`;
        }

        if (variant === 'project-detail') {
            return `
      <div class="container header-row">
        <div class="header-left">
          <div class="header-avatar">JR</div>
          <div>
            <div class="header-title">Juan R. Reynoso</div>
            <div class="header-subtitle">Maintenance & Inventory Management</div>
          </div>
        </div>

        <nav class="header-nav">
          <a href="../../index.html"${withActiveClass(activePage, 'overview')}>Overview</a>

          <div class="header-projects-menu">
            <a href="../projects.html"${withActiveClass(activePage, 'projects')}>Projects ▾</a>
            ${renderProjectDropdown('', 'header-projects-dropdown')}
          </div>
          <a href="../about.html"${withActiveClass(activePage, 'about')}>About Me</a>
        </nav>

        <a href="mailto:jreynoso111@gmail.com" class="header-cta">Contact →</a>
      </div>`;
        }

        return '';
    }

    function initHeader() {
        const headerHost = document.getElementById('site-header');
        if (headerHost) {
            const hasContent = (headerHost.innerHTML || '').trim().length > 0;
            if (!hasContent) {
                const variant = headerHost.dataset.variant || 'project-detail';
                const activePage = headerHost.dataset.active || '';
                headerHost.innerHTML = renderHeader(variant, activePage);
            }
        }

        const sidebarHost = document.getElementById('projects-sidebar');
        if (sidebarHost) {
            const hasContent = (sidebarHost.innerHTML || '').trim().length > 0;
            if (!hasContent) {
                const activeProject = sidebarHost.dataset.activeProject || '';
                sidebarHost.innerHTML = renderProjectsSidebar(activeProject);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeader);
    } else {
        initHeader();
    }
})();
