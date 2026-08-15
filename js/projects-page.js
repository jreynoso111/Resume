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

    function normalizeProjectHref(raw) {
      const value = String(raw || "").trim();
      if (!value || /[\u0000-\u001f\u007f]/.test(value)) return "";
      try {
        const url = new URL(value, window.location.href);
        const projectBase = new URL("projects/", window.location.href);
        if (url.origin !== projectBase.origin) return "";
        if (!url.pathname.startsWith(projectBase.pathname)) return "";
        const filename = url.pathname.slice(projectBase.pathname.length);
        if (!/^[a-z0-9][a-z0-9-]*\.html$/i.test(filename)) return "";
        return `${url.pathname}${url.search}${url.hash}`;
      } catch (_e) {
        return "";
      }
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

    function normalizeCaseStudy(raw) {
      let value = raw;
      if (typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch (_e) {
          return null;
        }
      }
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const normalized = {
        summary: String(value.summary || "").trim(),
        context: String(value.context || "").trim(),
        problem: String(value.problem || "").trim(),
        approach: String(value.approach || "").trim(),
        solution: String(value.solution || "").trim(),
        analytics: String(value.analytics || "").trim(),
        operational_use: String(value.operational_use || value.operationalUse || "").trim(),
        impact_label: String(value.impact_label || value.impactLabel || "").trim(),
        impact: String(value.impact || "").trim(),
        tools: Array.isArray(value.tools)
          ? value.tools.map((tool) => String(tool || "").trim()).filter(Boolean)
          : [],
        evidence: Array.isArray(value.evidence)
          ? value.evidence.map((item) => String(item || "").trim()).filter(Boolean)
          : [],
      };
      return normalized.problem || normalized.approach || normalized.solution || normalized.impact
        ? normalized
        : null;
    }

    async function loadCaseStudyMap(rootPrefix) {
      try {
        const response = await fetch(`${rootPrefix || ""}data/project-case-studies.json?v=3`, {
          credentials: "same-origin",
        });
        if (!response.ok) return new Map();
        const payload = await response.json();
        const projects = payload && payload.projects && typeof payload.projects === "object"
          ? payload.projects
          : {};
        const entries = Object.entries(projects)
          .map(([slug, value]) => [slug, normalizeCaseStudy(value)])
          .filter((entry) => entry[0] && entry[1]);
        return new Map(entries);
      } catch (_e) {
        return new Map();
      }
    }

    function resolveCaseStudy(project, slug, caseStudies) {
      const embedded = normalizeCaseStudy(project && project.case_study);
      if (embedded) return embedded;
      return slug && caseStudies instanceof Map ? caseStudies.get(slug) || null : null;
    }

    function readEmbeddedProjects() {
      const script = document.querySelector('script[type="application/json"][data-projects-fallback="1"]');
      if (!script) return [];
      try {
        const payload = JSON.parse(String(script.textContent || "[]"));
        return Array.isArray(payload) ? payload.filter((item) => item && typeof item === "object") : [];
      } catch (_e) {
        return [];
      }
    }

  async function init() {
    const grid = document.getElementById("projects-grid");
    if (!grid) return;

    const FEATURED_PROJECT_SLUGS = [
      "techloc-fleet-service-control",
      "fare-card-batch-integrity-investigation",
      "fare-system-transaction-fraud-detection-metro-santo-domingo",
      "turnstile-deployment-management-line-2b-expansion",
    ];

    const LOCAL_PROJECTS = [
      {
        id: "local-fare-card-batch-integrity-investigation",
        title: "MIFARE Fare Card Batch Integrity Investigation",
        description: "Identified a systematic mapping mismatch affecting approximately 125,000 MIFARE fare cards, isolated the affected inventory, supported its warranty replacement, and introduced a validation process that prevented recurrence.",
        href: "projects/fare-card-batch-integrity-investigation.html",
        image_url: null,
        is_published: true,
        sort_order: 80,
      },
      {
        id: "local-pulse-operational-workspace",
        title: "Pulse Operational Workspace",
        description: "Operational work management with portfolio intelligence, flexible boards, service discovery, and guided execution.",
        href: "projects/pulse-operational-workspace.html",
        image_url: "/assets/images/projects/pulse-operational-workspace/dashboard.jpg",
        is_published: true,
        sort_order: 999,
      },
    ];

    const cfg = window.__SUPABASE_CONFIG__ || {};
    const rootPrefix =
      (document.getElementById("site-footer") &&
        document.getElementById("site-footer").dataset &&
        document.getElementById("site-footer").dataset.rootPath) ||
      "../";
    const caseStudies = await loadCaseStudyMap(rootPrefix);
    armImageFallbacks(grid);

    const LOCAL_PREVIEW_SLUGS = new Set([
      "fleet-maintenance-analytics",
      "inventory-control-dashboard",
      "gps-movement-analytics",
      "techloc-fleet-service-control",
      "repossession-risk-monitoring",
    ]);

    function mergeLocalProjects(list) {
      const merged = Array.isArray(list) ? list.slice() : [];
      LOCAL_PROJECTS.forEach((project) => {
        const slug = hrefToSlug(project.href);
        const existingIndex = merged.findIndex((item) => hrefToSlug(item && item.href) === slug);
        if (existingIndex === -1) merged.push(project);
        else merged[existingIndex] = { ...merged[existingIndex], ...project };
      });
      const featuredRank = new Map(FEATURED_PROJECT_SLUGS.map((slug, index) => [slug, index]));
      return merged
        .map((project, index) => ({ project, index }))
        .sort((a, b) => {
          const rankA = featuredRank.has(hrefToSlug(a.project && a.project.href))
            ? featuredRank.get(hrefToSlug(a.project && a.project.href))
            : FEATURED_PROJECT_SLUGS.length;
          const rankB = featuredRank.has(hrefToSlug(b.project && b.project.href))
            ? featuredRank.get(hrefToSlug(b.project && b.project.href))
            : FEATURED_PROJECT_SLUGS.length;
          return rankA - rankB || a.index - b.index;
        })
        .map((entry) => entry.project);
    }

    const fallbackProjects = mergeLocalProjects(readEmbeddedProjects());

    function renderCards(list, noteHtml) {
      const note = noteHtml ? `<div style="color: var(--text-muted); font-size: 12px; margin-bottom: 10px;">${noteHtml}</div>` : "";
      const cards = (list || []).map((p) => {
        const href = normalizeProjectHref(p.href) || "#";
        const title = String(p.title || "").trim() || "Untitled project";
        const projectId = p && p.id != null ? String(p.id) : "";
        const slug = hrefToSlug(href);
        const caseStudy = resolveCaseStudy(p, slug, caseStudies);
        const desc = String((caseStudy && caseStudy.summary) || p.description || "").trim();
        const fallbackPreview = slug && LOCAL_PREVIEW_SLUGS.has(slug)
          ? `${rootPrefix || ""}assets/images/projects/previews/${slug}.jpg`
          : "";
        const genericPreview = `${rootPrefix || ""}assets/images/projects/project-placeholder.svg`;
        const baseImgSrc = normalizeAssetUrl(p.image_url, rootPrefix) || fallbackPreview || genericPreview;
        const imgSrc = withCacheVersion(baseImgSrc, projectImageVersion(p));
        const localFallbackBase = localAssetUrl(p.image_url, rootPrefix) || fallbackPreview || genericPreview;
        const fallbackImgSrc = withCacheVersion(localFallbackBase, projectImageVersion(p));
        const fallbackAttr = fallbackImgSrc && fallbackImgSrc !== imgSrc
          ? ` data-fallback-src="${escapeHtml(fallbackImgSrc)}"`
          : "";
        const imgAlt = escapeHtml(title);
        const descHtml = desc ? `<p class="project-desc">${escapeHtml(desc)}</p>` : "";
        const caseStudyPreview = caseStudy
          ? `
              <div class="project-case-study-marker">Professional case study</div>
              <div class="project-case-study-preview">
                ${caseStudy.problem ? `<p><span>Problem</span>${escapeHtml(caseStudy.problem)}</p>` : ""}
                ${caseStudy.impact ? `<p><span>Value</span>${escapeHtml(caseStudy.impact)}</p>` : ""}
              </div>
              ${caseStudy.tools.length
                ? `<div class="project-card-tags" aria-label="Tools and domains">${caseStudy.tools
                    .slice(0, 3)
                    .map((tool) => `<span>${escapeHtml(tool)}</span>`)
                    .join("")}</div>`
                : ""}
            `
          : "";
        const imgHtml = imgSrc
          ? `<img src="${escapeHtml(imgSrc)}"${fallbackAttr} alt="${imgAlt}" loading="lazy">`
          : "";

        return `
          <article class="project-card${caseStudy ? " project-card--case-study" : ""}"${projectId ? ` data-project-id="${escapeHtml(projectId)}"` : ''}>
            <a href="${escapeHtml(href)}" class="project-img-frame">${imgHtml}</a>
            <div class="project-content">
              <h2 class="project-title"><a href="${escapeHtml(href)}">${escapeHtml(title)}</a></h2>
              ${descHtml}
              ${caseStudyPreview}
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
      if (!grid.querySelector(".project-card")) {
        setGridHtml(renderCards(fallbackProjects.length ? fallbackProjects : LOCAL_PROJECTS, ""));
      }
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
      if (!grid.querySelector(".project-card")) {
        setGridHtml(renderCards(fallbackProjects.length ? fallbackProjects : LOCAL_PROJECTS, ""));
      }
      return;
    }

    if (!data || data.length === 0) {
      if (!grid.querySelector(".project-card")) {
        setGridHtml(renderCards(fallbackProjects.length ? fallbackProjects : LOCAL_PROJECTS, ""));
      }
      return;
    }

    setGridHtml(renderCards(mergeLocalProjects(data), ""));
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      const grid = document.getElementById("projects-grid");
      if (!grid) return;
      console.warn("Could not refresh the pre-rendered project snapshot.", err);
    });
  });
})();
