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
    return `<p>${renderInlineFormatting(block).replace(/\n/g, "<br>")}</p>`;
  }

  function renderInlineFormatting(text) {
    const safe = escapeHtml(text).replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
    const withUnderline = safe.replace(/\+\+([^+\n][^+\n]*?)\+\+/g, "<u>$1</u>");
    const withBold = withUnderline.replace(/\*\*([^*\n][^*\n]*?)\*\*/g, "<strong>$1</strong>");
    const withItalic = withBold.replace(/(^|[^*])\*([^*\n][^*\n]*?)\*(?!\*)/g, "$1<em>$2</em>");
    const withSize = withItalic.replace(/\[\[size:(\d{1,2})\]\]([\s\S]*?)\[\[\/size\]\]/g, (_m, sizeRaw, inner) => {
      const sizeNum = Number(sizeRaw);
      const size = Number.isFinite(sizeNum) ? Math.min(64, Math.max(10, Math.round(sizeNum))) : 16;
      return `<span style="font-size:${size}px">${inner}</span>`;
    });
    return withSize;
  }

  function normalizeBlogBodyText(value) {
    let out = String(value == null ? "" : value);
    if (!out) return "";
    out = out.replace(/\r\n?/g, "\n");
    out = out.replace(/\\n/g, "\n");
    // Backward compatibility: some records stored "/n" markers.
    if (/\/n\s*\/n/i.test(out)) {
      out = out.replace(/\/n(?![a-z0-9_])/gi, "\n");
    }
    out = out.replace(/\n{3,}/g, "\n\n");
    return out;
  }

  function splitBodyBlocks(raw) {
    const normalized = String(raw || "").replace(/\r\n?/g, "\n");
    const withBlankLines = normalized
      .split(/\n{2,}/g)
      .map((part) => String(part || "").trim())
      .filter(Boolean);

    if (withBlankLines.length > 1) return withBlankLines;

    const lines = normalized
      .split("\n")
      .map((line) => String(line || "").trim())
      .filter(Boolean);

    return lines.length ? lines : withBlankLines;
  }

  function renderArticleBody(rawBody, rootPrefix) {
    const raw = normalizeBlogBodyText(rawBody).trim();
    if (!raw) {
      return '<p class="blog-note">No content yet. Add the article body in Admin Dashboard → Blog.</p>';
    }

    const blocks = splitBodyBlocks(raw);

    return blocks
      .map((block) => {
        const imgMatch = block.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imgMatch) {
          const alt = String(imgMatch[1] || "Article illustration").trim();
          const imageSrc = normalizeAssetUrl(imgMatch[2], rootPrefix);
          if (!imageSrc) return "";
          const fallbackSrc = localAssetUrl(imgMatch[2], rootPrefix);
          const fallbackAttr =
            fallbackSrc && fallbackSrc !== imageSrc
              ? ` data-fallback-src="${escapeHtml(fallbackSrc)}"`
              : "";
          return `
            <figure class="blog-inline-image">
              <img src="${escapeHtml(imageSrc)}"${fallbackAttr} alt="${escapeHtml(alt)}" loading="lazy">
            </figure>
          `;
        }

        if (block.startsWith("## ")) {
          return `<h2>${renderInlineFormatting(block.slice(3).trim() || "Section")}</h2>`;
        }

        if (block.startsWith("### ")) {
          return `<h3>${renderInlineFormatting(block.slice(4).trim() || "Subsection")}</h3>`;
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
      title: "Lessons from Maintenance & Analytics",
      excerpt:
        "Practical lessons from connecting maintenance records, asset history, cost, downtime, GPS activity, and operational exceptions into a reliable decision workflow.",
      cover_image_url: "assets/images/projects/fleet-maintenance-analytics/hero.jpg",
      published_at: "2026-02-15T00:00:00.000Z",
      body:
        "Maintenance data becomes useful when it helps answer operational questions: What happened? Which asset was affected? Is the problem repeating? How long was the unit unavailable? What cost, service, or inventory condition requires action? A repair record can look routine by itself and become a warning when it is placed inside the complete history of the asset.\n\nMy experience connecting maintenance and operational data has reinforced one central lesson: reporting is not the objective. The objective is to create enough context to make a reliable decision and follow it through.\n\n## A Repair Record Is Not an Asset History\n\nAn invoice, work order, or service note describes an event. Reliability analysis requires a chronology. The asset identifier, date, fault, repair, part, vendor, cost, downtime, location, and return-to-service status need to be interpreted together. Without that connection, repeated failures can appear unrelated and the operational effect of a repair remains difficult to see.\n\nVIN-level history changed the way I reviewed fleet maintenance. Instead of asking only how much a repair cost, I could examine whether the same unit had returned for a similar issue, whether parts usage was unusual, whether downtime was accumulating, and whether the recorded GPS activity was consistent with the asset's reported status.\n\n## Combine Sources Before Drawing Conclusions\n\nDaily fleet oversight rarely comes from one clean system. In my work, the analytical workflow combined NetSuite exports, GPS activity logs, maintenance invoices, parts inventory, and internal tracking records. Each source answered part of the question, but none provided enough context alone.\n\nIntegrating more than seven daily NetSuite extracts with those operational sources created a centralized model for current status and historical analysis. The important step was not placing the data into a dashboard. It was defining how records should connect, standardizing identifiers and dates, preserving traceability, and making conflicting conditions visible instead of hiding them during consolidation.\n\n## Exceptions Create More Value Than Averages\n\nAverage cost and total spend are useful indicators, but they do not always identify the next action. Operational control often depends on exceptions: repeated repairs, unexpected parts consumption, GPS inconsistencies, units with missing documentation, vehicles waiting for service, old open invoices, or assets whose recorded condition conflicts with their movement.\n\nAn exception-focused view changes analytics from passive reporting into a work queue. It helps separate normal variation from conditions that require investigation. It also makes review more consistent because the same rules can be applied every day instead of depending on memory or manual comparison between spreadsheets.\n\n## Cost and Downtime Must Be Read Together\n\nMaintenance cost without operational context can be misleading. A low-cost repair that repeats and keeps an asset unavailable may create more disruption than a higher one-time repair that restores dependable service. For that reason, cost, downtime, repair frequency, parts usage, vendor history, and current asset status should be reviewed together.\n\nThis combined view supports better questions. Is the repair resolving the cause or only the symptom? Is a vendor seeing the same unit repeatedly? Is the part consumption consistent with the work performed? Is the asset actually operating after being marked complete? Analytics cannot replace technical judgment, but it can direct that judgment toward the cases with the highest operational risk.\n\n## A Dashboard Is Only One Layer\n\nPower BI, Power Query, Excel, and source systems are implementation tools. The analytical capability comes from understanding the operation well enough to define useful relationships, controls, and exceptions. A polished visualization cannot compensate for inconsistent asset identifiers, duplicated transactions, unclear status definitions, or missing history.\n\nThe most important work happens before the visual layer: cleaning records, establishing business rules, validating relationships, and deciding which indicators should lead to action. The dashboard then becomes a shared operational view rather than a collection of charts.\n\n## From Reporting to Daily Control\n\nCentralizing the maintenance model and dashboard suite reduced manual report preparation by more than 90%, standardized daily fleet oversight, and enabled faster detection of operational anomalies and financial risk. That result did not come from automation alone. It came from replacing disconnected checks with a repeatable workflow that preserved asset-level detail.\n\nA dependable daily process should make new information easy to ingest, highlight exceptions without requiring a complete manual review, retain enough history to investigate patterns, and allow the underlying record to be traced when a number looks wrong. Those controls make the analysis usable beyond a single reporting cycle.\n\n## The Practical Lesson\n\nMaintenance analytics works best when technical records and operational conditions are treated as parts of the same system. The question is not simply what the dashboard shows. The question is whether the information helps someone identify risk, understand the cause, decide what requires attention, and verify that the action produced the expected result.\n\nThat is the standard I continue to apply: connect the asset history, preserve operational context, focus on exceptions, and use data to support action rather than reporting for its own sake.",
    };
    const localPosts = [
      LOCAL_FALLBACK_POST,
      ...(Array.isArray(window.__LOCAL_BLOG_POSTS__) ? window.__LOCAL_BLOG_POSTS__ : []),
    ];
    const localPost = localPosts.find((post) => String((post && post.slug) || "").trim() === slug);

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
        : "";

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
      if (localPost) {
        render(localPost);
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
      if (localPost) {
        render(localPost);
        return;
      }
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
