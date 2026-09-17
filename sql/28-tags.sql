-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — Tags (Banner section, below Page Location)
-- Run in Supabase SQL Editor (safe to re-run — every statement below is
-- IF NOT EXISTS / OR REPLACE / idempotent)
--
-- Stakeholders pick from a shared, searchable tag list (imported from an
-- Excel export: name/category/URL) or request a brand-new tag by name.
-- New requests land as status='pending' and need admin approval
-- (AdminPanel → Tags) before they appear in anyone else's search — see
-- the RLS policies below for how that's enforced, not just a UI
-- convention. Once approved, a tag can be found by any stakeholder.
--
-- Per-request selections are stored denormalized on requests.banner_tags
-- (JSONB array of {id, name, category, url, status} snapshots), matching
-- every other repeatable-item field in this app (kb_cards, cs_items,
-- oth_items, etc.) — no live join needed to render a request's tags.
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  category      text,
  url           text,
  -- 'approved' = visible in every search dropdown. 'pending' = a
  -- stakeholder-requested tag awaiting admin review. 'rejected' = admin
  -- declined it; kept (not deleted) for an audit trail, and its name
  -- frees up for a future request via the partial unique index below.
  status        text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  requested_by  uuid REFERENCES public.users(id),
  approved_by   uuid REFERENCES public.users(id),
  approved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive dedupe across approved+pending (but not rejected) —
-- this is also the enforcement point for "don't let a stakeholder
-- request a tag that already exists or is already pending," since a
-- regular stakeholder has no SELECT visibility into other people's
-- pending rows (RLS below) to check for themselves client-side.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_unique
  ON public.tags (lower(name))
  WHERE status <> 'rejected';

CREATE INDEX IF NOT EXISTS idx_tags_search ON public.tags (lower(name)) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_tags_status ON public.tags (status);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tags_select ON public.tags;
CREATE POLICY tags_select ON public.tags
  FOR SELECT
  USING (status = 'approved' OR public.get_user_role() IN ('admin', 'super_admin'));

-- Any signed-in user can request a new tag — always forced into
-- status='pending' and stamped with their own id, regardless of what the
-- client sends, so nobody can insert a tag as pre-approved by crafting
-- the request body themselves.
DROP POLICY IF EXISTS tags_insert_request ON public.tags;
CREATE POLICY tags_insert_request ON public.tags
  FOR INSERT
  WITH CHECK (status = 'pending' AND requested_by = public.get_user_id());

-- Admin bulk-import / manual add — inserts pre-approved.
DROP POLICY IF EXISTS tags_insert_admin ON public.tags;
CREATE POLICY tags_insert_admin ON public.tags
  FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS tags_update_admin ON public.tags;
CREATE POLICY tags_update_admin ON public.tags
  FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS tags_delete_admin ON public.tags;
CREATE POLICY tags_delete_admin ON public.tags
  FOR DELETE
  USING (public.get_user_role() IN ('admin', 'super_admin'));

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS banner_tags JSONB DEFAULT '[]'::jsonb;
