# Content Intake Portal — Project Context
Last updated: 2026-07-10

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
- Storage bucket: "attachments" (same as v1 ImageField)
- Task files stored at: tasks/{req.id}/{role}/{section}/{timestamp}.{ext}
- Filtered on fetch by storage_path LIKE prefix (no uploaded_by_role column)
- Attachments table: id, request_id, user_id, user_name (NOT NULL),
  file_name (NOT NULL), file_type (NOT NULL), file_size (NOT NULL),
  storage_path (NOT NULL), public_url, created_at

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
  PRIORITY_META, NOTIFICATION_TYPES, AUDIT_ACTIONS (all additive)
- src/lib/taskUtils.js — TASK_TEAMS (rich array), supabase-as-param,
  createTasksForRequest, tryUnlockWebTeam, syncOverallStatus,
  getTasksForRequest, updateTask (all return { data, error })
- src/components/Dashboard.js — new roles, Pending Admin Review tab,
  priority badges, due date indicators, task progress dots
- src/components/AdminTaskSetup.js — admin sets teams/priority/due_date,
  creates tasks, flips overall_status to in_progress
- src/components/TaskBoard.js — role-based routing to AdminTaskSetup /
  TaskPanel / TaskBoardOverview
- src/components/TaskBoardOverview.js — stakeholder + admin view of all
  tasks; progress bar; needs_info Q&A; pending_approval with file preview
  + approve/reject; brand approval notifies design_team
- src/components/TaskPanel.js — team member workspace; Start Task;
  Ask Stakeholder (non-blocking needs_info); role-specific actions:
  editorial_team (complete), seo_team (complete), brand_team (file
  upload + submit for approval), design_team (brand wait toggle + upload
  + submit), web_team (completeness indicator + request changes modal
  + publish); AssigneeDropdown; CompletenessIndicator
- src/components/ReqDetail.js — overall_status gate routes to TaskBoard;
  null overall_status shows legacy message

## RLS Known Issue
TaskPanel Web Team "Request Changes" sets another team's task to
pending_action, but current RLS only allows web_team to update rows
where team_role = 'web_team'. Will silently fail unless:
  a) RLS policy is expanded to allow web_team cross-task updates, OR
  b) Moved to a server-side API route (/api/tasks/request-changes)
TODO comment is in TaskPanel.js handleRequestChanges.

## task_attachments Table
TaskBoardOverview queries a "task_attachments" table that does NOT exist
yet in the DB. The query returns empty gracefully, so "No files uploaded
yet" placeholder shows. This table must be created when task-level file
tracking is needed (separate from the request-level "attachments" table).

## What's Next (build in order)
1. NotificationBell.js — navbar component, queries notifications table,
   shows unread count badge, dropdown list, mark-as-read on click
2. AdminPanel updates — add Audit Log tab (reads audit_log table, shows
   timestamp, user, action, entity, old→new value in a table)
3. NewRequest.js — add "needs brand team?" checkbox at step 1 (sets
   req.needs_brand = true on submit, pre-selects brand_team in AdminTaskSetup)
4. WebTeamView.js — already exists but may need update for v2 (content
   completeness is now in TaskPanel CompletenessIndicator; check for
   duplication)

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
