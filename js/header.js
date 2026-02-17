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

    function normalizeRootPrefix(raw) {
        const s = String(raw || '');
        if (!s) return '';
        return s.endsWith('/') ? s : `${s}/`;
    }

    function inferRootPrefixFromHeaderScript() {
        const script = Array.from(document.scripts || []).find((s) => {
            const src = String(s.getAttribute('src') || s.src || '');
            return /(?:^|\/)js\/header\.js(?:$|[?#])/.test(src);
        });
        if (!script) return '';
        const raw = String(script.getAttribute('src') || script.src || '');
        const clean = raw.split('?', 1)[0].split('#', 1)[0];
        const marker = clean.lastIndexOf('js/header.js');
        if (marker === -1) return '';
        return normalizeRootPrefix(clean.slice(0, marker));
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = Array.from(document.scripts || []).find((s) => {
                const cur = String(s.getAttribute('src') || s.src || '');
                return cur === src || cur.split('?')[0] === src.split('?')[0];
            });
            if (existing) {
                return resolve();
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.addEventListener('load', () => resolve(), { once: true });
            script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), {
                once: true
            });
            document.head.appendChild(script);
        });
    }

    async function ensureAuthModule(rootPrefix) {
        if (window.ResumeAuth) return window.ResumeAuth;
        const src = `${normalizeRootPrefix(rootPrefix)}assets/js/auth.js?v=2`;
        await loadScript(src);
        return window.ResumeAuth || null;
    }

    function renderDesktopAuthLinks(rootPrefix, isLoggedIn, buttonClass) {
        const loginHref = `${rootPrefix}login.html`;
        const profileHref = `${rootPrefix}profile.html`;
        const btnClass = String(buttonClass || '').trim() || 'nav-cta';
        const clsAttr = btnClass ? ` class="${btnClass}"` : '';
        if (isLoggedIn) {
            return `<a href="${profileHref}"${clsAttr}>Profile</a> <a href="${loginHref}" data-auth-logout="1">Logout</a>`;
        }
        return `<a href="${loginHref}"${clsAttr}>Login</a>`;
    }

    function renderMobileAuthLinks(rootPrefix, isLoggedIn) {
        const loginHref = `${rootPrefix}login.html`;
        const profileHref = `${rootPrefix}profile.html`;
        if (isLoggedIn) {
            return `<a href="${profileHref}">Profile</a><a href="${loginHref}" data-auth-logout="1">Logout</a>`;
        }
        return `<a href="${loginHref}">Login</a>`;
    }

    function bindAuthLogout(root, auth, rootPrefix) {
        root.querySelectorAll('[data-auth-logout="1"]').forEach((el) => {
            if (el.dataset.boundAuthLogout === '1') return;
            el.dataset.boundAuthLogout = '1';
            el.addEventListener('click', async (event) => {
                event.preventDefault();
                if (!auth || typeof auth.logout !== 'function') return;
                try {
                    await auth.logout({ redirectTo: `${rootPrefix}login.html` });
                } catch (_e) {
                    // Ignore logout errors to keep nav non-blocking.
                }
            });
        });
    }

    async function refreshAuthNav(root, auth, rootPrefix) {
        let isLoggedIn = false;
        try {
            const session = auth && typeof auth.getSession === 'function' ? await auth.getSession() : null;
            isLoggedIn = Boolean(session && session.user);
        } catch (_e) {
            isLoggedIn = false;
        }

        root.querySelectorAll('[data-auth-desktop="1"]').forEach((slot) => {
            slot.innerHTML = renderDesktopAuthLinks(
                rootPrefix,
                isLoggedIn,
                slot.getAttribute('data-auth-btn-class') || ''
            );
        });
        root.querySelectorAll('[data-auth-mobile="1"]').forEach((slot) => {
            slot.innerHTML = renderMobileAuthLinks(rootPrefix, isLoggedIn);
        });
        bindAuthLogout(root, auth, rootPrefix);
    }

    async function initAuthNavigation(root) {
        if (!root || root.dataset.authNavInitialized === '1') return;
        root.dataset.authNavInitialized = '1';

        const rootPrefix = inferRootPrefixFromHeaderScript();
        let auth = null;

        try {
            auth = await ensureAuthModule(rootPrefix);
        } catch (_e) {
            auth = null;
        }

        if (!auth) {
            root.querySelectorAll('[data-auth-desktop="1"]').forEach((slot) => {
                slot.innerHTML = renderDesktopAuthLinks(
                    rootPrefix,
                    false,
                    slot.getAttribute('data-auth-btn-class') || ''
                );
            });
            root.querySelectorAll('[data-auth-mobile="1"]').forEach((slot) => {
                slot.innerHTML = renderMobileAuthLinks(rootPrefix, false);
            });
            return;
        }

        await refreshAuthNav(root, auth, rootPrefix);
        if (typeof auth.onAuthStateChange === 'function') {
            auth.onAuthStateChange(() => {
                refreshAuthNav(root, auth, rootPrefix);
            }).catch(() => {});
        }
    }

    function renderMobileMenu(activePage, config) {
        const activeClass = config.activeClass || 'nav-mobile-active';
        const projectsPrefix = config.projectsDropdownPrefix || '';
        const contactHref = config.contactHref || 'mailto:JReynoso111@gmail.com';

        return `
      <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false">
        <span class="nav-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span>
      </button>

      <div class="nav-mobile" hidden>
        <div class="nav-mobile-overlay" data-nav-close="true" aria-hidden="true"></div>
        <div class="nav-mobile-panel" role="dialog" aria-modal="true" aria-label="Site menu">
          <div class="nav-mobile-top">
            <div class="nav-mobile-title">Menu</div>
            <button class="nav-mobile-close" type="button" data-nav-close="true">Close</button>
          </div>

          <div class="nav-mobile-links">
            <a href="${config.overviewHref}"${withActiveClass(activePage, 'overview', activeClass)}>Overview</a>
            <a href="${config.projectsHref}"${withActiveClass(activePage, 'projects', activeClass)}>Projects</a>

            <div class="nav-mobile-section">
              <div class="nav-mobile-section-label">Project Pages</div>
              <div class="nav-mobile-sub">
                ${projectLinks.map((item) => `<a href="${projectsPrefix}${item.href}">${item.label}</a>`).join('')}
              </div>
            </div>

            <a href="${config.blogHref}"${withActiveClass(activePage, 'blog', activeClass)}>Blog</a>
            <a href="${config.aboutHref}"${withActiveClass(activePage, 'about', activeClass)}>About Me</a>
            <a href="${contactHref}">Contact</a>
            <div data-auth-mobile="1"></div>
          </div>
        </div>
      </div>`;
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
        <a href="${config.blogHref}"${withActiveClass(activePage, 'blog', activeClass)}>Blog</a>
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
                blogHref: 'pages/blog.html',
                aboutHref: 'pages/about.html'
            })}

          <div class="nav-auth-cta">
            <span data-auth-desktop="1" data-auth-btn-class="nav-cta"></span>
            <a href="mailto:JReynoso111@gmail.com" class="nav-cta">Contact <span aria-hidden="true">→</span></a>
          </div>

          ${renderMobileMenu(activePage, {
                overviewHref: 'index.html',
                projectsHref: 'pages/projects.html',
                projectsDropdownPrefix: 'pages/projects/',
                blogHref: 'pages/blog.html',
                aboutHref: 'pages/about.html'
            })}
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
                blogHref: 'blog.html',
                aboutHref: 'about.html'
            })}
          </div>
          <div class="nav-auth-cta">
            <span data-auth-desktop="1" data-auth-btn-class="nav-cta"></span>
            <a href="mailto:JReynoso111@gmail.com" class="nav-cta">Contact <span aria-hidden="true">→</span></a>
          </div>

          ${renderMobileMenu(activePage, {
                overviewHref: '../index.html',
                projectsHref: 'projects.html',
                projectsDropdownPrefix: 'projects/',
                blogHref: 'blog.html',
                aboutHref: 'about.html'
            })}
        </nav>
	      </div>`;
	        }

	        // Nested "inner" pages that live under /pages/*/ (for example /pages/blog/my-post.html).
	        // Same visual style as `inner`, but links must step up one extra directory.
	        if (variant === 'inner-nested') {
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
	                overviewHref: '../../index.html',

	                projectsHref: '../projects.html',
	                projectsDropdownPrefix: '../projects/',
	                projectsWrapperClass: 'dropdown',
	                projectsAnchorClass: 'dropbtn',
	                projectsDropdownClass: 'dropdown-content',
	                blogHref: '../blog.html',
	                aboutHref: '../about.html'
	            })}
	          </div>
		          <div class="nav-auth-cta">
		            <span data-auth-desktop="1" data-auth-btn-class="nav-cta"></span>
		            <a href="mailto:JReynoso111@gmail.com" class="nav-cta">Contact <span aria-hidden="true">→</span></a>
		          </div>

	          ${renderMobileMenu(activePage, {
	                overviewHref: '../../index.html',
	                projectsHref: '../projects.html',
	                projectsDropdownPrefix: '../projects/',
	                blogHref: '../blog.html',
	                aboutHref: '../about.html'
	            })}
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
                blogHref: 'blog.html',
                aboutHref: 'about.html',
                projectsLabel: 'Projects'
            })}
        </nav>
	        <div class="header-cta nav-auth-cta">
            <span data-auth-desktop="1" data-auth-btn-class="nav-cta"></span>
            <a href="mailto:JReynoso111@gmail.com" class="nav-cta">Contact →</a>
          </div>

        ${renderMobileMenu(activePage, {
                overviewHref: '../index.html',
                projectsHref: 'projects.html',
                projectsDropdownPrefix: 'projects/',
                blogHref: 'blog.html',
                aboutHref: 'about.html'
            })}
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
          <a href="../blog.html"${withActiveClass(activePage, 'blog')}>Blog</a>
	          <a href="../about.html"${withActiveClass(activePage, 'about')}>About Me</a>
	        </nav>

	        <div class="nav-auth-cta">
            <span data-auth-desktop="1" data-auth-btn-class="header-cta"></span>
            <a href="mailto:JReynoso111@gmail.com" class="header-cta">Contact →</a>
          </div>

        ${renderMobileMenu(activePage, {
                overviewHref: '../../index.html',
                projectsHref: '../projects.html',
                projectsDropdownPrefix: '',
                blogHref: '../blog.html',
                aboutHref: '../about.html'
            })}
      </div>`;
        }

        return '';
    }

    function initMobileNav(root) {
        const toggle = root.querySelector('.nav-toggle');
        const mobile = root.querySelector('.nav-mobile');
        if (!toggle || !mobile) return;

        const closeEls = mobile.querySelectorAll('[data-nav-close="true"]');
        const panel = mobile.querySelector('.nav-mobile-panel');

        let escHandler = null;
        let hideTimer = null;

        function open() {
            mobile.hidden = false;
            // Trigger CSS transitions.
            requestAnimationFrame(() => {
                mobile.classList.add('is-open');
                document.body.classList.add('nav-open');
                toggle.setAttribute('aria-expanded', 'true');
            });

            escHandler = (e) => {
                if (e.key === 'Escape') close();
            };
            document.addEventListener('keydown', escHandler);

            // Focus close button for accessibility.
            const closeBtn = mobile.querySelector('.nav-mobile-close');
            if (closeBtn) closeBtn.focus();
        }

        function close() {
            mobile.classList.remove('is-open');
            document.body.classList.remove('nav-open');
            toggle.setAttribute('aria-expanded', 'false');

            if (escHandler) {
                document.removeEventListener('keydown', escHandler);
                escHandler = null;
            }

            let closedOnce = false;
            const done = () => {
                if (closedOnce) return;
                closedOnce = true;
                if (hideTimer) {
                    clearTimeout(hideTimer);
                    hideTimer = null;
                }
                mobile.hidden = true;
                if (panel) panel.removeEventListener('transitionend', done);
                toggle.focus();
            };

            // If no panel, just hide immediately.
            if (!panel) {
                mobile.hidden = true;
                toggle.focus();
                return;
            }

            panel.addEventListener('transitionend', done);
            // Fallback in case transitionend doesn't fire.
            hideTimer = setTimeout(done, 250);
        }

        toggle.addEventListener('click', () => {
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            if (expanded) close();
            else open();
        });

        closeEls.forEach((el) => el.addEventListener('click', close));

        mobile.addEventListener('click', (e) => {
            // Clicks inside the panel should not close unless a close element is clicked.
            if (panel && panel.contains(e.target)) return;
        });

        // If resizing up to desktop, close the mobile menu to avoid stuck state.
        window.addEventListener('resize', () => {
            const isMobile = window.matchMedia('(max-width: 860px)').matches;
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            if (!isMobile && expanded) close();
        });
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
            initMobileNav(headerHost);
            initAuthNavigation(headerHost);
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
