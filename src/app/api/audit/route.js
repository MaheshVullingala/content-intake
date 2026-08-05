import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/security";

// Server-only client — service_role key bypasses RLS so this route can
// insert into audit_log, which has no client-facing INSERT policy.
function getAdminClient() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// Verifies the caller's Supabase access token and resolves their REAL
// public.users row. Identity fields in the audit log must come from this,
// never from the client-supplied body — otherwise anyone could POST here
// and forge log entries claiming to be any user_id/email/role, which
// defeats the entire point of an audit trail. Returns null if the token
// is missing/invalid or there's no matching users row.
async function getVerifiedIdentity(request, supabaseAdmin) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabaseAuth = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("id, email, role, department")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return profile;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, entity_type, entity_id } = body;

    if (!action || !entity_type || !entity_id) {
      return NextResponse.json(
        { error: "action, entity_type and entity_id are required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Audit logging is not configured (missing SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 500 }
      );
    }

    const identity = await getVerifiedIdentity(request, supabaseAdmin);
    if (!identity) {
      // logAudit() swallows this client-side, so a 401 here just means the
      // action goes unlogged rather than breaking the caller's real flow.
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { allowed } = rateLimit(`audit:${identity.id}`, 60, 60000);
    if (!allowed) {
      return NextResponse.json({ error: "Too many audit log requests." }, { status: 429 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    const { error } = await supabaseAdmin.from("audit_log").insert({
      // Identity always comes from the verified session, never the body.
      user_id:            identity.id,
      user_role:          identity.role,
      user_email:         identity.email,
      user_department:    identity.department,
      // Impersonation is a client-only UI concept (see effectiveUser in
      // page.js) with no server-side session equivalent, so this one field
      // still comes from the body — it's informational, not a security
      // control, and worst case someone mislabels what they were viewing.
      impersonating_role: body.impersonating_role ?? null,
      action,
      entity_type,
      entity_id,
      field_name:         body.field_name ?? null,
      old_value:          body.old_value ?? null,
      new_value:          body.new_value ?? null,
      ip_address:         ip,
      session_id:         body.session_id ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to write audit log entry" },
      { status: 500 }
    );
  }
}
