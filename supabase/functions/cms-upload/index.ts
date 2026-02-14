import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAIL = "jreynoso111@gmail.com";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  } as const;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ ok: false, error: "Server not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return json({ ok: false, error: "Missing Authorization header" }, 401);
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userRes?.user) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const email = String(userRes.user.email ?? "").trim().toLowerCase();
    if (!email || email !== ADMIN_EMAIL) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    const form = await req.formData();
    const bucket = String(form.get("bucket") || "resume-cms");
    const path = String(form.get("path") || "").replace(/^\/+/, "");
    const file = form.get("file");

    if (!path) return json({ ok: false, error: "Missing path" }, 400);
    if (!(file instanceof File)) {
      return json({ ok: false, error: "Missing file" }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadErr } = await supabaseAdmin.storage.from(bucket).upload(
      path,
      bytes,
      {
        upsert: true,
        contentType: file.type || undefined,
      },
    );
    if (uploadErr) return json({ ok: false, error: uploadErr.message }, 400);

    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub?.publicUrl ?? "";
    if (!publicUrl) {
      return json({ ok: false, error: "Could not resolve public URL" }, 500);
    }

    return json({ ok: true, publicUrl });
  } catch (err) {
    const msg = err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
    return json({ ok: false, error: msg }, 500);
  }
});

