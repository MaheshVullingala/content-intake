# Content Intake Portal — Project Context
Last updated: 2026-07-19

## Project
Internal web app for Cadence Design Systems.
Managing parallel editorial workflow for web page content requests.

## Codebase
- Repo: github.com/MaheshVullingala/content-intake
- Local: D:\content-intake-pro
- Branch: main
- Stack: Next.js 14, Supabase, Vercel
- Supabase: izhfetvnortpjimfwnad.supabase.co

## Current Status
V1 is working and deployed. V2 parallel workflow has been grafted on
alongside v1. Both paths coexist — DO NOT rebuild what already works.

## What Works in V1 (DO NOT TOUCH)
- All section components (KeyBenefits, FeaturesApps, CustomerStories,
  PromoSection, RelatedContent, Resources, RelatedProducts, TrainingSupport)
- All section preview components
- PagePreview.js (two-column sticky live preview)
- NewRequest.js (3-step wizard, all 11 sections, all fields)
- ImageField.js — uploads to "attachments" bucket (SAME bucket TaskPanel uses)
- Login page (LoginAnimated.js, AuthPageAnimated.js, auth.css)
- Auth flow (Register, ForgotPassword, ResetPassword)
- Ocean Deep design system (tokens.css, components.css)
- PCBLoader.js
- AIAssistant.js, SectionAIAssist.js, /api/ai route

## Roles (v2)
super_admin, admin, stakeholder, editorial_team, brand_team,
seo_team, design_team, web_team

## Workflow
1. Stakeholder submits → overall_status = pending_admin
2. Admin creates tasks via AdminTaskSetup → in_progress
3. Four parallel tasks: editorial_team, brand_team (optional),
   seo_team, design_team — all run simultaneously
4. Brand completes → stakeholder approves → design_team notified
5. All parallel tasks complete → web_team unlocks
6. Web team → published

## Backwards Compatibility Gate
- overall_status = NULL → legacy v1 request, shows "no longer supported" message
- overall_status set → v2 TaskBoard path
- All v1 db content has been cleared (requests table truncated)

## SQL Files (applied to Supabase — verified working)
- supabase-schema.sql — original v1 schema
- tasks-migration.sql — adds tasks table, overall_status/needs_brand/
  stakeholder_approved_brand/design columns to requests, base RLS
- sql/01-schema.sql — v2 additions: priority, due_date, published_at
  on requests; 6 new tasks columns; notifications table; audit_log table
- sql/02-rls.sql — RLS for tasks (role-based), notifications, audit_log
- sql/03-functions.sql — check_web_team_unlock(), get_user_role(),
  get_user_id()
- sql/04-stakeholder-priority-reason.sql — adds requests.stakeholder_priority_reason,
  split out from priority_override_reason (the admin's own reason for
  changing priority) which the stakeholder-side field used to collide with
  — AdminTaskSetup's task-creation write was silently nulling the
  stakeholder's original reason even when the admin never touched priority
- sql/05-promo-bg-image-ref.sql — documents requests.promo_bg_image_ref
  (JSONB) — confirmed present live; see "Image ref fields" below for the
  buildPayload bug this was tied to
- sql/06-seo-og-fields.sql — adds requests.seo_og_title, seo_og_description
  (TEXT) — confirmed applied 2026-07-19, for the SEO Team AI-generation
  feature (see session log below); existing seo_page_location,
  seo_meta_title, seo_meta_description, seo_meta_keywords predate this file
- sql/07-tasks-web-team-request-changes.sql — second PERMISSIVE tasks
  UPDATE policy letting web_team update any task on a request where
  web_team also has a task — confirmed applied 2026-07-19; resolves the
  "RLS Known Issue" below
- sql/08-task-assignment-visibility.sql — get_user_can_assign() helper
  (COALESCE'd to false) + REPLACED (same policy names, not new ones —
  see "Task Assignment Flow" below for why that distinction mattered)
  tasks_select / requests_select: leads (can_assign=true) see
  everything for their team, members only see tasks/requests assigned
  to them. Confirmed applied 2026-07-19
- sql/09-fix-requests-insert-superadmin.sql — REPLACES requests_insert /
  requests_update / requests_delete (never touched since rls-migration.sql
  / tasks-migration.sql — confirmed via grep, unlike requests_select which
  sql/08 already fixed). Adds the missing 'super_admin' branch to all
  three, and brings requests_update's team-role clause up to v2's actual
  role names (was still editorial_qa/design_qa + old linear-status
  checks). Written 2026-07-29, CONFIRMED APPLIED (verified 2026-07-29 via
  direct Supabase MCP schema introspection — requests_insert/update/delete
  all include 'super_admin' live). See "Known Gaps" below for the bug this
  fixes.
- sql/10-content-change-requests.sql — new content_change_requests table
  + RLS, new tasks.content_update_note/at/read columns, and a second fix
  to tasks_update (same missing-'super_admin' gap as sql/09's fixes, hit
  again by the admin-approve step of the new mid-flight content-change
  feature). CONFIRMED APPLIED (verified 2026-07-29 live). See "Mid-flight
  stakeholder content changes" below.
- sql/11-fix-content-change-requests-insert.sql — content_change_requests_insert
  had two bugs, not one: missing 'super_admin' (same class as everything
  else today) AND an EXISTS clause requiring the submitter to be the
  request's own creator, which blocks a super_admin impersonating a
  different stakeholder regardless of the role fix. Admin/super_admin now
  bypass the own-request check entirely. CONFIRMED APPLIED (verified
  2026-07-29 live). See "Suggest a Change reworked to a tabbed wizard"
  below.
- sql/00-consolidated-bootstrap.sql (2026-07-29) — THE authoritative,
  single-file schema. Generated by direct introspection of the live
  production DB (Supabase MCP: list_tables verbose, pg_policies, pg_proc,
  pg_indexes, information_schema.triggers, storage.buckets/policies) —
  not hand-assembled from the files above. This closed a real gap: most of
  `requests`' columns and `users.auth_id`/`users.can_assign` were added
  directly in the Supabase SQL Editor over time and existed in NO tracked
  SQL file until now. Syntax-verified against Postgres's own grammar
  (pglast/libpg_query, 113/113 statements parsed clean) but NOT yet
  applied to a fresh/branch database — do that before trusting it for the
  RHEL 9 self-hosted migration. Files 01–11 above are kept for history;
  00-consolidated-bootstrap.sql is what to actually run on a new instance.

## Key tasks table columns (tasks-migration.sql)
- id, request_id, team_role, status, is_required
- assigned_to, assigned_by
- question TEXT, question_at, question_asked_by (added in 01-schema)
- answer TEXT, answer_at, answer_given_by (added in 01-schema)
- pending_action_note, pending_action_at, pending_action_by (01-schema)
- brand_files_note TEXT (01-schema)
- completed_at, unlocked_at, created_at, updated_at

## File Upload
- Storage bucket: "attachments" (same bucket as v1 ImageField — verified
  live via Supabase Storage REST API; also has a second "assets" bucket)
- Task files stored at: tasks/{req.id}/{role}/{tag}/{timestamp}.{ext}
  — brand_team always uses tag "brand"; design_team uses the selected
  SECTION_TAGS value lowercased ("banner"/"overview"/"other")
- DB target is "task_attachments" (NOT the old "attachments" table —
  that table is still used by v1 ImageField/NewRequest.js, unrelated)
- task_attachments columns: id, task_id (FK tasks), request_id (FK requests),
  uploaded_by (FK users), file_name, file_type, file_size, storage_path,
  public_url, section_tag (nullable — null for brand_team uploads), created_at
