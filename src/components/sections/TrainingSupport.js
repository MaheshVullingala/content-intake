"use client";

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

const Field = ({ label, value, onChange, placeholder, multiline, hint, disabled, readOnly, style: fieldStyle }) => (
  <div className="field-wrap">
    <label className="field-label">{label}</label>
    {multiline
      ? <textarea value={value} onChange={e => !disabled && !readOnly && onChange(e.target.value)} placeholder={placeholder} className="textarea" disabled={disabled} readOnly={readOnly} style={fieldStyle || { minHeight: 70 }} />
      : <input    value={value} onChange={e => !disabled && !readOnly && onChange(e.target.value)} placeholder={placeholder} className="input" disabled={disabled} readOnly={readOnly} style={fieldStyle} />
    }
    {hint && <div className="field-hint">{hint}</div>}
  </div>
);

export default function TrainingSupport({ data = {}, onChange, isNA, onToggleNA, aiAssistButton, naButton }) {
  // Merge with defaults so fields are pre-filled
  const d   = { ...DEFAULTS, ...data };
  const upd = (key, val) => onChange({ ...d, [key]: val });

  const resetToDefault = () => onChange({ ...DEFAULTS });

  if (isNA) return (
    <div className="na-placeholder">
      <div className="icon">—</div>
      <div className="text">Training & Support marked as Not Applicable</div>
      <button onClick={onToggleNA} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Info banner */}
      <div style={{ background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 10, padding: "0.85rem 1.1rem", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>ℹ️</span>
          <span style={{ fontSize: 13, color: "#646464" }}>
            Pre-filled with default content. Edit any field to customise for this page.
          </span>
        </div>
        <button onClick={resetToDefault}
          style={{ background: "#fff", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.35rem 0.8rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", color: "#646464", whiteSpace: "nowrap", flexShrink: 0 }}>
          ↺ Reset to default
        </button>
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
        <Field label="Impact Statement" value={d.ts_impact} onChange={v => upd("ts_impact", v)} placeholder="Need Help?" />
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
            hint="Design QA will source the icon from the library" />
          <Field label="Title"
            value={d[`ts_card${n}_title`]}
            onChange={v => upd(`ts_card${n}_title`, v)}
            placeholder={`Card ${n} title`} />
          <Field label="Description"
            value={d[`ts_card${n}_description`]}
            onChange={v => upd(`ts_card${n}_description`, v)}
            placeholder="Card description..."
            multiline />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="CTA Label"
              value={d[`ts_card${n}_cta_label`]}
              onChange={v => upd(`ts_card${n}_cta_label`, v)}
              placeholder="BROWSE TRAINING" />
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
