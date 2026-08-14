(() => {
  "use strict";

  const TABLE = "credentials";

  const CREDENTIAL_TEXT_CORRECTIONS = Object.freeze({
    1: { title: ["Data Analysis & Data Visualization Foundations", "Data Analysis and Visualization Foundations"] },
    3: { title: ["VICOS Operation Management L1 Depot", "Vicos Operation L1 Depot"] },
    10: { title: ["Big Data & Asset Management", "Big Data @ Asset Management"] },
    11: { issuer: ["GOOGLE - Coursera", "Google - Coursera"] },
    12: {
      title: ["Excel Skills for Businesses", "Excel Skills for Business"],
      issuer: ["McGuire University - Coursera", "Macquarie University - Coursera"],
    },
    13: {
      title: ["Python for Data Analysis", "Python for Data Analysis: Pandas & NumPy"],
      issuer: ["Coursera", "Coursera Project Network"],
    },
    14: { issuer: ["McGuire - Coursera", "Macquarie University - Coursera"] },
    17: { issuer: ["Learn Quest - Coursera", "LearnQuest - Coursera"] },
    18: { title: ["Project Management Principles", "Project Management Principles and Practices"] },
    19: { title: ["Switch motor", "Switch Motor"] },
    21: {
      title: ["Motorola Tetra Programation", "Motorola TETRA Radio Programming and Configuration"],
    },
    24: { title: ["Budgeting and Schedulling Projects", "Budgeting and Scheduling Projects"] },
    26: {
      title: [
        "Retrieving, Processing & Visualizing",
        "Capstone: Retrieving, Processing, and Visualizing Data with Python",
      ],
      issuer: ["UOM - Coursera", "University of Michigan - Coursera"],
    },
  });

  const DEFAULT_ITEMS = [
    // Certifications
    {
      kind: "certification",
      title: "Data Analysis & Data Visualization",
      issuer: "Professional Training",
      year: null,
      category: "Analytics",
      note:
        "Credential focused on translating operational data into management reporting and clear visual insights.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "certification",
      title: "Internal Auditor — ISO 9001:2015",
      issuer: "ISO Quality Management",
      year: null,
      category: "Quality",
      note:
        "Internal auditor credential supporting structured process control, compliance checks, and corrective-action discipline.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "certification",
      title: "Rail Systems Technical Training — SCADA",
      issuer: "Rail Systems Operations",
      year: null,
      category: "Rail Systems",
      note:
        "Technical training supporting SCADA monitoring, incident response, and maintenance coordination in rail operations.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "certification",
      title: "Rail Systems Technical Training — CCTV",
      issuer: "Rail Systems Operations",
      year: null,
      category: "Rail Systems",
      note:
        "Technical training supporting CCTV operational readiness, troubleshooting workflows, and service continuity.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "certification",
      title: "Rail Systems Technical Training — TETRA Radios",
      issuer: "Rail Systems Operations",
      year: null,
      category: "Rail Systems",
      note:
        "Technical training supporting radio communications operations, fault triage, and field coordination discipline.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "certification",
      title: "Rail Systems Technical Training — Access Control",
      issuer: "Rail Systems Operations",
      year: null,
      category: "Rail Systems",
      note:
        "Technical training supporting access-control system reliability, monitoring, and incident response procedures.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "certification",
      title: "Rail Systems Technical Training — Intrusion Detection",
      issuer: "Rail Systems Operations",
      year: null,
      category: "Rail Systems",
      note:
        "Technical training supporting intrusion detection oversight, alarm workflows, and escalation coordination.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "certification",
      title: "Rail Systems Technical Training — Telephony",
      issuer: "Rail Systems Operations",
      year: null,
      category: "Rail Systems",
      note:
        "Technical training supporting telephony service continuity, troubleshooting routines, and operational readiness.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "certification",
      title: "Rail Systems Technical Training — Axle Counters",
      issuer: "Rail Systems Operations",
      year: null,
      category: "Rail Systems",
      note:
        "Technical training supporting axle counter systems, condition monitoring, and maintenance coordination.",
      proof_image_url: "",
      proof_url: "",
    },

    // Courses
    {
      kind: "course",
      title: "Big Data (training)",
      issuer: "Professional Training",
      year: null,
      category: "Analytics",
      note:
        "Coursework in big-data concepts used to strengthen operational reporting, KPI governance, and decision support.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "course",
      title: "Coursera (courses)",
      issuer: "Coursera",
      year: null,
      category: "Online Learning",
      note:
        "Ongoing professional coursework supporting analytics, operations management, and technical upskilling.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "course",
      title: "DataCamp (courses)",
      issuer: "DataCamp",
      year: null,
      category: "Analytics",
      note:
        "Applied coursework in data tools and workflows supporting reporting automation and operational visibility.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "course",
      title: "Infotep (courses)",
      issuer: "INFOTEP",
      year: null,
      category: "Workforce Training",
      note:
        "Technical training supporting service operations discipline, systems maintenance, and organizational execution.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "course",
      title: "SQL (training)",
      issuer: "Professional Training",
      year: null,
      category: "Data",
      note:
        "Querying and data fundamentals applied to KPI dashboards, management reporting, and operational analysis.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "course",
      title: "Power BI (training)",
      issuer: "Professional Training",
      year: null,
      category: "Reporting",
      note:
        "Dashboard design and KPI storytelling used as management tools for accountability and execution reviews.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "course",
      title: "Python (training)",
      issuer: "Professional Training",
      year: null,
      category: "Automation",
      note:
        "Analytics and automation scripting supporting faster reporting cycles and cleaner operational insights.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "course",
      title: "R (training)",
      issuer: "Professional Training",
      year: null,
      category: "Analytics",
      note:
        "Statistical analysis and reporting workflows supporting data-backed operational decision-making.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "course",
      title: "Project Management (coursework/training — not a certification)",
      issuer: "Coursework / Training",
      year: null,
      category: "Operations",
      note:
        "Project execution fundamentals supporting maintenance planning, vendor coordination, and delivery discipline.",
      proof_image_url: "",
      proof_url: "",
    },
    {
      kind: "course",
      title: "Food Technology — Higher Technical Studies",
      issuer: "Universidad Autónoma de Santo Domingo (UASD)",
      year: null,
      category: "Education",
      note:
        "Completed academic coursework in Food Technology, with emphasis on food science, quality standards, and process control.",
      proof_image_url: "",
      proof_url: "",
    },
  ];

  const SORTS = /** @type {const} */ (["year", "alphabet", "type"]);

  function getRootPrefix() {
    const footer = document.getElementById("site-footer");
    const raw =
      footer && footer.dataset && typeof footer.dataset.rootPath === "string"
        ? footer.dataset.rootPath
        : "";
    return raw || "";
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts || []).find((s) => {
        const cur = s.getAttribute("src") || s.src || "";
        return cur === src;
      });
      if (existing) return resolve();

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener(
        "error",
        () => reject(new Error(`Failed to load script: ${src}`)),
        { once: true }
      );
      document.head.appendChild(script);
    });
  }

  async function getSupabaseConfig(rootPrefix) {
    const cfg = window.__SUPABASE_CONFIG__;
    if (cfg && cfg.url && cfg.anonKey) return cfg;
    try {
      await loadScript(`${rootPrefix}js/supabase-config.js?v=3`);
    } catch (_e) {
      return null;
    }
    const cfg2 = window.__SUPABASE_CONFIG__;
    if (cfg2 && cfg2.url && cfg2.anonKey) return cfg2;
    return null;
  }

  async function ensureSupabaseLibrary() {
    if (window.supabase && typeof window.supabase.createClient === "function") return;
    await loadScript(`${getRootPrefix()}assets/vendor/supabase/supabase-js.v2.js`);
  }

  async function createSupabaseClient(cfg) {
    if (!cfg || !cfg.url || !cfg.anonKey) return null;
    if (window.ResumeAuth && typeof window.ResumeAuth.getClient === "function") {
      return window.ResumeAuth.getClient();
    }
    if (window.__resumeSupabaseClientPromise) {
      return window.__resumeSupabaseClientPromise;
    }
    await ensureSupabaseLibrary();
    if (!window.supabase || typeof window.supabase.createClient !== "function") return null;
    const client = window.supabase.createClient(cfg.url, cfg.anonKey);
    window.__resumeSupabaseClient = client;
    window.__resumeSupabaseClientPromise = Promise.resolve(client);
    return client;
  }

  async function fetchCredentialsPublic(cfg) {
    if (!cfg || !cfg.url || !cfg.anonKey) throw new Error("Missing Supabase public config.");
    const base = String(cfg.url || "").replace(/\/$/, "");
    const url =
      `${base}/rest/v1/${encodeURIComponent(TABLE)}` +
      "?select=id,kind,title,issuer,year,category,note,proof_image_url,proof_url,sort_order,created_at,updated_at" +
      "&order=sort_order.asc,id.asc";

    const res = await fetch(url, {
      headers: {
        apikey: String(cfg.anonKey || ""),
        Authorization: `Bearer ${String(cfg.anonKey || "")}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Public credentials fetch failed (${res.status}).`);
    }

    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data.map(normalizeItem) : [];
  }

  function normalizeKind(raw) {
    const kind = String(raw || "").trim().toLowerCase();
    if (kind === "certification" || kind === "course") return kind;
    return "course";
  }

  function normalizeItem(raw) {
    const item = raw && typeof raw === "object" ? raw : {};
    const id = typeof item.id === "number" ? item.id : null;
    const correction = id == null ? null : CREDENTIAL_TEXT_CORRECTIONS[id];
    const originalTitle = String(item.title || item.name || "").trim();
    const originalIssuer = String(item.issuer || "").trim();
    const title =
      correction && correction.title && originalTitle === correction.title[0]
        ? correction.title[1]
        : originalTitle;
    const issuer =
      correction && correction.issuer && originalIssuer === correction.issuer[0]
        ? correction.issuer[1]
        : originalIssuer;
    const year =
      typeof item.year === "number"
        ? item.year
        : typeof item.year === "string" && item.year.trim()
          ? Number(item.year)
          : null;
    return {
      id,
      kind: normalizeKind(item.kind),
      title,
      issuer,
      year: Number.isFinite(year) ? year : null,
      sort_order:
        typeof item.sort_order === "number"
          ? item.sort_order
          : typeof item.sort_order === "string" && item.sort_order.trim()
            ? Number(item.sort_order)
            : 0,
      category: String(item.category || "").trim(),
      note: String(item.note || "").trim(),
      proof_image_url: String(item.proof_image_url || "").trim(),
      proof_url: String(item.proof_url || "").trim(),
    };
  }

  function textOrDash(value) {
    const s = String(value == null ? "" : value).trim();
    return s ? s : "—";
  }

  function isAdminModeActive() {
    return Boolean(document.body && document.body.classList.contains("cms-admin-mode"));
  }

  async function isAuthenticatedAdmin(sb, cfg) {
    if (!sb || !cfg) return false;
    try {
      const { data: sessionData, error: sessionError } = await sb.auth.getSession();
      if (sessionError || !sessionData || !sessionData.session) return false;
      const { data, error } = await sb.rpc("is_admin_user");
      return !error && data === true;
    } catch (_e) {
      return false;
    }
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = String(text);
    return el;
  }

  function setActiveSort(buttons, sortBy) {
    buttons.forEach((btn) => {
      const btnSort = String(btn.dataset.ccSort || "year");
      const active = btnSort === sortBy;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.tabIndex = active ? 0 : -1;
    });
  }

  function buildEmptyState(emptyEl, message) {
    if (!emptyEl) return;
    emptyEl.textContent = String(message || "No items found.");
  }

  function readEmbeddedFallback(section) {
    const script = section.querySelector('[data-cc-fallback="1"]');
    if (!script) return [];
    try {
      const parsed = JSON.parse(String(script.textContent || "[]"));
      return Array.isArray(parsed) ? parsed.map(normalizeItem) : [];
    } catch (_e) {
      return [];
    }
  }

  function matchesQuery(item, q) {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return true;
    const haystack = [item.title, item.issuer, item.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }

  function isEducationItem(item) {
    const category = String(item && item.category ? item.category : "")
      .trim()
      .toLowerCase();
    return category === "education" || category.includes("education");
  }

  function filterItems(items, query) {
    return items.filter((item) => matchesQuery(item, query));
  }

  function sortItems(items, sortBy) {
    const sorted = [...items];

    if (sortBy === "alphabet") {
      sorted.sort((a, b) => {
        const titleCmp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        if (titleCmp !== 0) return titleCmp;
        const issuerCmp = a.issuer.localeCompare(b.issuer, undefined, { sensitivity: "base" });
        if (issuerCmp !== 0) return issuerCmp;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
      return sorted;
    }

    if (sortBy === "type") {
      sorted.sort((a, b) => {
        const typeCmp = a.kind.localeCompare(b.kind, undefined, { sensitivity: "base" });
        if (typeCmp !== 0) return typeCmp;
        const yearA = Number.isFinite(a.year) ? a.year : -Infinity;
        const yearB = Number.isFinite(b.year) ? b.year : -Infinity;
        if (yearA !== yearB) return yearB - yearA;
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      });
      return sorted;
    }

    sorted.sort((a, b) => {
      const yearA = Number.isFinite(a.year) ? a.year : -Infinity;
      const yearB = Number.isFinite(b.year) ? b.year : -Infinity;
      if (yearA !== yearB) return yearB - yearA;
      const orderA = Number.isFinite(a.sort_order) ? a.sort_order : Number.MAX_SAFE_INTEGER;
      const orderB = Number.isFinite(b.sort_order) ? b.sort_order : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
    return sorted;
  }

  function normalizeAssetUrl(raw, rootPrefix) {
    const url = String(raw || "").trim();
    if (!url) return "";
    if (/^javascript:/i.test(url)) return "";
    if (/^(https?:|data:image\/|blob:)/i.test(url)) return url;
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
      if (cleaned.startsWith("assets/")) return `${storageBase}${cleaned.slice("assets/".length)}`;
      if (cleaned.startsWith("images/") || cleaned.startsWith("credentials/")) return `${storageBase}${cleaned}`;
    }

    return `${rootPrefix || ""}${cleaned}`;
  }

  function normalizeProofUrl(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";
    try {
      const parsed = new URL(value, window.location.href);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
    } catch (_) {
      return "";
    }
  }

  function buildCard(item, { rootPrefix, adminActive, onViewProof, onEdit, onDelete }) {
    const card = createEl("article", "cc-card");

    const top = createEl("div", "cc-card-top");
    const title = createEl("div", "cc-title", textOrDash(item.title));
    top.append(title);
    if (typeof item.year === "number" && Number.isFinite(item.year)) {
      const yearPill = createEl("div", "cc-year", String(item.year));
      top.appendChild(yearPill);
    }

    const meta = createEl("div", "cc-meta");
    const issuer = createEl("div", "cc-issuer", textOrDash(item.issuer));
    const kindLabel = isEducationItem(item)
      ? "Education"
      : item.kind === "certification"
        ? "Certification"
        : "Course";
    const kind = createEl("div", "cc-kind", kindLabel);
    meta.append(issuer, kind);

    const footer = createEl("div", "cc-card-footer");
    const tag = createEl("div", "cc-tag", textOrDash(item.category));

    const actions = createEl("div", "cc-actions");
    const viewBtn = createEl("button", "cc-action-btn cc-action-btn-primary", "View");
    viewBtn.type = "button";
    viewBtn.addEventListener("click", () => onViewProof(item));
    actions.append(viewBtn);

    if (adminActive) {
      const editBtn = createEl("button", "cc-action-btn", "Edit");
      editBtn.type = "button";
      editBtn.addEventListener("click", () => onEdit(item));

      const delBtn = createEl("button", "cc-action-btn cc-action-btn-danger", "Delete");
      delBtn.type = "button";
      delBtn.addEventListener("click", () => onDelete(item));

      actions.append(editBtn, delBtn);
    }

    footer.append(tag, actions);

    card.append(top, meta, footer);
    return card;
  }

  function createModal(section) {
    const overlay = createEl("div", "cc-modal-overlay");
    overlay.hidden = true;
    overlay.dataset.resumeDynamic = "1";

    const modal = createEl("div", "cc-modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "cc-modal-title");

    const header = createEl("div", "cc-modal-header");
    const heading = createEl("div", "cc-modal-title");
    heading.id = "cc-modal-title";
    const closeBtn = createEl("button", "cc-modal-close", "Close");
    closeBtn.type = "button";

    header.append(heading, closeBtn);

    // View panel
    const viewPanel = createEl("div", "cc-modal-view");
    const viewMeta = createEl("div", "cc-modal-meta");
    const viewNote = createEl("div", "cc-modal-note");
    const imageFrame = createEl("div", "cc-modal-image");
    const img = document.createElement("img");
    img.className = "cc-modal-img";
    img.alt = "";
    img.loading = "lazy";
    const imageLoading = createEl("div", "cc-modal-image-loading");
    imageLoading.hidden = true;
    const imageLoadingSpinner = createEl("span", "cc-modal-image-loading-spinner");
    imageLoadingSpinner.setAttribute("aria-hidden", "true");
    const imageLoadingText = createEl(
      "span",
      "cc-modal-image-loading-text",
      "Loading certificate image..."
    );
    imageLoading.append(imageLoadingSpinner, imageLoadingText);
    const placeholder = createEl("div", "cc-modal-placeholder", "No certificate image on file.");
    imageFrame.append(img, imageLoading, placeholder);
    const viewLinkRow = createEl("div", "cc-modal-linkrow");
    const viewLinkEmpty = createEl("div", "cc-modal-link-empty", "No proof link on file.");
    const viewLink = createEl("a", "cc-modal-link", "Open link");
    viewLink.target = "_blank";
    viewLink.rel = "noopener noreferrer";
    viewLinkRow.append(viewLinkEmpty, viewLink);
    viewPanel.append(viewMeta, viewNote, imageFrame, viewLinkRow);

    modal.append(header, viewPanel);
    overlay.appendChild(modal);
    section.appendChild(overlay);

    let mode = "view";
    let currentItem = null;
    let lastFocused = null;
    let adminActive = false;
    let activeImageRequestId = 0;
    let imageLoadWatchRaf = 0;
    let editLinkBtn = null;
    let editPanel = null;
    let editError = null;
    let kindSelect = null;
    let yearInput = null;
    let titleInput = null;
    let issuerInput = null;
    let catInput = null;
    let noteInput = null;
    let linkInput = null;
    let fileInput = null;
    let saveBtn = null;
    let cancelBtn = null;
    let cropButton = null;
    let cropPanel = null;
    let cropCanvas = null;
    let cropInputs = null;
    let cropSaveBtn = null;
    let cropCancelBtn = null;
    let cropError = null;
    let cropSourceImage = null;
    let cropSourceObjectUrl = "";

    function createInputField(label, input, span) {
      const wrap = createEl("label", span ? "cc-field cc-field-span" : "cc-field");
      wrap.append(createEl("div", "cc-field-label", label), input);
      return wrap;
    }

    function clearCropSource() {
      cropSourceImage = null;
      if (cropSourceObjectUrl) URL.revokeObjectURL(cropSourceObjectUrl);
      cropSourceObjectUrl = "";
      if (cropCanvas) {
        cropCanvas.width = 1;
        cropCanvas.height = 1;
      }
    }

    function setCropError(message) {
      if (!cropError) return;
      const text = String(message || "").trim();
      cropError.textContent = text;
      cropError.hidden = !text;
    }

    function setCropBusy(busy) {
      const active = Boolean(busy);
      if (cropInputs) Object.values(cropInputs).forEach((input) => { input.disabled = active; });
      if (cropSaveBtn) {
        cropSaveBtn.disabled = active || !cropSourceImage || !getCropRect();
        cropSaveBtn.textContent = active ? "Saving crop..." : "Save crop";
      }
      if (cropCancelBtn) cropCancelBtn.disabled = active;
      closeBtn.disabled = active;
    }

    function getCropRect() {
      if (!cropSourceImage || !cropInputs) return null;
      const top = Number(cropInputs.top.value || 0) / 100;
      const right = Number(cropInputs.right.value || 0) / 100;
      const bottom = Number(cropInputs.bottom.value || 0) / 100;
      const left = Number(cropInputs.left.value || 0) / 100;
      const widthRatio = 1 - left - right;
      const heightRatio = 1 - top - bottom;
      if (widthRatio < 0.1 || heightRatio < 0.1) return null;
      return {
        sx: Math.round(cropSourceImage.naturalWidth * left),
        sy: Math.round(cropSourceImage.naturalHeight * top),
        sw: Math.max(1, Math.round(cropSourceImage.naturalWidth * widthRatio)),
        sh: Math.max(1, Math.round(cropSourceImage.naturalHeight * heightRatio)),
      };
    }

    function updateCropPreview() {
      if (!cropCanvas || !cropSourceImage) return;
      const rect = getCropRect();
      if (!rect) {
        setCropError("The crop is too small. Reduce one or more crop values.");
        if (cropSaveBtn) cropSaveBtn.disabled = true;
        return;
      }
      setCropError("");
      if (cropSaveBtn) cropSaveBtn.disabled = false;
      const scale = Math.min(1, 680 / rect.sw, 420 / rect.sh);
      cropCanvas.width = Math.max(1, Math.round(rect.sw * scale));
      cropCanvas.height = Math.max(1, Math.round(rect.sh * scale));
      const context = cropCanvas.getContext("2d", { alpha: false });
      if (!context) return;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
      context.drawImage(
        cropSourceImage,
        rect.sx,
        rect.sy,
        rect.sw,
        rect.sh,
        0,
        0,
        cropCanvas.width,
        cropCanvas.height
      );
    }

    async function createCroppedFile() {
      const rect = getCropRect();
      if (!rect || !cropSourceImage || !currentItem) {
        throw new Error("A valid crop is required.");
      }
      const scale = Math.min(1, 2400 / Math.max(rect.sw, rect.sh));
      const output = document.createElement("canvas");
      output.width = Math.max(1, Math.round(rect.sw * scale));
      output.height = Math.max(1, Math.round(rect.sh * scale));
      const context = output.getContext("2d", { alpha: false });
      if (!context) throw new Error("The browser could not prepare the crop.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, output.width, output.height);
      context.drawImage(
        cropSourceImage,
        rect.sx,
        rect.sy,
        rect.sw,
        rect.sh,
        0,
        0,
        output.width,
        output.height
      );
      const blob = await new Promise((resolve, reject) => {
        output.toBlob(
          (result) => result ? resolve(result) : reject(new Error("The crop could not be exported.")),
          "image/jpeg",
          0.9
        );
      });
      return new File([blob], `credential-${currentItem.id}-cropped.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }

    async function openCrop() {
      if (!adminActive || !currentItem || !currentItem.id || !currentItem.proof_image_url) return;
      ensureAdminControls();
      setMode("crop");
      heading.textContent = `Crop image: ${textOrDash(currentItem.title)}`;
      setCropError("");
      setCropBusy(true);
      Object.values(cropInputs).forEach((input) => {
        input.value = "0";
        const output = input.closest(".cc-crop-field")?.querySelector(".cc-crop-field-value");
        if (output) output.textContent = "0%";
      });
      clearCropSource();
      openBase();

      try {
        const imageUrl = normalizeAssetUrl(currentItem.proof_image_url, getRootPrefix());
        const response = await fetch(imageUrl, { credentials: "omit" });
        if (!response.ok) throw new Error("The certificate image could not be loaded for cropping.");
        const blob = await response.blob();
        cropSourceObjectUrl = URL.createObjectURL(blob);
        const source = new Image();
        source.decoding = "async";
        await new Promise((resolve, reject) => {
          source.addEventListener("load", resolve, { once: true });
          source.addEventListener("error", () => reject(new Error("The certificate image could not be decoded.")), { once: true });
          source.src = cropSourceObjectUrl;
        });
        cropSourceImage = source;
        updateCropPreview();
      } catch (error) {
        setCropError(error && error.message ? error.message : String(error));
      } finally {
        setCropBusy(false);
      }
    }

    function ensureAdminControls() {
      if (editPanel) return;

      editLinkBtn = createEl("button", "cc-action-btn", "Edit link");
      editLinkBtn.type = "button";
      viewLinkRow.appendChild(editLinkBtn);

      cropButton = createEl("button", "cc-image-edit-btn", "Crop image");
      cropButton.type = "button";
      cropButton.hidden = !currentItem || !currentItem.proof_image_url;
      imageFrame.appendChild(cropButton);

      cropPanel = createEl("div", "cc-crop-panel");
      cropPanel.hidden = true;
      cropPanel.appendChild(createEl(
        "p",
        "cc-crop-help",
        "Adjust the four edges until only the area that should remain is visible. Saving replaces the current certificate image."
      ));
      const preview = createEl("div", "cc-crop-preview");
      cropCanvas = document.createElement("canvas");
      cropCanvas.className = "cc-crop-canvas";
      preview.appendChild(cropCanvas);
      cropPanel.appendChild(preview);

      cropInputs = {};
      const cropControls = createEl("div", "cc-crop-controls");
      [["top", "Top"], ["right", "Right"], ["bottom", "Bottom"], ["left", "Left"]].forEach(([key, label]) => {
        const field = createEl("label", "cc-crop-field");
        const labelRow = createEl("span", "cc-crop-field-label");
        const value = createEl("output", "cc-crop-field-value", "0%");
        labelRow.append(createEl("span", "", label), value);
        const input = document.createElement("input");
        input.type = "range";
        input.min = "0";
        input.max = "45";
        input.step = "1";
        input.value = "0";
        input.addEventListener("input", () => {
          value.textContent = `${input.value}%`;
          updateCropPreview();
        });
        cropInputs[key] = input;
        field.append(labelRow, input);
        cropControls.appendChild(field);
      });
      cropPanel.appendChild(cropControls);
      cropError = createEl("div", "cc-modal-error");
      cropError.hidden = true;
      cropPanel.appendChild(cropError);
      const cropActions = createEl("div", "cc-modal-actions");
      cropSaveBtn = createEl("button", "cc-action-btn cc-action-btn-primary", "Save crop");
      cropSaveBtn.type = "button";
      cropCancelBtn = createEl("button", "cc-action-btn", "Cancel");
      cropCancelBtn.type = "button";
      cropActions.append(cropSaveBtn, cropCancelBtn);
      cropPanel.appendChild(cropActions);
      modal.appendChild(cropPanel);

      editPanel = createEl("form", "cc-modal-edit");
      editPanel.hidden = true;
      editError = createEl("div", "cc-modal-error");
      editError.hidden = true;

      kindSelect = document.createElement("select");
      kindSelect.className = "cc-input";
      kindSelect.name = "kind";
      ["Certification", "Course"].forEach((label) => {
        const option = document.createElement("option");
        option.value = label.toLowerCase();
        option.textContent = label;
        kindSelect.appendChild(option);
      });

      yearInput = document.createElement("input");
      yearInput.className = "cc-input";
      yearInput.name = "year";
      yearInput.type = "number";
      yearInput.inputMode = "numeric";
      yearInput.placeholder = "e.g. 2024";

      titleInput = document.createElement("input");
      titleInput.className = "cc-input";
      titleInput.name = "title";
      titleInput.type = "text";
      titleInput.autocomplete = "off";
      titleInput.required = true;

      issuerInput = document.createElement("input");
      issuerInput.className = "cc-input";
      issuerInput.name = "issuer";
      issuerInput.type = "text";
      issuerInput.autocomplete = "off";

      catInput = document.createElement("input");
      catInput.className = "cc-input";
      catInput.name = "category";
      catInput.type = "text";
      catInput.autocomplete = "off";

      noteInput = document.createElement("textarea");
      noteInput.className = "cc-input cc-textarea";
      noteInput.name = "note";
      noteInput.rows = 4;
      noteInput.placeholder = "Short description shown in the proof view modal.";

      linkInput = document.createElement("input");
      linkInput.className = "cc-input";
      linkInput.name = "proof_url";
      linkInput.type = "url";
      linkInput.placeholder = "https://...";

      fileInput = document.createElement("input");
      fileInput.className = "cc-input";
      fileInput.name = "proof_image";
      fileInput.type = "file";
      fileInput.accept = "image/*";

      const row1 = createEl("div", "cc-form-row");
      row1.append(createInputField("Type", kindSelect), createInputField("Year", yearInput));
      const row2 = createEl("div", "cc-form-row");
      row2.appendChild(createInputField("Title", titleInput, true));
      const row3 = createEl("div", "cc-form-row");
      row3.append(createInputField("Issuer", issuerInput), createInputField("Category", catInput));
      const row4 = createEl("div", "cc-form-row");
      row4.appendChild(createInputField("Proof link (optional)", linkInput, true));
      const row5 = createEl("div", "cc-form-row");
      row5.appendChild(createInputField("Certificate image (optional)", fileInput, true));

      const btnRow = createEl("div", "cc-modal-actions");
      saveBtn = createEl("button", "cc-action-btn cc-action-btn-primary", "Save");
      saveBtn.type = "submit";
      cancelBtn = createEl("button", "cc-action-btn", "Cancel");
      cancelBtn.type = "button";
      btnRow.append(saveBtn, cancelBtn);

      editPanel.append(
        editError,
        row1,
        row2,
        row3,
        createInputField("Credential note", noteInput, true),
        row4,
        row5,
        btnRow
      );
      modal.appendChild(editPanel);
      cancelBtn.addEventListener("click", close);
      cropButton.addEventListener("click", () => {
        openCrop().catch((error) => setCropError(error && error.message ? error.message : String(error)));
      });
      cropCancelBtn.addEventListener("click", () => {
        const item = currentItem;
        clearCropSource();
        if (item) openView(item, { rootPrefix: getRootPrefix() });
        else close();
      });
      cropSaveBtn.addEventListener("click", async () => {
        try {
          setCropError("");
          setCropBusy(true);
          const file = await createCroppedFile();
          overlay.dispatchEvent(new CustomEvent("cc:crop-save", {
            detail: { item: currentItem, file },
          }));
        } catch (error) {
          setCropBusy(false);
          setCropError(error && error.message ? error.message : String(error));
        }
      });
      editLinkBtn.addEventListener("click", () => {
        if (adminActive && currentItem) openEdit(currentItem, { focusField: "proof_url" });
      });
      overlay.dispatchEvent(new CustomEvent("cc:admin-controls-ready"));
    }

    function removeAdminControls() {
      if (mode === "edit") setMode("view");
      if (mode === "crop") setMode("view");
      if (editLinkBtn) editLinkBtn.remove();
      if (editPanel) editPanel.remove();
      if (cropButton) cropButton.remove();
      if (cropPanel) cropPanel.remove();
      clearCropSource();
      editLinkBtn = null;
      editPanel = null;
      editError = null;
      kindSelect = null;
      yearInput = null;
      titleInput = null;
      issuerInput = null;
      catInput = null;
      noteInput = null;
      linkInput = null;
      fileInput = null;
      saveBtn = null;
      cancelBtn = null;
      cropButton = null;
      cropPanel = null;
      cropCanvas = null;
      cropInputs = null;
      cropSaveBtn = null;
      cropCancelBtn = null;
      cropError = null;
    }

    function setMode(next) {
      mode = next;
      viewPanel.hidden = mode !== "view";
      if (editPanel) editPanel.hidden = mode !== "edit";
      if (cropPanel) cropPanel.hidden = mode !== "crop";
    }

    function close() {
      activeImageRequestId += 1;
      stopImageLoadWatch();
      setImageLoadingVisible(false);
      clearCropSource();
      overlay.hidden = true;
      overlay.classList.remove("is-open");
      document.body.classList.remove("cc-modal-open");
      setMode("view");
      currentItem = null;
      if (editError) {
        editError.hidden = true;
        editError.textContent = "";
      }
      if (lastFocused && typeof lastFocused.focus === "function") {
        try {
          lastFocused.focus();
        } catch (_e) {}
      }
      lastFocused = null;
    }

    function openBase() {
      lastFocused = document.activeElement;
      overlay.hidden = false;
      overlay.classList.add("is-open");
      document.body.classList.add("cc-modal-open");
      closeBtn.focus();
    }

    function stopImageLoadWatch() {
      if (!imageLoadWatchRaf) return;
      cancelAnimationFrame(imageLoadWatchRaf);
      imageLoadWatchRaf = 0;
    }

    function setImageLoadingVisible(visible, text) {
      if (text != null) imageLoadingText.textContent = String(text);
      const show = Boolean(visible);
      imageLoading.hidden = !show;
      imageLoading.style.display = show ? "flex" : "none";
      if (show) {
        imageFrame.classList.add("is-loading");
      } else {
        imageFrame.classList.remove("is-loading");
      }
    }

    function startImageLoadWatch(requestId) {
      stopImageLoadWatch();
      const watch = () => {
        if (requestId !== activeImageRequestId) return;
        if (img.complete) {
          if (img.naturalWidth > 0) {
            markImageLoaded();
          } else {
            markImageError("Certificate image could not be loaded.");
          }
          return;
        }
        imageLoadWatchRaf = requestAnimationFrame(watch);
      };
      imageLoadWatchRaf = requestAnimationFrame(watch);
    }

    function markImageLoaded() {
      stopImageLoadWatch();
      setImageLoadingVisible(false);
      placeholder.hidden = true;
      placeholder.textContent = "No certificate image on file.";
      img.hidden = false;
    }

    function markImageError(message) {
      stopImageLoadWatch();
      setImageLoadingVisible(false);
      img.hidden = true;
      if (cropButton) cropButton.hidden = true;
      placeholder.hidden = false;
      placeholder.textContent = String(message || "Certificate image could not be loaded.");
    }

    function openView(item, { rootPrefix }) {
      if (mode === "crop") clearCropSource();
      currentItem = item;
      setMode("view");
      heading.textContent = textOrDash(item.title);

      const metaParts = [];
      metaParts.push(textOrDash(item.issuer));
      if (typeof item.year === "number" && Number.isFinite(item.year)) {
        metaParts.push(String(item.year));
      }
      viewMeta.textContent = metaParts.join(" • ");

      viewNote.textContent = item.note ? item.note : "Credential note not provided.";
      setImageLoadingVisible(false);
      imageLoadingText.textContent = "Loading certificate image...";

      const imgUrl = normalizeAssetUrl(item.proof_image_url, rootPrefix);
      if (cropButton) cropButton.hidden = !adminActive || !imgUrl;
      if (imgUrl) {
        activeImageRequestId += 1;
        const requestId = activeImageRequestId;
        img.dataset.ccImageReq = String(requestId);
        setImageLoadingVisible(true, "Loading certificate image...");
        img.src = imgUrl;
        img.alt = textOrDash(item.title);
        img.hidden = false;
        placeholder.hidden = true;
        startImageLoadWatch(requestId);
        if (img.complete) {
          if (img.naturalWidth > 0) {
            markImageLoaded();
          } else {
            markImageError("Certificate image could not be loaded.");
          }
        } else if (typeof img.decode === "function") {
          img
            .decode()
            .then(() => {
              const currentReq = Number(img.dataset.ccImageReq || "0");
              if (requestId !== currentReq) return;
              if (img.naturalWidth > 0) markImageLoaded();
            })
            .catch(() => {
              const currentReq = Number(img.dataset.ccImageReq || "0");
              if (requestId !== currentReq) return;
              if (img.complete && img.naturalWidth > 0) {
                markImageLoaded();
              }
            });
        }
      } else {
        activeImageRequestId += 1;
        img.dataset.ccImageReq = String(activeImageRequestId);
        setImageLoadingVisible(false);
        img.removeAttribute("src");
        img.alt = "";
        img.hidden = true;
        placeholder.hidden = false;
      }

      const proofLink = normalizeProofUrl(item.proof_url);
      if (proofLink) {
        viewLink.href = proofLink;
        viewLink.hidden = false;
        viewLinkEmpty.hidden = true;
        viewLinkRow.hidden = false;
      } else {
        viewLink.removeAttribute("href");
        viewLink.hidden = true;
        viewLinkEmpty.hidden = !adminActive;
        viewLinkRow.hidden = !adminActive;
      }

      openBase();
    }

    function openEdit(item, options) {
      if (!adminActive) return;
      ensureAdminControls();
      currentItem = item;
      setMode("edit");
      heading.textContent = item && item.id ? "Edit item" : "Add new item";
      editError.hidden = true;
      editError.textContent = "";

      const normalized = item ? normalizeItem(item) : normalizeItem({ kind: "course" });
      kindSelect.value = normalized.kind;
      yearInput.value = normalized.year ? String(normalized.year) : "";
      titleInput.value = normalized.title || "";
      issuerInput.value = normalized.issuer || "";
      catInput.value = normalized.category || "";
      noteInput.value = normalized.note || "";
      linkInput.value = normalized.proof_url || "";
      fileInput.value = "";

      openBase();

      const focusField = options && options.focusField ? String(options.focusField) : "";
      if (focusField === "proof_url") {
        requestAnimationFrame(() => {
          try {
            linkInput.focus();
          } catch (_e) {}
        });
      }
    }

    function setAdminActive(next) {
      adminActive = Boolean(next);
      if (adminActive) ensureAdminControls();
      else removeAdminControls();

      if (mode === "view" && currentItem) {
        const proofLink = String(currentItem.proof_url || "").trim();
        const hasSafeLink = Boolean(proofLink && !/^javascript:/i.test(proofLink));
        if (!hasSafeLink) {
          viewLink.hidden = true;
          viewLinkEmpty.hidden = !adminActive;
          viewLinkRow.hidden = !adminActive;
        }
      }
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    closeBtn.addEventListener("click", () => close());

    document.addEventListener("keydown", (event) => {
      if (overlay.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    });

    img.addEventListener("load", () => {
      const currentReq = Number(img.dataset.ccImageReq || "0");
      if (!currentReq || currentReq !== activeImageRequestId) return;
      markImageLoaded();
    });

    img.addEventListener("error", () => {
      const currentReq = Number(img.dataset.ccImageReq || "0");
      if (!currentReq || currentReq !== activeImageRequestId) return;
      markImageError("Certificate image could not be loaded.");
    });

    return {
      overlay,
      close,
      openView,
      openEdit,
      setAdminActive,
      getCurrentItem: () => currentItem,
      getEditForm: () => editPanel,
      getFileInput: () => fileInput,
      setEditError: (message) => {
        if (!editError) return;
        const msg = String(message || "").trim();
        if (!msg) {
          editError.hidden = true;
          editError.textContent = "";
          return;
        }
        editError.hidden = false;
        editError.textContent = msg;
      },
      getEditValues: () => editPanel ? ({
        kind: normalizeKind(kindSelect.value),
        year: yearInput.value ? Number(yearInput.value) : null,
        title: String(titleInput.value || "").trim(),
        issuer: String(issuerInput.value || "").trim(),
        category: String(catInput.value || "").trim(),
        note: String(noteInput.value || "").trim(),
        proof_url: String(linkInput.value || "").trim(),
        file: fileInput.files && fileInput.files[0] ? fileInput.files[0] : null,
      }) : null,
      setEditBusy: (busy) => {
        if (!editPanel) return;
        const b = Boolean(busy);
        [kindSelect, yearInput, titleInput, issuerInput, catInput, noteInput, linkInput, fileInput].forEach(
          (el) => {
            el.disabled = b;
          }
        );
        saveBtn.disabled = b;
        cancelBtn.disabled = b;
        closeBtn.disabled = b;
        saveBtn.textContent = b ? "Saving..." : "Save";
      },
      setCropBusy,
      setCropError,
    };
  }

  function safeExtFromFile(file) {
    if (!file) return "";
    const name = String(file.name || "");
    const idx = name.lastIndexOf(".");
    if (idx !== -1 && idx >= name.length - 6) {
      const ext = name.slice(idx).toLowerCase();
      if (/^\.[a-z0-9]+$/.test(ext)) return ext;
    }
    const type = String(file.type || "").toLowerCase();
    if (type === "image/png") return ".png";
    if (type === "image/jpeg") return ".jpg";
    if (type === "image/webp") return ".webp";
    if (type === "image/gif") return ".gif";
    if (type === "image/svg+xml") return ".svg";
    return "";
  }

  function withAssetVersion(rawUrl) {
    const value = String(rawUrl || "").trim();
    if (!value) return value;
    if (/^(data:|blob:)/i.test(value)) return value;

    const hashIndex = value.indexOf("#");
    const base = hashIndex === -1 ? value : value.slice(0, hashIndex);
    const hash = hashIndex === -1 ? "" : value.slice(hashIndex);

    const qIndex = base.indexOf("?");
    const path = qIndex === -1 ? base : base.slice(0, qIndex);
    const query = qIndex === -1 ? "" : base.slice(qIndex + 1);

    const kept = query
      ? query
          .split("&")
          .filter(Boolean)
          .filter((part) => {
            const key = part.split("=", 1)[0];
            return key !== "v" && key !== "cb";
          })
      : [];

    kept.push(`v=${Date.now()}`);
    return `${path}?${kept.join("&")}${hash}`;
  }

  async function uploadFileViaSupabaseFunction(sb, cfg, functionName, { bucket, path, file }) {
    const fn = String(functionName || "").trim();
    if (!fn) throw new Error("Missing upload function name.");
    const { data } = await sb.auth.getSession();
    const token =
      data && data.session && data.session.access_token ? String(data.session.access_token) : "";
    if (!token) throw new Error("Not signed in.");

    const endpoint = `${String(cfg.url || "").replace(/\/$/, "")}/functions/v1/${encodeURIComponent(fn)}`;
    const form = new FormData();
    form.append("bucket", String(bucket || "resume-cms"));
    form.append("path", String(path || ""));
    form.append("file", file, file && file.name ? file.name : "upload");

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: String(cfg.anonKey || ""),
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload || payload.ok !== true) {
      const msg = payload && payload.error ? payload.error : `Upload failed (HTTP ${res.status})`;
      throw new Error(msg);
    }
    const publicUrl = payload && payload.publicUrl ? String(payload.publicUrl) : "";
    if (!publicUrl) throw new Error("Upload succeeded, but no public URL was returned.");
    return publicUrl;
  }

  async function fetchCredentials(sb) {
    const { data, error } = await sb
      .from(TABLE)
      .select(
        "id, kind, title, issuer, year, category, note, proof_image_url, proof_url, sort_order, created_at, updated_at"
      )
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data.map(normalizeItem) : [];
  }

  async function seedDefaultsIfAdmin({ sb, cfg, alreadySeeded }) {
    if (!sb || !cfg || alreadySeeded) return false;
    if (!isAdminModeActive()) return false;

    try {
      // Check once more under admin session to avoid duplicating existing rows.
      const current = await fetchCredentials(sb);
      if (current.length > 0) return true;

      const payload = DEFAULT_ITEMS.map((item, idx) => ({
        kind: item.kind,
        title: item.title,
        issuer: item.issuer,
        year: item.year,
        category: item.category,
        note: item.note,
        proof_image_url: item.proof_image_url,
        proof_url: item.proof_url,
        sort_order: idx,
      }));

      const { error } = await sb.from(TABLE).insert(payload);
      if (error) throw error;
      return true;
    } catch (_e) {
      return false;
    }
  }

  async function init() {
    // Hard reset any stale overlay (including older snapshots that appended the modal to <body>).
    if (document.body) document.body.classList.remove("cc-modal-open");
    document.querySelectorAll(".cc-modal-overlay").forEach((el) => el.remove());

    const section = document.querySelector('[data-cc-section="1"]');
    if (!section) return;

    const rootPrefix = getRootPrefix();
    const grid = section.querySelector('[data-cc-grid="1"]');
    const emptyEl = section.querySelector('[data-cc-empty="1"]');
    const searchInput = section.querySelector('[data-cc-search="1"]');
    let adminControls = section.querySelector('[data-cc-admin-controls="1"]');
    let addBtn = section.querySelector('[data-cc-add="1"]');
    const sortButtons = Array.from(section.querySelectorAll("[data-cc-sort]"));

    if (!grid || !emptyEl || !searchInput) return;

    const state = {
      rootPrefix,
      query: "",
      sortBy: "year",
      items: [],
      itemsSource: "unavailable", // unavailable | supabase
      emptyMessage: "Loading courses and certifications...",
      fallbackItems: [],
      sb: null,
      cfg: null,
      supabaseReady: false,
      adminAuthed: false,
      seeded: false,
      modal: null,
    };

    const modal = createModal(section);
    state.modal = modal;
    state.fallbackItems = readEmbeddedFallback(section);

    // Only create the "Add new" button for admin sessions, so it never exists for public viewers.
    function ensureAdminAddButton() {
      if (!adminControls || !adminControls.isConnected) {
        adminControls = createEl("div", "cc-admin-controls cc-header-actions");
        adminControls.dataset.ccAdminControls = "1";
        adminControls.dataset.resumeDynamic = "1";
        const headerRow = section.querySelector(".cc-header-row");
        if (!headerRow) return null;
        headerRow.appendChild(adminControls);
      }
      if (addBtn && addBtn.isConnected) return addBtn;
      adminControls.replaceChildren();
      const btn = createEl("button", "cc-btn cc-btn-primary", "Add new");
      btn.type = "button";
      btn.dataset.ccAdd = "1";
      adminControls.appendChild(btn);
      addBtn = btn;

      btn.addEventListener("click", async () => {
        if (!isAdminModeActive() || !state.supabaseReady || !state.adminAuthed) return;
        await maybeSeedOnAdminActive();
        modal.openEdit(null);
      });

      return btn;
    }

    function updateAdminUi() {
      const active = isAdminModeActive();
      const shouldShow = active && state.supabaseReady && state.adminAuthed;
      if (shouldShow) {
        const host = ensureAdminAddButton();
        if (host && adminControls) adminControls.hidden = false;
      } else if (adminControls) {
        adminControls.remove();
        adminControls = null;
        addBtn = null;
      }
    }

    function render() {
      updateAdminUi();
      const adminActive =
        isAdminModeActive() &&
        state.supabaseReady &&
        state.adminAuthed &&
        state.itemsSource === "supabase";
      modal.setAdminActive(adminActive);

      const filtered = filterItems(state.items, state.query);
      const sorted = sortItems(filtered, state.sortBy);
      grid.replaceChildren();

      if (sorted.length === 0) {
        emptyEl.hidden = false;
        const message = state.query ? "No matching items." : state.emptyMessage;
        buildEmptyState(emptyEl, message);
        return;
      }

      emptyEl.hidden = true;
      const frag = document.createDocumentFragment();
      sorted.forEach((item) => {
        const card = buildCard(item, {
          rootPrefix: state.rootPrefix,
          adminActive,
          onViewProof: (it) => modal.openView(it, { rootPrefix: state.rootPrefix }),
          onEdit: (it) => {
            if (!adminActive) return;
            modal.openEdit(it);
          },
          onDelete: async (it) => {
            if (!adminActive) return;
            if (!it || !it.id) return;
            if (!confirm("Delete this item?")) return;
            try {
              modal.setEditError("");
              const { error } = await state.sb.from(TABLE).delete().eq("id", it.id);
              if (error) throw error;
              state.items = await fetchCredentials(state.sb);
              state.itemsSource = "supabase";
              render();
            } catch (e) {
              alert(e && e.message ? e.message : String(e));
            }
          },
        });
        frag.appendChild(card);
      });
      grid.appendChild(frag);
    }

    async function loadData() {
      const cfg = await getSupabaseConfig(state.rootPrefix);
      if (!cfg) {
        state.items = state.fallbackItems.slice();
        state.itemsSource = state.fallbackItems.length ? "snapshot" : "unavailable";
        state.emptyMessage = state.fallbackItems.length
          ? "Showing the latest published snapshot."
          : "Courses and certifications are temporarily unavailable.";
        state.supabaseReady = false;
        return;
      }

      state.cfg = cfg;

      try {
        const rows = await fetchCredentialsPublic(cfg);
        if (rows.length > 0) {
          state.items = rows;
          state.itemsSource = "supabase";
          state.emptyMessage = "No courses or certifications published yet.";
        } else {
          state.items = [];
          state.itemsSource = "supabase";
          state.emptyMessage = "No courses or certifications published yet.";
        }
      } catch (_e) {
        state.items = state.fallbackItems.slice();
        state.itemsSource = state.fallbackItems.length ? "snapshot" : "unavailable";
        state.emptyMessage = state.fallbackItems.length
          ? "Showing the latest published snapshot."
          : "Unable to load courses and certifications right now.";
      }

      try {
        const sb = await createSupabaseClient(cfg);
        state.sb = sb;
        state.supabaseReady = Boolean(sb);
        state.adminAuthed = sb ? await isAuthenticatedAdmin(sb, cfg) : false;

        if (sb && sb.auth && typeof sb.auth.onAuthStateChange === "function") {
          sb.auth.onAuthStateChange(async () => {
            state.adminAuthed = await isAuthenticatedAdmin(state.sb, state.cfg);
            updateAdminUi();
            render();
          });
        }
      } catch (_e) {
        state.sb = null;
        state.supabaseReady = false;
        state.adminAuthed = false;
      }
    }

    async function maybeSeedOnAdminActive() {
      if (!state.supabaseReady || state.itemsSource === "supabase") return;
      if (!state.adminAuthed) return;
      const didSeed = await seedDefaultsIfAdmin({
        sb: state.sb,
        cfg: state.cfg,
        alreadySeeded: state.seeded,
      });
      state.seeded = state.seeded || didSeed;
      if (!didSeed) return;
      try {
        const rows = await fetchCredentials(state.sb);
        if (rows.length > 0) {
          state.items = rows;
          state.itemsSource = "supabase";
          render();
        }
      } catch (_e) {}
    }

    async function uploadCredentialProofImage(credentialId, file) {
      if (!credentialId || !file) return;
      const ext = safeExtFromFile(file);
      const path = `credentials/${credentialId}/proof${ext || ""}`;
      const bucket =
        state.cfg && state.cfg.cms && state.cfg.cms.assetsBucket
          ? String(state.cfg.cms.assetsBucket)
          : "resume-cms";
      const fn =
        state.cfg && state.cfg.cms && state.cfg.cms.uploadFunction
          ? String(state.cfg.cms.uploadFunction)
          : "cms-upload";

      const publicUrl = await uploadFileViaSupabaseFunction(state.sb, state.cfg, fn, {
        bucket,
        path,
        file,
      });

      const versionedUrl = withAssetVersion(publicUrl);
      const { data: updatedRows, error: upErr } = await state.sb
        .from(TABLE)
        .update({ proof_image_url: versionedUrl })
        .eq("id", credentialId)
        .select("id")
        .limit(1);
      if (upErr) throw upErr;
      if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
        throw new Error("Image uploaded, but record update was blocked. Check admin permissions/RLS for credentials.");
      }
    }

    sortButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = String(btn.dataset.ccSort || "year");
        if (!SORTS.includes(next)) return;
        state.sortBy = next;
        setActiveSort(sortButtons, next);
        render();
      });
    });

    searchInput.addEventListener("input", () => {
      state.query = String(searchInput.value || "");
      render();
    });

    // If an older snapshot already has the button in HTML, wire it up as well.
    if (addBtn) {
      addBtn.addEventListener("click", async () => {
        if (!isAdminModeActive() || !state.supabaseReady || !state.adminAuthed) return;
        await maybeSeedOnAdminActive();
        modal.openEdit(null);
      });
    }

    function bindModalAdminControls() {
      const editForm = modal.getEditForm();
      const modalFileInput = modal.getFileInput();
      if (!editForm || !modalFileInput || editForm.dataset.bound === "1") return;
      editForm.dataset.bound = "1";

      modalFileInput.addEventListener("change", async () => {
        const file = modalFileInput.files && modalFileInput.files[0] ? modalFileInput.files[0] : null;
        if (!file) return;
        if (!isAdminModeActive() || !state.supabaseReady || !state.adminAuthed) return;

        const current = modal.getCurrentItem();
        if (!current || !current.id) {
          modal.setEditError('For a new item, fill the form and click "Save" to create it before uploading an image.');
          return;
        }

        modal.setEditError("");
        modal.setEditBusy(true);
        try {
          await uploadCredentialProofImage(current.id, file);
          state.items = await fetchCredentials(state.sb);
          state.itemsSource = "supabase";
          render();
          modalFileInput.value = "";
          modal.setEditError("Image uploaded successfully.");
        } catch (e) {
          modal.setEditError(e && e.message ? e.message : String(e));
        } finally {
          modal.setEditBusy(false);
        }
      });

      editForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!isAdminModeActive() || !state.supabaseReady || !state.adminAuthed) return;

        const current = modal.getCurrentItem();
        const isEdit = Boolean(current && current.id);
        const vals = modal.getEditValues();
        if (!vals) return;

        if (!vals.title) {
          modal.setEditError("Title is required.");
          return;
        }

        const proofUrl = normalizeProofUrl(vals.proof_url);
        if (vals.proof_url && !proofUrl) {
          modal.setEditError("Invalid proof link.");
          return;
        }

        modal.setEditError("");
        modal.setEditBusy(true);
        try {
          // Ensure defaults exist in DB before editing existing placeholders.
          await maybeSeedOnAdminActive();

          const basePayload = {
            kind: vals.kind,
            title: vals.title,
            issuer: vals.issuer,
            year: typeof vals.year === "number" && Number.isFinite(vals.year) ? vals.year : null,
            category: vals.category,
            note: vals.note,
            proof_url: proofUrl,
          };

          let row = null;
          if (isEdit) {
            const { data, error } = await state.sb
              .from(TABLE)
              .update(basePayload)
              .eq("id", current.id)
              .select("id, title, issuer, year, kind, category, note, proof_image_url, proof_url")
              .single();
            if (error) throw error;
            row = normalizeItem(data);
          } else {
            const nextSortOrder = state.items.reduce((max, it) => {
              const v =
                it && typeof it.sort_order === "number" && Number.isFinite(it.sort_order)
                  ? it.sort_order
                  : -1;
              return v > max ? v : max;
            }, -1) + 1;

            const { data, error } = await state.sb
              .from(TABLE)
              .insert({ ...basePayload, sort_order: nextSortOrder })
              .select("id, title, issuer, year, kind, category, note, proof_image_url, proof_url")
              .single();
            if (error) throw error;
            row = normalizeItem(data);
          }

          if (vals.file) await uploadCredentialProofImage(row.id, vals.file);

          state.items = await fetchCredentials(state.sb);
          state.itemsSource = "supabase";
          modal.close();
          render();
        } catch (e) {
          modal.setEditError(e && e.message ? e.message : String(e));
        } finally {
          modal.setEditBusy(false);
        }
      });
    }

    modal.overlay.addEventListener("cc:admin-controls-ready", bindModalAdminControls);
    modal.overlay.addEventListener("cc:crop-save", async (event) => {
      const detail = event && event.detail && typeof event.detail === "object" ? event.detail : {};
      const item = detail.item;
      const file = detail.file;
      const adminActive =
        isAdminModeActive() && state.supabaseReady && state.adminAuthed && state.itemsSource === "supabase";
      if (!adminActive || !item || !item.id || !(file instanceof File)) {
        modal.setCropBusy(false);
        modal.setCropError("An authorized admin session is required to save this crop.");
        return;
      }

      try {
        await uploadCredentialProofImage(item.id, file);
        state.items = await fetchCredentials(state.sb);
        state.itemsSource = "supabase";
        render();
        const updated = state.items.find((candidate) => String(candidate.id) === String(item.id));
        if (!updated) throw new Error("The cropped image was saved, but the credential could not be refreshed.");
        modal.setCropBusy(false);
        modal.openView(updated, { rootPrefix: state.rootPrefix });
      } catch (error) {
        modal.setCropBusy(false);
        modal.setCropError(error && error.message ? error.message : String(error));
      }
    });

    // Update admin UI when editor mode toggles.
    if (document.body) {
      const observer = new MutationObserver(async () => {
        if (state.supabaseReady) {
          state.adminAuthed = await isAuthenticatedAdmin(state.sb, state.cfg);
        }
        updateAdminUi();
        maybeSeedOnAdminActive();
        render();
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }

    await loadData();
    updateAdminUi();
    render();
    maybeSeedOnAdminActive();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init().catch((err) => {
        console.error("[courses-certifications] init failed:", err);
      });
    });
  } else {
    init().catch((err) => {
      console.error("[courses-certifications] init failed:", err);
    });
  }
})();
