(function () {
	    function renderFooter(rootPath) {
	        const year = new Date().getFullYear();

	        return `
	      <div class="shell">
        <div class="footer-row">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>© ${year} Juan R. Reynoso. All rights reserved.</span>
            <a href="${rootPath}admin/" class="dashboard-link" aria-label="Admin Dashboard" title="Open dashboard">Dashboard</a>
            <a href="javascript:void(0)" class="admin-link" aria-label="Edit page" title="Edit page">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path
                  d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z">
                </path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </a>
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

	    function ensureEditorLoaded(rootPath) {
	        if (typeof window.__resumeCmsToggleEditor === 'function') {
	            return Promise.resolve();
	        }

	        // De-dupe concurrent loads (multiple clicks, multiple footers, etc.).
	        if (window.__resumeCmsEditorLoadPromise) {
	            return window.__resumeCmsEditorLoadPromise;
	        }

	        function getFooterScriptRoot() {
	            const script = Array.from(document.scripts || []).find((s) => {
	                const src = String(s.getAttribute('src') || s.src || '');
	                return /(?:^|\/)js\/footer\.js(?:$|[?#])/.test(src);
	            });
	            if (!script) return '';
	            try {
	                const srcAttr = script.getAttribute('src') || script.src || '';
	                const parsed = new URL(srcAttr, location.href);
	                const pathname = parsed.pathname || '';
		                const marker = pathname.lastIndexOf('js/footer.js');
		                if (marker === -1) return '';
		                const rootPathname = pathname.slice(0, marker);
		                if (!rootPathname) return '/';
		                return rootPathname.endsWith('/') ? rootPathname : `${rootPathname}/`;
		            } catch (_e) {
		                return '';
		            }
		        }

	        async function validateScriptUrl(url) {
	            // Best-effort: if fetch is unavailable or blocked (file://), skip validation.
	            if (typeof fetch !== 'function') return true;
	            try {
	                const res = await fetch(url, { method: 'GET', cache: 'no-store' });
	                if (!res || !res.ok) return false;
	                const text = await res.text();
	                const head = text.slice(0, 120).trim();
	                if (!head) return false;
	                // Common mis-route: HTML (SPA fallback / 404 page with 200).
	                if (head.startsWith('<!DOCTYPE') || head.startsWith('<html') || head.startsWith('<')) return false;
	                // Sanity check: our editor script should expose the toggle controller.
	                return text.includes('__resumeCmsToggleEditor');
	            } catch (_e) {
	                return false;
	            }
	        }

	        const existing = Array.from(document.scripts || []).find((s) => {
	            const src = String(s.getAttribute('src') || s.src || '');
	            return /(?:^|\/)js\/editor-auth\.js(?:$|[?#])/.test(src);
	        });

	        const base = String(rootPath || '');
	        const scriptRoot = getFooterScriptRoot();
	        const canonical = `${base}js/editor-auth.js?v=15`;
	        const canonicalFromFooter = scriptRoot
	            ? (scriptRoot.endsWith('/') || scriptRoot.endsWith('\\')
	                ? `${scriptRoot}js/editor-auth.js?v=15`
	                : `${scriptRoot.replace(/[\\/]+$/, '')}/js/editor-auth.js?v=15`)
	            : '';
	        const src = existing ? (existing.getAttribute('src') || existing.src || canonical) : canonical;
	        const bust = `${src}${src.includes('?') ? '&' : '?'}cb=${Date.now()}`;

	        window.__resumeCmsEditorLoadPromise = (async () => {
	            // Prefer a URL that actually returns JS (some hosts rewrite missing paths to HTML).
	            let chosen = existing ? bust : src;
	            const candidates = [
	                chosen,
	                canonical,
	                canonicalFromFooter,
	                // Fallbacks relative to the current page URL.
	                new URL('js/editor-auth.js?v=15', location.href).toString(),
	                new URL('../js/editor-auth.js?v=15', location.href).toString(),
	                new URL('../../js/editor-auth.js?v=15', location.href).toString(),
	                new URL('../../../js/editor-auth.js?v=15', location.href).toString()
	            ].filter(Boolean);

	            for (const candidate of candidates) {
	                // Avoid validating cross-origin URLs.
	                let sameOrigin = true;
	                try {
	                    const u = new URL(candidate, location.href);
	                    sameOrigin = (u.origin === location.origin) || location.protocol === 'file:';
	                } catch (_e) {}
	                if (!sameOrigin) continue;
	                if (await validateScriptUrl(candidate)) {
	                    chosen = candidate;
	                    break;
	                }
	            }

	            await new Promise((resolve, reject) => {
	            // If the script tag exists but the controller isn't present, attempt a reload.
	            const script = document.createElement('script');
	            script.async = true;
	            script.src = chosen;
	            script.addEventListener('load', () => {
	                if (typeof window.__resumeCmsToggleEditor === 'function') resolve();
	                else reject(new Error('Editor script loaded, but toggle controller was not initialized.'));
	            }, { once: true });
	            script.addEventListener('error', () => {
	                reject(new Error(`Failed to load editor script: ${script.src}`));
	            }, { once: true });
	            document.head.appendChild(script);
	            });
	        })().finally(() => {
	            // Allow retry after failures.
	            setTimeout(() => { window.__resumeCmsEditorLoadPromise = null; }, 0);
	        });

	        return window.__resumeCmsEditorLoadPromise;
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

	            // Ensure the gear never navigates/scrolls. Route through the editor controller if present.
	            const editLink = footerHost.querySelector('.admin-link');
	            if (editLink && !editLink.dataset.bound) {
	                editLink.dataset.bound = '1';
	                editLink.addEventListener('click', async (event) => {
	                    // editor-auth.js already delegates `.admin-link` clicks at the document level.
	                    // If it already prevented default, do not double-trigger the toggle here.
	                    if (event.defaultPrevented) return;

	                    event.preventDefault();
	                    event.stopPropagation();

	                    try {
	                        const rootPath = footerHost.dataset.rootPath || '';
	                        await ensureEditorLoaded(rootPath);
	                        const toggle = window.__resumeCmsToggleEditor;
	                        if (typeof toggle !== 'function') {
	                            throw new Error('Editor controller is not available.');
	                        }
	                        await toggle();
	                    } catch (err) {
	                        console.error(err);
	                        const msg = err && err.message ? err.message : String(err);
	                        const ran = window.__resumeCmsEditorAuthLoaded === true;
	                        const hint = ran
	                            ? ''
	                            : '\n\nHint: `js/editor-auth.js` did not execute. This usually means the request returned HTML (SPA fallback) or hit a parse error. Check the Network tab: the response for editor-auth.js should be JavaScript, not HTML.';
	                        window.alert(`Editor is not loaded on this page.\n\n${msg}${hint}`);
	                    }
	                }, true);
	            }
	        }
	    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFooter);
    } else {
        initFooter();
    }
})();
