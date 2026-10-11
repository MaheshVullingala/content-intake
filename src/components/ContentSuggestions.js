"use client";
import { useState } from "react";
import { FaExclamationTriangle, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { findContentSuggestions } from "@/lib/contentChecks";

// Compact, collapsible list of advisory content-format suggestions
// (spacing, capitalization, punctuation, wording) for the edit surfaces
// (EditSectionModal, ProposeChangeWizard). Never blocks saving; whitespace
// problems are repaired automatically on save by autoCleanPayload().
// `payload` is a flat { fieldKey: value } object in the same shape as the
// request columns, so the same rules as the new-request pre-flight apply.
export default function ContentSuggestions({ payload }) {
  const [open, setOpen] = useState(false);
  const issues = findContentSuggestions(payload || {});
  if (issues.length === 0) return null;
  return (
    <div style={{ background: "#fffbeb", border: "1px solid #f59e0b44", borderRadius: 8, padding: "0.5rem 0.75rem", marginTop: 12, fontFamily: "'Rubik',sans-serif" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#92400e", padding: 0, textAlign: "left" }}>
        <FaExclamationTriangle size={11} color="#d97706" />
        {issues.length} content suggestion{issues.length > 1 ? "s" : ""} (won&apos;t block saving)
        <span style={{ marginLeft: "auto" }}>{open ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}</span>
      </button>
      {open && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#181313", display: "flex", flexDirection: "column", gap: 4 }}>
          {issues.map((i, n) => <li key={n}>{i.message}</li>)}
        </ul>
      )}
    </div>
  );
}
