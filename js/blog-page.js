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
      if (cleaned.startsWith("images/") || cleaned.startsWith("blog/")) {
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

  function formatDateLabel(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    try {
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    } catch (_e) {
      return d.toISOString().slice(0, 10);
    }
  }

  function hrefForSlug(slug) {
    const s = String(slug || "").trim();
    if (!s) return "blog-post.html";
    return `blog-post.html?slug=${encodeURIComponent(s)}`;
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

  function postImageVersion(post) {
    const updatedRaw = String((post && post.updated_at) || "").trim();
    if (!updatedRaw) return "";
    const d = new Date(updatedRaw);
    if (Number.isNaN(d.getTime())) return "";
    return String(d.getTime());
  }

  async function init() {
    const grid = document.getElementById("blog-posts-grid");
    if (!grid) return;

    const cfg = window.__SUPABASE_CONFIG__ || {};
    const rootPrefix =
      (document.getElementById("site-footer") &&
        document.getElementById("site-footer").dataset &&
        document.getElementById("site-footer").dataset.rootPath) ||
      "../";

    const LOCAL_FALLBACK_POSTS = [
      {
        slug: "first-post",
        title: "Lessons from Maintenance & Analytics",
        excerpt:
          "Practical lessons from connecting maintenance records, asset history, cost, downtime, GPS activity, and operational exceptions into a reliable decision workflow.",
        cover_image_url: "assets/images/projects/fleet-maintenance-analytics/hero.jpg",
        published_at: "2026-02-15T00:00:00.000Z",
      },
      ...(Array.isArray(window.__LOCAL_BLOG_POSTS__) ? window.__LOCAL_BLOG_POSTS__ : []),
    ];

    function mergePosts(remotePosts, localPosts) {
      const bySlug = new Map();
      (localPosts || []).forEach((post) => {
        const slug = String((post && post.slug) || "").trim();
        if (slug) bySlug.set(slug, post);
      });
      (remotePosts || []).forEach((post) => {
        const slug = String((post && post.slug) || "").trim();
        if (slug) bySlug.set(slug, post);
      });

      return Array.from(bySlug.values()).sort((a, b) => {
        const aDate = new Date(a.published_at || a.updated_at || a.created_at || 0).getTime();
        const bDate = new Date(b.published_at || b.updated_at || b.created_at || 0).getTime();
        return bDate - aDate;
      });
    }

    function renderCards(list, noteHtml) {
      const note = noteHtml
        ? `<div style="color: var(--text-muted); font-size: 12px; margin-bottom: 10px;">${noteHtml}</div>`
        : "";

      const cards = (list || [])
        .map((p) => {
          const slug = String(p.slug || "").trim();
          const title = String(p.title || "").trim() || "Untitled post";
          const excerpt = String(p.excerpt || "").trim();
          const baseCover = normalizeAssetUrl(p.cover_image_url, rootPrefix);
          const cover = withCacheVersion(baseCover, postImageVersion(p));
          const localFallbackBase = localAssetUrl(p.cover_image_url, rootPrefix);
          const fallbackCover = withCacheVersion(localFallbackBase, postImageVersion(p));
          const fallbackAttr =
            fallbackCover && fallbackCover !== cover
              ? ` data-fallback-src="${escapeHtml(fallbackCover)}"`
              : "";
          const date = formatDateLabel(p.published_at || p.updated_at || p.created_at);
          const meta = date ? `<div class="blog-card-meta">${escapeHtml(date)}</div>` : "";
          const excerptHtml = excerpt ? `<p class="blog-card-excerpt">${escapeHtml(excerpt)}</p>` : "";
          const href = hrefForSlug(slug);
          const coverHtml = cover
            ? `
              <a class="blog-cover" href="${escapeHtml(href)}">
                <img src="${escapeHtml(cover)}"${fallbackAttr} alt="${escapeHtml(title)}" loading="lazy">
              </a>
            `
            : "";

          return `
            <article class="blog-card">
              ${coverHtml}
              <div class="blog-card-body">
                ${meta}
                <h2 class="blog-card-title"><a href="${escapeHtml(href)}">${escapeHtml(title)}</a></h2>
                ${excerptHtml}
                <a href="${escapeHtml(href)}" class="blog-card-link">Read →</a>
              </div>
            </article>
          `;
        })
        .join("");

      return `${note}${cards}`;
    }

    function setGridHtml(html) {
      grid.innerHTML = html;
      armImageFallbacks(grid);
    }

    if (!cfg.url || !cfg.anonKey || !window.supabase) {
      setGridHtml(renderCards(LOCAL_FALLBACK_POSTS, "Showing local blog preview (Supabase not configured)."));
      return;
    }

    const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    const { data, error } = await sb
      .from("blog_posts")
      .select("id,slug,title,excerpt,cover_image_url,is_published,published_at,created_at,updated_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      setGridHtml(renderCards(
        LOCAL_FALLBACK_POSTS,
        `Error loading blog posts from Supabase. Showing local preview instead. (${escapeHtml(error.message || String(error))})`
      ));
      return;
    }

    setGridHtml(renderCards(mergePosts(data, LOCAL_FALLBACK_POSTS), ""));
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      const grid = document.getElementById("blog-posts-grid");
      if (!grid) return;
      const msg = escapeHtml(err && err.message ? err.message : String(err));
      grid.innerHTML = `<div class="blog-empty" style="color:#b91c1c;">Error loading blog posts: ${msg}</div>`;
    });
  });
})();
