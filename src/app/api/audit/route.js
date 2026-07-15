import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-only client — service_role key bypasses RLS so this route can
// insert into audit_log, which has no client-facing INSERT policy.
function getAdminClient() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
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

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    const { error } = await supabaseAdmin.from("audit_log").insert({
      user_id:            body.user_id ?? null,
      user_role:          body.user_role ?? null,
      user_email:         body.user_email ?? null,
      user_department:    body.user_department ?? null,
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
