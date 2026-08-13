import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.112.3";

type CmsDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; role: string | null };
        Insert: { id: string; role?: string | null };
        Update: { id?: string; role?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const DEFAULT_BUCKET = "resume-cms";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD_BYTES = 512 * 1024;
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
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      ...corsHeaders(req),
    },
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

function getPathExtension(path: string) {
  const match = String(path || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function getExpectedMimeType(path: string) {
  const extension = getPathExtension(path);
  if (extension === "avif") return "image/avif";
  if (extension === "gif") return "image/gif";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "";
}

function hasPrefix(bytes: Uint8Array, expected: number[], offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function hasImageSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/png") {
    return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (mime === "image/jpeg") return hasPrefix(bytes, [0xff, 0xd8, 0xff]);
  if (mime === "image/gif") {
    return hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
      hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  }
  if (mime === "image/webp") {
    return hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      hasPrefix(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  }
  if (mime === "image/avif") {
    const brand = new TextDecoder().decode(bytes.slice(8, 12));
    return hasPrefix(bytes, [0x66, 0x74, 0x79, 0x70], 4) &&
      (brand === "avif" || brand === "avis");
  }
  return false;
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
  supabaseAuth: SupabaseClient<CmsDatabase>,
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
  supabaseAuth: SupabaseClient<CmsDatabase>,
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

  const contentLength = Number(req.headers.get("Content-Length") ?? "0");
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_UPLOAD_BYTES + MAX_MULTIPART_OVERHEAD_BYTES
  ) {
    return json(req, { ok: false, error: "File too large" }, 413);
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

    const supabaseAuth = createClient<CmsDatabase>(supabaseUrl, supabaseAnonKey, {
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
    if (file.size > MAX_UPLOAD_BYTES) {
      return json(req, { ok: false, error: "File too large" }, 413);
    }

    const declaredMime = String(file.type || "").trim().toLowerCase();
    const expectedMime = getExpectedMimeType(path);
    if (
      !expectedMime ||
      !ALLOWED_MIME_TYPES.has(declaredMime) ||
      declaredMime !== expectedMime
    ) {
      return json(req, { ok: false, error: "Unsupported file type" }, 415);
    }

    const supabaseAdmin = createClient<CmsDatabase>(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasImageSignature(bytes, expectedMime)) {
      return json(req, { ok: false, error: "Invalid image content" }, 415);
    }

    const { error: uploadErr } = await supabaseAdmin.storage.from(bucket).upload(
      path,
      bytes,
      {
        upsert: true,
        contentType: expectedMime,
      },
    );
    if (uploadErr) {
      console.error("CMS asset upload failed", uploadErr);
      return json(req, { ok: false, error: "Upload failed" }, 400);
    }

    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub?.publicUrl ?? "";
    if (!publicUrl) {
      return json(req, { ok: false, error: "Could not resolve public URL" }, 500);
    }

    return json(req, { ok: true, publicUrl });
  } catch (err) {
    console.error("CMS upload handler failed", err);
    return json(req, { ok: false, error: "Unexpected server error" }, 500);
  }
});
