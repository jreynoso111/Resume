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

  function localAssetUrl(raw, rootPrefix) {
    const url = String(raw || "").trim();
    if (!url) return "";
    if (/^(https?:|data:|blob:)/i.test(url)) return "";
    if (url.startsWith("/")) return "";
    const cleaned = url.replace(/^\.\//, "").replace(/^(?:\.\.\/)+/, "");
    return `${rootPrefix || ""}${cleaned}`;
  }

  function armImageFallbacks(scope) {
    const root = scope instanceof HTMLElement ? scope : document;
    const images = Array.from(root.querySelectorAll("img[data-fallback-src]"));
    images.forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      const fallback = String(img.getAttribute("data-fallback-src") || "").trim();
      if (!fallback) return;
      img.addEventListener(
        "error",
        () => {
          if (img.dataset.fallbackApplied === "1") return;
          if (img.src === fallback) return;
          img.dataset.fallbackApplied = "1";
          img.src = fallback;
        },
        { once: true }
      );
    });
  }

  function hrefToSlug(href) {
      const raw = String(href || "").trim();
      if (!raw) return "";
      const noHash = raw.split("#")[0];
      const noQuery = noHash.split("?")[0];
      const last = noQuery.split("/").filter(Boolean).pop() || "";
      return last.replace(/\.html$/i, "");
    }

    function withCacheVersion(url, seed) {
      const raw = String(url || "").trim();
      if (!raw) return "";
      const v = String(seed || "").trim();
      if (!v) return raw;
      const [pathAndQuery, hash = ""] = raw.split("#");
      const [path, query = ""] = pathAndQuery.split("?");
      const params = query
        ? query
            .split("&")
            .filter(Boolean)
            .filter((part) => part.split("=", 1)[0] !== "v")
        : [];
      params.push(`v=${encodeURIComponent(v)}`);
      return `${path}?${params.join("&")}${hash ? `#${hash}` : ""}`;
    }

    function projectImageVersion(project) {
      const updatedRaw = String((project && project.updated_at) || "").trim();
      if (!updatedRaw) return "";
      const d = new Date(updatedRaw);
      if (Number.isNaN(d.getTime())) return "";
      return String(d.getTime());
    }

  async function init() {
    const grid = document.getElementById("projects-grid");
    if (!grid) return;

    const cfg = window.__SUPABASE_CONFIG__ || {};
    const rootPrefix =
      (document.getElementById("site-footer") &&
        document.getElementById("site-footer").dataset &&
        document.getElementById("site-footer").dataset.rootPath) ||
      "../";

    const LOCAL_PREVIEW_SLUGS = new Set([
      "fleet-maintenance-analytics",
      "inventory-control-dashboard",
      "gps-movement-analytics",
      "techloc-fleet-service-control",
      "turnstile-deployment-management-line-2b-expansion",
      "warranty-claim-analytics-metro-santo-domingo",
      "fare-system-transaction-fraud-detection-metro-santo-domingo",
    ]);

    function renderCards(list, noteHtml) {
      const note = noteHtml ? `<div style="color: var(--text-muted); font-size: 12px; margin-bottom: 10px;">${noteHtml}</div>` : "";
      const cards = (list || []).map((p) => {
        const href = String(p.href || "").trim() || "#";
        const title = String(p.title || "").trim() || "Untitled project";
        const desc = String(p.description || "").trim();
        const projectId = p && p.id != null ? String(p.id) : "";
        const slug = hrefToSlug(href);
        const fallbackPreview = slug && LOCAL_PREVIEW_SLUGS.has(slug)
          ? `${rootPrefix || ""}assets/images/projects/previews/${slug}.jpg`
          : "";
        const baseImgSrc = normalizeAssetUrl(p.image_url, rootPrefix) || fallbackPreview;
        const imgSrc = withCacheVersion(baseImgSrc, projectImageVersion(p));
        const localFallbackBase = localAssetUrl(p.image_url, rootPrefix) || fallbackPreview;
        const fallbackImgSrc = withCacheVersion(localFallbackBase, projectImageVersion(p));
        const fallbackAttr = fallbackImgSrc && fallbackImgSrc !== imgSrc
          ? ` data-fallback-src="${escapeHtml(fallbackImgSrc)}"`
          : "";
        const imgAlt = escapeHtml(title);
        const descHtml = desc ? `<p class="project-desc">${escapeHtml(desc)}</p>` : "";
        const imgHtml = imgSrc
          ? `<img src="${escapeHtml(imgSrc)}"${fallbackAttr} alt="${imgAlt}" loading="lazy">`
          : "";

        return `
          <article class="project-card"${projectId ? ` data-project-id="${escapeHtml(projectId)}"` : ''}>
            <a href="${escapeHtml(href)}" class="project-img-frame">${imgHtml}</a>
            <div class="project-content">
              <h2 class="project-title"><a href="${escapeHtml(href)}">${escapeHtml(title)}</a></h2>
              ${descHtml}
              <a href="${escapeHtml(href)}" class="project-link">View Case Study →</a>
            </div>
          </article>
        `;
      }).join("");
      return `${note}${cards}`;
    }

    function setGridHtml(html) {
      grid.innerHTML = html;
      armImageFallbacks(grid);
    }

    if (!cfg.url || !cfg.anonKey || !window.supabase) {
      setGridHtml(`<div style="color: var(--text-muted);">Projects data source is not available.</div>`);
      return;
    }

    const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    const { data, error } = await sb
      .from("projects")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      setGridHtml(`<div style="color:#b91c1c; font-size: 13px;">Error loading projects from Supabase: ${escapeHtml(error.message || String(error))}</div>`);
      return;
    }

    if (!data || data.length === 0) {
      setGridHtml(`<div style="color: var(--text-muted);">No published projects found in Supabase.</div>`);
      return;
    }

    setGridHtml(renderCards(data, ""));
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      const grid = document.getElementById("projects-grid");
      if (!grid) return;
      const msg = escapeHtml(err && err.message ? err.message : String(err));
      grid.innerHTML = `<div style="color:#b91c1c; font-size: 13px;">Error loading projects: ${msg}</div>`;
    });
  });
})();
