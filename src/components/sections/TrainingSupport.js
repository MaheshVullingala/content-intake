"use client";
import { useState } from "react";
import { FaExclamationTriangle, FaLock, FaUnlock, FaUndo } from "react-icons/fa";

const DEFAULTS = {
  ts_label: "TRAINING AND SUPPORT",
  ts_impact: "Need Help?",
  ts_card1_icon: "Training icon - person with checklist",
  ts_card1_title: "Training",
  ts_card1_description: "The Training Learning Maps help you get a comprehensive visual overview of learning opportunities. Training News - Subscribe",
  ts_card1_cta_label: "BROWSE TRAINING",
  ts_card1_cta_link: "",
  ts_card2_icon: "Cloud with question mark - online support",
  ts_card2_title: "Online Support",
  ts_card2_description: "The Cadence ASK system fields our entire library of accessible materials for self-study and step-by-step instruction.",
  ts_card2_cta_label: "REQUEST SUPPORT",
  ts_card2_cta_link: "",
  ts_card3_icon: "People group icon - technical forums",
  ts_card3_title: "Technical Forums",
  ts_card3_description: "Find community on the technical forums to discuss and elaborate on your design ideas.",
  ts_card3_cta_label: "FIND ANSWERS",
  ts_card3_cta_link: "",
};

// Standard section: text/icon fields are locked. CTA links stay editable
// (their defaults are blank and are page-specific). Unlocking the rest
// requires a written justification, stored in ts_edit_justification.
export const TS_LOCKED_KEYS = Object.keys(DEFAULTS).filter(k => !k.endsWith("_cta_link"));
export const MIN_JUSTIFICATION = 15;
export const tsIsEdited = (data = {}) =>
  TS_LOCKED_KEYS.some(k => data[k] != null && data[k] !== "" && data[k] !== DEFAULTS[k]);
// True when content deviates from the standard without a justification.
export const tsNeedsJustification = (data = {}) =>
  tsIsEdited(data) && !(data.ts_edit_justification || "").trim();

