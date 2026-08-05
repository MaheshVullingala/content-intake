-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Fix content_change_requests INSERT for super_admin
-- Run in Supabase SQL Editor (safe to re-run — DROP POLICY IF EXISTS first)
--
-- Root cause (2026-07-29): same bug class as Gap 7 (requests_insert) and
-- sql/10's tasks_update fix — reported error was 42501 "new row violates
-- row-level security policy for table \"content_change_requests\"" when
-- submitting via "Suggest a Change" while impersonating stakeholder.
--
-- sql/10's original content_change_requests_insert had TWO problems, not
-- just one:
--   1. `get_user_role() = 'stakeholder'` — no super_admin branch, same
--      gap as every other policy fixed today.
--   2. Even fixing (1) alone isn't enough: the EXISTS clause required
--      `r.created_by = get_user_id()` — i.e. the submitting user must be
--      the request's own creator. A super_admin impersonating a
--      different stakeholder is never that request's creator (the real
--      auth session is still the super_admin's), so this would keep
--      failing even with 'super_admin' added to the role check.
--
-- Fix: admin/super_admin can submit a change request for ANY request
-- (matching how they already have unconditional access on
-- requests_select/update/tasks_update elsewhere), bypassing the
-- own-request check entirely. Stakeholders keep the original restriction
-- — own requests only.
-- ══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "content_change_requests_insert" ON public.content_change_requests;
CREATE POLICY "content_change_requests_insert" ON public.content_change_requests
  FOR INSERT WITH CHECK (
    submitted_by = get_user_id()
    AND (
      get_user_role() IN ('admin', 'super_admin')
      OR (
        get_user_role() = 'stakeholder'
        AND EXISTS (
          SELECT 1 FROM public.requests r
          WHERE r.id = request_id
          AND r.created_by = get_user_id()
        )
      )
    )
  );
