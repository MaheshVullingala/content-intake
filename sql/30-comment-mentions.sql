-- ══════════════════════════════════════════════════════════════════════
-- @mentions in comments
-- ══════════════════════════════════════════════════════════════════════
--
-- Stores which users were tagged in a comment as an id array, decoupled
-- from the comment's plain-text `text` column (which still holds the
-- human-readable "@Full Name" for display). Storing ids rather than
-- re-parsing "@Name" strings on every render means renaming a user, or
-- two users sharing a display name, can't misattribute a mention.
--
-- No RLS changes needed: comments_select/comments_insert (see
-- sql/29-role-consolidation.sql) already scope who can read/write a
-- comment on a given request, and the taggable-user list surfaced in the
-- UI is built from that exact same rule (admin + general + editorial_team
-- + the request's own stakeholder) — see PagePreview.js. A mention is
-- just an id living inside a row someone could already read/write.
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS mentioned_user_ids UUID[] DEFAULT '{}';
