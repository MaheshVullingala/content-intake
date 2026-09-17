"use client";
// ── Others section ──────────────────────────────────────────────────────
// Free-form escape hatch: when a stakeholder's requirement doesn't match
// any of the existing sections, they describe it here instead of being
// blocked. Unlike every other section, there's no shared header
// label/impact field — each block IS a fully self-contained custom
// request (its own label, impact statement, description, explanation),
// and stakeholders can add as many as they need (decision: "multiple
// blocks", so unrelated one-off asks don't get crammed into one item).
import { useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import { isRichTextEmpty } from "@/lib/richText";
import { FaExclamationTriangle, FaLayerGroup, FaArrowUp, FaArrowDown, FaTimes } from "react-icons/fa";

// Per-item field limits, hardcoded here rather than in the global
// CHAR_LIMITS map — matches the app's convention for card/array-item
// fields (see CustomerStories.js's `customer` limit, RelatedProducts.js,
// etc.), since these are per-item, not a section-wide header field.
const LIMITS = { label: 40, impact_statement: 100, description: 800, explanation: 300 };

const MAX_ITEMS = 10;

const Field = ({ label, value, onChange, placeholder, multiline, hint, charLimit, required }) => {
  const len  = (value || "").length;
  const over = charLimit && len > charLimit;
  return (
    <div className="field-wrap">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
        <label className="field-label" style={{ margin:0 }}>{label}{required && <span className="req"> *</span>}</label>
        {charLimit && <span style={{ fontSize:10, fontFamily:"monospace", color: over ? "#c0392b" : len > charLimit*0.85 ? "#856404" : "#B5B5B5", fontWeight:500 }}>{len}/{charLimit}</span>}
      </div>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="textarea" style={{ minHeight:70, ...(over ? { borderColor:"#c0392b" } : {}) }} />
        : <input    value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input" style={over ? { borderColor:"#c0392b" } : {}} />
      }
      {over && <div style={{ fontSize:11, color:"#c0392b", marginTop:3, display:"flex", alignItems:"center", gap:4 }}><FaExclamationTriangle size={10} /> Exceeds {charLimit} character limit</div>}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
};

export default function Others({ data = {}, onChange, isNA, onToggleNA, aiAssistButton, naButton }) {
  const items = data.oth_items || [];
  const upd   = (key, val) => onChange({ ...data, [key]: val });

  const addItem = () => {
    if (items.length >= MAX_ITEMS) return;
    upd("oth_items", [...items, {
      id: `oth-${Date.now()}`, label: "", impact_statement: "", description: "", explanation: "",
    }]);
  };
  const updateItem = (id, field, val) => upd("oth_items", items.map(i => i.id === id ? { ...i, [field]: val } : i));
  const removeItem = (id) => upd("oth_items", items.filter(i => i.id !== id));
  const moveItem   = (idx, dir) => {
    const arr = [...items]; const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    upd("oth_items", arr);
  };

  if (isNA) return (
    <div className="na-placeholder">
      <div className="icon">—</div>
      <div className="text">Others marked as Not Applicable</div>
      <button onClick={onToggleNA} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Rubik', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Custom Section Requests</h3>
          <p style={{ fontSize: 11, color: "#B5B5B5", marginTop: 2 }}>
            {items.length}/{MAX_ITEMS} · For requirements that don't fit an existing section
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {aiAssistButton}
          {naButton}
          <button onClick={addItem} disabled={items.length >= MAX_ITEMS}
            style={{ background: items.length >= MAX_ITEMS ? "#F3F3F3" : "#181313", color: items.length >= MAX_ITEMS ? "#B5B5B5" : "#fff", border: "none", borderRadius: 8, padding: "0.45rem 1rem", fontSize: 13, fontWeight: 500, cursor: items.length >= MAX_ITEMS ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
            + Add Section Request
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8, display: "flex", justifyContent: "center", color: "#B5B5B5" }}><FaLayerGroup /></div>
          <div style={{ fontSize: 13, color: "#B5B5B5", marginBottom: 12 }}>
            No custom sections yet. If your content doesn't fit Banner, Overview, Key Benefits or any other section, describe it here.
          </div>
          <button onClick={addItem} style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 7, padding: "0.45rem 1rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>+ Add first request</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item, idx) => (
          <div key={item.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #F3F3F3" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#181313", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>{idx + 1}</div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#181313" }}>{item.label || `Custom Section ${idx + 1}`}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                  style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.25rem 0.55rem", fontSize: 11, cursor: idx === 0 ? "not-allowed" : "pointer", color: idx === 0 ? "#B5B5B5" : "#646464", display: "flex" }}><FaArrowUp size={10} /></button>
                <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}
                  style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.25rem 0.55rem", fontSize: 11, cursor: idx === items.length - 1 ? "not-allowed" : "pointer", color: idx === items.length - 1 ? "#B5B5B5" : "#646464", display: "flex" }}><FaArrowDown size={10} /></button>
                <button onClick={() => removeItem(item.id)}
                  style={{ background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.25rem 0.55rem", fontSize: 11, cursor: "pointer", display: "flex" }}><FaTimes size={10} /></button>
              </div>
            </div>

            <Field label="Label" required charLimit={LIMITS.label} value={item.label}
              onChange={v => updateItem(item.id, "label", v)}
              placeholder="e.g. Partner Logos, FAQ, Pricing Table"
              hint="Short name for this custom section" />

            <Field label="Impact Statement" required charLimit={LIMITS.impact_statement} value={item.impact_statement}
              onChange={v => updateItem(item.id, "impact_statement", v)}
              placeholder='e.g. "Why This Section Matters"'
              hint="Headline / statement this section should make" />

            <RichTextEditor
              label="Description" required charLimit={LIMITS.description}
              value={item.description}
              onChange={v => updateItem(item.id, "description", v)}
              placeholder="Describe the content in full — use the toolbar for bold text and bullet or numbered lists"
              minHeight={130}
            />

            <Field label="Explanation" required multiline charLimit={LIMITS.explanation} value={item.explanation}
              onChange={v => updateItem(item.id, "explanation", v)}
              placeholder="Explain how this section should look and where it should sit on the page"
              hint="Layout, placement and visual guidance for design/web team" />
          </div>
        ))}
      </div>

      {items.length > 0 && items.length < MAX_ITEMS && (
        <button onClick={addItem}
          style={{ width: "100%", marginTop: 10, background: "transparent", border: "2px dashed #E0E0E0", borderRadius: 8, padding: "0.6rem", fontSize: 12, color: "#B5B5B5", cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#3C3C3C"; e.currentTarget.style.color = "#3C3C3C"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.color = "#B5B5B5"; }}>
          + Add another custom section ({items.length}/{MAX_ITEMS})
        </button>
      )}
    </div>
  );
}

// Exported so PagePreview.js / EditSectionModal.js can apply the same
// "has this item been filled in" rule without duplicating the rich-text-aware
// emptiness check (a plain `!item.description` would be wrong once the
// field can hold "<p><br></p>").
export const isOthersItemEmpty = (item) =>
  !item?.label && !item?.impact_statement && isRichTextEmpty(item?.description) && !item?.explanation;
