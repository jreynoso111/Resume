(function () {
  "use strict";

  const PROFILE_TABLE = "profiles";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  let basePathnameCache = null;
  let configPromise = null;
  let clientPromise = null;

  function normalizePath(path) {
    const p = String(path || "").trim();
    if (!p) return "/";
    const withLeading = p.startsWith("/") ? p : `/${p}`;
    return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
  }

  function inferBasePathname() {
    if (basePathnameCache) return basePathnameCache;

    const script = Array.from(document.scripts || []).find((s) => {
      const src = String(s.getAttribute("src") || s.src || "");
      return /(?:^|\/)assets\/js\/auth\.js(?:$|[?#])/.test(src);
    });

    if (script) {
      try {
        const src = new URL(String(script.getAttribute("src") || script.src || ""), window.location.href);
        const pathname = String(src.pathname || "");
        const marker = pathname.lastIndexOf("/assets/js/auth.js");
        if (marker !== -1) {
          basePathnameCache = normalizePath(pathname.slice(0, marker + 1));
          return basePathnameCache;
        }
      } catch (_e) {
        // Ignore and use fallbacks.
      }
    }

    const path = String(window.location.pathname || "/");
    const pagesIdx = path.indexOf("/pages/");
    if (pagesIdx !== -1) {
      basePathnameCache = normalizePath(path.slice(0, pagesIdx + 1));
      return basePathnameCache;
    }

    const authIdx = path.indexOf("/auth/");
    if (authIdx !== -1) {
      basePathnameCache = normalizePath(path.slice(0, authIdx + 1));
      return basePathnameCache;
    }

    basePathnameCache = normalizePath(path.replace(/[^/]*$/, ""));
    return basePathnameCache;
  }

  function getAppHref(path) {
    const clean = String(path || "").replace(/^\/+/, "");
    return `${inferBasePathname()}${clean}`;
  }

  function getAppUrl(path) {
    return new URL(getAppHref(path), window.location.origin).toString();
  }

  function normalizeNextPath(nextPath) {
    if (typeof nextPath !== "string") return "";
    const raw = nextPath.trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin !== window.location.origin) return "";
      return `${url.pathname}${url.search}${url.hash}`;
    } catch (_e) {
      return raw.startsWith("/") ? raw : "";
    }
  }

  function loadScriptOnce(src, readyCheck) {
    if (typeof readyCheck === "function" && readyCheck()) {
      return Promise.resolve();
    }

    const existing = Array.from(document.scripts || []).find((s) => {
      const cur = String(s.getAttribute("src") || s.src || "");
      return cur === src || cur.split("?")[0] === src.split("?")[0];
    });

    if (existing) {
      if (typeof readyCheck !== "function" || readyCheck()) {
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        let settled = false;
        const startedAt = Date.now();
        const timeoutMs = 8000;

        const finish = (err) => {
          if (settled) return;
          settled = true;
          existing.removeEventListener("load", onLoad);
          existing.removeEventListener("error", onError);
          clearInterval(timer);
          if (err) reject(err);
          else resolve();
        };

        const onLoad = () => {
          if (typeof readyCheck !== "function" || readyCheck()) {
            finish();
            return;
          }
          // Continue polling briefly after load in case globals attach async.
        };

        const onError = () => finish(new Error(`Failed to load script: ${src}`));

        const timer = setInterval(() => {
          if (typeof readyCheck !== "function" || readyCheck()) {
            finish();
            return;
          }
          if (Date.now() - startedAt >= timeoutMs) {
            finish(new Error(`Script loaded but dependency is unavailable: ${src}`));
          }
        }, 50);

        existing.addEventListener("load", onLoad);
        existing.addEventListener("error", onError);
      });
    }

    return new Promise((resolve, reject) => {
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

  async function getConfig() {
    if (configPromise) return configPromise;

    configPromise = (async () => {
      const current = window.__SUPABASE_CONFIG__;
      if (current && current.url && current.anonKey) return current;

      await loadScriptOnce(getAppHref("js/supabase-config.js"), () => {
        const cfg = window.__SUPABASE_CONFIG__;
        return Boolean(cfg && cfg.url && cfg.anonKey);
      });

      const cfg = window.__SUPABASE_CONFIG__;
      if (!cfg || !cfg.url || !cfg.anonKey) {
        throw new Error("Supabase configuration not found.");
      }
      return cfg;
    })();

    return configPromise;
  }

  async function ensureSupabaseLibrary() {
    if (window.supabase && typeof window.supabase.createClient === "function") return;
    await loadScriptOnce(SUPABASE_CDN, () => {
      return Boolean(window.supabase && typeof window.supabase.createClient === "function");
    });
  }

  async function getClient() {
    if (clientPromise) return clientPromise;

    clientPromise = (async () => {
      const cfg = await getConfig();
      await ensureSupabaseLibrary();

      return window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      });
    })();

    return clientPromise;
  }

  async function getSession() {
    const sb = await getClient();
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    return (data && data.session) || null;
  }

  async function getUser() {
    const sb = await getClient();
    const { data, error } = await sb.auth.getUser();
    if (error) throw error;
    return (data && data.user) || null;
  }

  async function getProfile(userId) {
    const uid = String(userId || "").trim() || (await getUser())?.id;
    if (!uid) return null;

    const sb = await getClient();
    const { data, error } = await sb
      .from(PROFILE_TABLE)
      .select("id, full_name, role, created_at")
      .eq("id", uid)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return data || null;
  }

  function normalizeFullName(raw) {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed || null;
  }

  async function ensureProfile(options) {
    const opts = options && typeof options === "object" ? options : {};
    const user = opts.user || (await getUser());
    if (!user || !user.id) return null;

    const metaName =
      user && user.user_metadata && typeof user.user_metadata === "object"
        ? user.user_metadata.full_name || user.user_metadata.name || ""
        : "";

    const fullName =
      opts.full_name !== undefined ? normalizeFullName(opts.full_name) : normalizeFullName(metaName);

    const sb = await getClient();
    const payload = {
      id: user.id,
      full_name: fullName,
      role: "viewer",
      created_at: new Date().toISOString(),
    };

    const { error } = await sb
      .from(PROFILE_TABLE)
      .upsert(payload, { onConflict: "id", ignoreDuplicates: true });

    if (error && error.code !== "23505") {
      throw error;
    }

    const profile = await getProfile(user.id);
    if (profile) return profile;

    return {
      id: user.id,
      full_name: fullName,
      role: "viewer",
      created_at: payload.created_at,
    };
  }

  async function requireAuth(options) {
    const opts = options && typeof options === "object" ? options : {};
    const redirectTo = opts.redirectTo || getAppHref("login.html");

    const session = await getSession();
    if (session && session.user) return session;

    window.location.replace(redirectTo);
    return null;
  }

  async function requireRole(rolesArray, options) {
    const allowed = Array.isArray(rolesArray)
      ? rolesArray
          .map((r) => String(r || "").trim().toLowerCase())
          .filter(Boolean)
      : [];

    if (allowed.length === 0) return true;

    const session = await requireAuth(options);
    if (!session || !session.user) return false;

    let profile = await getProfile(session.user.id);
    if (!profile) profile = await ensureProfile({ user: session.user });

    const role = String((profile && profile.role) || "viewer").trim().toLowerCase();
    const ok = allowed.includes(role);

    if (!ok && options && options.redirectTo) {
      window.location.replace(String(options.redirectTo));
    }

    return ok;
  }

  async function logout(options) {
    const opts = options && typeof options === "object" ? options : {};
    const sb = await getClient();
    const { error } = await sb.auth.signOut();
    if (error) throw error;

    if (opts.redirectTo) {
      window.location.replace(String(opts.redirectTo));
    }
  }

  async function onAuthStateChange(callback) {
    try {
      const sb = await getClient();
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        if (typeof callback === "function") callback(session || null);
      });
      return (data && data.subscription) || null;
    } catch (_e) {
      return null;
    }
  }

  function getOAuthRedirectTo(nextPath) {
    const url = new URL(getAppUrl("auth/callback.html"));
    const safeNext = normalizeNextPath(nextPath);
    if (safeNext) url.searchParams.set("next", safeNext);
    return url.toString();
  }

  window.ResumeAuth = {
    getSession,
    getUser,
    getProfile,
    ensureProfile,
    requireAuth,
    requireRole,
    logout,
    getClient,
    onAuthStateChange,
    getAppHref,
    getAppUrl,
    normalizeNextPath,
    getOAuthRedirectTo,
  };
})();
