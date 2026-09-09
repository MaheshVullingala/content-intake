"use client";
import { useState } from "react";
import { ROLE_META } from "@/lib/constants";

// Replaces the dropdown-driven CommentThread sidebar panel: a small
// chat-bubble icon sits on each section (next to the ✎ Edit button
// pattern already used there), badge-counted, and clicking it pops open
// a compact thread scoped to just that section — no picking a section
// from a list first. Purely presentational: PagePreview.js owns the
// actual comments fetch/post (one query for the whole request, sliced
// per section) and hands this component its slice + a post callback.
export default function SectionCommentBubble({ sectionKey, label, comments = [], onPost, user, hovered, inline = false }) {
  const [open,    setOpen]    = useState(false);
  const [text,    setText]    = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    await onPost?.(text.trim());
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
      // Opposite corner from EditBtn (top-right) on purpose — avoids any
      // chance of overlap regardless of how wide "✎ Edit"/"✓ Editing"
      // renders, rather than trying to compute a safe right-offset gap.
      : { position: "absolute", top: 10, left: 10, zIndex: open ? 30 : 10 }}>
      <button
        onClick={() => setOpen(v => !v)}
        title={`Discuss ${label}`}
        style={{
          position: "relative",
          background: open ? "#0f766e" : "#3ec5cb",
          color: "#fff",
          border: "1.5px solid #0f766e",
          borderRadius: inline ? 20 : "50%",
          width: inline ? "auto" : 30, height: 30,
          padding: inline ? "0 10px" : 0,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          fontSize: inline ? 12 : 14, fontWeight: inline ? 600 : 400, cursor: "pointer",
          fontFamily: inline ? "'Rubik',sans-serif" : undefined,
          boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
          opacity: inline || hovered || open || comments.length > 0 ? 1 : 0,
          transition: "opacity 0.15s, background 0.15s",
        }}
      >
        {inline && <span>{label}</span>}
        💬
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
          position: "absolute", top: 36,
          // Bubble sits at the section's top-left corner (non-inline) —
          // anchor the popover to expand rightward from there, not
          // leftward off the section's own edge. Inline (the "General"
          // bubble in the browser bar) keeps its original right-anchor.
          ...(inline ? { right: 0 } : { left: 0 }),
          width: 280, maxWidth: "calc(100vw - 40px)",
          background: "#fff", border: "1px solid #E0E0E0", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          padding: 10, fontFamily: "'Rubik',sans-serif",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#181313" }}>💬 {label}</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#B5B5B5" }}>✕</button>
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
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{meta.icon || ""} {c.user_name}</span>
                      <span style={{ fontSize: 10, color: "#B5B5B5", marginLeft: "auto" }}>{formatTime(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "#3C3C3C" }}>{c.text}</div>
                  </div>
                );
              })
            )}
          </div>

          <textarea
            rows={2}
            placeholder={`Comment on ${label}…`}
            value={text}
            onChange={e => setText(e.target.value)}
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
