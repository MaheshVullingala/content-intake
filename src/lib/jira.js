// ── Jira ticket creation (server-only) ──────────────────────────────────
// Called from src/app/api/jira/create-ticket/route.js right after a
// stakeholder submits a request — see Decision C in
// PHASE1-EDITORIAL-REVIEW-PLAN.md, which originally deferred this
// ("Automatic creation is a clean add-on later") for lack of Jira admin
// access. This is that add-on.
//
// Supports two auth modes so it works whichever Jira the org ends up on:
//   - Server / Data Center (self-hosted, e.g. jira.ourorg.com): a
//     Personal Access Token, sent as `Authorization: Bearer <PAT>`.
//   - Cloud (*.atlassian.net): an account email + API token, sent as
//     HTTP Basic auth.
// Whichever pair of env vars is present decides which mode is used; PAT
// takes priority if both are somehow set.
//
// Uses REST API v2 (`/rest/api/2/issue`), which accepts a plain string
// for `description` on both Server/DC and Cloud. Cloud's newer v3 API
// wants Atlassian Document Format (ADF) instead and is what Jira's own
// docs steer new integrations toward — if this ever moves to Cloud and
// hits complaints about description formatting, that's the fix.
//
// Never throws for "not configured" — callers should check
// isJiraConfigured() first and skip cleanly. createJiraTicket() itself
// throws only for an actual failed API call, so the caller can decide
// how to handle that (this app's choice: fail-open, see the route).

function getConfig() {
  const baseUrl    = (process.env.JIRA_BASE_URL || "").replace(/\/+$/, "");
  const projectKey = process.env.JIRA_PROJECT_KEY || "";
  const issueType  = process.env.JIRA_ISSUE_TYPE || "Task";
  const pat        = process.env.JIRA_PAT || "";
  const email      = process.env.JIRA_EMAIL || "";
  const apiToken   = process.env.JIRA_API_TOKEN || "";
  return { baseUrl, projectKey, issueType, pat, email, apiToken };
}

export function isJiraConfigured() {
  const { baseUrl, projectKey, pat, email, apiToken } = getConfig();
  const hasAuth = !!pat || !!(email && apiToken);
  return !!(baseUrl && projectKey && hasAuth);
}

function getAuthHeader({ pat, email, apiToken }) {
  if (pat) return `Bearer ${pat}`;
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;
}

// summary/description are plain strings — caller builds them, this file
// only knows how to talk to Jira's API, not what the app wants to say.
export async function createJiraTicket({ summary, description }) {
  const config = getConfig();
  if (!isJiraConfigured()) {
    throw new Error("Jira is not configured (missing JIRA_BASE_URL/JIRA_PROJECT_KEY/credentials).");
  }

  const res = await fetch(`${config.baseUrl}/rest/api/2/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  getAuthHeader(config),
    },
    body: JSON.stringify({
      fields: {
        project:   { key: config.projectKey },
        issuetype: { name: config.issueType },
        summary,
        description,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Jira API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = await res.json(); // { id, key, self }
  return {
    id:  data.id,
    key: data.key,
    url: `${config.baseUrl}/browse/${data.key}`,
  };
}
