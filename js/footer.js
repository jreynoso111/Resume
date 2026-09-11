(function () {
	    function getAdminLoginHref(rootPath) {
	        const prefix = String(rootPath || '');
	        return `${prefix}${prefix && !prefix.endsWith('/') ? '/' : ''}login.html`;
	    }

	    function renderAdminLink(rootPath) {
	        return `<a href="${getAdminLoginHref(rootPath)}" class="footer-admin-link" data-admin-link="1" aria-label="Admin sign in" title="Admin sign in"><span aria-hidden="true">⚙</span></a>`;
	    }

	    function renderFooter(rootPath) {
	        const year = new Date().getFullYear();

	        return `
	      <div class="shell">
	        <div class="footer-row">
	          <div style="display: flex; align-items: center; gap: 8px;">
	            <span>© ${year} Juan R. Reynoso. All rights reserved.</span>
	          </div>

          <div class="footer-links">
            <a href="#top">Back to top</a>
	          ${renderAdminLink(rootPath)}
          </div>
        </div>
	      </div>`;
	    }

	    function ensureAdminLink(footerHost) {
	        if (!footerHost) return;
	        const footerLinks = footerHost.querySelector('.footer-links');
	        if (!footerLinks || footerLinks.querySelector('[data-admin-link="1"]')) return;

	        const link = document.createElement('a');
	        link.href = getAdminLoginHref(footerHost.dataset.rootPath || inferRootPathFromFooterScript());
	        link.className = 'footer-admin-link';
	        link.dataset.adminLink = '1';
	        link.setAttribute('aria-label', 'Admin sign in');
	        link.title = 'Admin sign in';
	        link.innerHTML = '<span aria-hidden="true">⚙</span>';
	        footerLinks.appendChild(link);
	    }

	    function inferRootPathFromFooterScript() {
	        const script = Array.from(document.scripts || []).find((s) => {
	            const src = String(s.getAttribute('src') || s.src || '');
	            return /(?:^|\/)js\/footer\.js(?:$|[?#])/.test(src);
	        });
	        if (!script) return '';
	        const raw = String(script.getAttribute('src') || script.src || '');
	        const clean = raw.split('?', 1)[0].split('#', 1)[0];
	        const marker = clean.lastIndexOf('js/footer.js');
	        if (marker === -1) return '';
	        return clean.slice(0, marker);
	    }

	    function initFooter() {
	        let footerHost = document.getElementById('site-footer');
	        if (!footerHost) {
	            footerHost = document.createElement('footer');
	            footerHost.id = 'site-footer';
	            footerHost.dataset.rootPath = inferRootPathFromFooterScript();
	            document.body.appendChild(footerHost);
	        }

	        if (footerHost) {
	            const hasContent = (footerHost.innerHTML || '').trim().length > 0;
	            if (!hasContent) {
	                const rootPath = footerHost.dataset.rootPath || inferRootPathFromFooterScript() || '';
	                footerHost.dataset.rootPath = rootPath;
	                footerHost.innerHTML = renderFooter(rootPath);
	            }
	            ensureAdminLink(footerHost);

	            // Keep year current even when the footer HTML is static (fallback for no/failed JS).
	            const year = String(new Date().getFullYear());
	            footerHost.querySelectorAll('[data-footer-year]').forEach((el) => {
	                el.textContent = year;
	            });

		        }

	    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFooter);
    } else {
        initFooter();
    }
})();
