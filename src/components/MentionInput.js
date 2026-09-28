"use client";
// ── @mention-aware comment textarea ─────────────────────────────────────
// Plain textarea + a lightweight autocomplete dropdown, no rich-text lib
// (matches the app's existing zero-new-dependency convention — see
// RichTextEditor.js's own comment on this). Typing "@" starts a query
// against `users` (whoever the caller decided is taggable for this
// thread — see PagePreview.js, which scopes it to the same RLS rule that
// already governs who can read/write comments); arrow keys + Enter/Tab
// pick a match, Escape closes it.
//
// Doesn't track "which users got mentioned" as separate state that could
// drift from the text (e.g. if someone backspaces over a mention). The
// mentioned-ids list is always derived fresh from the current text by
// scanning for "@<name>" for every candidate — see mentionedIdsInText()
// below, also used by SectionCommentBubble.js to highlight posted
// comments. Two people with identical display names will both match; if
// that ever matters, this needs to move to storing an explicit token
// (e.g. "@[Name](id)") instead of matching on plain text.
import { useState, useRef, useEffect } from "react";

// Users whose name appears as "@Name" in `text`, matched with a
// word-boundary lookahead so "@Al" doesn't also match a candidate named
// "Albert". Exported so callers can compute the same list without
// duplicating the regex logic (SectionCommentBubble uses this both to
// build mentioned_user_ids at post time and to highlight on render).
export function mentionedIdsInText(text, users = []) {
  if (!text) return [];
  const found = [];
  for (const u of users) {
    if (!u?.name) continue;
    const escaped = u.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`@${escaped}(?![A-Za-z0-9])`);
    if (re.test(text)) found.push(u.id);
  }
  return found;
}

export default function MentionInput({
  value, onChange, users = [], onMentionsChange,
  placeholder, rows = 2, style, className = "textarea",
}) {
  const [query,     setQuery]     = useState(null); // null = no active @query
  const [caretIdx,  setCaretIdx]  = useState(0);     // index of "@" that started the query
  const [highlight, setHighlight] = useState(0);     // keyboard-selected dropdown row
  const textareaRef = useRef(null);

  // Re-derive mentions any time the text or candidate list changes —
  // single source of truth is the text itself, see file header.
  useEffect(() => {
    onMentionsChange?.(mentionedIdsInText(value, users));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, users]);

  const matches = query === null
    ? []
    : users.filter(u => u.name?.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  // Finds an unclosed "@query" ending at the cursor: walks back from the
  // cursor to the nearest "@" that isn't preceded by a word character
  // (so "email@x" doesn't trigger) and isn't separated from the cursor by
  // whitespace/newline (so an old "@" earlier in the comment doesn't stay
  // "active" forever).
  const detectQuery = (text, cursor) => {
    const uptoCursor = text.slice(0, cursor);
    const at = uptoCursor.lastIndexOf("@");
    if (at === -1) return null;
    const before = at > 0 ? uptoCursor[at - 1] : "";
    if (/[A-Za-z0-9_]/.test(before)) return null;
    const between = uptoCursor.slice(at + 1);
    if (/\s/.test(between)) return null;
    return { start: at, text: between };
  };

  const handleChange = (e) => {
    const text = e.target.value;
    onChange(text);
    const found = detectQuery(text, e.target.selectionStart);
    if (found) {
      setQuery(found.text);
      setCaretIdx(found.start);
      setHighlight(0);
    } else {
      setQuery(null);
    }
  };

  const applyMention = (u) => {
    const el = textareaRef.current;
    const cursor = el ? el.selectionStart : value.length;
    const before = value.slice(0, caretIdx);
    const after  = value.slice(cursor);
    const next = `${before}@${u.name} ${after}`;
    onChange(next);
    setQuery(null);
    // Restore focus + caret just past the inserted mention — has to wait
    // a tick for the controlled value to actually land in the DOM.
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = before.length + u.name.length + 2;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e) => {
    if (query === null || matches.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => (h + 1) % matches.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => (h - 1 + matches.length) % matches.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); applyMention(matches[highlight]); }
    else if (e.key === "Escape") { setQuery(null); }
  };

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={textareaRef}
        rows={rows}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)} // delay so a dropdown click still registers
        style={style}
      />
      {query !== null && matches.length > 0 && (
        <div style={{
          position: "absolute", bottom: "100%", left: 0, marginBottom: 4,
          width: "100%", maxHeight: 160, overflowY: "auto",
          background: "#fff", border: "1px solid #E0E0E0", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 40,
        }}>
          {matches.map((u, i) => (
            <div
              key={u.id}
              // onMouseDown (not onClick) so this fires before the
              // textarea's onBlur closes the dropdown out from under it.
              onMouseDown={(e) => { e.preventDefault(); applyMention(u); }}
              style={{
                padding: "6px 10px", fontSize: 12, cursor: "pointer",
                background: i === highlight ? "rgba(62,197,203,0.12)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              }}
            >
              <span style={{ fontWeight: 500 }}>{u.name}</span>
              <span style={{ fontSize: 10, color: "#B5B5B5" }}>{u.role}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
