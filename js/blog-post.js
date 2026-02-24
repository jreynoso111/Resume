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
      return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch (_e) {
      return d.toISOString().slice(0, 10);
    }
  }

  function countWords(text) {
    const raw = String(text == null ? "" : text)
      .trim()
      .replace(/\s+/g, " ");
    if (!raw) return 0;
    return raw.split(" ").filter(Boolean).length;
  }

  function estimateReadingMinutes(post) {
    const source = [post && post.title, post && post.excerpt, post && post.body].join(" ");
    const words = countWords(source);
    return Math.max(1, Math.round(words / 220));
  }

  function paragraphHtml(block) {
    return `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`;
  }

  function renderArticleBody(rawBody, rootPrefix) {
    const raw = String(rawBody == null ? "" : rawBody).trim();
    if (!raw) {
      return '<p class="blog-note">No content yet. Add the article body in Admin Dashboard → Blog.</p>';
    }

    const blocks = raw.split(/\n{2,}/g).map((part) => String(part || "").trim()).filter(Boolean);
    let imageCount = 0;

    return blocks
      .map((block) => {
        const imgMatch = block.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imgMatch) {
          if (imageCount >= 2) return "";
          const alt = String(imgMatch[1] || "").trim() || "Article image";
          const rawSrc = String(imgMatch[2] || "").trim();
          const src = normalizeAssetUrl(rawSrc, rootPrefix);
          const localFallback = localAssetUrl(rawSrc, rootPrefix);
          const fallbackAttr =
            localFallback && localFallback !== src
              ? ` data-fallback-src="${escapeHtml(localFallback)}"`
              : "";
          if (!src) return "";
          imageCount += 1;
          return `
            <figure class="blog-inline-image">
              <img src="${escapeHtml(src)}"${fallbackAttr} alt="${escapeHtml(alt)}" loading="lazy">
            </figure>
          `;
        }

        if (block.startsWith("## ")) {
          return `<h2>${escapeHtml(block.slice(3).trim() || "Section")}</h2>`;
        }

        if (block.startsWith("### ")) {
          return `<h3>${escapeHtml(block.slice(4).trim() || "Subsection")}</h3>`;
        }

        return paragraphHtml(block);
      })
      .filter(Boolean)
      .join("\n");
  }

  function getSlug() {
    try {
      const params = new URLSearchParams(location.search || "");
      return String(params.get("slug") || "").trim();
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

  function postImageVersion(post) {
    const updatedRaw = String((post && post.updated_at) || "").trim();
    if (!updatedRaw) return "";
    const d = new Date(updatedRaw);
    if (Number.isNaN(d.getTime())) return "";
    return String(d.getTime());
  }

  async function init() {
    const root = document.getElementById("blog-post-root");
    if (!root) return;

    const slug = getSlug();
    if (!slug) {
      root.innerHTML = '<div class="blog-empty">Missing <code>?slug=</code>. Go back to <a href="blog.html">Blog</a>.</div>';
      return;
    }

    const cfg = window.__SUPABASE_CONFIG__ || {};
    const rootPrefix =
      (document.getElementById("site-footer") &&
        document.getElementById("site-footer").dataset &&
        document.getElementById("site-footer").dataset.rootPath) ||
      "../";

    const LOCAL_FALLBACK_POST = {
      slug: "first-post",
      title: "First Post (Demo)",
      excerpt: "A publication-style article template for long-form notes.",
      cover_image_url: "assets/images/blog/cover-generic.png",
      published_at: "2026-02-15T00:00:00.000Z",
      body:
        "Operations teams often fail not because of missing effort, but because information arrives fragmented and late. When a team reads the same signal at different times, execution quality drops even if everyone is technically capable.\n\nIn this publication format, the objective is simple: write one complete argument from start to finish. Avoid splitting the message into disconnected blocks. A reader should be able to understand the problem, the constraints, and the decision criteria in one continuous flow.\n\n## A Practical Publishing Standard\n\nEach post should open with context, continue with evidence, and close with an operational recommendation. That sequence makes the article usable for both decision makers and implementers. It also makes archives valuable over time because each publication can stand on its own.\n\n![Field note](assets/images/blog/chapter-1.png)\n\nA good publication is dense in meaning, not in visual effects. One or two supporting images are enough when they clarify a process, a system state, or a before/after condition. Anything beyond that usually competes with the text instead of supporting it.\n\n## Writing For Execution\n\nTreat the article as an operational memo with editorial quality. Keep paragraphs focused, define terms when needed, and state assumptions explicitly. If a recommendation depends on a metric, include the metric and the threshold.\n\n![Workflow diagram](assets/images/blog/chapter-2.png)\n\nA blog built this way remains simple: one blog index, and one publication page per post. The structure is stable, readable, and easy to maintain without introducing card fragments or chapter management overhead.",
    };

    function render(post) {
      const title = String(post.title || "").trim() || "Untitled post";
      const excerpt = String(post.excerpt || "").trim();
      const date = formatDateLabel(post.published_at || post.updated_at || post.created_at);
      const readingMinutes = estimateReadingMinutes(post);
      const articleBody = renderArticleBody(post.body, rootPrefix);
      const baseCoverSrc = normalizeAssetUrl(post.cover_image_url, rootPrefix);
      const coverSrc = withCacheVersion(baseCoverSrc, postImageVersion(post));
      const coverFallbackBase = localAssetUrl(post.cover_image_url, rootPrefix);
      const coverFallback = withCacheVersion(coverFallbackBase, postImageVersion(post));
      const coverFallbackAttr =
        coverFallback && coverFallback !== coverSrc
          ? ` data-fallback-src="${escapeHtml(coverFallback)}"`
          : "";
      const coverAlt = title ? `Cover image for ${title}` : "Post cover image";
      const mediaSlot = coverSrc
        ? `
          <figure class="blog-post-media-slot">
            <img src="${escapeHtml(coverSrc)}"${coverFallbackAttr} alt="${escapeHtml(coverAlt)}" loading="eager">
          </figure>
        `
        : `
          <figure class="blog-post-media-slot blog-post-media-slot--placeholder" aria-label="Post image placeholder">
            <div class="blog-post-media-slot-empty">
              Add a cover image in Admin Dashboard → Blog
            </div>
          </figure>
        `;

      root.innerHTML = `
        <article class="blog-post-single">
          <div class="blog-post-back-row">
            <a href="blog.html" class="blog-back-link">← Back to Blog</a>
          </div>

          <header class="blog-post-head">
            <h1 class="blog-post-title">${escapeHtml(title)}</h1>
            ${excerpt ? `<p class="blog-post-excerpt">${escapeHtml(excerpt)}</p>` : ""}
            <div class="blog-post-meta-row">
              ${date ? `<span class="blog-meta-pill">${escapeHtml(date)}</span>` : ""}
              <span class="blog-meta-pill">${readingMinutes} min read</span>
            </div>
          </header>

          ${mediaSlot}

          <div class="blog-prose blog-article-simple">
            ${articleBody}
          </div>
        </article>
      `;
      armImageFallbacks(root);

      try {
        document.title = `${title} | Blog`;
      } catch (_e) {}
    }

    if (!cfg.url || !cfg.anonKey || !window.supabase) {
      if (slug === LOCAL_FALLBACK_POST.slug) {
        render(LOCAL_FALLBACK_POST);
      } else {
        root.innerHTML = `<div class="blog-empty">Post not found (local preview). Go back to <a href="blog.html">Blog</a>.</div>`;
      }
      return;
    }

    const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    const { data: post, error: postErr, status: postStatus } = await sb
      .from("blog_posts")
      .select("id,slug,title,excerpt,body,cover_image_url,is_published,published_at,created_at,updated_at")
      .eq("slug", slug)
      .limit(1)
      .single();

    if (postErr) {
      if (postStatus === 406) {
        root.innerHTML = `<div class="blog-empty">Post not found. Go back to <a href="blog.html">Blog</a>.</div>`;
        return;
      }
      throw postErr;
    }

    render(post);
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      const root = document.getElementById("blog-post-root");
      if (!root) return;
      const msg = escapeHtml(err && err.message ? err.message : String(err));
      root.innerHTML = `<div class="blog-empty" style="color:#b91c1c;">Error loading post: ${msg}</div>`;
    });
  });
})();
