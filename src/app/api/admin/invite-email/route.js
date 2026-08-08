import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/security";
import { sendEmail, inviteEmailHtml } from "@/lib/email";

// Server-only. Sends the "you've been invited" email after AdminPanel has
// already created the public.users row via the invite_user() RPC (that
// RPC is the actual authorization/creation step — this route only sends
// a notification, and re-verifies the caller is an admin independently,
// since it's a separate network call and shouldn't trust a client claim.
function getAdminClient() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// Same verified-identity pattern as /api/audit — resolves the caller's
// REAL public.users row from their access token, never from the request
// body, so this can't be tricked into sending invite emails on behalf of
// a non-admin.
async function getVerifiedAdmin(request, supabaseAdmin) {
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
    .select("id, role")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") return null;
  return profile;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, name, roleLabel } = body;
    if (!email || !roleLabel) {
      return NextResponse.json({ error: "email and roleLabel are required" }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Not configured (missing SUPABASE_SERVICE_ROLE_KEY)" }, { status: 500 });
    }

    const admin = await getVerifiedAdmin(request, supabaseAdmin);
    if (!admin) {
      return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
    }

    const { allowed } = rateLimit(`invite-email:${admin.id}`, 20, 60000);
    if (!allowed) {
      return NextResponse.json({ error: "Too many invite requests — please slow down." }, { status: 429 });
    }

    const { data: settings } = await supabaseAdmin
      .from("settings").select("email_notifications_enabled").eq("id", "global").maybeSingle();

    if (!settings?.email_notifications_enabled) {
      return NextResponse.json({ sent: false, skipped: true, reason: "Email notifications are off (AdminPanel → Settings)." });
    }

    const html = inviteEmailHtml({
      name,
      roleLabel,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
      oktaEnabled: process.env.NEXT_PUBLIC_OKTA_ENABLED === "true",
    });

    const result = await sendEmail({
      to: email,
      subject: "You've been added to the Content Intake Portal",
      html,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to send invite email" }, { status: 500 });
  }
}
