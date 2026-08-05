-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Fix requests INSERT/UPDATE/DELETE for super_admin
-- Run in Supabase SQL Editor (safe to re-run — DROP POLICY IF EXISTS first)
--
-- Root cause (2026-07-29): stakeholder request submission failed with
--   42501 "new row violates row-level security policy for table requests"
--   when tested via the "⚡ Viewing as: Stakeholder" impersonation switcher
--   (super_admin only, page.js). Impersonation only swaps the `role` field
--   on a client-side `effectiveUser` object (see page.js's `effectiveUser`
--   useMemo) — it never changes the underlying Supabase Auth session. So
--   the actual Postgres role behind the request is still super_admin, and
--   get_user_role() (which reads auth.uid() -> public.users.role) returns
--   'super_admin', not 'stakeholder'.
--
--   requests_insert (defined in rls-migration.sql, never touched by any
--   later migration file — confirmed via grep across the repo's *.sql
--   files) only ever allowed:
--     get_user_role() IN ('stakeholder', 'admin')
--   'super_admin' was never added when that role was introduced for v2,
--   so any super_admin — impersonating or not — has been unable to
--   INSERT into requests at all. NewRequest.js's submit() does a raw
--   POST to PostgREST when no draft row exists yet (see submit()), which
--   is the exact path that hits this policy.
--
--   requests_update and requests_delete (also only ever defined in
--   rls-migration.sql / tasks-migration.sql) have the same gap: no
--   'super_admin' branch. requests_update additionally still referenced
--   pre-v2 role names (editorial_qa/design_qa) and per-status checks from
--   the old linear v1 flow, which don't match v2's parallel task model at
--   all (v2 gates on overall_status, not a single `status` stage). Fixed
--   to match the role set and pattern already established in
--   sql/08-task-assignment-visibility.sql's requests_select.
--
-- This file only replaces requests_insert / requests_update /
-- requests_delete. requests_select is untouched (already fixed by
-- sql/08, see that file's PART 2) — though note CONTEXT.md records that
-- sql/08's stricter requests_select/tasks_select were later rolled back
-- to permissive policies outside any Claude session (intentional, per
-- "RLS member visibility — KNOWN LIMITATION"). That rollback was
-- SELECT-only; it does not affect this file.
-- ══════════════════════════════════════════════════════════════════════

-- ── INSERT: stakeholders create their own requests; admin/super_admin
--    can also create requests directly (e.g. testing, admin-authored
--    requests) ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "requests_insert" ON public.requests;
CREATE POLICY "requests_insert" ON public.requests
  FOR INSERT WITH CHECK (
    get_user_role() IN ('stakeholder', 'admin', 'super_admin')
    AND created_by = get_user_id()
  );

-- ── UPDATE: stakeholders edit their own requests; admin/super_admin edit
--    all; any v2 team role can update a request once it has entered the
--    parallel task workflow (overall_status set) ────────────────────────
DROP POLICY IF EXISTS "requests_update" ON public.requests;
CREATE POLICY "requests_update" ON public.requests
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'super_admin')
    OR (get_user_role() = 'stakeholder' AND created_by = get_user_id())
    OR (
      get_user_role() IN ('editorial_team', 'brand_team', 'seo_team', 'design_team', 'web_team')
      AND overall_status IS NOT NULL
    )
  );

-- ── DELETE: admin/super_admin delete any; stakeholders delete only their
--    own drafts ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "requests_delete" ON public.requests;
CREATE POLICY "requests_delete" ON public.requests
  FOR DELETE USING (
    get_user_role() IN ('admin', 'super_admin')
    OR (get_user_role() = 'stakeholder' AND created_by = get_user_id() AND status = 'draft')
  );
