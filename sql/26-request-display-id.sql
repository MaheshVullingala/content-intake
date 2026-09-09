-- ══════════════════════════════════════════════════════════════════════
-- Content Intake Portal — human-friendly Request ID
-- Run in Supabase SQL Editor (safe to re-run)
--
-- requests.id is a UUID — fine for the database, unusable for pasting
-- into a Jira ticket or reading over someone's shoulder. This adds a
-- short sequential display id (REQ-00001, REQ-00002, ...) assigned the
-- moment a stakeholder actually submits (overall_status becomes
-- non-null) — not at draft-creation, so abandoned drafts don't burn
-- numbers. Used by JiraTicketCard.js's "reference this request's id"
-- instruction, the TaskBoard.js header, and Dashboard.js's request list.
-- ══════════════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS public.requests_request_number_seq START 1;
GRANT USAGE, SELECT ON SEQUENCE public.requests_request_number_seq TO authenticated;

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS request_number     INTEGER,
  ADD COLUMN IF NOT EXISTS request_display_id TEXT;

CREATE OR REPLACE FUNCTION public.assign_request_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Fires once per request: only when it doesn't have a number yet AND
  -- it's actually been submitted (overall_status set). Every later
  -- insert/update on the same row is a no-op here since request_number
  -- is already set by then.
  IF NEW.request_number IS NULL AND NEW.overall_status IS NOT NULL THEN
    NEW.request_number := nextval('public.requests_request_number_seq');
    NEW.request_display_id := 'REQ-' || LPAD(NEW.request_number::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_request_display_id ON public.requests;
CREATE TRIGGER trg_assign_request_display_id
  BEFORE INSERT OR UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_request_display_id();

-- Backfill: requests already submitted before this migration existed.
-- Numbered in submission order (created_at) so early requests get
-- earlier numbers, matching what you'd expect if this had existed from
-- the start. Idempotent — only touches rows still missing a number.
DO $$
DECLARE
  r     RECORD;
  v_num INTEGER;
BEGIN
  FOR r IN
    SELECT id FROM public.requests
    WHERE overall_status IS NOT NULL AND request_number IS NULL
    ORDER BY created_at ASC
  LOOP
    v_num := nextval('public.requests_request_number_seq');
    UPDATE public.requests
    SET request_number = v_num, request_display_id = 'REQ-' || LPAD(v_num::text, 5, '0')
    WHERE id = r.id;
  END LOOP;
END $$;
