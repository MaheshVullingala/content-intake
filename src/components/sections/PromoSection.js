"use client";

const Field = ({ label, value, onChange, placeholder, multiline, required, hint }) => (
  <div className="field-wrap">
    <label className="field-label">
      {label}{required && <span className="req"> *</span>}
    </label>
    {multiline
      ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="textarea" />
      : <input    value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input" />
    }
    {hint && <div className="field-hint">{hint}</div>}
  </div>
);

export default function PromoSection({ data = {}, onChange, isNA, onToggleNA }) {
  const upd = (key, val) => onChange({ ...data, [key]: val });

  if (isNA) return (
    <div className="na-placeholder">
      <div className="icon">—</div>
      <div className="text">Promo Section marked as Not Applicable</div>
      <button onClick={onToggleNA} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Rubik', sans-serif" }}>
      <div className="card">
        <div className="card-header">
          <div><h3>Promo Section</h3><p>Full-width banner with background image and CTA</p></div>
        </div>

        <div style={{ paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #F3F3F3" }}>
          <div style={{ fontSize: 11, color: "#646464", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Background Image</div>
          <Field label="Image URL" value={data.promo_bg_image || ""} onChange={v => upd("promo_bg_image", v)}
            placeholder="https://... or leave for Design QA" />
          <Field label="Image Description / Note for Design QA" value={data.promo_bg_note || ""} onChange={v => upd("promo_bg_note", v)}
            placeholder='e.g. "Dark circuit board image with purple accent lighting"'
            hint="Describe the background image needed — Design QA will source from library" />
        </div>

        <Field label="Label" value={data.promo_label || ""} onChange={v => upd("promo_label", v)}
          placeholder='e.g. "NEXT STEPS"' hint="Small caps tag (optional)" />
        <Field label="Promo Title" required value={data.promo_title || ""} onChange={v => upd("promo_title", v)}
          placeholder='e.g. "Start your next design with Fidelity CFD Platform."' multiline
          hint="Large text shown on the left side of the banner" />
        <Field label="Description" value={data.promo_description || ""} onChange={v => upd("promo_description", v)}
          placeholder="Optional supporting text..." multiline />

        <div style={{ paddingTop: 12, marginTop: 4, borderTop: "1px solid #F3F3F3" }}>
          <div style={{ fontSize: 11, color: "#646464", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Button</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Button Label" required value={data.promo_btn_label || ""} onChange={v => upd("promo_btn_label", v)}
              placeholder='e.g. "REQUEST TRIAL"' />
            <Field label="Button Link" required value={data.promo_btn_link || ""} onChange={v => upd("promo_btn_link", v)}
              placeholder="/trial or https://..." />
          </div>
        </div>
      </div>
    </div>
  );
}
