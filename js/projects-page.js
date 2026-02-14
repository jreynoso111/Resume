	(function () {
	  function escapeHtml(value) {
	    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
	      "&": "&amp;",
	      "<": "&lt;",
	      ">": "&gt;",
	      '"': "&quot;",
	      "'": "&#39;",
	    })[ch]);
	  }

	  function normalizeAssetUrl(raw, rootPrefix) {
	    const url = String(raw || "").trim();
	    if (!url) return "";
	    if (/^(https?:|data:|blob:)/i.test(url)) return url;
	    if (url.startsWith("/")) return url;
	    const cleaned = url.replace(/^\.\//, "").replace(/^(?:\.\.\/)+/, "");
	    const cfg = window.__SUPABASE_CONFIG__ || {};
	    const bucket = cfg && cfg.cms && cfg.cms.assetsBucket ? String(cfg.cms.assetsBucket) : "";
	    const sbUrl = cfg && cfg.url ? String(cfg.url) : "";
	    const storageBase =
	      bucket && sbUrl
	        ? `${sbUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/`
	        : "";
	    if (storageBase) {
	      if (cleaned.startsWith("assets/")) {
	        return `${storageBase}${cleaned.slice("assets/".length)}`;
	      }
	      if (cleaned.startsWith("images/") || cleaned.startsWith("projects/")) {
	        return `${storageBase}${cleaned}`;
	      }
	    }
	    return `${rootPrefix || ""}${cleaned}`;
	  }

  async function init() {
    const grid = document.getElementById("projects-grid");
    if (!grid) return;

    const cfg = window.__SUPABASE_CONFIG__ || {};
    if (!cfg.url || !cfg.anonKey || !window.supabase) {
      grid.innerHTML =
        '<div style="color: var(--text-muted); font-size: 13px;">Projects are unavailable (Supabase not configured).</div>';
      return;
    }

    const rootPrefix =
      (document.getElementById("site-footer") &&
        document.getElementById("site-footer").dataset &&
        document.getElementById("site-footer").dataset.rootPath) ||
      "../";

    const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    const { data, error } = await sb
      .from("projects")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      grid.innerHTML = `<div style="color:#b91c1c; font-size: 13px;">Error loading projects: ${escapeHtml(
        error.message || String(error)
      )}</div>`;
      return;
    }

    if (!data || data.length === 0) {
      grid.innerHTML =
        '<div style="color: var(--text-muted); font-size: 13px;">No projects yet.</div>';
      return;
    }

    grid.innerHTML = data
      .map((p) => {
        const href = String(p.href || "").trim() || "#";
        const title = String(p.title || "").trim() || "Untitled project";
        const desc = String(p.description || "").trim();
        const imgSrc = normalizeAssetUrl(p.image_url, rootPrefix);
        const imgAlt = escapeHtml(title);
        const descHtml = desc ? `<p class="project-desc">${escapeHtml(desc)}</p>` : "";
        const imgHtml = imgSrc
          ? `<img src="${escapeHtml(imgSrc)}" alt="${imgAlt}" loading="lazy">`
          : "";

        return `
          <article class="project-card">
            <a href="${escapeHtml(href)}" class="project-img-frame">${imgHtml}</a>
            <div class="project-content">
              <h2 class="project-title"><a href="${escapeHtml(href)}">${escapeHtml(
          title
        )}</a></h2>
              ${descHtml}
              <a href="${escapeHtml(href)}" class="project-link">View Case Study →</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      const grid = document.getElementById("projects-grid");
      if (!grid) return;
      grid.innerHTML = `<div style="color:#b91c1c; font-size: 13px;">Error loading projects: ${escapeHtml(
        err && err.message ? err.message : String(err)
      )}</div>`;
    });
  });
})();
