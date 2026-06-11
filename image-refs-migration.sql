-- ── Image Reference Fields Migration ─────────────────────────
-- Adds JSONB columns for stakeholder image references (description/link/attachment)
-- Run in Supabase SQL Editor

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS banner_image_ref    JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS overview_media_ref  JSONB DEFAULT NULL;

-- Note: kb_cards, fa_items, cs_items, rc_cards, rp_cards already store
-- JSONB arrays — image_ref is added as a field within each card object.
-- No schema change needed for those columns.

-- Design team uploaded images per section
CREATE TABLE IF NOT EXISTS public.design_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  section_key  TEXT NOT NULL,   -- e.g. "banner", "key_benefits_card_1"
  file_name    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url   TEXT NOT NULL,
  uploaded_by  UUID REFERENCES public.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.design_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.design_images FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookup by request
CREATE INDEX IF NOT EXISTS idx_design_images_request_id ON public.design_images(request_id);
