"use client";
// ── Lightweight rich-text editor ────────────────────────────────────────
// Hand-built contentEditable + document.execCommand toolbar (Bold, Bullet
// list, Numbered list) -- no external rich-text library, per the app's
// existing zero-new-dependency convention. Used only by the Others
// section's "description" field, which needs paragraphs + bullet points
// rather than a single plain string.
//
// Output is an HTML string, always run through sanitizeRichText() before
// it reaches the caller (on every input/blur here, and again on save via
// sanitizePayload's richTextKeys, and again on render before
// dangerouslySetInnerHTML) -- defense in depth for a field that stores
// markup instead of plain text.
import { useRef, useEffect, useCallback, useState } from "react";
import { FaBold, FaListUl, FaListOl, FaExclamationTriangle } from "react-icons/fa";
import { sanitizeRichText, htmlToPlainText, isRichTextEmpty } from "@/lib/richText";

const ToolbarBtn = ({ icon: Icon, label, onClick, disabled }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    disabled={disabled}
    // mousedown (not click) + preventDefault so the editor never loses
    // focus/selection before execCommand runs against it.
    onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
    style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28, border: "1px solid #E0E0E0", borderRadius: 6,
      background: "#fff", color: disabled ? "#D8D8D8" : "#646464",
      cursor: disabled ? "not-allowed" : "pointer", padding: 0,
    }}
  >
    <Icon size={11} />
  </button>
);

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "",
  disabled = false,
  readOnly = false,
  charLimit,
  minHeight = 110,
  label,
  required,
  hint,
}) {
  const editorRef = useRef(null);
  const isFocused = useRef(false);
  const [empty, setEmpty] = useState(() => isRichTextEmpty(value));
  const inert = disabled || readOnly;

  // Keep the DOM in sync with external value changes (e.g. loading a
  // draft, or a sibling toggling N/A) -- but only while unfocused, so a
  // prop update triggered by this editor's own onChange doesn't fight the
  // browser's live cursor position on every keystroke.
  useEffect(() => {
    if (isFocused.current) return;
    const el = editorRef.current;
    if (!el) return;
    const clean = sanitizeRichText(value);
    if (el.innerHTML !== clean) el.innerHTML = clean;
    setEmpty(isRichTextEmpty(value));
  }, [value]);

  const emit = useCallback((html) => {
    setEmpty(isRichTextEmpty(html));
    onChange?.(html);
  }, [onChange]);

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    emit(el.innerHTML);
  };

  const exec = (command) => {
    if (inert) return;
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command);
    emit(el.innerHTML);
  };

  // Force plain-text paste -- keeps clipboard formatting (colors, spans,
  // stray tags from Word/Google Docs) from ever entering the editor. The
  // toolbar is how formatting gets applied instead.
  const handlePaste = (e) => {
    if (inert) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  // Sanitize on blur too, not just on save -- catches anything odd that
  // slipped in (e.g. via a browser extension) before it sits unsanitized
  // in in-memory state that the live preview renders directly.
  const handleBlur = () => {
    isFocused.current = false;
    const el = editorRef.current;
    if (!el) return;
    const clean = sanitizeRichText(el.innerHTML);
    if (el.innerHTML !== clean) el.innerHTML = clean;
    emit(clean);
  };

  const len = htmlToPlainText(value).length;
  const over = charLimit && len > charLimit;

  return (
    <div className="field-wrap">
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <label className="field-label" style={{ margin: 0 }}>{label}{required && <span className="req"> *</span>}</label>
          {charLimit && (
            <span style={{ fontSize: 10, fontFamily: "monospace", color: over ? "#c0392b" : len > charLimit * 0.85 ? "#856404" : "#B5B5B5", fontWeight: 500 }}>
              {len}/{charLimit}
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <ToolbarBtn icon={FaBold} label="Bold" disabled={inert} onClick={() => exec("bold")} />
        <ToolbarBtn icon={FaListUl} label="Bullet list" disabled={inert} onClick={() => exec("insertUnorderedList")} />
        <ToolbarBtn icon={FaListOl} label="Numbered list" disabled={inert} onClick={() => exec("insertOrderedList")} />
      </div>

      <div style={{ position: "relative" }}>
        {empty && placeholder && (
          <div style={{ position: "absolute", top: 11, left: 13, fontSize: 14, color: "#B5B5B5", pointerEvents: "none" }}>
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          className="textarea rich-text-editor"
          contentEditable={!inert}
          suppressContentEditableWarning
          onFocus={() => { isFocused.current = true; }}
          onBlur={handleBlur}
          onInput={handleInput}
          onPaste={handlePaste}
          style={{
            minHeight,
            overflowY: "auto",
            ...(over ? { borderColor: "#c0392b" } : {}),
            ...(inert ? { background: "#F5F5F5", color: "#B5B5B5", cursor: "not-allowed" } : {}),
          }}
        />
      </div>

      {over && (
        <div style={{ fontSize: 11, color: "#c0392b", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
          <FaExclamationTriangle size={10} /> Exceeds {charLimit} character limit
        </div>
      )}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}