const Field = ({ label, value, onChange, placeholder, multiline, hint, disabled, readOnly, style: fieldStyle, charLimit, required }) => {
  const len  = (value || "").length;
  const over = charLimit && len > charLimit;
  return (
    <div className="field-wrap">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
        <label className="field-label" style={{ margin:0 }}>{label}{required && <span className="req"> *</span>}</label>
        {charLimit && <span style={{ fontSize:10, fontFamily:"monospace", color: over ? "#c0392b" : len > charLimit*0.85 ? "#856404" : "#B5B5B5", fontWeight:500 }}>{len}/{charLimit}</span>}
      </div>
      {multiline
        ? <textarea value={value} onChange={e => !disabled && !readOnly && onChange(e.target.value)} placeholder={placeholder} className="textarea" disabled={disabled} readOnly={readOnly} maxLength={charLimit || undefined} style={{ ...(fieldStyle || { minHeight:70 }), ...(over ? { borderColor:"#c0392b" } : {}) }} />
        : <input    value={value} onChange={e => !disabled && !readOnly && onChange(e.target.value)} placeholder={placeholder} className="input" disabled={disabled} readOnly={readOnly} maxLength={charLimit || undefined} style={{ ...fieldStyle, ...(over ? { borderColor:"#c0392b" } : {}) }} />
      }
      {over && <div style={{ fontSize:11, color:"#c0392b", marginTop:3, display:"flex", alignItems:"center", gap:4 }}><FaExclamationTriangle size={10} /> Exceeds {charLimit} character limit</div>}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
};

export default function TrainingSupport({ data = {}, onChange, isNA, onToggleNA, aiAssistButton, naButton }) {
  // Merge with defaults so fields are pre-filled
  const d   = { ...DEFAULTS, ...data };
  const upd = (key, val) => onChange({ ...d, [key]: val });

  const resetToDefault = () => onChange({ ...DEFAULTS, ts_edit_justification: "" });

  const [asking, setAsking] = useState(false);
  const [draftReason, setDraftReason] = useState("");
  const unlocked = !!(d.ts_edit_justification || "").trim() || tsIsEdited(d);
  const lock = unlocked ? {} : { readOnly: true, disabled: true };
  const lockStyle = unlocked ? undefined : { background: "#F5F5F5", color: "#8a8a8a", cursor: "not-allowed" };
  const confirmUnlock = () => {
    if (draftReason.trim().length < MIN_JUSTIFICATION) return;
    onChange({ ...d, ts_edit_justification: draftReason.trim() });
    setAsking(false); setDraftReason("");
  };

  if (isNA) return (
    <div className="na-placeholder">
      <div className="icon">—</div>
      <div className="text">Training & Support marked as Not Applicable</div>
      <button onClick={onToggleNA} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Lock banner */}
      <div style={{ background: unlocked ? "#FFF8E6" : "#F9F9F9", border: `1px solid ${unlocked ? "#F0D890" : "#E0E0E0"}`, borderRadius: 10, padding: "0.85rem 1.1rem", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, display: "flex", color: unlocked ? "#856404" : "#646464" }}>{unlocked ? <FaUnlock /> : <FaLock />}</span>
            <span style={{ fontSize: 13, color: unlocked ? "#856404" : "#646464" }}>
              {unlocked
                ? "Standard content unlocked for editing. Your justification is shared with the editorial team."
                : "This section uses fixed standard content and can't be edited. Need changes? Request to edit and give a justification."}
            </span>
          </div>
          {unlocked ? (
            <button onClick={resetToDefault}
              style={{ background: "#fff", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.35rem 0.8rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", color: "#646464", whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}>
              <FaUndo size={10} /> Revert to standard
            </button>
          ) : !asking && (
            <button onClick={() => setAsking(true)}
              style={{ background: "#fff", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.35rem 0.8rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", color: "#181313", whiteSpace: "nowrap", flexShrink: 0 }}>
              Request to edit
            </button>
          )}
        </div>
        {!unlocked && asking && (
          <div style={{ marginTop: 12 }}>
            <label className="field-label">Justification <span className="req">*</span></label>
            <textarea className="textarea" value={draftReason} onChange={e => setDraftReason(e.target.value)} placeholder="Why does this page need different Training & Support content?" style={{ minHeight: 70 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <button className="btn-primary" onClick={confirmUnlock} disabled={draftReason.trim().length < MIN_JUSTIFICATION}>Unlock for editing</button>
              <button className="btn-ghost" onClick={() => { setAsking(false); setDraftReason(""); }}>Cancel</button>
              <span style={{ fontSize: 11, color: "#B5B5B5" }}>At least {MIN_JUSTIFICATION} characters</span>
            </div>
          </div>
        )}
        {unlocked && (
          <div style={{ marginTop: 12 }}>
            <label className="field-label">Justification <span className="req">*</span></label>
            <textarea className="textarea" value={d.ts_edit_justification || ""} onChange={e => upd("ts_edit_justification", e.target.value)} placeholder="Why does this page need different content?" style={{ minHeight: 60 }} />
          </div>
        )}
      </div>

      {/* Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div><h3>Section Header</h3><p>Label and impact statement</p></div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {aiAssistButton}
            {naButton}
          </div>
        </div>
        <Field label="Label" value="TRAINING AND SUPPORT" onChange={() => {}} readOnly disabled style={{ background: "#F5F5F5", color: "#B5B5B5", cursor: "not-allowed" }} hint="Fixed label — not editable" />
        <Field label="Impact Statement" value={d.ts_impact} onChange={v => upd("ts_impact", v)} placeholder="Need Help?" {...lock} style={lockStyle} />
      </div>

      {/* 3 fixed cards */}
      {[1, 2, 3].map(n => (
        <div key={n} className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#181313", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #F3F3F3", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#181313", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>{n}</div>
            {d[`ts_card${n}_title`] || `Card ${n}`}
          </div>

          <Field label="Icon Description"
            value={d[`ts_card${n}_icon`]}
            onChange={v => upd(`ts_card${n}_icon`, v)}
            placeholder="Describe the icon..."
            hint="Design QA will source the icon from the library" {...lock} style={lockStyle} />
          <Field label="Title"
            value={d[`ts_card${n}_title`]}
            onChange={v => upd(`ts_card${n}_title`, v)}
            placeholder={`Card ${n} title`} {...lock} style={lockStyle} />
          <Field label="Description"
            value={d[`ts_card${n}_description`]}
            onChange={v => upd(`ts_card${n}_description`, v)}
            placeholder="Card description..."
            multiline {...lock} style={unlocked ? undefined : { ...lockStyle, minHeight: 70 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="CTA Label"
              value={d[`ts_card${n}_cta_label`]}
              onChange={v => upd(`ts_card${n}_cta_label`, v)}
              placeholder="BROWSE TRAINING" {...lock} style={lockStyle} />
            <Field label="CTA Link"
              value={d[`ts_card${n}_cta_link`]}
              onChange={v => upd(`ts_card${n}_cta_link`, v)}
              placeholder="/training or https://..." />
          </div>
        </div>
      ))}
    </div>
  );
}
