# Phase 1: Stakeholder → Editorial Review → Jira Handoff

Status: PROPOSED — not yet built. Written to align on the flow before
implementation starts. Supersedes the "just export to Word" idea from
the initial post-demo feedback — see rationale below.

## Why this instead of a plain Word export

The client's first post-demo ask was: stakeholder fills the form,
downloads a Word doc, attaches it to a Jira ticket, everything else
happens in Jira. On its own, that gives a stakeholder no reason to use
the portal over just filling out a Word template directly — the value
isn't the export, it's what happens to the content *before* it becomes
a static document. Keeping editorial review and the back-and-forth
conversation inside the tool is what actually replaces the old
mess (Word docs emailed around, unclear which version is current, no
audit trail). Jira still gets used, but only once there's a finished,
agreed-on artifact to track — not as the place review happens.

## Roles active in Phase 1

- `stakeholder` — existing
- `editorial_qa` — existing, doing double duty as "the reviewer"
- `admin` — existing, acts as the triage/Jira gatekeeper
- Everyone else already in `constants.js` (`design_qa`, `web_team`,
  `brand_team`, `seo_team`) stays dormant. Not deleted, not shown in
  any active flow — this keeps the door open for later phases without
  needing schema changes then.

Comment access is NOT role-gated. See "Open comment section" below.

## Flow

1. Stakeholder logs in, fills the guided form (AI-assist optional),
   submits.
2. Request lands in Admin's queue.
3. Admin creates a Jira ticket for tracking. The ticket description is
   just a link back to the live request in the portal — no content is
   copied into Jira yet. This is the fix to the naive version of the
   flow: if a Word snapshot were attached at this point, it would go
   stale the moment editorial makes a single edit, and we'd be back to
   "which version is current."
4. Request opens for editorial review. Editorial can:
   - edit sections directly (see Decision A), and/or
   - leave a comment/question on a specific section
5. Open comment thread, visible and postable by anyone with access to
   that request — stakeholder, editorial, and anyone else added (BA
   head, etc. — see "Open comment section" below). This is where
   clarification happens, instead of over email or in Jira comments.
6. Editorial marks the request complete.
7. At that point — and only at that point — the final content is
   exported to Word and attached to the existing Jira ticket (or the
   ticket is just updated with a "ready" status + link, if we skip
   auto-attach for v1 — see Decision D).
8. Everything past this point (design, build, publish) is Jira's job,
   outside this tool. Web team's only need from the portal is to open
   the completed request and copy the final content — plain read
   access to a finished request, not a new pipeline stage.

## Open comment section

Confirmed: comments should NOT be limited to stakeholder + editorial +
admin. Stakeholder, editorial, and other reviewers (e.g. a BA head) all
need to be able to read and post. None of those "other reviewers" are
necessarily one of the three active roles above, so role-based access
doesn't cleanly cover this.

Recommended approach: a **collaborators list per request** — admin (or
the stakeholder) can add specific people by email to a given request,
independent of their system role. Comment access = request owner +
assigned editorial + collaborators list. Avoids inventing a formal
"BA head" role for what's really an ad hoc reviewer added per-request.
This reuses the existing `comments` table (already in the schema) —
mainly need a `request_collaborators` table and to open up comment
read/write RLS to anyone in that list, plus the stakeholder/editorial
already on the request.

**Needs your call**: does this sound right, or would you rather comment
access just be "anyone with an `editorial_qa`/`admin` role can comment
on anything" (simpler, no per-request list, but less precise about who
should actually be looped in on a given request)?

## Open decisions

**A. Editorial edit rights** — direct inline edit, or suggest-only
requiring approval (like the stakeholder change-request flow already
built)? Recommend direct edit for v1 — editorial is a small, trusted
internal team, and building a full suggest/approve loop for them too
is extra work without an obvious payoff at this stage.

**B. Comment participant model** — see above, needs a decision on
collaborators-list vs. role-based.

**C. Jira ticket creation** — automatic via Jira's API (needs an API
token, project key, issue type mapping from whoever admins their Jira),
or manual for v1 (admin creates the ticket themselves in Jira, pastes
the ticket URL into the portal so it's tracked)? Recommend starting
manual — it ships immediately and doesn't depend on Jira admin access
we don't currently have. Automatic creation is a clean add-on later.

**D. Word export timing** — auto-generate and attach the moment
editorial marks a request complete, or a manual "Export to Word"
button admin/editorial clicks when ready? Recommend manual button for
v1 — same reasoning as C, less to get wrong on the first pass.

**E. Stakeholder visibility on completion** — does the stakeholder see
the final reviewed version before it's marked complete and handed to
Jira, or is editorial's sign-off final? Matters for trust/adoption —
worth deciding before this is presented back to the client.

## What's reused vs. net-new

Reused: `comments` table, the request/status model, notifications
infra, the propose/review pattern already built for
`ProposeChangeWizard` + admin approve/reject (same shape as
editorial-suggests → someone-acts-on-it, if Decision A goes the
suggest-only route instead of direct edit).

Net-new: `request_collaborators` table (or equivalent) if going the
collaborators-list route, Word export generation from structured
request data, a Jira ticket-link field on `requests`, and whatever UI
wraps the open comment thread on a request/section.
