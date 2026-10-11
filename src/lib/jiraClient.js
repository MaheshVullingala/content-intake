"use client";
import { getAccessToken } from "@/lib/security";

// Browser-side helper for the "Create Jira Ticket" buttons (post-submit
// banner in ReqDetail.js, and JiraTicketCard.js). Calls the server route,
// which holds the Jira credentials — they never reach the browser.
// Always resolves (never throws) with:
//   { ok: true,  ticket: { key, url } }              ticket created (or already existed)
//   { ok: false, notConfigured: true,  error }       JIRA_* env vars not set yet
//   { ok: false, error }                             anything else (Jira down, bad token, ...)
export async function createJiraTicket(supabase, requestId) {
  try {
    const token = await getAccessToken(supabase);
    if (!token) return { ok: false, error: "Please sign in again." };
    const res = await fetch("/api/jira/create-ticket", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ requestId }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.skipped && data.reason === "not_configured") {
      return { ok: false, notConfigured: true, error: "Jira integration isn't configured yet — ask an admin, or create the ticket in Jira and link it manually." };
    }
    if (data.skipped && data.reason === "already_linked") {
      return { ok: true, ticket: { key: data.ticketId }, alreadyLinked: true };
    }
    if (!res.ok || data.error) return { ok: false, error: data.error || "Couldn't create the Jira ticket." };
    return { ok: true, ticket: data.ticket };
  } catch (e) {
    return { ok: false, error: e.message || "Couldn't create the Jira ticket." };
  }
}
