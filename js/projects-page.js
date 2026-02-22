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

      // Treat repo-hosted assets as local even when Supabase Storage is configured.
      // This avoids rewriting paths like `assets/images/projects/...` into Storage URLs.
      if (/^assets\/images\//i.test(cleaned)) {
        return `${rootPrefix || ""}${cleaned}`;
      }

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

    function hrefToSlug(href) {
      const raw = String(href || "").trim();
      if (!raw) return "";
      const noHash = raw.split("#")[0];
      const noQuery = noHash.split("?")[0];
      const last = noQuery.split("/").filter(Boolean).pop() || "";
      return last.replace(/\.html$/i, "");
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
      "repossession-risk-monitoring",
      "gps-movement-analytics",
      "techloc-fleet-service-control",
    ]);

    const LOCAL_FALLBACK_PROJECTS = [
      {
        href: "projects/fleet-maintenance-analytics.html",
        title: "Fleet Maintenance Analytics System",
        description: "Fleet maintenance KPIs, downtime visibility, and readiness reporting.",
      },
      {
        href: "projects/inventory-control-dashboard.html",
        title: "Inventory Control Dashboard",
        description: "Stock-level controls, usage monitoring, and cost exposure visibility.",
      },
      {
        href: "projects/repossession-risk-monitoring.html",
        title: "Repo & Risk Monitoring System",
        description: "Operational risk signals and asset recovery workflow tracking.",
      },
      {
        href: "projects/gps-movement-analytics.html",
        title: "GPS Tracking & Movement Analysis",
        description: "Movement patterns, utilization, and operational movement oversight.",
      },
      {
        href: "projects/techloc-fleet-service-control.html",
        title: "TechLoc Fleet & Service Control Platform",
        description: "Dispatch + service control visibility for fleet readiness execution.",
      },
    ];

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
        const imgSrc = normalizeAssetUrl(p.image_url, rootPrefix) || fallbackPreview;
        const imgAlt = escapeHtml(title);
        const descHtml = desc ? `<p class="project-desc">${escapeHtml(desc)}</p>` : "";
        const imgHtml = imgSrc
          ? `<img src="${escapeHtml(imgSrc)}" alt="${imgAlt}" loading="lazy">`
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

    if (!cfg.url || !cfg.anonKey || !window.supabase) {
      grid.innerHTML = renderCards(LOCAL_FALLBACK_PROJECTS, "Showing local project previews (Supabase not configured).");
      return;
    }

    const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    const { data, error } = await sb
      .from("projects")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      grid.innerHTML = renderCards(
        LOCAL_FALLBACK_PROJECTS,
        `Error loading projects from Supabase. Showing local previews instead. (${escapeHtml(error.message || String(error))})`
      );
      return;
    }

    if (!data || data.length === 0) {
      grid.innerHTML = renderCards(LOCAL_FALLBACK_PROJECTS, "No projects returned from Supabase. Showing local previews instead.");
      return;
    }

    grid.innerHTML = renderCards(data, "");
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      const grid = document.getElementById("projects-grid");
      if (!grid) return;
      const rootPrefix =
        (document.getElementById("site-footer") &&
          document.getElementById("site-footer").dataset &&
          document.getElementById("site-footer").dataset.rootPath) ||
        "../";
      const msg = escapeHtml(err && err.message ? err.message : String(err));
      grid.innerHTML = `
        <div style="color:#b91c1c; font-size: 13px; margin-bottom: 10px;">Error loading projects: ${msg}</div>
        <div style="color: var(--text-muted); font-size: 12px; margin-bottom: 12px;">Showing local previews instead.</div>
        <article class="project-card">
          <a href="projects/fleet-maintenance-analytics.html" class="project-img-frame">
            <img src="${rootPrefix}assets/images/projects/previews/fleet-maintenance-analytics.jpg" alt="Fleet Maintenance Analytics System" loading="lazy">
          </a>
          <div class="project-content">
            <h2 class="project-title"><a href="projects/fleet-maintenance-analytics.html">Fleet Maintenance Analytics System</a></h2>
            <p class="project-desc">Fleet maintenance KPIs, downtime visibility, and readiness reporting.</p>
            <a href="projects/fleet-maintenance-analytics.html" class="project-link">View Case Study →</a>
          </div>
        </article>
        <article class="project-card">
          <a href="projects/inventory-control-dashboard.html" class="project-img-frame">
            <img src="${rootPrefix}assets/images/projects/previews/inventory-control-dashboard.jpg" alt="Inventory Control Dashboard" loading="lazy">
          </a>
          <div class="project-content">
            <h2 class="project-title"><a href="projects/inventory-control-dashboard.html">Inventory Control Dashboard</a></h2>
            <p class="project-desc">Stock-level controls, usage monitoring, and cost exposure visibility.</p>
            <a href="projects/inventory-control-dashboard.html" class="project-link">View Case Study →</a>
          </div>
        </article>
        <article class="project-card">
          <a href="projects/repossession-risk-monitoring.html" class="project-img-frame">
            <img src="${rootPrefix}assets/images/projects/previews/repossession-risk-monitoring.jpg" alt="Repo & Risk Monitoring System" loading="lazy">
          </a>
          <div class="project-content">
            <h2 class="project-title"><a href="projects/repossession-risk-monitoring.html">Repo & Risk Monitoring System</a></h2>
            <p class="project-desc">Operational risk signals and asset recovery workflow tracking.</p>
            <a href="projects/repossession-risk-monitoring.html" class="project-link">View Case Study →</a>
          </div>
        </article>
        <article class="project-card">
          <a href="projects/gps-movement-analytics.html" class="project-img-frame">
            <img src="${rootPrefix}assets/images/projects/previews/gps-movement-analytics.jpg" alt="GPS Tracking & Movement Analysis" loading="lazy">
          </a>
          <div class="project-content">
            <h2 class="project-title"><a href="projects/gps-movement-analytics.html">GPS Tracking & Movement Analysis</a></h2>
            <p class="project-desc">Movement patterns, utilization, and operational movement oversight.</p>
            <a href="projects/gps-movement-analytics.html" class="project-link">View Case Study →</a>
          </div>
        </article>
        <article class="project-card">
          <a href="projects/techloc-fleet-service-control.html" class="project-img-frame">
            <img src="${rootPrefix}assets/images/projects/previews/techloc-fleet-service-control.jpg" alt="TechLoc Fleet & Service Control Platform" loading="lazy">
          </a>
          <div class="project-content">
            <h2 class="project-title"><a href="projects/techloc-fleet-service-control.html">TechLoc Fleet & Service Control Platform</a></h2>
            <p class="project-desc">Dispatch + service control visibility for fleet readiness execution.</p>
            <a href="projects/techloc-fleet-service-control.html" class="project-link">View Case Study →</a>
          </div>
        </article>
      `;
    });
  });
})();
