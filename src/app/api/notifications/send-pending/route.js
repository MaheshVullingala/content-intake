import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, notificationEmailHtml } from "@/lib/email";

// ── Email notification sweep ────────────────────────────────────────────
// Polling-based rather than fired on insert, deliberately: notifications
// are inserted from ~15 different call sites across the app (TaskPanel,
// TaskBoardOverview, AdminTaskSetup, PendingChangeCard, AssigneeDropdown,
// etc.), so a per-insert email trigger would mean touching every one of
// them individually and keeping them all in sync forever. This route
// instead sweeps unsent notifications on a schedule (see vercel.json's
// cron entry; on the self-hosted VM, wire an equivalent system cron /
// systemd timer hitting this same URL) — one place to reason about, and
// new notification call sites get email coverage automatically with zero
// changes here.
//
// Gated by settings.email_notifications_enabled (flip in AdminPanel →
// Settings once SMTP is actually configured) AND by whether SMTP itself
// is configured (lib/email.js no-ops safely either way) — so this route
// is safe to leave wired up and scheduled well before either is true.
//
// Auth: this isn't a user-session route, it's meant to be called by a
// scheduler. Protected by a shared secret (CRON_SECRET) rather than a
// Supabase JWT. Vercel Cron automatically sends this as a Bearer token
// when CRON_SECRET is set in the project's env vars; a VM-side cron job
// should do the same via `curl -H "Authorization: Bearer $CRON_SECRET"`.

const BATCH_SIZE = 50;

function getAdminClient() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function GET(request) {
  return handleSweep(request);
}
export async function POST(request) {
  return handleSweep(request);
}

async function handleSweep(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  // No CRON_SECRET configured yet — allow through unauthenticated for now
  // (matches "build it ready, add details later"), but this route does
  // nothing destructive either way: worst case it's a no-op read + no
  // SMTP configured, so nothing actually sends. Set CRON_SECRET before
  // this is reachable from outside your own scheduler in production.

  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Not configured (missing SUPABASE_SERVICE_ROLE_KEY)" }, { status: 500 });
  }

  const { data: settings } = await supabase
    .from("settings").select("email_notifications_enabled").eq("id", "global").maybeSingle();
  if (!settings?.email_notifications_enabled) {
    return NextResponse.json({ skipped: true, reason: "email_notifications_enabled is off" });
  }

  const { data: pending, error: fetchErr } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, message, action_url, users!notifications_user_id_fkey(email)")
    .eq("email_sent", false)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!pending?.length) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  let sent = 0, failed = 0;
  for (const n of pending) {
    const to = n.users?.email;
    const result = await sendEmail({
      to,
      subject: n.title || "Content Intake Portal notification",
      html: notificationEmailHtml({
        title: n.title, message: n.message, actionUrl: n.action_url, appUrl,
      }),
    });

    if (result.sent) {
      sent++;
      await supabase.from("notifications").update({ email_sent: true }).eq("id", n.id);
    } else {
      failed++;
      // Leave email_sent=false so it's retried on the next sweep — e.g. a
      // transient SMTP outage shouldn't permanently drop a notification.
    }
  }

  return NextResponse.json({ sent, failed, total: pending.length });
}
