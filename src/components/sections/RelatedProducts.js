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

export default function RelatedProducts({ data = {}, onChange, isNA, onToggleNA, requestId = "draft" }) {
  const cards = data.rp_cards || [];
  const upd   = (key, val) => onChange({ ...data, [key]: val });

  const addCard    = () => { if (cards.length >= 12) return; upd("rp_cards", [...cards, { id: `rp-${Date.now()}`, title: "", description: "", cta_label: "Learn More", cta_link: "", image_ref: null }]); };
  const updateCard = (id, field, val) => upd("rp_cards", cards.map(c => c.id === id ? { ...c, [field]: val } : c));
  const removeCard = (id) => upd("rp_cards", cards.filter(c => c.id !== id));
  const moveCard   = (idx, dir) => {
    const arr = [...cards]; const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    upd("rp_cards", arr);
  };

  if (isNA) return (
    <div className="na-placeholder">
      <div className="icon">—</div>
      <div className="text">Related Products marked as Not Applicable</div>
      <button onClick={onToggleNA} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Header fields */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div><h3>Related Products — Header</h3><p>Label, impact statement and description</p></div>
        </div>
        <Field label="Label" value="RELATED PRODUCTS" onChange={() => {}} readOnly disabled style={{ background: "#F5F5F5", color: "#B5B5B5", cursor: "not-allowed" }} hint="Fixed label — not editable" />
        <Field label="Impact Statement" required value={data.rp_impact || ""} onChange={v => upd("rp_impact", v)}
          placeholder='e.g. "A Collection of Products to Fully Explore"' multiline />
        <Field label="Description" charLimit={300} value={data.rp_description || ""} onChange={v => upd("rp_description", v)}
          placeholder="Supporting paragraph..." multiline />
      </div>

      {/* Cards header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Product Cards</h3>
          <p style={{ fontSize: 11, color: "#B5B5B5", marginTop: 2 }}>
            {cards.length}/12 cards · 2 column layout
          </p>
        </div>
        <button onClick={addCard} disabled={cards.length >= 12}
          style={{ background: cards.length >= 12 ? "#F3F3F3" : "#181313", color: cards.length >= 12 ? "#B5B5B5" : "#fff", border: "none", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 13, fontWeight: 500, cursor: cards.length >= 12 ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
          + Add Card {cards.length >= 12 ? "(Max 12)" : `(${cards.length}/12)`}
        </button>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 12, padding: "2.5rem", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📦</div>
          <div style={{ fontSize: 14, color: "#B5B5B5", marginBottom: 14 }}>No cards yet. Add at least 1 product card.</div>
          <button onClick={addCard} style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 8, padding: "0.55rem 1.2rem", fontSize: 13, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
            + Add first card
          </button>
        </div>
      )}

      {/* Card list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {cards.map((card, idx) => (
          <div key={card.id} className="card">
            {/* Card header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #F3F3F3" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#181313", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>
                  {idx + 1}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#181313" }}>
                  {card.title || `Card ${idx + 1}`}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => moveCard(idx, -1)} disabled={idx === 0}
                  style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.3rem 0.65rem", fontSize: 12, cursor: idx === 0 ? "not-allowed" : "pointer", color: idx === 0 ? "#B5B5B5" : "#646464" }}>↑</button>
                <button onClick={() => moveCard(idx, 1)} disabled={idx === cards.length - 1}
                  style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.3rem 0.65rem", fontSize: 12, cursor: idx === cards.length - 1 ? "not-allowed" : "pointer", color: idx === cards.length - 1 ? "#B5B5B5" : "#646464" }}>↓</button>
                <button onClick={() => removeCard(card.id)}
                  style={{ background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.3rem 0.65rem", fontSize: 12, cursor: "pointer" }}>✕</button>
              </div>
            </div>

            <Field label="Product Title" required value={card.title}
              onChange={v => updateCard(card.id, "title", v)}
              placeholder='e.g. "Verisium Manager"' />
            <Field label="Description" required value={card.description}
              onChange={v => updateCard(card.id, "description", v)}
              placeholder="Brief description of this product..."
              multiline />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="CTA Label" charLimit={25} value={card.cta_label}
                onChange={v => updateCard(card.id, "cta_label", v)}
                placeholder="Learn More" />
              <Field label="CTA Link" required value={card.cta_link}
                onChange={v => updateCard(card.id, "cta_link", v)}
                placeholder="/products/verisium-manager" />
            </div>
            <ImageField
              label="Product Thumbnail"
              value={card.image_ref || null}
              onChange={v => updateCard(card.id, "image_ref", v)}
              fieldKey={`related-products_card-${idx + 1}_image`}
              requestId={requestId}
            />
          </div>
        ))}
      </div>

      {/* Add more */}
      {cards.length > 0 && cards.length < 12 && (
        <button onClick={addCard}
          style={{ width: "100%", marginTop: 12, background: "transparent", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "0.75rem", fontSize: 13, color: "#B5B5B5", cursor: "pointer", fontFamily: "'Rubik',sans-serif", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#3C3C3C"; e.currentTarget.style.color = "#3C3C3C"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.color = "#B5B5B5"; }}>
          + Add another card ({cards.length}/12)
        </button>
      )}
    </div>
  );
}
