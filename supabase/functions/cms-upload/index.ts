import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_BUCKET = "resume-cms";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const DEFAULT_ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/(?:www\.)?jreynoso\.net$/i,
  /^https:\/\/jreynoso111\.github\.io$/i,
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
];

function parseAllowedOrigins(raw: string) {
  return new Set(
    String(raw || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function isDefaultAllowedOrigin(origin: string) {
  return DEFAULT_ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

function resolveAllowOrigin(req: Request) {
  const origin = String(req.headers.get("Origin") ?? "").trim();
  if (!origin) return "null";
  const allowedOrigins = parseAllowedOrigins(Deno.env.get("CMS_ALLOWED_ORIGINS") ?? "");
  if (allowedOrigins.size > 0) {
    return allowedOrigins.has(origin) ? origin : "null";
  }
  return isDefaultAllowedOrigin(origin) ? origin : "null";
}

function corsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": resolveAllowOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  } as const;
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

function normalizeObjectPath(raw: unknown) {
  const path = String(raw || "").trim().replace(/^\/+/, "");
  if (!path || path.length > 512) return "";
  if (path.includes("\\") || path.includes("..")) return "";
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(path)) return "";
  const segments = path.split("/").filter(Boolean);
  return segments.length > 0 ? segments.join("/") : "";
}

function hasAllowedMimeType(file: File) {
  const mime = String(file.type || "").trim().toLowerCase();
  if (mime && ALLOWED_MIME_TYPES.has(mime)) return true;
  const name = String(file.name || "").trim().toLowerCase();
  return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(name);
}

function normalizeRoleValue(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isElevatedRole(value: unknown) {
  const role = normalizeRoleValue(value);
  if (role === "admin" || role === "editor") return true;
  return false;
}

async function getProfileRole(
  supabaseAuth: ReturnType<typeof createClient>,
  userId: string,
) {
  if (!userId) return "";
  const { data, error } = await supabaseAuth
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return "";
  return normalizeRoleValue(data.role);
}

async function isAuthorizedAdmin(
  supabaseAuth: ReturnType<typeof createClient>,
  user: { id?: string | null; email?: string | null; app_metadata?: Record<string, unknown> | null },
) {
  if (isElevatedRole(user.app_metadata?.role)) return true;
  if (isElevatedRole(await getProfileRole(supabaseAuth, String(user.id ?? "").trim()))) return true;
  const expectedUserId = String(Deno.env.get("CMS_ADMIN_USER_ID") ?? "").trim();
  const expectedEmail = String(Deno.env.get("CMS_ADMIN_EMAIL") ?? "")
    .trim()
    .toLowerCase();
  const currentUserId = String(user.id ?? "").trim();
  const currentEmail = String(user.email ?? "").trim().toLowerCase();

  if (expectedUserId && currentUserId && expectedUserId === currentUserId) return true;
  return Boolean(expectedEmail && currentEmail && expectedEmail === currentEmail);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(req, { ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json(req, { ok: false, error: "Server not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return json(req, { ok: false, error: "Missing Authorization header" }, 401);
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userRes?.user) {
      return json(req, { ok: false, error: "Unauthorized" }, 401);
    }

    if (!await isAuthorizedAdmin(supabaseAuth, userRes.user)) {
      return json(req, { ok: false, error: "Forbidden" }, 403);
    }

    const form = await req.formData();
    const bucket = String(form.get("bucket") || DEFAULT_BUCKET).trim();
    const path = normalizeObjectPath(form.get("path"));
    const file = form.get("file");

    if (bucket !== DEFAULT_BUCKET) {
      return json(req, { ok: false, error: "Invalid bucket" }, 400);
    }
    if (!path) return json(req, { ok: false, error: "Invalid path" }, 400);
    if (!(file instanceof File)) {
      return json(req, { ok: false, error: "Missing file" }, 400);
    }
    if (!hasAllowedMimeType(file)) {
      return json(req, { ok: false, error: "Unsupported file type" }, 415);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > MAX_UPLOAD_BYTES) {
      return json(req, { ok: false, error: "File too large" }, 413);
    }

    const { error: uploadErr } = await supabaseAdmin.storage.from(bucket).upload(
      path,
      bytes,
      {
        upsert: true,
        contentType: file.type || undefined,
      },
    );
    if (uploadErr) return json(req, { ok: false, error: uploadErr.message }, 400);

    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub?.publicUrl ?? "";
    if (!publicUrl) {
      return json(req, { ok: false, error: "Could not resolve public URL" }, 500);
    }

    return json(req, { ok: true, publicUrl });
  } catch (err) {
    const msg = err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
    return json(req, { ok: false, error: msg }, 500);
  }
});
