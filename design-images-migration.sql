-- ── Design QA Image Slot Migration ───────────────────────────
-- Adds section_key column to attachments table so each slot
-- can have exactly one image (old replaced when new uploaded)

ALTER TABLE public.attachments
  ADD COLUMN IF NOT EXISTS section_key TEXT DEFAULT NULL;

-- Index for fast slot lookup
CREATE INDEX IF NOT EXISTS idx_attachments_slot
  ON public.attachments(request_id, section_key)
  WHERE section_key IS NOT NULL;

-- Optional: clean up duplicate rows from before this fix
-- Keeps only the most recent attachment per (request_id, section_key)
-- Uncomment if needed:
-- DELETE FROM public.attachments a
-- USING public.attachments b
-- WHERE a.request_id = b.request_id
--   AND a.section_key = b.section_key
--   AND a.section_key IS NOT NULL
--   AND a.created_at < b.created_at;
