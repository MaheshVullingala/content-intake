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
