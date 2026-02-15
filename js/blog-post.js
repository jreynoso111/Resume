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

    // Keep repo-hosted images local even when Supabase Storage is configured.
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
      if (cleaned.startsWith("images/") || cleaned.startsWith("blog/")) {
        return `${storageBase}${cleaned}`;
      }
    }

    return `${rootPrefix || ""}${cleaned}`;
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

  function renderBodyText(text) {
    const raw = String(text == null ? "" : text).trim();
    if (!raw) return "";

    const paras = raw.split(/\n{2,}/g);
    return paras
      .map((p) => {
        const safe = escapeHtml(p).replace(/\n/g, "<br>");
        return `<p>${safe}</p>`;
      })
      .join("");
  }

  function getSlug() {
    try {
      const params = new URLSearchParams(location.search || "");
      return String(params.get("slug") || "").trim();
    } catch (_e) {
      return "";
    }
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

    const PLACEHOLDER_COVER = `${rootPrefix}assets/images/blog/cover-generic.png`;
    const PLACEHOLDER_CHAPTER = `${rootPrefix}assets/images/placeholders/placeholder.png`;

    const LOCAL_FALLBACK_POST = {
      slug: "first-post",
      title: "First Post (Demo)",
      excerpt:
        "This post exists to test the full flow: dashboard -> database -> public site.",
      cover_image_url: "assets/images/blog/cover-generic.png",
      published_at: "2026-02-15T00:00:00.000Z",
      chapters: [
        {
          sort_order: 0,
          title: "Chapter 1: Structure",
          body:
            "This is a generic chapter.\n\nIt includes a text block and an image area.",
          image_url: "assets/images/blog/chapter-1.png",
        },
        {
          sort_order: 1,
          title: "Chapter 2: Images",
          body:
            "Images can be local paths (assets/...) or public URLs from Supabase Storage.\n\nFrom the dashboard you can upload an image and save its URL on the chapter.",
          image_url: "assets/images/blog/chapter-2.png",
        },
        {
          sort_order: 2,
          title: "Chapter 3: Publishing",
          body:
            "You can publish the post or keep it as a draft.\n\nVisitors only see published posts.",
          image_url: "assets/images/blog/chapter-3.png",
        },
      ],
    };

    function render(post, chapters) {
      const title = String(post.title || "").trim() || "Untitled post";
      const excerpt = String(post.excerpt || "").trim();
      const date = formatDateLabel(post.published_at || post.updated_at || post.created_at);
      const cover = normalizeAssetUrl(post.cover_image_url, rootPrefix) || PLACEHOLDER_COVER;

      const meta = date ? `<div class="blog-post-meta">${escapeHtml(date)}</div>` : "";
      const excerptHtml = excerpt ? `<p class="page-subtitle" style="max-width: 760px;">${escapeHtml(excerpt)}</p>` : "";

      const chaptersHtml = (chapters || [])
        .slice()
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((ch) => {
          const chTitle = String(ch.title || "").trim() || "Chapter";
          const chBody = renderBodyText(ch.body || "");
          const img = normalizeAssetUrl(ch.image_url, rootPrefix) || PLACEHOLDER_CHAPTER;
          return `
            <section class="blog-chapter">
              <div class="blog-chapter-inner">
                <div class="blog-chapter-media">
                  <img src="${escapeHtml(img)}" alt="${escapeHtml(chTitle)}" loading="lazy">
                </div>
                <div>
                  <h2 class="blog-chapter-title">${escapeHtml(chTitle)}</h2>
                  <div class="blog-chapter-body">${chBody || '<p style="color: var(--text-muted);">No content yet.</p>'}</div>
                </div>
              </div>
            </section>
          `;
        })
        .join("");

      const chaptersBlock = chaptersHtml
        ? `<div class="blog-chapters">${chaptersHtml}</div>`
        : '<div class="blog-empty">No chapters yet. Add chapters in the Admin Dashboard → Blog tab.</div>';

      root.innerHTML = `
        <div class="page-intro blog-post-header">
          <div style="margin-bottom: 10px;">
            <a href="blog.html" style="color: var(--text-muted); font-size: 13px;">← Back to Blog</a>
          </div>
          <h1 class="blog-post-title">${escapeHtml(title)}</h1>
          ${meta}
          ${excerptHtml}
        </div>

        <div class="blog-post-cover">
          <img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" loading="lazy">
        </div>

        ${chaptersBlock}
      `;

      try {
        document.title = `${title} | Blog`;
      } catch (_e) {}
    }

    // Local-only fallback
    if (!cfg.url || !cfg.anonKey || !window.supabase) {
      if (slug === LOCAL_FALLBACK_POST.slug) {
        render(LOCAL_FALLBACK_POST, LOCAL_FALLBACK_POST.chapters);
      } else {
        root.innerHTML = `<div class="blog-empty">Post not found (local preview). Go back to <a href="blog.html">Blog</a>.</div>`;
      }
      return;
    }

    const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    const { data: post, error: postErr, status: postStatus } = await sb
      .from("blog_posts")
      .select("*")
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

    const { data: chapters, error: chErr } = await sb
      .from("blog_chapters")
      .select("*")
      .eq("post_id", post.id)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (chErr) throw chErr;

    render(post, chapters || []);
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