- TaskPanel.js fetchMyFiles: filtered by task_id = myTask.id (own team's files)
- BrandFilesPanel.js (new, shared): read-only fetch by request_id, embeds
  users!uploaded_by(role), filters to role === "brand_team" client-side.
  Used by design_team's TaskPanel view and WebTeamView (web_team). NOT
  used for editorial_team/seo_team — they never see brand files.
  Stakeholder sees brand files via TaskBoardOverview's existing
  pending_approval fileMap (fetched by request_id, filtered by task_id)
  — no separate component needed there.
- Delete: brand/design team can delete their own files (uploaded_by ===
  user.id) as long as their task status !== "pending_approval". Removes
  the storage object then the task_attachments row; window.confirm() guard.
- Known gap: no realtime subscription — BrandFilesPanel/FileList in other
  open tabs won't reflect a delete until they refetch/remount.

## Design System
- Primary: #1b5793
- Accent: #3ec5cb (teal)
- Font: Rubik
- CSS classes: card, card-header, card-sm, btn-primary, btn-ghost,
  btn-danger, btn-success, btn-full, badge, badge-light, badge-dark,
  field-wrap, field-label, field-hint, input, textarea, select,
  alert, alert-info, alert-warning, alert-error, alert-success,
  divider, flex-col, gap-4/8/12/16, mt-4/8/12/16, mb-8/12/16,
  text-xs, text-sm, text-base, text-md, text-uppercase, text-muted,
  text-night, text-success, text-danger
- DO NOT create new CSS files — use existing design system classes only

## Components Completed (v2)
- src/lib/constants.js — v2 roles, TASK_STATUS_META, OVERALL_STATUS_META,
  TASK_TEAMS (string array), PARALLEL_TEAMS, TASK_DEPENDENCY_MAP,
  PRIORITY_META, NOTIFICATION_TYPES, AUDIT_ACTIONS, ROLE_OPTIONS (all additive)
- src/lib/taskUtils.js — TASK_TEAMS (rich array), supabase-as-param,
  createTasksForRequest, tryUnlockWebTeam, syncOverallStatus,
  getTasksForRequest, updateTask (all return { data, error })
- src/components/Dashboard.js — new roles, Pending Admin Review tab,
  priority badges, due date indicators, task progress dots
- src/components/AdminTaskSetup.js — admin sets teams/priority/due_date,
  creates tasks, flips overall_status to in_progress
- src/components/TaskBoard.js — role-based routing to AdminTaskSetup /
  TaskPanel / TaskBoardOverview; web_team left column → WebTeamView
- src/components/TaskBoardOverview.js — stakeholder + admin view of all
  tasks; progress bar; needs_info Q&A; pending_approval with file preview
  + approve/reject; brand approval notifies design_team; handleApprove and
  handleReject now call syncOverallStatus after every task/approval
  change; handleApprove additionally fires tryUnlockWebTeam (fire-and-
  forget Promise.all, onRefresh on resolve) so overall_status keeps up
  with per-task state instead of only being set at task creation
- src/components/TaskPanel.js — team member workspace; Start Task;
  Ask Stakeholder (non-blocking needs_info); role-specific actions:
  editorial_team (complete), seo_team (complete), brand_team (file
  upload + submit for approval), design_team (brand wait toggle + upload
  + submit), web_team (completeness indicator + request changes modal
  + publish); AssigneeDropdown; CompletenessIndicator; handleComplete
  fires syncOverallStatus + tryUnlockWebTeam fire-and-forget after a
  parallel task is marked completed, so web_team unlocks as soon as the
  last required task finishes instead of never (see below); design_team
  additionally gets an "Images to Map" card (getFlaggedImageFields) with
  per-field upload/replace/delete — see "Design Team image mapping" below
- src/lib/imageFields.js + src/lib/imageRef.js — see "Design Team image
  mapping" session log entry (2026-07-18) for the full field/fieldId map
  and getDesignImage/getImagePlaceholder contract
- src/components/ReqDetail.js — overall_status gate routes to TaskBoard;
  null overall_status shows legacy message
- src/components/NotificationBell.js — bell icon in navbar; fetches
  notifications table for current user; red badge (99+ cap); dropdown
  with last 10; click-to-navigate (go("detail", request_id)); mark all
  read; polls every 60s; dark Ocean Deep styling
- src/components/WebTeamView.js — web_team left column; 9-section
  completeness check with progress bar + missing-section chips; all text
  fields with 📋 copy buttons; image thumbnails vs file icons; ZIP download
  via JSZip; Mark as Published (sets overall_status=published + completes
  web_team task row); no CSS module; correct column names (public_url)
- src/components/layout/Navbar.js — role switcher dropdown (super_admin
  only); NotificationBell wired in; accepts supabase prop
- src/app/page.js — impersonation banner (⚡ Viewing as: [Role]);
  effectiveUser derived from localStorage cip-impersonated-role;
  all view components receive effectiveUser; Navbar receives real user
- src/components/NewRequest.js — priority selector (Normal/High/Urgent)
  and brand team checkbox added to Step 1; priority in buildPayload and
  loadDraft; Step 3 duplicate brand checkbox removed; CHAR_LIMITS now
  imported from constants.js instead of a local duplicate copy
- src/components/EditSectionModal.js — editorial_team popup editor,
  triggered by "✎ Edit" buttons in PagePreview (editorialMode only).
  Config-driven per section (SECTION_CONFIG); only shows fields/cards
  with existing content; char counts via CHAR_LIMITS; Features/Apps has
  a dedicated renderer per fa_view_type (list/tabs_horizontal/
  tabs_vertical/table) with a read-only view-type indicator; Training &
  Support edits all 9 card fields (title/description/cta_label ×3) as
  flat string columns. Logs AUDIT_ACTIONS.CONTENT_EDITED on save.
  TaskBoard.js owns editModal state ({section, data} | null); replaced
  TaskPanel.js's old inline EditorialPanel accordion entirely.
- src/lib/auditLogger.js + src/app/api/audit/route.js — client→server
  audit logging. RLS blocks client INSERT on audit_log (service_role
  only), so logAudit() POSTs to /api/audit, which uses
  SUPABASE_SERVICE_ROLE_KEY server-side. Fire-and-forget, all errors
  swallowed — must never block the calling action. Wired into:
  task.created (AdminTaskSetup), task.completed + task.status_changed
  (TaskPanel), content.edited (EditSectionModal), approval.given
  (TaskBoardOverview). session_id always null by design (no token
  fragments persisted).
- src/components/AdminPanel.js — new "Audit Log" tab: date range +
  action type (from AUDIT_ACTIONS) + user email filters, CSV export of
  filtered rows, immutable-log notice, styled like the Users tab table.
- src/components/BrandFilesPanel.js — read-only reference list of
  brand_team's task_attachments for a request; used by design_team
  (TaskPanel) and web_team (WebTeamView).

## RLS Known Issue — RESOLVED 2026-07-19 (v153)
~~TaskPanel Web Team "Request Changes" sets another team's task to
pending_action, but current RLS only allows web_team to update rows
where team_role = 'web_team'.~~ Fixed via
sql/07-tasks-web-team-request-changes.sql — a second PERMISSIVE
tasks UPDATE policy allowing web_team to update any task on a request
where web_team also has a task (Postgres ORs multiple permissive
policies together, so this only widens access, never narrows the base
tasks_update policy). Confirmed applied in Supabase. Same commit also
added the missing target-team notification insert on request-changes
(the web_team-own-task pause was already implemented from an earlier
session, just the notification was missing). See handleRequestChanges
in TaskPanel.js.

## Known Gaps
Numbering follows the user's own external tracking, referenced starting
2026-07-19. Only what's actually been discussed with Claude is
documented below — if a gap number is missing, it hasn't come up yet.
- Gap 1 — Web Team "Request Changes" RLS: RESOLVED v153 (see "RLS Known
  Issue" above).
- Gap 2 — Brand Team rejection notification: RESOLVED v155. handleReject
  in TaskBoardOverview.js now inserts a notification (type
  approval_rejected) for the rejected team, generalized to
  task.team_role rather than hardcoded brand_team (the same function
  handles both brand_team and design_team rejections — design_team
  would otherwise have stayed silently un-notified). TaskPanel.js now
  shows the rejection reason prominently in both brand_team's and
  design_team's card (`myTask.status === "in_progress" &&
  myTask.pending_action_note`) — the status==="in_progress" check is
  load-bearing, not cosmetic: pending_action_note is also written by
  handleRequestChanges (web_team → any team), but that flow sets status
  to "pending_action" (a different value), so the rejection-reason
  display can never misattribute a web_team change-request as a
  stakeholder rejection.
- Gap 3 — Stakeholder progress indicator: RESOLVED v156. Turned out
  ~95% already built — the 5-dot per-TASK_TEAMS-entry progress row
  (Dashboard.js:538-550) already rendered for every role including
  stakeholder (not admin-gated), taskProgress was already populated on
  stakeholder rows (fetchRequests's taskProgress block runs
  unconditionally on `rows`, after the stakeholder query already
  scoped rows to created_by=user.id), and TASK_STATUS_META's existing
  colors already matched the requested scheme exactly (completed
  green, in_progress blue, pending_approval purple, needs_info orange,
  pending_action red, pending gray, locked light gray). Only the
  "X of 5 tasks complete" text was actually missing — added, no query
  changes were needed.
- Gap 4 — NUMBERING COLLISION: the user has used "Gap 4" for two
  different things across this session. Both are documented below as
  given; not reconciled into a single number since that's the user's
  own external tracking, not Claude's to renumber.
  - Gap 4 (as defined 2026-07-19 during the Task Assignment Flow work)
    — Admin reassignment: PARTIALLY DONE as of v154. Team leads
    (can_assign=true) and super_admin can reassign a task via
    AssigneeDropdown in TaskPanel.js (see "Task Assignment Flow"
    below). Reassigning a task from AdminPanel.js directly (i.e.
    without opening the request's TaskPanel) is still pending — lower
    priority per user.
  - Gap 4 (as redefined 2026-07-19 for the "Published confirmation +
    stakeholder notification" task) — RESOLVED v157. Both duplicate
    handlePublish implementations (TaskPanel.js and WebTeamView.js —
    web_team sees both simultaneously; see "Duplicate publish
    implementations" note below) now insert a notification to the
    stakeholder (req.created_by) and to every admin/super_admin user,
    and show the exact success message on first publish
    ("🎉 Page published successfully!..."). WebTeamView.js's existing
    persistent "this request has been published" indicator (driven by
    req.overall_status, shows on every future visit) was kept for
    returning visits; the celebratory message is layered on top via a
    separate publishSuccess local-state flag, shown only for the
    person who just clicked the button in that session.
- Gap 5 — Admin task reassignment from TaskBoardOverview: RESOLVED v158.
  AssigneeDropdown was extracted verbatim out of TaskPanel.js into its
  own file, src/components/AssigneeDropdown.js, and is now imported by
  both TaskPanel.js (unchanged call site/behavior) and
  TaskBoardOverview.js (new). In TaskBoardOverview.js it renders inside
  each task card's expanded content, gated to
  `isAdmin && isExpanded && !isLocked` where
  `isAdmin = ["admin", "super_admin"].includes(user.role)` — the
  stakeholder view of TaskBoardOverview is untouched since isAdmin is
  false there. This finally closes the "reassign without opening
  TaskPanel" gap noted under Gap 4 (admin reassignment) above — the
  remaining lower-priority piece (reassigning directly from
  AdminPanel.js) is still not done.
- Gap 6 — Section-specific questions from Editorial Team: RESOLVED
  v159. TaskPanel.js gained a QUESTION_SECTIONS list matching
  EditSectionModal.js's real SECTION_CONFIG keys exactly (the spec
  originally said `promo` and omitted `resources` — corrected to
  `promo_section` and added `resources` before implementing). The
  section <select> only renders for editorial_team/seo_team (brand_team
  and design_team don't ask content questions). handleAskQuestion
  prefixes the saved question with `[section_key] ` when a section is
  picked. TaskBoard.js regex-parses that tag
  (`/^\[(\w+)\]/`) off the first open editorial/seo needs_info task and
  passes it to PagePreview as highlightSection, which renders an amber
  "✏️ Editorial Team has a question about this section" banner at the
  top of the matching section.
  Deliberately NOT done, per explicit decision: reintroducing
  setEditModal/EditSectionModal into TaskBoardOverview.js's card click
  handler. That mechanic was removed in v150 in favor of stakeholders
  editing via PagePreview's own ✎ buttons (which already auto-answer
  the open question on save via handleStakeholderEditSaved) — bringing
  back a modal-from-card path would have reintroduced the exact dual
  editing paths v150 eliminated. The highlightSection banner satisfies
  the actual goal (point the stakeholder at the right section) without
  it. TaskBoardOverview.js's card click handler is therefore unchanged
  from v150.

## Gap 7 — stakeholder submit fails as 42501 RLS error when impersonated
Found and fixed (pending live confirmation) 2026-07-29. Reported error:
submitting a new request as "⚡ Viewing as: Stakeholder" (super_admin
using the impersonation switcher) failed with `{"code":"42501",...,
"message":"new row violates row-level security policy for table
\"requests\""}`.
Root cause: impersonation (page.js's `effectiveUser`) is purely a
client-side role swap on a JS object — it never touches the actual
Supabase Auth session. NewRequest.js's submit() authenticates its raw
PostgREST POST with the real logged-in user's token (getAuthHeaders),
so get_user_role() in the DB still resolves to 'super_admin', not
'stakeholder'. requests_insert (defined once, in rls-migration.sql, and
never revisited by any later migration — confirmed via repo-wide grep)
only ever checked `get_user_role() IN ('stakeholder', 'admin')` — no
'super_admin' branch was ever added for that policy when the role was
introduced. requests_update / requests_delete had the same gap.
Fix: sql/09-fix-requests-insert-superadmin.sql — see "SQL Files" above.
NOT YET CONFIRMED APPLIED to the live DB (no DB access from this
session) — user needs to run it in the Supabase SQL Editor, then retest
a stakeholder submission via impersonation to confirm.

## Mid-flight stakeholder content changes (2026-07-29)
New feature: stakeholders can propose content edits while teams are
already working a request (overall_status in_progress/pending_web),
without teams working against soon-to-be-stale content. Deliberately
separate from the existing needs_info answer-by-editing flow (PagePreview
✎ buttons when a team asks a question via TaskBoard.js's
handleStakeholderEditSaved) — that flow is untouched and still applies
immediately, no admin step. This new flow is for stakeholder-initiated,
unprompted edits only.

Flow: stakeholder clicks "✎ Suggest a Change" (TaskBoard.js, stakeholder
view, only when not mid-approval/mid-question and overall_status is set
and not published) → gives a reason → PagePreview shows with ✎ buttons
(editorialMode) → each section edit opens EditSectionModal in a new
`deferApply` mode (saves nothing, just returns the built payload to the
caller) → TaskBoard.js accumulates payloads per section into
`proposedChanges` → ProposeChangePanel.js's Submit builds a flat diff
(`changed_fields`: `[{section,key,label,old_value,new_value}]`, native
types preserved — NOT stringified, since the approve step reads
new_value straight back into the `requests` update payload) and inserts
one row into the new `content_change_requests` table (status: pending),
notifying admin/super_admin. Nothing is applied to `requests` at this
point.

Admin reviews inline on the request's own detail view (TaskBoard.js View
4 — chosen over a global AdminPanel queue, per explicit decision) via
PendingChangeCard.js: shows reason + old→new per field, Approve/Reject.
Approve: applies changed_fields to `requests`, marks the change
'approved', bulk-updates every task on the request
(content_update_note/content_update_at/content_update_read=false — new
tasks columns), and notifies each task's assignee. Reject: marks
'rejected' with a required reason, notifies the stakeholder
(submitted_by) — no changes applied.

Task owners see the note via TaskPanel.js: a purple banner (shown when
content_update_note is set and content_update_read is false) with a
"Mark as Read" button that flips content_update_read via the existing
updateTask() helper — this is a normal task field update, no new RLS
needed for the read-toggle itself, but see below.

SQL: sql/10-content-change-requests.sql (NOT YET CONFIRMED APPLIED — no
live DB access from this session, same limitation as sql/09). Creates
content_change_requests + RLS (stakeholder insert own-request only,
admin/super_admin update, admin/super_admin/owning-stakeholder select),
adds tasks.content_update_note/content_update_at/content_update_read.
Also re-fixes tasks_update: it had the exact same missing-'super_admin'
gap as requests_insert/update/delete (Gap 7) — the admin-approve step
bulk-updates every task on a request, which would have hit the same
42501 class of error for a super_admin approver. Run sql/09 and sql/10
together in the Supabase SQL Editor (sql/10 doesn't depend on sql/09
being applied first, but both are needed for this feature to work
end-to-end for a super_admin admin account).

Files touched: EditSectionModal.js (exported SECTION_CONFIG for reuse;
added deferApply prop — default false, every existing caller unaffected,
same immediate-write behavior as before), TaskBoard.js (new
composingChange/proposedReason/proposedChanges/pendingChange state, new
early-return branch for the compose flow, "Suggest a Change" button,
PendingChangeCard wired into admin View 4), ProposeChangePanel.js (new),
PendingChangeCard.js (new), TaskPanel.js (new content-update banner),
constants.js (new NOTIFICATION_TYPES/AUDIT_ACTIONS entries — not
imported at call sites, matching this codebase's established
raw-string-literal convention, see v153).

Verification: `npm run build` could not be completed in this session's
sandbox — a cold Next.js production build didn't finish within the
sandbox's resource/time limits (2 vCPU, no persistent background
processes across tool calls) even after 40+ seconds, still short of
webpack's "creating an optimized production build" stage. Substituted:
esbuild bundle-check (with the project's own `@/*` → `./src` path alias
from jsconfig.json resolved) across the full reachable import graph from
every changed/new file — TaskBoard.js, EditSectionModal.js,
ProposeChangePanel.js, PendingChangeCard.js, TaskPanel.js, constants.js.
All bundled cleanly with zero errors (confirms JSX/syntax validity and
that every cross-file import — including the new SECTION_CONFIG export —
resolves to a real export). This is NOT a substitute for `npm run build`
— run it before deploying.

## Suggest a Change reworked to a tabbed wizard (2026-07-29, same day as
## the feature above)
User feedback after reviewing the first version: the ✎-per-section-modal
compose UI (ProposeChangePanel.js + EditSectionModal in deferApply mode)
was confusing, and had a real functional gap — EditSectionModal only
ever shows fields that already have content, so a section left blank or
marked N/A on the original request could never be added through it.

Fix: ProposeChangeWizard.js (new) replaces that UI entirely for the
"Suggest a Change" flow only — the existing needs_info answer-by-editing
flow (small EditSectionModal, immediate-apply) is untouched, per the
earlier explicit decision to leave it alone. The wizard reuses the exact
section form components NewRequest.js uses to create a request in the
first place (KeyBenefits.js, FeaturesApps.js, CustomerStories.js,
PromoSection.js, RelatedContent.js, Resources.js, RelatedProducts.js,
TrainingSupport.js, plus inline Banner/Overview/SEO fields) behind the
same horizontal section-tab bar layout as NewRequest.js's Step 2 — so a
stakeholder proposing a change gets the identical editing experience
they had when they first submitted, including sections they skipped.

Mechanics: two-phase like before (reason gate, then the editor), but the
editor now seeds every section's local state from the live `req` prop on
mount (unconditionally, unlike NewRequest's loadDraft which skips
seeding an empty slice as a no-op optimization — here an empty section
still needs to render as a blank, fillable form, not be skipped). A
snapshot of `req` at mount time is kept in a ref; Submit diffs the
merged current state against that snapshot (deep-equal via
JSON.stringify for arrays/objects) to build changed_fields — same
insert-into-content_change_requests contract PendingChangeCard.js
already expects, so nothing on the admin-review or approve side needed
to change. A field→{section,label} reverse lookup is built once from
EditSectionModal's exported SECTION_CONFIG, with a few manual additions
for fields SECTION_CONFIG doesn't cover (image refs, fa_items/columns/
rows) — used both for the diff's display labels and for a small "●"
modified-indicator per tab.

ProposeChangePanel.js is now unused/superseded — left in the repo rather
than deleted (file deletion wasn't done unilaterally), TaskBoard.js no
longer imports it. Safe to delete manually if desired.

Also fixed: content_change_requests_insert (sql/10) had the same
missing-'super_admin' gap as everything else fixed today, PLUS a second,
independent problem — its EXISTS clause required the submitting user to
literally be the request's own creator, which a super_admin impersonating
a different stakeholder never is (impersonation doesn't change the real
auth session). Fixing only the role check wouldn't have been enough on
its own. Fix: sql/11-fix-content-change-requests-insert.sql — admin/
super_admin bypass the own-request check entirely (matches how they
already have unconditional access elsewhere: requests_select/update,
tasks_update); stakeholders keep the original own-request-only
restriction. NOT YET CONFIRMED APPLIED — same no-DB-access limitation as
sql/09 and sql/10.

Verification: same esbuild bundle-check approach as the RLS fix earlier
today (full `npm run build` still not completable in this sandbox) —
TaskBoard.js, ProposeChangeWizard.js, PendingChangeCard.js,
EditSectionModal.js all bundle cleanly with the project's real `@/*` →
`./src` path alias resolved, zero errors.

Bug found in testing right after this shipped: typing into any field in
the wizard only accepted one character before losing focus. Cause:
`SectionLayout` was declared *inside* ProposeChangeWizard's function
body (closing over `mergedPreview`/`activeSection`/`req.page_type`
directly instead of taking them as props). A component defined inline
inside a parent's render gets a brand-new function identity every
render, so React treats it as a different component type each time and
unmounts/remounts the whole subtree under it — including the `<input>`/
`<textarea>` DOM nodes — on every keystroke's state update. Fixed by
moving SectionLayout to module scope (alongside Field) and passing
activeSection/pageType/mergedPreview in as explicit props at all four
call sites instead of closing over them. Re-verified with the same
esbuild bundle-check, zero errors.

## Pending content changes surfaced in admin dashboard (2026-07-29)
Gap: admin had no way to know a request had a pending content change
without opening it — PendingChangeCard.js only appears once you're
already on that request's detail view. Fixed in Dashboard.js:

- fetchRequests batch-queries content_change_requests (status='pending')
  for admin/super_admin only, scoped to the same parallelIds already
  computed for taskProgress, and stamps `hasPendingChange` onto each row
  — same batch-query-then-map pattern already used for taskProgress dots
  and return-comment counts, not a new pattern.
- Row badge: "📝 CONTENT UPDATED" pill next to the title, purple
  (#9333ea / #faf5ff) — deliberately reusing PendingChangeCard.js's own
  border/background colors and the app's existing pending_approval purple
  (TASK_STATUS_META, OVERALL_STATUS_META.pending_stakeholder) rather than
  introducing a new color. Considered a different status value instead of
  a badge, but rejected it: a content change is an orthogonal overlay on
  top of the real workflow state (a request can be "in_progress" AND have
  a pending change at the same time), so folding it into the status chip
  would misrepresent it as a new pipeline stage that doesn't actually
  exist. Row background also gets the same purple tint (matching the
  file's existing isDesignQuery/isReturnedDraft row-tint pattern) — the
  most visually prominent existing signal short of the priority-urgent
  red left border, which was left alone rather than contested for the
  same style property.
- Admin's "⚠️ Pending Review" tab (tab1) filter broadened from only
  `overall_status === 'pending_admin'` to also include
  `hasPendingChange` — a pending content change is exactly what that tab
  is for, so it belongs there, not just in "All Requests."
- Found and fixed while doing this: Dashboard.js's tab config and tab1
  filter both checked `user.role === "admin"` literally, never
  'super_admin' — same gap class as the RLS bugs fixed earlier today,
  different layer (UI branching, not a DB policy). A super_admin's own
  native (non-impersonated) dashboard was falling through to the regular-
  operational-member tab config ("Assigned to Me" / "All Requests"),
  which doesn't make sense for a role with no tasks of its own. Both
  checks now use `["admin","super_admin"].includes(user.role)`, matching
  the equivalence already used everywhere else (TaskBoard.js's isAdmin,
  every RLS policy fixed today).

Verification: esbuild bundle-check on Dashboard.js, zero errors. No SQL
changes — content_change_requests_select (sql/10) already grants
admin/super_admin unconditional SELECT, so this dashboard query needs
nothing new applied.

## Duplicate publish implementations — found 2026-07-19, not consolidated
TaskPanel.js's handlePublish and WebTeamView.js's handlePublish are two
independent implementations of the same action. web_team sees both
components at once (WebTeamView left, TaskPanel right in TaskBoard.js's
TWO_COL layout), so both "Mark as Published" buttons are live
simultaneously and either can be clicked. Gap 4's publish-notification
fix (v157) was applied to both, to avoid the fix silently not applying
depending on which button gets used — but the underlying duplication
itself wasn't refactored away (out of scope for what was asked). Worth
consolidating into one shared path if this becomes a recurring source
of the two implementations drifting apart.

## RLS member visibility — KNOWN LIMITATION (2026-07-19)
sql/08-task-assignment-visibility.sql (role-aware tasks_select/
requests_select — leads see everything for their team, members only
see tasks/requests assigned to them) was applied, then rolled back to
permissive policies (tasks_select / requests_select: `auth.uid() IS NOT
NULL`) — restored outside this conversation, Claude has no record of
who/how. User confirmed this rollback is intentional and the
restriction is deferred: "Skip the RLS member visibility for now...
Mark this as a known limitation to revisit on internal server."
AssigneeDropdown, get_user_can_assign(), and the rest of the Task
Assignment Flow (see below) are unaffected by this rollback and still
work — the UI-level assignment/reassignment logic doesn't depend on the
stricter RLS to function, it just means a non-lead member can currently
still SELECT tasks/requests not assigned to them at the DB level (the
UI doesn't currently expose a path that would surface this, but it's
not DB-enforced right now). Revisit sql/08 when moving to an internal
server. Claude could not independently verify the current live policy
state (pg_policies isn't exposed via PostgREST, same limitation as
information_schema) — this is based on the user's report.

## overall_status / web_team unlock (2026-07-17)
Root cause of stakeholder-approves-but-badge-stays-stale bug:
TaskBoardOverview.js's handleApprove/handleReject updated the task row
and the approval flag but never recalculated `requests.overall_status`.
taskUtils.js already had syncOverallStatus() (recalculates from live
task rows) and tryUnlockWebTeam() (flips web_team locked→pending +
overall_status→pending_web once check_web_team_unlock() RPC says all
required non-web tasks are completed) — both existed but were called
from nowhere except TaskPanel's generic doUpdate (which only covers the
acting team's own status changes, not stakeholder approvals).
Fixed: wired syncOverallStatus + tryUnlockWebTeam (fire-and-forget,
Promise.all → onRefresh) into TaskPanel.js handleComplete and
TaskBoardOverview.js handleApprove.
Also fixed a latent regression bug in tryUnlockWebTeam itself: its task
UPDATE matched on team_role='web_team' only, no status='locked' guard.
Once called from multiple sites it would re-fire after the real unlock
and silently reset an in_progress/completed web_team task back to
'pending' (and overall_status back to 'pending_web' even post-publish).
Fixed by adding .eq('status','locked') + only flipping overall_status
when a row was actually updated.

## Image ref fields on requests (2026-07-18)
Every image-capable field stores an ImageField value, not a plain URL:
`{ type: "description"|"link"|"attachment", value, url, path? }`.
Column/path map:
  - banner_image_ref, overview_media_ref, promo_bg_image_ref — single object
  - kb_cards[].image_ref, fa_items[].image_ref (tabs only — list/table have
    no image), cs_items[].logo_ref, rc_cards[].image_ref, rp_cards[].image_ref
    — one object per array item
ImageField.js uploads go to the "attachments" bucket at
`requests/{Date.now()}_{sanitized filename}` (flat, no per-request folder —
changed 2026-07-18, was previously `{fieldKey}_{timestamp}.{ext}` under
`{requestId}/`, which produced 400s). Upload auth was also fixed: it now
sends the caller's real session access_token (via supabase.auth.getSession()),
not the anon key — the anon key alone fails Storage RLS ("new row violates
row-level security policy"), which was the actual root cause of the
reported 400s, not the path format.

src/lib/imageRef.js — getImageUrl(ref) always returns null for a raw
stakeholder ref (stakeholder-provided images/links are intentionally never
rendered as real images in PagePreview) and getImagePlaceholder(ref) returns
display text: the description itself for type='description', or "Image
pending Design Team" for type='link'/'attachment', or null if the field is
empty. All 7 preview surfaces (PagePreview.js banner+overview inline,
KeyBenefitsPreview, FeaturesAppsPreview, CustomerStoriesPreview,
PromoSectionPreview, RelatedContentPreview, RelatedProductsPreview) resolve
through these two functions rather than reading _ref objects directly.
getImageUrl is intentionally still called (not deleted) — it's the
integration point for showing a real Design Team-uploaded image once that
overlay is wired in (task_attachments lookup keyed by section_tag).
RelatedContent.js previously had a completely separate, disconnected
image_url/image_note plain-text pair that was superseded by ImageField/
image_ref — removed in favor of the same pattern every other section uses.

## Task Assignment Flow — COMPLETE 2026-07-19 (v154)
RLS (sql/08-task-assignment-visibility.sql) + AssigneeDropdown
(TaskPanel.js) together enforce and surface: leads (can_assign=true)
see and can assign/reassign every task for their team on any request;
regular members only ever see tasks/requests where the task is assigned
to them (both DB-enforced via RLS and reflected in the UI). Corrected
from the original spec before applying: every `= auth.uid()` comparison
against assigned_to/created_by had to go through get_user_id() instead —
auth.uid() is the Supabase Auth UUID, not public.users.id, per this
schema's established auth_id-mapping convention. Also: the new RLS
policies REPLACE the live tasks_select/requests_select policies (same
names) rather than adding new ones — Postgres ORs multiple permissive
policies together, so a differently-named additive policy would have
left the old, broader policies in effect and had zero restrictive
effect for 3 of 5 team roles.
AssigneeDropdown: dropdown value is sourced directly from task.assigned_to
(no separate local "selected" state, avoiding drift). First assignment
applies immediately + notifies + audit-logs. Reassigning (target already
assigned, including reassigning to "— Unassigned —") requires an inline
reason textarea before the update fires; notifies both new and old
assignee with different wording per whether it's a first assignment or
a reassignment; audit_log has no dedicated reason column, so the reason
is folded into new_value as descriptive text rather than inventing a
field that isn't in the table. Visibility gate: user.can_assign ||
user.role === 'super_admin'. Member fetch has no is_active filter — that
column doesn't exist on public.users (confirmed live; columns are id,
email, name, role, department, avatar_url, created_at, updated_at,
auth_id, can_assign).
AssigneeDropdown now lives in its own file, src/components/
AssigneeDropdown.js (extracted from TaskPanel.js in v158), imported by
both TaskPanel.js and TaskBoardOverview.js — see Gap 5 above for the
TaskBoardOverview.js integration (admin/super_admin only, per expanded
card).
Dashboard.js's isLead "Needs Review" tab (tab1) filter — unassigned OR
assigned-to-self — was found to already be correctly implemented from
an earlier session; no change was needed there (see PART 4 in this
session's request; verified rather than reflexively "fixed").
See "Known Gaps" above for what's still open (Gap 4 — admin
reassignment via AdminPanel specifically, not via TaskPanel).

## task_attachments Table
Created in Supabase (2026-07-16). Columns: id, task_id, request_id,
uploaded_by, file_name, file_type, file_size, storage_path, public_url,
section_tag, created_at. No CHECK constraint on section_tag (plain
nullable text — confirmed via PostgREST OpenAPI introspection). Fully
wired: TaskPanel.js upload/delete/fetchMyFiles, TaskBoardOverview.js
pending-approval fileMap, BrandFilesPanel.js reference view. See
"File Upload" above for the full picture.

## What's Next (build in order)
1. Email notification service — disabled by default; Supabase Edge Function
   or Next.js API route that reads undelivered notifications (email_sent=false)
   and sends via Resend/SendGrid; guarded by a feature flag in settings table
2. Realtime file sync — BrandFilesPanel / TaskPanel's own FileList have no
   subscription, so uploads/deletes in one open tab don't reflect in
   another until refetch/remount. Low priority until multi-tab use is common.
3. Audit log coverage is partial — only 5 actions wired (task.created,
   task.completed, task.status_changed on Start Task, content.edited,
   approval.given). Not yet logged: request.submitted, approval.rejected,
   attachment.uploaded, user.role_switched, task.assigned (reassign
   dropdown), rejection via TaskBoardOverview's handleReject, publish.
4. ~~RLS known issue — web_team "Request Changes" cross-task update~~
   RESOLVED v153, see below.
5. End-to-end browser testing — login as each role, submit a request,
   advance through full workflow, verify TaskBoard routing, confirm
   notifications arrive, test impersonation switcher.

## Session Log
### 2026-07-10
- Truncated requests table (clean start for v2)
- sql/01-schema.sql, 02-rls.sql, 03-functions.sql created and applied
- constants.js — v2 additive exports
- taskUtils.js — full rewrite (supabase-as-param pattern)
- Dashboard.js — new role tabs, progress dots, priority badges, due dates
- AdminTaskSetup.js — created (design system only, no CSS module)
- TaskBoard.js — created (role routing, real components wired)
- TaskBoardOverview.js — created (progress bar, Q&A, approve/reject)
- TaskPanel.js — complete rewrite (role-aware, all 5 team UIs, no CSS module)
- ReqDetail.js — overall_status gate added
- Dev server confirmed clean start (port 3003, Ready in 4.1s)
- Build confirmed zero errors throughout
- NewRequest.js — priority selector + brand checkbox added to Step 1
  (priority state, buildPayload, loadDraft; Step 3 duplicate removed)
- Committed as v138 (Note: git log shows v137 label was used; next is v139)

### 2026-07-11
- Role switcher (super_admin only) added to Navbar — ROLE_OPTIONS in
  constants.js, cip-impersonated-role in localStorage, page reload on switch
- Impersonation banner added to page.js — effectiveUser passed to all views
- NotificationBell.js created and wired into Navbar
- WebTeamView.js fully rewritten — completeness check, copy buttons,
  image thumbnails, ZIP download, Mark as Published; wired into TaskBoard
  as left column for web_team
- Build confirmed zero errors (154 kB bundle)
- Committed as v137 (git commit 0308097)

### 2026-07-13 / 2026-07-14
- EditSectionModal.js created and wired into TaskBoard/PagePreview —
  editorial_team popup content editor, replacing TaskPanel's old inline
  EditorialPanel accordion entirely
- CHAR_LIMITS moved from a local const in NewRequest.js to constants.js
  (single source of truth); NewRequest.js now imports it
- Fixed Features/Applications + Training & Support field mappings in
  EditSectionModal to match real schema (fa_view_type-driven renderer;
  fa_columns/fa_rows object shape, not flat arrays; ts_card1-3 flat
  string columns, not a JSONB array)
- AdminPanel.js — added Audit Log tab (date range, action type, email
  filters, CSV export, immutable notice)
- src/app/api/audit/route.js + src/lib/auditLogger.js created — service-
  role audit writes via API route since RLS blocks client inserts;
  CONTENT_EDITED added to AUDIT_ACTIONS; wired into 5 call sites (see
  "Components Completed" above)
- SUPABASE_SERVICE_ROLE_KEY added to .env.local (gitignored) and to
  Vercel env vars
- Build confirmed zero errors throughout; committed as v138 (85ceee7)

### 2026-07-16
- Diagnosed and fixed a pre-existing table mismatch: TaskPanel.js was
  inserting uploads into "attachments" while TaskBoardOverview.js read
  from a nonexistent "task_attachments" table — stakeholder's pending-
  approval file list was always empty. task_attachments table created
  in Supabase; TaskPanel.js (uploadFile, fetchMyFiles) and
  TaskBoardOverview.js (fetchTaskFiles, file link render) repointed to it
- Verified live via Supabase REST: "attachments" storage bucket exists
  (public); task_attachments has no CHECK constraint on section_tag
- Split brand_team/design_team upload UI: BrandUploadZone (no section
  dropdown, section_tag always null) vs UploadZone (design_team keeps
  the Banner/Overview/Other select)
- Added delete-file capability (own files only, blocked once task is
  pending_approval), with confirm dialog, storage + DB row removal
- BrandFilesPanel.js created — read-only brand_team file reference,
  wired into design_team's TaskPanel view and WebTeamView (web_team);
  stakeholder already covered by TaskBoardOverview's existing fileMap
- Build confirmed zero errors; committed as v140 (ca3ddf6) and pushed
  to origin/main (earlier session had a push permission error — GitHub
  credentials mismatch — resolved by this point)

### 2026-07-17
- notifications RLS: added notifications_insert policy (any authenticated
  user may insert; SELECT policy already restricts reads to own user_id)
  — previously client inserts were blocked entirely (service_role only)
- Diagnosed overall_status staleness bug: approving Brand Team in
  TaskBoardOverview never recalculated requests.overall_status, so the
  badge stayed on "Needs Approval" after approval
- Wired existing-but-unused syncOverallStatus() into TaskBoardOverview.js
  handleApprove + handleReject
- Wired existing-but-unused tryUnlockWebTeam() into TaskPanel.js
  handleComplete and TaskBoardOverview.js handleApprove (fire-and-forget
  Promise.all, onRefresh on resolve) — web_team was previously never
  unlocked anywhere in the app since this function had no callers
- Fixed regression bug in tryUnlockWebTeam (taskUtils.js): added
  .eq('status','locked') guard on the task UPDATE and skip the
  overall_status write when no row matched, so repeated calls after the
  real unlock can no longer reset an in_progress/completed web_team task
  back to pending or revert overall_status past pending_web
- Build confirmed zero errors; committed as v141

### 2026-07-18
- v142: fixed a race in TaskBoardOverview.js handleApprove — a stray
  synchronous onRefresh?.() at the end of the function ran before the
  fire-and-forget syncOverallStatus/tryUnlockWebTeam writes landed,
  sometimes clobbering the refetch with stale data; removed it so
  onRefresh only fires from the Promise.all .then()/.catch()
- Diagnosed ImageField.js upload 400s: root cause was NOT the storage
  path format (key-benefits_card-1_image_1784... etc. was actually
  valid) but that handleFile sent the anon key as the Authorization
  bearer instead of the real session token, so Storage RLS always
  rejected it as unauthenticated. Confirmed via direct REST calls:
  anon key → 403 RLS violation; service-role key, same path → 200.
  Fixed both: path simplified to requests/{Date.now()}_{sanitized
  filename}, and Authorization now uses supabase.auth.getSession()'s
  access_token (matches the pattern already used by TaskPanel.js's
  SDK-based upload and NewRequest.js's getAuthHeaders())
- Fixed Dashboard.js stakeholder "My Requests" tab (tab2) excluding
  drafts (status='draft' && !overall_status) — a stakeholder's first
  saved draft was invisible there until submitted; tab now returns all
  of the stakeholder's own requests unfiltered (My Drafts tab1 unchanged)
- v144: three more bugs found while auditing image fields for the
  Design Team flagging work (see "Image ref fields" above) — Promo's
  image ref was saved to the wrong buildPayload key and silently lost;
  every preview component read a stale/legacy field name instead of the
  real _ref field, so no stakeholder image ever rendered anywhere; and
  RelatedContent.js had a dead, disconnected image_url/image_note pair
  with no relation to its own image_ref data field. All three fixed,
  then reverted one layer on user instruction: stakeholder _ref values
  now render as a placeholder box (description text, or "Image pending
  Design Team" for link/attachment) rather than an actual image — actual
  images are reserved for Design Team's own uploads (not yet wired)
- Committed as v144 (598e7b6) and pushed to origin/main
- Design Team image mapping built (ISSUE 3 + 4), on top of the v144 fixes:
  - src/lib/imageFields.js (new) — getImageFields(req)/getFlaggedImageFields(req)
    enumerate every stakeholder image field into a flat list with a stable
    fieldId (banner_image, overview_media, promo_bg_image, kb_card_N_image,
    fa_item_N_image [tabs view types only], cs_item_N_logo, rc_card_N_image,
    rp_card_N_image); flagged = ref?.value truthy
  - TaskPanel.js — new "Images to Map" card (design_team only, shown when
    any field is flagged): one row per flagged field showing what the
    stakeholder provided (description text / clickable link / "Reference
    image uploaded" + view link for attachment) and either an upload
    button or a thumbnail+delete once mapped. Upload replaces any existing
    mapping for that field (one image per field) via
    uploadMappedImage/deleteMappedImage, storage path
    tasks/{req.id}/design_team/mapped/{fieldId}/{timestamp}.{ext},
    task_attachments.section_tag = `design_team:{fieldId}`. Both call
    onRefresh() (not just fetchMyFiles()) so TaskBoard's designAttachments
    refetches and the adjacent PagePreview updates live.
  - src/lib/imageRef.js — getImageUrl removed (was always null, dead once
    getDesignImage existed); added getDesignImage(fieldId, attachments)
    which matches attachments against `design_team:{fieldId}` and returns
    public_url or null. getImagePlaceholder unchanged.
  - PagePreview.js + all 6 section preview components now accept an
    `attachments` prop (task_attachments rows) and resolve each image as
    designImg (getDesignImage) → real <img>, else placeholder
    (getImagePlaceholder) → grey box, else nothing.
  - TaskBoard.js — new designAttachments state, fetched via
    `task_attachments.eq(request_id).like(section_tag, 'design_team:%')`,
    refetched in handleRefresh; passed as `attachments` prop into both
    PagePreview call sites. Deliberately named differently from TaskBoard's
    own `attachments` prop (the unrelated legacy v1 attachments table,
    still passed through to WebTeamView/TaskPanel) to avoid confusion —
    they are not the same data.
  - Build confirmed zero errors.
  - Committed as v145 (d39f423) and pushed to origin/main
- White-screen crash on design_team opening a request, root-caused and
  fixed (v146):
  - Live DB inspection (via PostgREST + service-role key — no SQL Editor
    access available to Claude, only read-only REST calls) showed the
    request actually used for the image-field test had overall_status =
    NULL (no tasks ever created for it — submission likely failed before
    tasks existed), so it wasn't reachable through design_team's
    TaskBoard view at all. The requests that DO have tasks ("tewtwew",
    "Test page 1", "New Test sgrsggsgss") all have clean, well-formed
    JSONB image fields — ruling out imageFields.js's null/array-shape
    handling as the actual cause, despite it looking like the obvious
    suspect
  - Real cause: PagePreview.js:70 — `overview_media_note` was still
    referenced in the parsedReq shorthand object literal, but the
    variable was renamed to `overview_media_placeholder` during the v144
    Bug B revert and this one reference was missed. Shorthand `{ foo }`
    throws ReferenceError if `foo` isn't in scope — this fires
    unconditionally on every PagePreview render (parsedReq is built at
    the top of the function, before any section-specific branching), so
    it broke PagePreview everywhere, not just for design_team — likely
    also broke NewRequest.js's live preview panel the whole time,
    unnoticed because saveDraft/submit don't depend on the preview
    rendering successfully. `npm run build` did not (and structurally
    cannot, without stricter lint/type config) catch this — it's a
    plain-JS ReferenceError, not a build-time error, on a project with
    no TypeScript and no no-undef-style lint gate
  - Fixed: removed the dangling `overview_media_note` reference.
    Cross-checked every other identifier in parsedReq (lines 69-78)
    against its own const declaration above — no other undefined refs
  - Also hardened imageFields.js per user request: each parse(...)
    result now goes through an explicit Array.isArray() check before
    .forEach(), and each callback does `if (!item) return;` to skip null
    elements without re-indexing (an earlier proposed .filter(Boolean)
    approach was rejected — it would have shifted indices and silently
    mismapped a Design Team upload to the wrong card/tab/item)
  - promo_bg_image_ref column existence re-confirmed live (was a 42703
    "does not exist" on an earlier check — resolved by the time of a
    follow-up check, either applied manually or a stale PostgREST
    schema-cache read; sql/05-promo-bg-image-ref.sql documents it,
    idempotent ADD COLUMN IF NOT EXISTS). Cross-checked all _ref fields
    NewRequest.js's buildPayload() actually writes (banner_image_ref,
    overview_media_ref, promo_bg_image_ref) against the live DB schema
    (pulled via PostgREST's swagger/OpenAPI endpoint, since
    information_schema isn't exposed through the REST API) — all three
    present, no other gaps
  - Build confirmed zero errors; committed as v146 and pushed to origin/main
- Full 14-point audit run against this CONTEXT.md's claimed fix list —
  every item verified present in the actual code (not just claimed);
  only exception is confirming notifications_insert RLS policy is
  applied live (no tool access to Postgres policy introspection, only
  PostgREST's table/column-level schema)
- Two stakeholder-facing improvements (v147):
  - Dashboard.js "Needs Attention": attentionRequests derived from
    r.taskProgress (NOT r.tasks — that field doesn't exist on fetched
    rows; taskProgress is the array of {team_role, status} already
    populated by fetchRequests for every overall_status-set request).
    Red pulsing badge (scoped `<style jsx>` keyframe — no prior pulse
    animation existed anywhere in the codebase, no new CSS file added)
    on the "My Requests" tab, stakeholder only, when count > 0. Popup:
    purple left-border for pending_approval, amber for needs_info, via
    getAttentionReason() → "{TeamLabel} needs approval" / "has a
    question" using TASK_TEAMS for the role→label lookup; capped at 5
    items, "View All" only when count > 5 (switches to tab2); dismiss
    via X, click-outside (same transparent-overlay pattern as the
    existing delete modal), or clicking an item (also navigates via
    go("detail", r.id))
  - TaskBoard.js stakeholder routing: now shows the same two-column
    PagePreview + TaskBoardOverview layout admin gets, but only when
    localTasks.some(t => t.status === "pending_approval") — otherwise
    unchanged (TaskBoardOverview alone). Uses localTasks (not the
    tasks prop — localTasks is the live, refetched state; tasks is
    only the initial useState seed) and the existing designAttachments
    state so Design Team's mapped images render in the stakeholder's
    approval view too.
  - Build confirmed zero errors; committed as v147 and pushed to origin/main
- v148: TaskBoardOverview.js task card layout, scoped to the new
  stakeholder pending-approval right column only:
  - New singleColumn prop (default false) — grid becomes "1fr" instead
    of repeat(auto-fill, minmax(260px, 1fr)) when true. Only passed at
    the stakeholder pending-approval TaskBoardOverview call site in
    TaskBoard.js; admin's own right-column instance and the stakeholder
    no-pending-approval standalone instance both stay auto-fill,
    unchanged, per explicit instruction
  - STATUS_PRIORITY-based sortedTasks (pending_approval/needs_info float
    to top, locked sinks to bottom) — card grid now maps sortedTasks
    instead of orderedTasks; orderedTasks itself (TASK_TEAMS canonical
    order, used for the progress-bar count) is untouched
  - Build confirmed zero errors; committed as v148 and pushed to origin/main
- v149: stakeholder can resolve an editorial_team/seo_team "needs_info"
  question by editing content directly instead of just typing a text
  answer:
  - TaskBoardOverview.js task cards are now clickable (header row only —
    not the whole card, so clicking into the answer textarea or
    Approve/Reject buttons never bubbles up and collapses the card
    mid-interaction). handleCardClick routing: needs_info from
    editorial_team/seo_team AND isStakeholder → opens EditSectionModal;
    locked → no-op; everything else → toggle expandedCard. opensEditModal
    (drives which content block renders — teaser+✎ vs question box+▸/▾)
    is gated by the same isStakeholder check, so admin viewing the same
    needs_info card gets the plain expand/collapse behavior (question
    visible, no answer box — matches showAnswer's existing isStakeholder
    gate) instead of a UI that claims to open an editor it won't for them
  - guessSection(question) — keyword match against question text
    (SECTION_KEYWORDS map) to open EditSectionModal on the likely
    section directly; falls back to section=null (picker) when nothing
    matches
  - EditSectionModal.js gained real section=null support (previously
    SECTION_CONFIG[null] → undefined → the component silently rendered
    nothing). Now: allowPicker=!section, pickedSection state defaults to
    the section prop; when unset, renders a list of all SECTION_CONFIG
    titles to choose from; once picked, the existing single-section edit
    UI takes over, with a "← Back" control to return to the list. Every
    existing caller (TaskBoard.js's editorial_team PagePreview-edit flow)
    always passes a concrete section, so allowPicker is false there —
    fully backward compatible, no other caller affected
  - After save, onSaved auto-answers the question via handleEditSaved:
    updateTask(status: "in_progress", answer: "Content has been
    updated", answer_at, answer_given_by) — mirrors handleAnswer's own
    status transition, fixed text instead of stakeholder-typed
  - Other statuses gained expand-on-click content: completed→completed_at
    date, in_progress→assignee note, pending/waiting_for_brand→a status
    sentence. pending_approval's files+Approve/Reject and the
    already-approved indicator are now also gated behind isExpanded
    (previously always visible whenever status matched)
  - Build confirmed zero errors; committed as v149 and pushed to origin/main
- v150: reworked v149's stakeholder content-editing flow — replaced the
  task-card-click-opens-a-modal approach with PagePreview's own ✎ edit
  buttons (the same ones editorial_team already uses), on user feedback
  that editing via the actual page preview is a better UX than a
  detached modal triggered from a task card:
  - TaskBoard.js stakeholder routing: two-column layout (PagePreview +
    TaskBoardOverview, singleColumn) now triggers on hasPendingApproval
    OR hasNeedsInfo (needs_info from editorial_team/seo_team).
    editorialMode={hasNeedsInfo} specifically (not the OR) — a pure
    approval flow with no question doesn't get edit buttons.
    handleStakeholderEditSaved answers every currently-open
    editorial/seo needs_info task (not just one — a PagePreview edit
    isn't tied to a specific task the way a card click was)
  - TaskBoardOverview.js: removed EditSectionModal import/render,
    editModal state, handleEditSaved, opensEditModal, and
    guessSection/SECTION_KEYWORDS entirely — no longer needed since the
    stakeholder now picks the section by clicking its own ✎ button
    directly, rather than the app guessing from question text.
    handleCardClick is back to two branches (locked→no-op, else→toggle
    expand); the needs_info block is one isExpanded-gated block again,
    showing "Use the edit buttons (✎) on the preview..." for
    isStakeholder && editorial/seo, else the original answer textarea
  - EditSectionModal.js's section=null picker mode (added in v149) is
    UNCHANGED and still there, but is now dormant — neither
    editorial_team's own flow nor this reworked stakeholder flow ever
    passes section=null anymore (TaskBoard.js's onEditSection always
    receives a concrete section from whichever ✎ button was clicked).
    Kept as a reusable capability, not removed, but nothing currently
    exercises it — worth knowing if it looks unused in a future search
  - Build confirmed zero errors; committed as v150 and pushed to origin/main
- v151: TaskPanel.js — design_team no longer has a general/unmapped
  upload path, only "Images to Map":
  - "Design Assets" card now just header + brand-wait toggle +
    BrandFilesPanel. <FileList/> and the general upload+submit block
    removed from it.
  - "Images to Map" card changed from flaggedFields.length > 0-gated to
    ALWAYS rendering for design_team (empty-state message "No images
    flagged by stakeholder yet." when there's nothing to map) — the
    Submit for Stakeholder Approval button moved here, at the bottom,
    same gating as before ((isActive || isPendingApproval) &&
    !isWaitingBrand to show; disabled on saving/no-files/pending).
    Decided deliberately: the previous flaggedFields-gated card would
    have left design_team with literally no way to submit for approval
    on a request where the stakeholder never flagged any image field
  - Confirmed myFiles/fetchMyFiles must stay — NOT design_team-upload-
    only as the task description assumed. getMappedFile() (Images to
    Map's "is this field already mapped" lookup) reads from myFiles,
    and brand_team's FileList/handleDeleteFile/submit-gating still use
    it directly too. Nothing removed there.
  - Dead code removed: UploadZone component, SECTION_TAGS constant,
    sectionTag state, and the isBrand-ternary branches inside
    uploadFile (only BrandUploadZone calls it now, always brand-only —
    accept=".jpg,.jpeg,.png" inlined directly into BrandUploadZone).
    FileList, BrandUploadZone, fileRef all kept — brand_team still
    uses them unchanged.
  - Build confirmed zero errors; committed as v151 and pushed to origin/main
- v152: AI-powered SEO generation for seo_team in TaskPanel.js. Several
  spec/reality mismatches caught and corrected before implementing (same
  class of bug as promo_bg_image_ref/r.tasks earlier this session):
  - Real requests columns are seo_meta_title/seo_meta_description/
    seo_meta_keywords/seo_page_location — NOT seo_title/seo_description/
    seo_keywords/page_url as originally specified. Used the real names
    throughout: seoFields state, the AI-generated JSON shape, and the
    DB save. seo_og_title/seo_og_description didn't exist at all —
    added via sql/06-seo-og-fields.sql (confirmed applied 2026-07-19)
  - /api/ai's actual contract (checked src/app/api/ai/route.js) is
    POST {prompt, systemPrompt?} → {text}; max_tokens is hardcoded to
    1000 server-side and NOT read from the request body at all, so the
    spec's {prompt, max_tokens: 500} would have silently done nothing.
    Followed the existing SectionAIAssist.js calling convention instead:
    strip stray ```json fences from data.text, then JSON.parse
  - SEO_FIELD_CONFIGS (module-level) drives all 5 fields: Meta
    Title/OG Title (50-70 chars), Meta Description/OG Description
    (120-160 chars), Meta Keywords (comma-separated, shown as a term
    count, no color coding — per spec). seoFields lazy-initialized from
    req.seo_meta_title etc. on mount (pre-fills immediately, no flash)
  - handleGenerateSEO builds a prompt with real page context
    (parseKbTitles/parseFaTitles over kb_cards/fa_items), calls
    /api/ai, merges the parsed result into seoFields
  - handleApproveSEO saves all 5 fields to requests, then calls the
    existing handleComplete() (same function editorial_team's "Mark
    Content Approved" already uses) — reuses the established
    syncOverallStatus/tryUnlockWebTeam completion flow rather than
    duplicating it
  - Build confirmed zero errors; committed as v152 and pushed to origin/main
- v153: fixed the "RLS Known Issue" (web_team Request Changes cross-task
  update) — see that section above for the full writeup. Also found
  while re-reading handleRequestChanges: the web_team-own-task pause was
  already implemented from an earlier session (contrary to the task's
  assumption that it was missing) — only the target-team notification
  insert was actually absent; added it, fire-and-forget with try/catch,
  matching the exact pattern already used elsewhere in this file and in
  TaskBoardOverview.js. Used the raw string "changes_requested" rather
  than importing NOTIFICATION_TYPES.CHANGES_REQUESTED from constants.js
  — that constants object is defined but never imported/used anywhere
  in the codebase; every existing notification insert uses a raw string
  literal, so matched the real convention instead of being the first
  call site to reach for the unused constant
  - Build confirmed zero errors; committed as v153 and pushed to origin/main
- v154: Task Assignment Flow — see the dedicated section above for the
  full writeup (RLS correction details, AssigneeDropdown behavior,
  Dashboard.js "Needs Review" verified-already-correct finding). SQL
  (sql/08-task-assignment-visibility.sql) confirmed applied in Supabase
  before the TaskPanel.js changes were built. Introduced the "Known
  Gaps" section (numbered per the user's own external tracking) — Gap 1
  resolved v153, Gap 4 partially done v154 (leads/super_admin can
  reassign via TaskPanel; AdminPanel-direct reassignment still pending,
  lower priority)
  - Build confirmed zero errors; committed as v154 and pushed to origin/main
- v155: temp debug logging (get_user_role/get_user_can_assign/get_user_id
  RPC calls in Dashboard.js) added and removed within the session to
  verify sql/08's helper functions work live — confirmed all three
  return correct values (role, true/false, UUID) from the browser.
  User then reported the role-aware RLS from sql/08 was rolled back to
  permissive policies outside this conversation — see "RLS member
  visibility — KNOWN LIMITATION" above. Gap 2 (Brand Team rejection
  notification) resolved — see "Known Gaps" above for the full writeup.
  Build confirmed zero errors; committed as v155 and pushed to origin/main
- v156: Gap 3 (stakeholder progress indicator) resolved — see "Known
  Gaps" above for the full writeup on how little actually needed to
  change. Build confirmed zero errors; committed as v156 and pushed to
  origin/main
- v157: Gap 4 (published confirmation + notification) resolved — see
  "Known Gaps" and "Duplicate publish implementations" above for the
  full writeup, including a numbering collision with the other Gap 4
  (admin reassignment) that was flagged rather than silently
  reconciled. Admin notification broadened to admin + super_admin
  (.in("role", ["admin","super_admin"]) instead of .eq("role","admin"))
  per follow-up request, applied to both handlePublish implementations.
  Build confirmed zero errors; committed as v157 and pushed to origin/main
- v158: Gap 5 (admin task reassignment from TaskBoardOverview) resolved
  — see "Known Gaps" and "Task Assignment Flow" above. AssigneeDropdown
  extracted from TaskPanel.js into its own component,
  src/components/AssigneeDropdown.js, imported by both TaskPanel.js and
  TaskBoardOverview.js; TaskBoardOverview.js gates it to
  admin/super_admin on an expanded, unlocked card. Build confirmed zero
  errors; committed as v158 and pushed to origin/main
- v159: Gap 6 (section-specific questions from Editorial Team) resolved
  — see "Known Gaps" above for the full writeup, including the
  deliberate decision to skip reintroducing the modal-from-card-click
  mechanic that v150 removed. Build confirmed zero errors; committed as
  v159 and pushed to origin/main

### 2026-07-29
- Diagnosed and fixed a 42501 RLS error on stakeholder request
  submission — see Gap 7 above and sql/09-fix-requests-insert-superadmin.sql.
  Root cause: requests_insert/update/delete never had a 'super_admin'
  branch added when that role was introduced; reproduced specifically via
  the "Viewing as: Stakeholder" impersonation switcher, since impersonation
  is client-side only and the real Postgres session stays super_admin.
- Built the mid-flight stakeholder content-change feature (propose →
  admin review/approve → per-task note) — see "Mid-flight stakeholder
  content changes" above for the full writeup. New files:
  ProposeChangePanel.js, PendingChangeCard.js, sql/10-content-change-requests.sql.
  Changed: EditSectionModal.js, TaskBoard.js, TaskPanel.js, constants.js.
- Neither sql/09 nor sql/10 could be confirmed applied from this session
  — no live Supabase access (MCP connector here is scoped to unrelated
  projects; this sandbox's network is allowlisted and blocked a direct
  PostgREST check). Both need to be run manually in the Supabase SQL
  Editor before the fix/feature work end-to-end.
- `npm run build` could not be completed in this sandbox (resource/time
  constrained — see "Mid-flight stakeholder content changes" above for
  what was substituted). Run a real build before deploying.
- User feedback after sql/10 was applied and testing began: reused the
  same requests_insert-style RLS gap fix pattern to diagnose a new
  42501 on content_change_requests (sql/11 — see "Suggest a Change
  reworked to a tabbed wizard" above), and reworked the compose UI itself
  from a PagePreview-✎-button-opens-a-modal pattern (ProposeChangePanel.js,
  now unused) to a tabbed wizard reusing NewRequest.js's actual section
  forms (ProposeChangeWizard.js), closing the gap where a stakeholder
  couldn't add a section they'd left blank originally.

### 2026-07-30
- Live Supabase MCP access confirmed working (user reconnected the
  connector). Introspected the real production schema directly (tables,
  columns, RLS policies, functions, indexes, triggers, storage buckets)
  and wrote sql/00-consolidated-bootstrap.sql — the first fully
  authoritative single-file schema, since most of requests' columns and
  users.auth_id/can_assign existed nowhere in any tracked SQL file
  (added directly in the SQL Editor over time). sql/09, 10, 11 confirmed
  applied live via this same introspection.
- Registration restricted to @cadence.com: client-side check in
  Register.js (ALLOWED_EMAIL_DOMAIN) plus the authoritative check,
  sql/12-enforce-cadence-email-domain.sql — a BEFORE INSERT trigger on
  auth.users, applied live. Only gates new signups; verified it has zero
  effect on existing sessions (all current test accounts are gmail/yahoo).
  An Okta SSO path was also built (LoginAnimated.js) then explicitly
  reverted per user decision to stick with domain-restricted
  email/password auth instead — worth knowing if Okta comes up again
  that LoginAnimated.js/AuthPageAnimated.js are dead code either way
  (see below), so that work never shipped regardless.
- Full codebase review (CODE_REVIEW.md, saved at repo root) surfaced:
  /api/ai and /api/audit had no auth check at all (anyone reaching the
  server could burn the Anthropic budget or forge audit_log entries);
  Next.js pinned to 14.2.3 with critical/high npm audit advisories;
  TaskPanel.js's upload paths skipped the validateFile() MIME/size check
  ImageField.js already used; 11 dead files (~2,500 lines) including a
  confusing set of top-level component duplicates fully superseded by
  src/components/sections/*.
- All of the above fixed:
  - /api/ai: verifies the caller's Supabase JWT server-side (401 if
    missing/invalid), rate-limited 20 req/min/user via the
    previously-unused rateLimit() in lib/security.js, prompt length
    capped. The 3 live callers (SectionAIAssist.js, AIAssistant.js,
    TaskPanel.js) now send an Authorization Bearer token via the new
    getAccessToken() helper in lib/security.js.
  - /api/audit: verifies the caller's JWT and resolves their REAL
    user_id/email/role/department from the users table server-side,
    ignoring whatever identity fields the client POST body sends —
    previously anyone could POST arbitrary user_id/email/role and have
    it written straight into audit_log via the service-role key.
    auditLogger.js updated to send the Authorization header;
    impersonating_role is still client-trusted (informational only).
  - next bumped to 14.2.35 in package.json (resolves the audit
    advisories, same 14.x line). Could not actually run npm install in
    this sandbox — the Windows-mounted drive silently blocks
    delete/rename operations (surfaced as npm ENOTEMPTY errors and a
    partially-broken node_modules) until
    mcp__cowork__allow_cowork_file_delete is called; even after that,
    large downloads (e.g. @next/swc's native binary) kept exceeding the
    sandbox's 45s per-call limit. node_modules is left in an
    inconsistent state — delete it and run npm install locally once to
    finish this.
  - TaskPanel.js's uploadFile/uploadMappedImage now call validateFile()
    with the same MIME allowlists their accept attributes already
    implied (jpeg/png for brand, +webp for design), matching
    ImageField.js's pattern. Removed the now-redundant
    MAX_BRAND_MB/MAX_DESIGN_MB constants.
  - Deleted: LoginPage.js, BannerPreview.js, OverviewPreview.js,
    ProposeChangePanel.js, AIAssist.js, and the 6 top-level section
    duplicates (CustomerStories/FeaturesApps/KeyBenefits/PromoSection/
    RelatedContent/TrainingSupport.js — real ones live in
    src/components/sections/). Zero remaining references confirmed via
    grep before and after deletion.
- Full functional workflow review (beyond the code-quality pass above)
  found and fixed 4 gaps, none previously documented:
  - AdminTaskSetup.js let an admin uncheck editorial_team/seo_team/
    design_team despite TASK_TEAMS flagging them alwaysRequired:true —
    only web_team was actually force-included (hardcoded separately in
    handleCreate). A request could complete and publish having skipped
    editorial or SEO review entirely, with no warning. Fixed: those 3
    teams' checkboxes are now disabled/locked-checked, matching how
    web_team already behaved in practice; only brand_team stays a real
    toggle.
  - tryUnlockWebTeam() (taskUtils.js) flips web_team's task from locked
    to pending but never notified anyone — web_team members had no way
    to know a task became actionable except by manually checking.
    NOTIFICATION_TYPES.WEB_TEAM_UNLOCKED existed but had zero call
    sites. Fixed: notifies all web_team users on unlock.
  - AdminTaskSetup.js let an admin silently override the stakeholder's
    requested priority with no notification back to them —
    NOTIFICATION_TYPES.PRIORITY_CHANGED existed but had zero call
    sites. Fixed: notifies req.created_by when priority actually
    changes, including the admin's reason if one was given.
  - taskUtils.js's TASK_TEAMS flagged editorial_team selfCompletes:false,
    but the real code (TaskPanel.js handleComplete) lets editorial_team
    self-complete with no approval gate — same as seo_team, correctly
    flagged true. Metadata corrected to match actual behavior (this
    field is otherwise unused anywhere, so it was a documentation
    mismatch, not a live bug).
- Both CODE_REVIEW.md and this session's workflow-gap fixes done without
  a working npm run build or esbuild bundle-check in this sandbox
  (esbuild's own binary got caught in the same node_modules breakage as
  next) — verified by careful manual re-read of every changed file
  instead. Run a real build before deploying.
- Self-serve stakeholder registration (sql/13, applied live). Register.js
  gained an "I'm signing up to..." choice (Request content / Join a
  content team) that passes role_request: "stakeholder" through signUp's
  options.data when chosen. handle_new_user() now grants role='stakeholder'
  immediately for that exact literal value — every other value (including
  a hand-crafted 'admin'/'super_admin' attempt) still falls through to
  'pending' as before; verified via a pure SQL logic test against several
  payloads before trusting it. Team roles and admin are unchanged — still
  always require manual assignment via AdminPanel. Rationale: stakeholder
  is the only role where every requests_insert/update/delete policy
  already requires created_by = self, so there was nothing for an admin
  to actually vet.
- Found while making that call: tasks_update RLS had `get_user_role() =
  'stakeholder'` completely unscoped — ANY stakeholder could UPDATE ANY
  task row in the system, not just tasks on requests they created. Existed
  before this session's change too (an admin-approved stakeholder had the
  same hole), but self-serve registration removes the human-review
  checkpoint that used to sit in front of it, so fixed in the same pass
  (sql/13, applied live): added an EXISTS check against
  requests.created_by, matching the pattern already used in
  comments_select/attachments_select/content_change_requests_select.
- sql/00-consolidated-bootstrap.sql updated to match both changes above.
- Email notification infrastructure built (not yet live — see below),
  addressing "What's Next" item #1 above:
  - src/lib/email.js — generic SMTP sender via nodemailer (added to
    package.json; not yet installed locally, same as the earlier next
    bump — run npm install). Deliberately provider-agnostic rather than
    Resend/SendGrid-specific: org uses Outlook/Microsoft 365, so this
    targets plain SMTP (works with smtp.office365.com + mailbox
    credentials, or an internal Exchange Online relay connector that
    allowlists the app's IP and needs no auth). Safely no-ops — returns
    {sent:false} rather than throwing — until SMTP_HOST/SMTP_FROM env
    vars are actually set; see CLAUDE.md for the full var list.
  - src/app/api/notifications/send-pending/route.js — cron-swept sender,
    not fired per-insert. Deliberate: notifications are inserted from
    ~15 different call sites across the app, so a per-insert trigger
    would mean touching all of them and keeping them in sync forever;
    a sweep of email_sent=false rows is one place to reason about, and
    covers any new notification call site automatically. Batches 50 at
    a time, leaves email_sent=false on send failure so it retries next
    sweep (e.g. a transient SMTP outage doesn't permanently drop one).
    Protected by a CRON_SECRET shared-secret Bearer header when set;
    currently unauthenticated if CRON_SECRET is unset (matches "build
    it ready" — harmless either way since nothing sends without SMTP
    configured too).
  - settings.email_notifications_enabled (sql/14, applied live, default
    false) — second gate on top of SMTP being configured; toggle lives
    in AdminPanel.js's existing Settings tab (new card below Session
    Settings), following the same upsert-by-id-global pattern the
    timeout setting already uses.
  - vercel.json added — 5-minute cron schedule hitting the sweep route.
    Note: Vercel's Hobby plan limits cron to once/day; Pro (or the
    self-hosted VM's own system cron/systemd timer, documented in
    CLAUDE.md) is needed for real 5-minute granularity.
  - Email template (notificationEmailHtml in lib/email.js) is generic —
    renders whatever title/message/action_url a notifications row
    already has, rather than per-type markup — since every insert site
    already sets human-readable title/message. Works for all ~14
    notification types today and any new one added later with zero
    template changes.
  - Deliberately NOT scoped to only "time-sensitive" notification types
    — sends for everything currently in the notifications table.
    Narrowing this later, if desired, is a one-line filter added to the
    send-pending query.
  - Found while adding the Settings-tab toggle, unrelated to email:
    AdminPanel.js's CharLimitsPanel reads/writes settings.key and
    settings.value (`select("key, value")`, `upsert({key, value})`) —
    but the real settings table has neither column, only
    id/timeout_mins/updated_at/updated_by(/email_notifications_enabled
    now). The Char Limits admin feature is silently broken — its fetch
    doesn't check the Supabase error, so it just renders as if there
    were no saved overrides, never a visible error. Not fixed — flagged
    here pending a decision on whether to add key/value columns
    (matches the code) or rework the feature onto dedicated columns.

## Char Limits admin feature — full fix (2026-07-30)
User chose "Full fix" over a minimal patch when asked: the storage-layer
bug above was only half the problem. Auditing every consumer
(NewRequest.js, EditSectionModal.js, ProposeChangeWizard.js) showed
NOTHING ever read a saved override back — all three imported the static
CHAR_LIMITS/ITEM_LIMITS objects from constants.js/EditSectionModal.js
directly and used them as-is. Even a working settings save would have
changed nothing the user could see. Fixed both layers:

- sql/15-char-limit-overrides.sql (applied live) — new
  public.char_limit_overrides table (key TEXT PK, value INTEGER CHECK >0,
  updated_at, updated_by), a proper key-value store rather than another
  column pair bolted onto the settings singleton row. RLS: any
  authenticated user can SELECT (every role that fills out content needs
  to apply the limits), only admin/super_admin can write — mirrors
  AdminPanel.js's own access gate. Verified live via pg_policies.
- src/lib/charLimits.js (new) — useCharLimits(supabase, defaults) hook:
  starts from the static defaults (zero loading flicker), fetches
  char_limit_overrides once on mount, and merges any rows found over the
  defaults by key. Silent no-op on fetch error/empty — same
  fail-open-to-defaults behavior the rest of the app uses for optional
  config.
- Three consumers wired via the same import-shadowing pattern (rename
  the static import to DEFAULT_X, then `const X = useCharLimits(supabase,
  DEFAULT_X)` as the first line inside the component) — every existing
  `CHAR_LIMITS.foo`/`ITEM_LIMITS[fk]` reference site needed zero further
  changes: NewRequest.js, ProposeChangeWizard.js (both CHAR_LIMITS →
  DEFAULT_CHAR_LIMITS), EditSectionModal.js (local ITEM_LIMITS →
  DEFAULT_ITEM_LIMITS).
- AdminPanel.js's CHAR_LIMIT_FIELDS array rebuilt from scratch against
  what's actually enforced in the codebase, not what seemed plausible:
  now lists exactly the 35 real keys in constants.js's CHAR_LIMITS
  (added 11 that were missing — cta1_link, cta2_link, overview_label,
  kb_label, fa_label, cs_label, promo_btn_link, rc_label, res_label,
  res_impact, rp_label, ts_label) plus a new "Card Items (shared across
  all card-based sections)" group for the 4 real generic keys
  EditSectionModal.js's ITEM_LIMITS actually uses (title:60,
  description:200, quote:300, customer:60). Removed ~13 fictional
  per-section-per-card-type keys (kb_card_title, cs_quote, rc_card_title,
  rp_card_cta_label, ts_card_title, etc.) that corresponded to no real
  enforcement point anywhere — editing them would have saved a value
  nothing ever read.
- CharLimitsPanel's fetch/save repointed from settings.key/value (never
  existed) to char_limit_overrides.key/value (real columns), with proper
  error handling added on both the read and the upsert (previously
  errors were silently swallowed on read).
- sql/00-consolidated-bootstrap.sql updated to include the new table +
  RLS and drop the stale settings-table comment referencing this bug.

Verification: no working bundler available in this session (esbuild's
own binary was caught in the same node_modules breakage noted under
"npm install" elsewhere in this doc) — all edits manually re-read for
correctness instead of build-verified. Run `npm run build` locally
before deploying, same caveat as everything else built this session.

## Fast lane for small stakeholder edits (2026-07-30)
Stakeholder feedback item from the earlier "consider yourself a
stakeholder" review: every "Suggest a Change" submission — a one-word
typo fix or a full section rewrite alike — goes through the same path
(propose → sits in content_change_requests as pending → admin reviews →
applies). For a trivial fix that's unnecessary friction and admin queue
noise. Discussed two design decisions with the user before building:
what counts as "small," and at which workflow stages the fast lane is
even allowed to fire. Landed on: an allowlist of plain-text fields
combined with a small-edit-distance threshold (not diff-size alone,
and not field-type alone — see rationale below), and pending_admin/
in_progress only (not once a parallel task reaches pending_approval or
web_team is active).

- src/lib/fastLane.js (new) — the eligibility rule, deliberately kept
  separate from ProposeChangeWizard.js so it can be unit-reasoned-about
  on its own:
  - FAST_LANE_STAGES = ['pending_admin', 'in_progress'] — excludes
    overall_status='pending_stakeholder' (a parallel team's work is
    already sitting in front of the stakeholder for their own approval
    — a simultaneous content change is exactly the kind of overlap
    that needs a human to reconcile) and 'pending_web'/published (web
    team already assembling or the page already shipped).
  - SAFE_FAST_LANE_FIELDS — built programmatically from
    EditSectionModal's own SECTION_CONFIG (never a hand-maintained
    list, so it can't drift), excluding any key ending in `_link`/
    `_url` (a wrong link silently breaks a CTA with no visual cue) and
    `seo_page_location` specifically (changes what URL the page lives
    at — a routing change, not a content tweak). Array fields
    (kb_cards, cs_items, rc_cards, rp_cards), image refs, and the
    features_apps custom renderer's fa_items/fa_columns/fa_rows are
    excluded automatically since they were never in cfg.fields to
    begin with — whole-card add/remove and image swaps always need a
    human look regardless of size.
  - MAX_FAST_LANE_EDIT_DISTANCE = 25 — a real Levenshtein edit distance
    per field (not a length-delta heuristic), so a same-length full
    sentence rewrite doesn't sneak through just because old.length ≈
    new.length. Small dependency-free implementation (fields here are
    short — titles/labels/short descriptions, never a whole page — so
    no need for a faster algorithm).
  - isFastLaneEligible(changedFields, overallStatus) — deliberately
    all-or-nothing across every changed field in one submission: if
    even one field isn't allowlisted or isn't small enough, the whole
    submission falls back to full admin review. Considered partial
    apply (fast-lane the safe fields, queue the rest for review) but
    rejected it — a stakeholder would have no reliable way to tell
    which of several edits went live immediately vs. which are still
    pending without re-reading the page, and it complicates
    content_change_requests' diff contract for no real benefit at this
    scale.
- ProposeChangeWizard.js — `fastLane` computed once per render from the
  existing `changedFields` diff + `req.overall_status`. handleSubmit
  branches: fast-lane writes the changed fields straight to `requests`
  (same shape as PendingChangeCard.js's own approve handler) and logs
  AUDIT_ACTIONS.CONTENT_CHANGE_FAST_LANED (new constant, added to
  constants.js — audit_log.action is plain TEXT with no CHECK
  constraint, confirmed via sql/00-consolidated-bootstrap.sql, so no
  migration needed) instead of inserting into content_change_requests.
  Deliberately does NOT also write tasks.content_update_note/at/read or
  notify task owners the way the admin-approve path does — a true typo
  fix doesn't warrant interrupting every team with a banner the way a
  real content change does; teams will simply see the corrected text
  next time they look. Action bar shows a live indicator ("✅ Small
  edit — applies immediately" vs. "👁️ Will need admin review") and the
  submit button's own label switches between "Apply Changes" and
  "Submit for Review" — decided before the click, not as a surprise
  after.
- No SQL migration required — reuses the existing `requests` table
  write path and audit_log's already-unconstrained `action` column.

Verification: no working bundler available in this session (same
node_modules/esbuild breakage as above) — manually re-read
fastLane.js and every edit to ProposeChangeWizard.js for correctness.
Run `npm run build` locally before deploying.

## AI Assist: server owns the prompt (2026-07-30)
User asked to discuss the AI content generation approach before doing
anything else with it. Two entry points existed — AIAssistant.js (product
brief → generate all/one section) and SectionAIAssist.js (per-section
"Improve"/"Start fresh") — both wired only into NewRequest.js, both
proxying through /api/ai/route.js to Claude Haiku with a hardcoded
Cadence brand-voice system prompt.

Real problem found while reviewing this: /api/ai/route.js took `prompt`
and `systemPrompt` straight from the client request body and passed both
to Claude unmodified. Any authenticated user (any role, including a
brand-new self-serve stakeholder) could send an arbitrary system prompt
and have the app's own Anthropic API key/budget run whatever instructions
they wanted — the route was an open LLM proxy gated only by login plus a
soft, per-instance-only rate limit (20/min). This wasn't a style
preference, it was a real hole, fixed regardless of anything else decided
in the discussion below.

Also discussed: what makes generated content actually relevant to a
specific product. Two separate concerns, addressed differently:
- Factual accuracy to the product — the brand-voice prompt encourages
  specific-sounding claims ("5X faster regression throughput") for style,
  which risks the model inventing a plausible number when a stakeholder's
  brief is vague. Fixed via input structure + explicit anti-fabrication
  instructions (see below), not via more data.
- Market/competitive/SEO relevance — flagged as a fundamentally different
  ask: the Claude API call this app makes has no tool use or web access
  enabled, so the model cannot know what's currently ranking or what
  competitors are saying — asking it to be "market-aware" without feeding
  it real data would just produce confident fabrication. Real market
  grounding needs either a human-fed input (SEO Team pastes keyword/
  competitor notes into a field used only for the SEO Meta section) or an
  actual data integration (SEO/analytics API, or enabling web search on
  the Claude call) — both real scope additions. User chose to defer this
  entirely for now; revisit once core workflow is fully hardened and
  it's clear which SEO/analytics tool the org actually uses.

Fix scope decided: close the open-proxy hole, and tighten grounding
(stricter brief structure + anti-hallucination instructions) — no new
integrations.

- src/lib/aiPrompts.js (new, server-only — must only ever be imported by
  src/app/api/ai/route.js, never by a "use client" component) — the
  single source of truth for the Cadence SYSTEM_PROMPT and every
  per-section output schema (SECTION_SCHEMAS), consolidated from what
  used to be two near-identical copies (one in each client component).
  buildPrompt({ sectionKey, mode, currentContent, direction, brief })
  builds the actual user-turn prompt for all three modes
  ("improve"/"direction"/"brief") from a fixed template — the client
  never sends prompt text, only these plain-data fields.
  SYSTEM_PROMPT gained a new "FACTUAL ACCURACY — CRITICAL" section:
  never invent a specific number/statistic/certification unless it was
  explicitly given (in the brief's proof points, the stakeholder's own
  draft, or a direction instruction); describe capability qualitatively
  instead of inventing a number; this rule explicitly overrides the
  earlier "precision-first" tone guidance when the two conflict.
  "improve"/"direction" prompt templates each also got an explicit
  "do not introduce new numbers not already present in the
  draft/direction" line.
- src/app/api/ai/route.js — rewritten to accept only
  { sectionKey, mode, currentContent, direction, brief }. Validates
  sectionKey against SUPPORTED_SECTIONS and mode against
  ["improve","direction","brief"] (400 if not), rejects any individual
  string field over 4000 chars (MAX_FIELD_CHARS — bounds cost even
  though the prompt itself is now fixed server-side), then calls
  buildPrompt() and sends SYSTEM_PROMPT + the built prompt to Claude.
  Auth verification and the 20/min rate limit from the earlier security
  pass are unchanged.
- src/components/SectionAIAssist.js — SYSTEM_PROMPT const and the
  buildPrompt() function removed entirely; generate() now POSTs
  { sectionKey, mode: selectedMode, currentContent, direction }.
  SECTION_LABELS (icon/label, used only to decide whether to render the
  button and what to show in the popup header) is unchanged — it's pure
  display metadata, never influenced the prompt.
- src/components/AIAssistant.js — SYSTEM_PROMPT const, formatBrief(),
  and each section's .prompt(brief) builder removed; SECTION_CONFIGS is
  now display-only (label/icon/desc for the section picker cards).
  generate() now POSTs { sectionKey, mode: "brief", brief }. Added a new
  "Verified Proof Points" field to the product brief form (between USP
  and Page Goal) — deliberately separate from USP (which can stay a
  general marketing claim): proofPoints is for real numbers/
  certifications the stakeholder is vouching for. formatBrief() on the
  server tells the model explicitly "no verified numeric proof points
  were provided — do not invent any" when the field is left blank,
  rather than silently staying quiet about the gap.
- Not changed, noted as pre-existing and out of scope: AI Assist still
  doesn't cover the `resources` or `related_products` sections (same gap
  before and after this consolidation — SECTION_SCHEMAS intentionally
  matches the same 9 sections both old configs already covered, not a
  new gap introduced here). Also not changed: AI Assist is still only
  wired into NewRequest.js, not EditSectionModal.js or
  ProposeChangeWizard.js — flagged in discussion as a possible future
  extension, not requested yet. Also not changed: AIAssistant.js's
  "Generate All Sections" still only console.errors per-section
  failures with no visible UI feedback — flagged as a real gap during
  discussion but out of today's agreed scope (security fix + grounding
  only).

Verification: no working bundler available in this session (same
node_modules/esbuild breakage noted throughout this doc) — manually
re-read aiPrompts.js, route.js, SectionAIAssist.js, and AIAssistant.js
in full after editing. Confirmed no remaining references to the removed
SYSTEM_PROMPT/buildPrompt/config.prompt symbols anywhere in src/components
via repo-wide grep. Run `npm run build` locally before deploying, same
caveat as everything else built this session.

## Bug found in testing: save-draft 42501 RLS error — root cause + fix (2026-08-05)
Reported: "Save failed: {"code":"42501",...,"message":"new row violates row-level
security policy for table \"requests\""}" when a stakeholder saves a draft.

Root cause, found by tracing the RLS chain (not guessed): getUserProfile()
(src/lib/supabase.js) has two lookup paths — by auth_id (primary), and by
email as a fallback for a public.users row whose auth_id doesn't yet match
the current Supabase Auth session (e.g. an admin-created row, a reset auth
account, or any pre-existing user whose auth.users id changed since their
public.users row was created). On the email-fallback path, the old code
tried to silently self-heal by running
`supabase.from('users').update({ auth_id: user.id }).eq('id', byEmail.id)`
directly from the client, fire-and-forget (`.then(() => {})`, no error
handling at all).

That update can never succeed. users_update's own RLS policy is
`FOR UPDATE USING (auth_id = auth.uid() OR get_user_role() = 'admin')` —
which requires auth_id to ALREADY equal auth.uid() before you're allowed
to update the row. That's backwards for exactly this case: the row's
auth_id is NULL/stale (not yet auth.uid()) precisely because it hasn't
been linked yet — a chicken-and-egg RLS problem. Postgres RLS doesn't
raise an error when a row is filtered out of an UPDATE this way, it just
silently affects 0 rows — and the client swallowed even that non-error.
Meanwhile getUserProfile() returned `{ ...byEmail, auth_id: user.id }` —
a client-side object claiming the link succeeded, when the database never
saw it. Every subsequent RLS-gated write for that user (requests insert/
update, tasks, everything using get_user_id()/get_user_role(), which all
resolve via `WHERE auth_id = auth.uid()`) then fails with 42501,
permanently, with no self-healing path — exactly the reported symptom.

Fix: sql/16-fix-auth-id-linking.sql (NOT YET APPLIED — see below) adds
public.link_auth_id_by_email(), a narrow SECURITY DEFINER RPC that
bypasses RLS only for this one safe operation: it reads the caller's real
email server-side from auth.users (never trusted from the client) and
only links a public.users row whose auth_id IS NULL matching that email —
cannot hijack an already-linked row or a different email. Returns the
linked row, or the already-linked row if a concurrent call (e.g. two tabs)
already did it. getUserProfile() rewritten to call this RPC (awaited,
with real error handling) instead of the silent direct update, and to
return the row it actually got back rather than a client-constructed
guess. Also added to sql/00-consolidated-bootstrap.sql.

NOT YET APPLIED TO THE LIVE DB — this session's Supabase MCP connection
is authenticated to a different Supabase account (list_projects/get_project
only show "Hod-menu"/"hod-billing" under a different org; izhfetvnortpjimfwnad
returns a permission error) — no live DB access this session. Run
sql/16-fix-auth-id-linking.sql in the Supabase SQL Editor manually, or
reconnect the correct Supabase account to pick this up automatically next
session.

## Bug found in testing: image upload — under investigation (2026-08-05)
Reported: "unable to upload images," no further detail yet (exact error
message and which upload path — ImageField.js in NewRequest.js vs
TaskPanel.js's uploadFile/uploadMappedImage — not confirmed). Reviewed
both code paths: ImageField.js sends the real session access_token (not
the anon key) to Storage's REST endpoint directly via XHR, matching the
2026-07-18 fix; storage_insert RLS only requires
`bucket_id = 'attachments' AND auth.uid() IS NOT NULL`, independent of
public.users/auth_id entirely (unlike the requests bug above) — no
structural bug found by inspection alone. Waiting on the exact error
message/console output and which screen it happens on before diagnosing
further.

## Bugs found in testing — actual root cause, confirmed live (2026-08-05)
Reconnected the correct Supabase project mid-session and got live access
(execute_sql/get_logs against izhfetvnortpjimfwnad). This corrected the
diagnosis:

**42501 on Save Draft — real cause was NOT auth_id linking.** Live query
confirmed all 10 real users have correctly linked auth_id (link_auth_id_by_email
fix above is still real and still applied — it protects the next
admin-created account — but it wasn't what was firing here). Postgres logs
showed repeated `ERROR: new row violates row-level security policy for
table "requests"` correlated exactly with `POST 401` on `/rest/v1/requests`
in the API logs, every time "Save Draft" was clicked. Root cause: NewRequest.js
has three separate save paths — saveDraft(), saveAndExit(), and submit().
saveAndExit() and submit() already correctly call getAuthHeaders(supabase)
(the real session JWT — comment there literally says "Option A security
fix"), but saveDraft() — the primary "Save Draft" button, the one actually
used in this testing — still built its own headers by hand with
`Authorization: Bearer ${supabaseKey}` (the anon key, not a session token).
Sent as the anon key, `auth.uid()` resolves to NULL for every request, so
get_user_role()/get_user_id() return NULL and requests_insert/update's
checks fail — 42501, on every single save, for every user, regardless of
role or auth_id linkage. Fixed: saveDraft() now calls getAuthHeaders(supabase)
like the other two functions. Repo-wide grep confirmed this was the only
remaining place sending the anon key as a bearer token.

**"Unable to upload images" — most likely the same bug, not a separate one.**
Storage logs show exactly one upload attempt in the window, and it
succeeded (`POST 200 /storage/v1/object/attachments/requests/...png`) —
Storage's own RLS only requires `auth.uid() IS NOT NULL`, unrelated to the
requests-table bug above, and ImageField.js already sends the real session
token (fixed 2026-07-18). The image upload landed fine; ten seconds later
the same session hit the saveDraft 401 covered above. Read together, this
looks like: stakeholder uploads a banner image (succeeds), clicks Save
Draft, save fails — experienced as "the image upload didn't work" even
though the file itself made it to storage (as an orphaned object, never
referenced by a saved request row, since the row was never created).
Asked the user to retest now that saveDraft() is fixed rather than
declaring this fully closed on inference alone.

Files touched: src/components/NewRequest.js (saveDraft rewritten to use
getAuthHeaders), src/lib/supabase.js + sql/16-fix-auth-id-linking.sql
(applied live) from the auth_id-linking fix above — real bug, kept, just
not the cause of this specific report.

## Bug found in testing: draft loading spins forever — root cause + fix (2026-08-05)

**Symptom:** "Draft is getting saved properly. When I try to open the draft its loading for a long time." (Reported after the save-draft 42501 bug above was already fixed and confirmed working.)

**Root cause:** `NewRequest.js`'s "Load draft data if editing" `useEffect` called an async `loadDraft()` function fire-and-forget — no `await`, no `.catch()`, and no internal `try/catch`. As long as the Supabase query resolved normally (even with an `{error}` field), the existing `if (error || !data) { go("dashboard"); return; }` check handled it fine. But if the underlying promise instead *rejected* — a network blip, or the 10-second `AbortController` timeout already built into `src/lib/supabase.js`'s custom fetch wrapper firing — there was nothing to catch it. The rejection became an unhandled promise rejection, `setLoadingDraft(false)` was never reached, and the component's `if (loadingDraft) return <PCBLoader label="LOADING DRAFT..." />` guard spun indefinitely with no way to recover short of a page refresh.

This is the same *class* of bug as the save-draft issue (missing error handling), but on the read path instead of the write path, and triggered by a rejected promise rather than a caught `{error}` response.

**Fix:** wrapped `loadDraft()`'s body in `try/catch/finally`, added a `cancelled` flag (guards against state updates after unmount / a newer `draftId` superseding an in-flight load), and added a 10-second `safetyTimeout` mirroring the pattern `saveDraft()` already used — so `loadingDraft` is guaranteed to eventually become `false` no matter what happens to the underlying promise. On timeout or catch, `error` is set and rendered through the existing `alert-error` banner (already used by every other error path in this file), so the failure is visible instead of silent. Also re-indented the try-block body for readability (cosmetic only).

File: `src/components/NewRequest.js` (lines ~125-172).

## Fill Test Data button (2026-08-05)

Added a "🎲 Fill Test Data" button in `NewRequest.js` step 2 (next to Save as
Draft), for QA/testing convenience — populates every section that applies to
the selected page type with placeholder Lorem Ipsum content in one click, so
you don't have to hand-fill the whole form on every test pass.

- `src/lib/testData.js` — pure client-side Lorem Ipsum generator
  (`generateTestData(pageType, sectionKeys, limits)`). No network calls,
  writes nothing to the DB — it only sets React state, same as typing into
  the fields by hand. Respects `getSectionsForPageType()` so it only fills
  sections that actually apply to the chosen page type, and truncates every
  field to the live `CHAR_LIMITS` (including admin overrides via
  `useCharLimits`) so nothing trips a char-limit warning.
- `NewRequest.js`'s `fillTestData()` calls the generator and applies the
  result to each section's state slice, and clears any N/A marks on the
  sections it just filled so the generated content is actually visible in
  the preview instead of being hidden behind a "marked N/A" placeholder.
- Image fields are left empty (`image_ref: null`) — there's no fake file to
  upload, so cards/banners will show their empty-image placeholder, which is
  expected and fine for testing text/layout.

## Accessibility: alt text for Overview and Features/Applications images (2026-08-08)

Scoped per explicit direction: only Overview's media and Features/Applications tab images get an alt text field. Background images (banner, promo) and icon descriptions (Key Benefits card icons, Training & Support icons) are already treated as presentational — `banner-bg-img` already renders with `alt=""` in `PagePreview.js` — and are intentionally excluded.

- `overview_media_alt` — new `requests` table column (`sql/17-overview-media-alt.sql`, applied live + added to `sql/00-consolidated-bootstrap.sql`). Only shown/relevant when `overview_media_type` is `image` or `diagram`, hidden for `video` (video needs captions/transcript, not alt text — different accessibility mechanism). Wired through `NewRequest.js` (state, load-draft, buildPayload) and rendered as the real `alt` attribute on the Overview `<img>` in `PagePreview.js` (previously hardcoded to the generic string `"Overview media"`). Added to `CHAR_LIMITS` (150) and the admin Char Limits panel (`AdminPanel.js`'s `CHAR_LIMIT_FIELDS`) so it's tunable like every other field.
- Features/Applications tab images — no schema migration needed, since tabs already live in the `fa_items` JSONB array. Added `image_alt` as a new key on each tab object (`FeaturesApps.js`'s `TabsView`, both horizontal and vertical orientation), shown right under the tab's `ImageField`. `FeaturesAppsPreview.js`'s tab `<img>` now uses `image_alt` with the tab title as a fallback for tabs created before this change. Char limit (150) is hardcoded locally, matching how this component's other per-tab limits (title 50, description 200) already work — `FeaturesApps.js` doesn't receive `CHAR_LIMITS`/`useCharLimits` at all today, a pre-existing gap not addressed here.
- Both fields are marked visually required (asterisk + hint) but **not** hard-enforced in `isValid()` — kept as "add the field" scope, not the broader pre-flight-check hard-block work discussed separately. Existing drafts/published requests with no alt text simply show an empty field; nothing breaks.

## Overview media: restored the "Describe" input mode (2026-08-08)

Overview's Media/Image field was passing `hideDescription` to `ImageField`, hiding the 📝 "Describe" toggle — the only section doing this; Banner and every other section's `ImageField` shows all three modes (Upload / Paste URL / Describe). Removed `hideDescription` from both usages (`NewRequest.js` and `ProposeChangeWizard.js`) so stakeholders can describe the image they want for Design QA to source, same as everywhere else.

## Pre-flight check panel (2026-08-08)

v1 of the pre-flight check discussed this session: two hard-blocking checks, both objectively unambiguous (never a judgment call), running once at Submit — never at Save Draft, which is allowed to be incomplete.

- `src/lib/preflightCheck.js` — centralized, pure `runPreflightChecks(payload)`, takes the same shape `buildPayload()` produces and returns a flat list of `{type, section, message}` issues. Two checks:
  1. **Placeholder text** — recursively walks every string value in the payload (including inside kb_cards/fa_items/cs_items/rc_cards/rp_cards arrays) for a small set of distinctive Lorem Ipsum tokens (lorem, ipsum, consectetur, adipiscing, elit). Chosen over anything statistical because these words essentially never appear in real copy by coincidence — near-zero false-positive risk, no maintenance needed as fields are added since it's a generic walk, not a hand-maintained field list.
  2. **CTA label/link mismatch** — flags a pair only when exactly one side is filled (both empty means the stakeholder doesn't want that CTA — not an issue). Covers all five label/link pairs in the app: Banner CTA 1/2, Promo button, Training & Support's 3 fixed cards, Features/Applications tabs (only when view type is tabs), and Related Products cards.
  - Deliberately NOT in v1: terminology/glossary checks (needs an admin-maintained word list first), duplicate-SEO detection, broken-link checking (downgraded from an earlier blocking proposal to advisory-only, if built at all — network calls are too flaky to hard-block on), and anything AI-based (tone, factual-claim flagging) — all deferred pending a decision on `/api/ai` cost/latency budget per submission.
- `NewRequest.js`: new "Pre-flight Check" card in step 3 (Preview & Submit), same visual pattern as the existing "Section Summary" card. Clean state shows a green checkmark; each issue shows its message plus a "Fix →" button that jumps back to step 2 and opens the relevant section tab. `submit()` runs the same check right before doing anything else (alongside the existing High/Urgent priority-reason check) and blocks with a count in the error banner if any issues are found.
- Fill Test Data (`🎲` button) is now gated behind `process.env.NODE_ENV !== "production"` — Next.js/webpack dead-code-eliminates it from a production build automatically, so it can't ship to prod by a forgotten manual-removal step. This also means the placeholder-text check in this panel isn't just guarding against that one button — it catches anyone who pastes Lorem Ipsum from any source while drafting.

## Okta SSO: dual login (2026-08-08)

Management asked for Okta login. Decisions made this session, in order:

1. **Login methods**: Okta and email/password run side by side, not either/or — Okta is additive. An admin can turn password login off once Okta is verified working, via a new "Login Settings" toggle in AdminPanel → Settings (`settings.password_login_enabled`, default `true`).
2. **Self-serve registration**: stays permanently, not just during dev — `Register.js` already restricts to `@cadence.com` (client-side + DB-enforced, `sql/12-enforce-cadence-email-domain.sql`) and already requires admin approval for team roles (stakeholder auto-grants, matching existing behavior). No code change needed here; this was already the shape of it.
3. **Hosting**: full self-host on an org RHEL 9 VM (Docker Compose: Postgres, GoTrue, PostgREST, Storage API, Kong, Nginx, the Next.js app — no Realtime, unused by this app). Currently on Supabase Cloud's Free plan, which doesn't support SSO at all — self-hosted GoTrue supports SAML natively, free, no Supabase Cloud add-on cost. This also fixes the sequencing question: Okta *cannot* happen before the VM migration completes, since Free plan has no SSO to bridge through.
4. **VPN constraint**: the VM is reachable only over the org VPN. This turned out not to be a real blocker for SAML — the browser carries the assertion between Okta (public internet) and the VM's ACS callback, so Okta's cloud never needs direct network access to the VM. The one real constraint: login must always be **SP-initiated** (start at the app, not at an Okta dashboard tile), since IdP-initiated login would try to redirect to the ACS URL before the user has necessarily connected to VPN.
5. **Interim IP-based setup**: while waiting on IT for a real internal DNS name, the VM's IP address is fine to build the Docker stack and app against (nothing there depends on hostname). Deliberately *not* wiring the actual Okta SAML app registration against the IP, though — that ties the ACS URL/SP Entity ID into both Okta's config and GoTrue's config, and would mean redoing both sides once the real DNS name lands. Okta wiring waits for the real hostname.

Implementation (env-var + DB-flag driven, no rework needed when the above lands):

- `src/lib/authConfig.js` — `OKTA_ENABLED` (`NEXT_PUBLIC_OKTA_ENABLED`, default off) controls whether the "Sign in with Okta" button renders at all; `OKTA_SSO_DOMAIN` (`NEXT_PUBLIC_OKTA_SSO_DOMAIN`, default `cadence.com`) is passed to `supabase.auth.signInWithSSO({ domain })`.
- `src/components/auth/Login.js` — reworked to show both methods together instead of the earlier either/or branch. Okta button renders when `OKTA_ENABLED`; on click, redirects to `data.url` from `signInWithSSO`. Password form renders when `!OKTA_ENABLED || passwordLoginEnabled` — the `!OKTA_ENABLED` half is a hard guardrail: if Okta isn't configured at all, the DB flag is ignored entirely and password login always shows, so a stale/mistaken admin toggle can never fully lock everyone out. `passwordLoginEnabled` is read via a new RPC (below) since this screen runs before any session exists.
- `sql/19-password-login-toggle.sql` (+ `sql/00-consolidated-bootstrap.sql`) — adds `settings.password_login_enabled BOOLEAN DEFAULT true`, plus `public.get_password_login_enabled()`: a narrow `SECURITY DEFINER` function granted to `anon` and `authenticated` that returns just that one boolean (fails open to `true` if the settings row doesn't exist), so the unauthenticated Login screen doesn't need broad anon read access to the rest of `settings`.
- `src/components/AdminPanel.js` — new "Login Settings" card next to the existing "Email Notifications" one, same pattern (checkbox + Save button, upserts into `settings`). Disabled/greyed out with an explanation until `OKTA_ENABLED` is true — same guardrail as Login.js, enforced in the UI so an admin can't even attempt to create the lockout.
- `sql/18-fix-handle-new-user-email-link.sql` (+ `sql/00-consolidated-bootstrap.sql`) — separate but related fix: `handle_new_user()` previously did a blind `INSERT ... ON CONFLICT (auth_id) DO NOTHING` on every new `auth.users` row. If an admin ever pre-provisions a `public.users` row ahead of someone's first login (`auth_id IS NULL`, role already assigned — the shape a future "Invite User" admin flow would need), that person's first login would create a *second*, orphaned `pending` row instead of linking to the admin's row, because the trigger's own insert wins the `getUserProfile()` auth_id lookup before the existing email-fallback/`link_auth_id_by_email()` RPC ever gets a chance to run. Fixed by having the trigger check for and link an `auth_id IS NULL` row matching the new user's email first, only falling through to insert for a genuinely new person.

Not yet built: the actual Okta↔GoTrue SAML configuration (blocked on the VM/DNS name), and an admin "Invite User" flow to pre-provision `public.users` rows ahead of first login (the `handle_new_user()` fix above is prep for this, but the UI itself hasn't been scoped or built).

Both new migrations (`18-fix-handle-new-user-email-link.sql`, `19-password-login-toggle.sql`) are written and committed but **not yet applied to the live database** — pending go-ahead.
