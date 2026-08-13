(function () {
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
          </div>
        </div>
	      </div>`;
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
