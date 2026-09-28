"use client";
import { useState } from "react";
import { FaCommentDots, FaTimes } from "react-icons/fa";
import { ROLE_META } from "@/lib/constants";
import MentionInput from "@/components/MentionInput";

// Wraps "@Name" substrings in a posted comment's text with a highlight,
// but only for names that are actually in that comment's
// mentioned_user_ids — never a generic "anything starting with @" match,
// so a stray "@" someone typed literally (not via the mention picker,
// and not matching a real mention) never gets styled.
function renderWithMentions(text, mentionedUserIds = [], users = []) {
  if (!mentionedUserIds?.length || !users?.length) return text;
  const names = users.filter(u => mentionedUserIds.includes(u.id)).map(u => u.name).filter(Boolean);
  if (!names.length) return text;
  const pattern = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(@(?:${pattern})(?![A-Za-z0-9]))`);
  const mentionTexts = new Set(names.map(n => `@${n}`));
  return text.split(re).map((part, i) =>
    mentionTexts.has(part)
      ? <span key={i} style={{ color: "#0f766e", fontWeight: 600, background: "rgba(62,197,203,0.15)", borderRadius: 4, padding: "0 2px" }}>{part}</span>
      : <span key={i}>{part}</span>
  );
}

// Replaces the dropdown-driven CommentThread sidebar panel: a small
// chat-bubble icon sits on each section (next to the Edit button
// pattern already used there), badge-counted, and clicking it pops open
// a compact thread scoped to just that section — no picking a section
// from a list first. Purely presentational: PagePreview.js owns the
// actual comments fetch/post (one query for the whole request, sliced
// per section) and hands this component its slice + a post callback.
export default function SectionCommentBubble({ sectionKey, label, comments = [], onPost, user, hovered, inline = false, users = [] }) {
  const [open,     setOpen]     = useState(false);
  const [text,     setText]     = useState("");
  const [mentions, setMentions] = useState([]); // ids derived from `text`, see MentionInput
  const [posting,  setPosting]  = useState(false);

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    await onPost?.(text.trim(), mentions);
    setText("");
    setPosting(false);
  };

  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  return (
    <div style={inline
      ? { position: "relative", display: "inline-flex", zIndex: open ? 30 : 10 }
      // Stacked below EditBtn (same top-right corner) rather than beside
      // it — button height is fixed regardless of "✎ Edit" vs
      // "✓ Editing" text length, so a fixed vertical gap is safe in a
      // way a horizontal one wasn't.
      : { position: "absolute", top: 48, right: 10, zIndex: open ? 30 : 10 }}>
      <button
        onClick={() => setOpen(v => !v)}
        title={`Discuss ${label}`}
        style={{
          position: "relative",
          // Closed state used white text/icon on #3ec5cb -- ~2.1:1 contrast,
          // fails WCAG AA (needs 4.5:1 for text, 3:1 for UI components).
          // Dark navy (existing Midnight Steel navbar color) on that same
          // background comes out to ~8.5:1. Open state's #0f766e is dark
          // enough that white text already passes (~5.5:1), so only the
          // closed state needed to change.
          background: open ? "#0f766e" : "#3ec5cb",
          color: open ? "#fff" : "#0f172a",
          border: "1.5px solid #0f766e",
          borderRadius: inline ? 20 : "50%",
          width: inline ? "auto" : 30, height: 30,
          padding: inline ? "0 10px" : 0,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          fontSize: inline ? 12 : 14, fontWeight: inline ? 600 : 400, cursor: "pointer",
          fontFamily: inline ? "'Rubik',sans-serif" : undefined,
          boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
          // Same touch-discoverability fix as EditBtn in PagePreview.js:
          // was opacity:0 with no comments and no hover -- invisible and
          // untappable on touch devices for a section nobody has
          // discussed yet. Dimmed-but-present instead of hidden.
          opacity: inline || hovered || open || comments.length > 0 ? 1 : 0.55,
          transition: "opacity 0.15s, background 0.15s",
        }}
      >
        {inline && <span>{label}</span>}
        <FaCommentDots size={inline ? 12 : 14} />
        {comments.length > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -5,
            background: "#c0392b", color: "#fff",
            borderRadius: 999, minWidth: 16, height: 16,
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px", fontFamily: "'Rubik',sans-serif",
          }}>
            {comments.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 36, right: 0,
          width: 280, maxWidth: "calc(100vw - 40px)",
          background: "#fff", border: "1px solid #E0E0E0", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          padding: 10, fontFamily: "'Rubik',sans-serif",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#181313", display: "flex", alignItems: "center", gap: 6 }}><FaCommentDots size={12} /> {label}</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#B5B5B5", display: "flex", alignItems: "center" }}><FaTimes size={12} /></button>
          </div>

          <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 8 }}>
            {comments.length === 0 ? (
              <p style={{ fontSize: 12, color: "#B5B5B5", margin: "4px 0" }}>No comments yet on this section.</p>
            ) : (
              comments.map(c => {
                const meta = ROLE_META[c.user_role] || {};
                const isMe = c.user_id === user?.id;
                return (
                  <div key={c.id} style={{
                    padding: "6px 8px", marginBottom: 5, borderRadius: 6,
                    background: isMe ? "rgba(62,197,203,0.1)" : "#F9F9F9",
                    border: "1px solid #F0F0F0",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>{meta.icon && <meta.icon size={10} />} {c.user_name}</span>
                      <span style={{ fontSize: 10, color: "#B5B5B5", marginLeft: "auto" }}>{formatTime(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "#3C3C3C" }}>{renderWithMentions(c.text, c.mentioned_user_ids, users)}</div>
                  </div>
                );
              })
            )}
          </div>

          <MentionInput
            rows={2}
            placeholder={`Comment on ${label}… (type @ to mention someone)`}
            value={text}
            onChange={setText}
            users={users}
            onMentionsChange={setMentions}
            className=""
            style={{
              width: "100%", fontSize: 12, padding: 6, borderRadius: 6,
              border: "1px solid #E0E0E0", resize: "vertical", fontFamily: "'Rubik',sans-serif",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handlePost}
            disabled={posting || !text.trim()}
            style={{
              width: "100%", marginTop: 6, padding: "6px 0",
              background: posting || !text.trim() ? "#F3F3F3" : "#181313",
              color: posting || !text.trim() ? "#B5B5B5" : "#fff",
              border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500,
              cursor: posting || !text.trim() ? "not-allowed" : "pointer",
            }}
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      )}
    </div>
  );
}
