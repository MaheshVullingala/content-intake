# Content Intake Portal — Project Context
Last updated: 2026-07-17

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
  last required task finishes instead of never (see below)
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

## RLS Known Issue
TaskPanel Web Team "Request Changes" sets another team's task to
pending_action, but current RLS only allows web_team to update rows
where team_role = 'web_team'. Will silently fail unless:
  a) RLS policy is expanded to allow web_team cross-task updates, OR
  b) Moved to a server-side API route (/api/tasks/request-changes)
TODO comment is in TaskPanel.js handleRequestChanges.

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
4. RLS known issue (below) — web_team "Request Changes" cross-task update
   still unresolved.
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
