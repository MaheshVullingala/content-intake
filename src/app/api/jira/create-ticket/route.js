import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/security";
import { isJiraConfigured, createJiraTicket } from "@/lib/jira";
import { AUDIT_ACTIONS } from "@/lib/constants";

// Auto-creates a Jira ticket the moment a stakeholder submits a request
// (see PHASE1-EDITORIAL-REVIEW-PLAN.md, Decision C — this is the
// "automatic" option that plan deferred for lack of Jira admin access).
// Called from NewRequest.js's submit() right after the request row is
// written. Fail-open by design: every failure path here returns a
// response the caller treats as non-fatal (see the try/catch around the
// fetch() in NewRequest.js) — a broken Jira token must never block a
// stakeholder's submission, only mean the ticket gets linked manually
// later via the existing JiraTicketCard.

function getAdminClient() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// Same shape as /api/audit's getVerifiedIdentity — resolves the caller's
// real public.users row from their session token, never trusts anything
// client-supplied for identity.
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
    .select("id, email, role")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return profile;
}

function buildTicketContent({ req, submittedByEmail }) {
  const displayId = req.request_display_id || req.id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  const summary = `Content request: ${req.page_title || "Untitled"} (${displayId})`;

  // The portal has no per-request URL route today (it's a single-page,
  // state-based nav — see src/app/page.js's go()), so this can't be a
  // working deep link yet. Pointing at the app root + the display id is
  // the honest version of "referencing this request's id" from the plan,
  // until the app grows real routes.
  const description = [
    "Auto-created from the Content Intake Portal when the stakeholder submitted this request.",
    "",
    `Request: ${displayId}`,
    `Page type: ${req.page_type || "(not set)"}`,
    `Page title: ${req.page_title || "(not set)"}`,
    `Submitted by: ${submittedByEmail || "(unknown)"}`,
    "",
    appUrl
      ? `Open the portal (${appUrl}) and find request ${displayId} to review.`
      : `Open the Content Intake Portal and find request ${displayId} to review.`,
  ].join("\n");

  return { summary, description };
}

export async function POST(request) {
  try {
    const { requestId } = await request.json();
    if (!requestId) {
      return NextResponse.json({ error: "requestId is required." }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Not configured (missing SUPABASE_SERVICE_ROLE_KEY)." }, { status: 500 });
    }

    const identity = await getVerifiedIdentity(request, supabaseAdmin);
    if (!identity) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { allowed } = rateLimit(`jira-create:${identity.id}`, 10, 60000);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    // Not configured yet (no env vars) — this is the expected/common state
    // until someone plugs in real Jira credentials. Not an error: skip
    // quietly so the caller doesn't log noise for a feature that's simply
    // not turned on yet.
    if (!isJiraConfigured()) {
      return NextResponse.json({ skipped: true, reason: "not_configured" });
    }

    const { data: req, error: fetchErr } = await supabaseAdmin
      .from("requests")
      .select("id, created_by, page_title, page_type, request_display_id, jira_ticket_id")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr || !req) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    // Only the submitting stakeholder can trigger auto-creation for their
    // own request — this route is called right at submit time, not a
    // general-purpose "create a ticket for any request" endpoint. Admins
    // still have the manual Jira Ticket card for every other case.
    if (req.created_by !== identity.id) {
      return NextResponse.json({ error: "Not authorized for this request." }, { status: 403 });
    }

    // Idempotent — a retried submit (double-click, network blip) must not
    // create a second ticket for the same request.
    if (req.jira_ticket_id) {
      return NextResponse.json({ skipped: true, reason: "already_linked", ticketId: req.jira_ticket_id });
    }

    const { summary, description } = buildTicketContent({ req, submittedByEmail: identity.email });

    let ticket;
    try {
      ticket = await createJiraTicket({ summary, description });
    } catch (jiraErr) {
      // Logged server-side for whoever's debugging the Jira token/project
      // setup — never surfaced to the stakeholder as a submission failure.
      console.error("Jira ticket creation failed:", jiraErr.message);
      return NextResponse.json({ error: jiraErr.message || "Jira API call failed." }, { status: 502 });
    }

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabaseAdmin.from("requests").update({
      jira_ticket_id:  ticket.key,
      jira_ticket_url: ticket.url,
      jira_created_at: nowIso,
      jira_created_by: identity.id,
    }).eq("id", requestId);

    if (updateErr) {
      // The ticket exists in Jira but we couldn't record it — surface this
      // distinctly so it doesn't look like ticket creation itself failed.
      console.error("Jira ticket created but failed to save to request:", updateErr.message);
      return NextResponse.json({ error: "Ticket created in Jira but failed to save — link it manually.", ticket }, { status: 500 });
    }

    await supabaseAdmin.from("audit_log").insert({
      user_id:     identity.id,
      user_role:   identity.role,
      user_email:  identity.email,
      action:      AUDIT_ACTIONS.JIRA_TICKET_CREATED,
      entity_type: "request",
      entity_id:   requestId,
      field_name:  "jira_ticket_id",
      old_value:   null,
      new_value:   ticket.key,
    }).then(() => {}).catch(() => {}); // audit failures never block the response

    return NextResponse.json({ success: true, ticket });

  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to create Jira ticket." }, { status: 500 });
  }
}
