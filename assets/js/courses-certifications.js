(() => {
  "use strict";

  const TABLE = "credentials";

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
  ];

  const KINDS = /** @type {const} */ (["all", "certification", "course"]);
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
      await loadScript(`${rootPrefix}js/supabase-config.js`);
    } catch (_e) {
      return null;
    }
    const cfg2 = window.__SUPABASE_CONFIG__;
    if (cfg2 && cfg2.url && cfg2.anonKey) return cfg2;
    return null;
  }

  async function ensureSupabaseLibrary() {
    if (window.supabase && typeof window.supabase.createClient === "function") return;
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
  }

  async function createSupabaseClient(cfg) {
    if (!cfg || !cfg.url || !cfg.anonKey) return null;
    await ensureSupabaseLibrary();
    if (!window.supabase || typeof window.supabase.createClient !== "function") return null;
    return window.supabase.createClient(cfg.url, cfg.anonKey);
  }

  function normalizeKind(raw) {
    const kind = String(raw || "").trim().toLowerCase();
    if (kind === "certification" || kind === "course") return kind;
    return "course";
  }

  function normalizeItem(raw) {
    const item = raw && typeof raw === "object" ? raw : {};
    const year =
      typeof item.year === "number"
        ? item.year
        : typeof item.year === "string" && item.year.trim()
          ? Number(item.year)
          : null;
    return {
      id: typeof item.id === "number" ? item.id : null,
      kind: normalizeKind(item.kind),
      title: String(item.title || item.name || "").trim(),
      issuer: String(item.issuer || "").trim(),
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

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = String(text);
    return el;
  }

  function setActiveTab(tabs, kind) {
    tabs.forEach((btn) => {
      const btnKind = String(btn.dataset.ccTab || "all");
      const active = btnKind === kind;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.tabIndex = active ? 0 : -1;
    });
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

  function matchesQuery(item, q) {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return true;
    const haystack = [item.title, item.issuer, item.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }

  function filterItems(items, activeKind, query) {
    return items.filter((item) => {
      if (activeKind !== "all" && item.kind !== activeKind) return false;
      return matchesQuery(item, query);
    });
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
    const kind = createEl("div", "cc-kind", item.kind === "certification" ? "Certification" : "Course");
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
    const placeholder = createEl("div", "cc-modal-placeholder", "No certificate image on file.");
    imageFrame.append(img, placeholder);
    const viewLinkRow = createEl("div", "cc-modal-linkrow");
    const viewLinkEmpty = createEl("div", "cc-modal-link-empty", "No proof link on file.");
    const viewLink = createEl("a", "cc-modal-link", "Open link");
    viewLink.target = "_blank";
    viewLink.rel = "noopener noreferrer";
    const editLinkBtn = createEl("button", "cc-action-btn", "Edit link");
    editLinkBtn.type = "button";
    editLinkBtn.hidden = true;
    viewLinkRow.append(viewLinkEmpty, viewLink, editLinkBtn);
    viewPanel.append(viewMeta, viewNote, imageFrame, viewLinkRow);

    // Edit panel (admin only)
    const editPanel = createEl("form", "cc-modal-edit");
    editPanel.hidden = true;

    const editError = createEl("div", "cc-modal-error");
    editError.hidden = true;

    const row1 = createEl("div", "cc-form-row");
    const kindWrap = createEl("label", "cc-field");
    const kindLabel = createEl("div", "cc-field-label", "Type");
    const kindSelect = document.createElement("select");
    kindSelect.className = "cc-input";
    kindSelect.name = "kind";
    [
      { value: "certification", label: "Certification" },
      { value: "course", label: "Course" },
    ].forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      kindSelect.appendChild(o);
    });
    kindWrap.append(kindLabel, kindSelect);

    const yearWrap = createEl("label", "cc-field");
    const yearLabel = createEl("div", "cc-field-label", "Year");
    const yearInput = document.createElement("input");
    yearInput.className = "cc-input";
    yearInput.name = "year";
    yearInput.type = "number";
    yearInput.inputMode = "numeric";
    yearInput.placeholder = "e.g. 2024";
    yearWrap.append(yearLabel, yearInput);
    row1.append(kindWrap, yearWrap);

    const row2 = createEl("div", "cc-form-row");
    const titleWrap = createEl("label", "cc-field cc-field-span");
    const titleLabel = createEl("div", "cc-field-label", "Title");
    const titleInput = document.createElement("input");
    titleInput.className = "cc-input";
    titleInput.name = "title";
    titleInput.type = "text";
    titleInput.autocomplete = "off";
    titleInput.required = true;
    titleWrap.append(titleLabel, titleInput);
    row2.append(titleWrap);

    const row3 = createEl("div", "cc-form-row");
    const issuerWrap = createEl("label", "cc-field");
    const issuerLabel = createEl("div", "cc-field-label", "Issuer");
    const issuerInput = document.createElement("input");
    issuerInput.className = "cc-input";
    issuerInput.name = "issuer";
    issuerInput.type = "text";
    issuerInput.autocomplete = "off";
    issuerWrap.append(issuerLabel, issuerInput);

    const catWrap = createEl("label", "cc-field");
    const catLabel = createEl("div", "cc-field-label", "Category");
    const catInput = document.createElement("input");
    catInput.className = "cc-input";
    catInput.name = "category";
    catInput.type = "text";
    catInput.autocomplete = "off";
    catWrap.append(catLabel, catInput);

    row3.append(issuerWrap, catWrap);

    const noteWrap = createEl("label", "cc-field cc-field-span");
    const noteLabel = createEl("div", "cc-field-label", "Credential note");
    const noteInput = document.createElement("textarea");
    noteInput.className = "cc-input cc-textarea";
    noteInput.name = "note";
    noteInput.rows = 4;
    noteInput.placeholder = "Short description shown in the proof view modal.";
    noteWrap.append(noteLabel, noteInput);

    const row4 = createEl("div", "cc-form-row");
    const linkWrap = createEl("label", "cc-field cc-field-span");
    const linkLabel = createEl("div", "cc-field-label", "Proof link (optional)");
    const linkInput = document.createElement("input");
    linkInput.className = "cc-input";
    linkInput.name = "proof_url";
    linkInput.type = "url";
    linkInput.placeholder = "https://...";
    linkWrap.append(linkLabel, linkInput);
    row4.append(linkWrap);

    const row5 = createEl("div", "cc-form-row");
    const fileWrap = createEl("label", "cc-field cc-field-span");
    const fileLabel = createEl("div", "cc-field-label", "Certificate image (optional)");
    const fileInput = document.createElement("input");
    fileInput.className = "cc-input";
    fileInput.name = "proof_image";
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileWrap.append(fileLabel, fileInput);
    row5.append(fileWrap);

    const btnRow = createEl("div", "cc-modal-actions");
    const saveBtn = createEl("button", "cc-action-btn cc-action-btn-primary", "Save");
    saveBtn.type = "submit";
    const cancelBtn = createEl("button", "cc-action-btn", "Cancel");
    cancelBtn.type = "button";
    btnRow.append(saveBtn, cancelBtn);

    editPanel.append(editError, row1, row2, row3, noteWrap, row4, row5, btnRow);

    modal.append(header, viewPanel, editPanel);
    overlay.appendChild(modal);
    section.appendChild(overlay);

    let mode = "view";
    let currentItem = null;
    let lastFocused = null;
    let adminActive = false;

    function setMode(next) {
      mode = next;
      viewPanel.hidden = mode !== "view";
      editPanel.hidden = mode !== "edit";
    }

    function close() {
      overlay.hidden = true;
      overlay.classList.remove("is-open");
      document.body.classList.remove("cc-modal-open");
      setMode("view");
      currentItem = null;
      editError.hidden = true;
      editError.textContent = "";
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

    function openView(item, { rootPrefix }) {
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

      const imgUrl = normalizeAssetUrl(item.proof_image_url, rootPrefix);
      if (imgUrl) {
        img.src = imgUrl;
        img.alt = textOrDash(item.title);
        img.hidden = false;
        placeholder.hidden = true;
      } else {
        img.removeAttribute("src");
        img.alt = "";
        img.hidden = true;
        placeholder.hidden = false;
      }

      const proofLink = String(item.proof_url || "").trim();
      if (proofLink && !/^javascript:/i.test(proofLink)) {
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
      editLinkBtn.hidden = !adminActive;

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
    cancelBtn.addEventListener("click", () => close());
    editLinkBtn.addEventListener("click", () => {
      if (!adminActive) return;
      if (!currentItem) return;
      openEdit(currentItem, { focusField: "proof_url" });
    });

    document.addEventListener("keydown", (event) => {
      if (overlay.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    });

    return {
      overlay,
      close,
      openView,
      openEdit,
      setAdminActive,
      getCurrentItem: () => currentItem,
      getEditForm: () => editPanel,
      setEditError: (message) => {
        const msg = String(message || "").trim();
        if (!msg) {
          editError.hidden = true;
          editError.textContent = "";
          return;
        }
        editError.hidden = false;
        editError.textContent = msg;
      },
      getEditValues: () => ({
        kind: normalizeKind(kindSelect.value),
        year: yearInput.value ? Number(yearInput.value) : null,
        title: String(titleInput.value || "").trim(),
        issuer: String(issuerInput.value || "").trim(),
        category: String(catInput.value || "").trim(),
        note: String(noteInput.value || "").trim(),
        proof_url: String(linkInput.value || "").trim(),
        file: fileInput.files && fileInput.files[0] ? fileInput.files[0] : null,
      }),
      setEditBusy: (busy) => {
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
    const adminControls = section.querySelector('[data-cc-admin-controls="1"]');
    let addBtn = section.querySelector('[data-cc-add="1"]');
    const tabs = Array.from(section.querySelectorAll("[data-cc-tab]"));
    const sortButtons = Array.from(section.querySelectorAll("[data-cc-sort]"));

    if (!grid || !emptyEl || !searchInput || !adminControls || tabs.length === 0) return;

    const state = {
      rootPrefix,
      activeKind: "all",
      query: "",
      sortBy: "year",
      items: [],
      itemsSource: "defaults", // defaults | supabase
      sb: null,
      cfg: null,
      supabaseReady: false,
      seeded: false,
      modal: null,
    };

    const modal = createModal(section);
    state.modal = modal;

    // Only create the "Add new" button for admin sessions, so it never exists for public viewers.
    function ensureAdminAddButton() {
      if (addBtn && addBtn.isConnected) return addBtn;
      adminControls.replaceChildren();
      const btn = createEl("button", "cc-btn cc-btn-primary", "Add new");
      btn.type = "button";
      btn.dataset.ccAdd = "1";
      adminControls.appendChild(btn);
      addBtn = btn;

      btn.addEventListener("click", async () => {
        if (!isAdminModeActive() || !state.supabaseReady) return;
        await maybeSeedOnAdminActive();
        modal.openEdit(null);
      });

      return btn;
    }

    function updateAdminUi() {
      const active = isAdminModeActive();
      const shouldShow = active && state.supabaseReady;
      adminControls.hidden = !shouldShow;
      if (shouldShow) ensureAdminAddButton();
    }

    function render() {
      updateAdminUi();
      const adminActive =
        isAdminModeActive() && state.supabaseReady && state.itemsSource === "supabase";
      modal.setAdminActive(adminActive);

      const filtered = filterItems(state.items, state.activeKind, state.query);
      const sorted = sortItems(filtered, state.sortBy);
      grid.replaceChildren();

      if (sorted.length === 0) {
        emptyEl.hidden = false;
        buildEmptyState(emptyEl, "No matching items.");
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
        state.items = DEFAULT_ITEMS.map(normalizeItem);
        state.itemsSource = "defaults";
        state.supabaseReady = false;
        return;
      }

      const sb = await createSupabaseClient(cfg);
      if (!sb) {
        state.items = DEFAULT_ITEMS.map(normalizeItem);
        state.itemsSource = "defaults";
        state.supabaseReady = false;
        return;
      }

      state.cfg = cfg;
      state.sb = sb;
      state.supabaseReady = true;

      try {
        const rows = await fetchCredentials(sb);
        if (rows.length > 0) {
          state.items = rows;
          state.itemsSource = "supabase";
        } else {
          state.items = DEFAULT_ITEMS.map(normalizeItem);
          state.itemsSource = "defaults";
        }
      } catch (_e) {
        state.items = DEFAULT_ITEMS.map(normalizeItem);
        state.itemsSource = "defaults";
        state.supabaseReady = false;
      }
    }

    async function maybeSeedOnAdminActive() {
      if (!state.supabaseReady || state.itemsSource === "supabase") return;
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

    tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = String(btn.dataset.ccTab || "all");
        if (!KINDS.includes(next)) return;
        state.activeKind = next;
        setActiveTab(tabs, next);
        render();
      });
    });

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
        if (!isAdminModeActive() || !state.supabaseReady) return;
        await maybeSeedOnAdminActive();
        modal.openEdit(null);
      });
    }

    modal.getEditForm().addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!isAdminModeActive() || !state.supabaseReady) return;

      const current = modal.getCurrentItem();
      const isEdit = Boolean(current && current.id);
      const vals = modal.getEditValues();

      if (!vals.title) {
        modal.setEditError("Title is required.");
        return;
      }

      if (vals.proof_url && /^javascript:/i.test(vals.proof_url)) {
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
          proof_url: vals.proof_url,
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

        if (vals.file) {
          const ext = safeExtFromFile(vals.file);
          const path = `credentials/${row.id}/proof${ext || ""}`;
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
            file: vals.file,
          });

          const { error: upErr } = await state.sb
            .from(TABLE)
            .update({ proof_image_url: publicUrl })
            .eq("id", row.id);
          if (upErr) throw upErr;
        }

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

    // Update admin UI when editor mode toggles.
    if (document.body) {
      const observer = new MutationObserver(() => {
        updateAdminUi();
        maybeSeedOnAdminActive();
        render();
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }

    await loadData();
    setActiveTab(tabs, state.activeKind);
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
