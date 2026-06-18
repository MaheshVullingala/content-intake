"use client";
import ImageField from "@/components/ImageField";

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
        ? <textarea value={value} onChange={e => !disabled && !readOnly && onChange(e.target.value)} placeholder={placeholder} className="textarea" disabled={disabled} readOnly={readOnly} style={{ ...(fieldStyle || { minHeight:70 }), ...(over ? { borderColor:"#c0392b" } : {}) }} />
        : <input    value={value} onChange={e => !disabled && !readOnly && onChange(e.target.value)} placeholder={placeholder} className="input" disabled={disabled} readOnly={readOnly} style={{ ...fieldStyle, ...(over ? { borderColor:"#c0392b" } : {}) }} />
      }
      {over && <div style={{ fontSize:11, color:"#c0392b", marginTop:3 }}>⚠️ Exceeds {charLimit} character limit</div>}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
};

export default function PromoSection({ data = {}, onChange, isNA, onToggleNA, aiAssistButton, naButton, requestId = "draft" }) {
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
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {aiAssistButton}
            {naButton}
          </div>
        </div>

        <div style={{ paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #F3F3F3" }}>
          <div style={{ fontSize: 11, color: "#646464", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Background Image</div>
          <ImageField
            label=""
            value={data.promo_bg_image_ref || null}
            onChange={v => upd("promo_bg_image_ref", v)}
            fieldKey="promo-section_bg-image"
            requestId={requestId}
          />
        </div>

        <Field label="Label" value={data.promo_label || ""} onChange={v => upd("promo_label", v)}
          placeholder='e.g. "NEXT STEPS"' hint="Small caps tag (optional)" />
        <Field label="Promo Title" charLimit={100} required value={data.promo_title || ""} onChange={v => upd("promo_title", v)}
          placeholder='e.g. "Start your next design with Fidelity CFD Platform."' multiline
          hint="Large text shown on the left side of the banner" />
        <Field label="Description" charLimit={300} value={data.promo_description || ""} onChange={v => upd("promo_description", v)}
          placeholder="Optional supporting text..." multiline />

        <div style={{ paddingTop: 12, marginTop: 4, borderTop: "1px solid #F3F3F3" }}>
          <div style={{ fontSize: 11, color: "#646464", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Button</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Button Label" charLimit={25} required value={data.promo_btn_label || ""} onChange={v => upd("promo_btn_label", v)}
              placeholder='e.g. "REQUEST TRIAL"' />
            <Field label="Button Link" required value={data.promo_btn_link || ""} onChange={v => upd("promo_btn_link", v)}
              placeholder="/trial or https://..." />
          </div>
        </div>
      </div>
    </div>
  );
}
