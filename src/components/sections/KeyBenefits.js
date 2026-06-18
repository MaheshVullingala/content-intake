"use client";
import ImageField from "@/components/ImageField";

const Field = ({ label, value, onChange, placeholder, multiline, required, hint, disabled, readOnly, style: fieldStyle, charLimit }) => {
  const len  = (value || "").length;
  const over = charLimit && len > charLimit;
  return (
    <div className="field-wrap">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
        <label className="field-label" style={{ margin:0 }}>{label}{required && <span className="req"> *</span>}</label>
        {charLimit && <span style={{ fontSize:10, fontFamily:"monospace", color: over ? "#c0392b" : len > charLimit*0.85 ? "#856404" : "#B5B5B5", fontWeight:500 }}>{len}/{charLimit}</span>}
      </div>
      {multiline
        ? <textarea value={value} onChange={e => !disabled && !readOnly && onChange(e.target.value)} placeholder={placeholder} className="textarea" disabled={disabled} readOnly={readOnly} style={{ ...(fieldStyle || { minHeight:70 }), borderColor: over ? "#c0392b" : undefined }} />
        : <input    value={value} onChange={e => !disabled && !readOnly && onChange(e.target.value)} placeholder={placeholder} className="input" disabled={disabled} readOnly={readOnly} style={{ ...fieldStyle, borderColor: over ? "#c0392b" : undefined }} />
      }
      {over && <div style={{ fontSize:11, color:"#c0392b", marginTop:3 }}>⚠️ Exceeds {charLimit} character limit</div>}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
};

export default function KeyBenefits({ data = {}, onChange, isNA, onToggleNA, aiAssistButton, naButton, requestId = "draft" }) {
  const cards = data.kb_cards || [];

  const upd = (key, val) => onChange({ ...data, [key]: val });

  const addCard = () => {
    if (cards.length >= 6) return;
    const newCard = { id: `card-${Date.now()}`, icon_description: "", title: "", description: "", image_ref: null };
    upd("kb_cards", [...cards, newCard]);
  };

  const updateCard = (id, field, val) => {
    upd("kb_cards", cards.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const removeCard = (id) => {
    upd("kb_cards", cards.filter(c => c.id !== id));
  };

  const moveCard = (idx, dir) => {
    const newCards = [...cards];
    const target = idx + dir;
    if (target < 0 || target >= newCards.length) return;
    [newCards[idx], newCards[target]] = [newCards[target], newCards[idx]];
    upd("kb_cards", newCards);
  };

  const getLayoutLabel = () => {
    if (cards.length <= 1) return "1 per row";
    if (cards.length === 2) return "2 per row";
    if (cards.length === 3) return "3 per row";
    return "2 per row (auto wrapping)";
  };

  if (isNA) return (
    <div className="na-placeholder">
      <div className="icon">—</div>
      <div className="text">Key Benefits section marked as Not Applicable</div>
      <button onClick={onToggleNA} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Header fields */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <h3>Key Benefits — Header</h3>
            <p>Label, impact statement and optional description</p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {aiAssistButton}
            {naButton}
          </div>
        </div>
        <Field label="Label" value="KEY BENEFITS" onChange={() => {}} readOnly disabled style={{ background: "#F5F5F5", color: "#B5B5B5", cursor: "not-allowed" }} hint="Fixed label — not editable" />
        <Field label="Impact Statement" required charLimit={100} value={data.kb_impact || ""} onChange={v => upd("kb_impact", v)}
          placeholder="e.g. Deliver 10X Design Productivity to Meet Your Time-to-Market Goals"
          multiline hint="Large heading — the main message of this section" />
        <Field label="Description" charLimit={300} value={data.kb_description || ""} onChange={v => upd("kb_description", v)}
          placeholder="Optional supporting paragraph..." multiline />
      </div>

      {/* Cards header */}
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Benefit Cards</h3>
          <p style={{ fontSize: 11, color: "#B5B5B5", marginTop: 2 }}>
            {cards.length}/6 cards · {getLayoutLabel()}
          </p>
        </div>
        <button onClick={addCard} disabled={cards.length >= 6}
          style={{ background: cards.length >= 6 ? "#F3F3F3" : "#181313", color: cards.length >= 6 ? "#B5B5B5" : "#fff", border: "none", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 13, fontWeight: 500, cursor: cards.length >= 6 ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
          + Add Card {cards.length >= 6 ? "(Max 6)" : `(${cards.length}/6)`}
        </button>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 12, padding: "2.5rem", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🃏</div>
          <div style={{ fontSize: 14, color: "#B5B5B5", marginBottom: 14 }}>No cards yet. Add at least 1 benefit card.</div>
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
                  title="Move up"
                  style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.3rem 0.65rem", fontSize: 12, cursor: idx === 0 ? "not-allowed" : "pointer", color: idx === 0 ? "#B5B5B5" : "#646464", fontFamily: "'Rubik',sans-serif" }}>↑</button>
                <button onClick={() => moveCard(idx, 1)} disabled={idx === cards.length - 1}
                  title="Move down"
                  style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.3rem 0.65rem", fontSize: 12, cursor: idx === cards.length - 1 ? "not-allowed" : "pointer", color: idx === cards.length - 1 ? "#B5B5B5" : "#646464", fontFamily: "'Rubik',sans-serif" }}>↓</button>
                <button onClick={() => removeCard(card.id)}
                  title="Remove card"
                  style={{ background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.3rem 0.65rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>✕</button>
              </div>
            </div>

            {/* Card fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field-wrap">
                <div style={{display:"flex",justifyContent:"space-between"}}><label className="field-label">Card Title <span className="req">*</span></label><span style={{fontSize:10,fontFamily:"monospace",color:(card.title||"").length>50?"#c0392b":"#B5B5B5"}}>{(card.title||"").length}/50</span></div>
                <input value={card.title}
                  onChange={e => updateCard(card.id, "title", e.target.value)}
                  placeholder='e.g. "Unmatched Performance"'
                  className="input" />
              </div>
            </div>

            <div className="field-wrap">
              <div style={{display:"flex",justifyContent:"space-between"}}><label className="field-label">Card Description <span className="req">*</span></label><span style={{fontSize:10,fontFamily:"monospace",color:(card.description||"").length>150?"#c0392b":"#B5B5B5"}}>{(card.description||"").length}/150</span></div>
              <textarea value={card.description}
                onChange={e => updateCard(card.id, "description", e.target.value)}
                placeholder="Brief description of this benefit..."
                className="textarea" style={{ minHeight: 70 }} />
            </div>
            <ImageField
              label="Card Image / Icon"
              value={card.image_ref || null}
              onChange={v => updateCard(card.id, "image_ref", v)}
              fieldKey={`key-benefits_card-${idx + 1}_image`}
              requestId={requestId}
            />
          </div>
        ))}
      </div>

      {/* Add more button */}
      {cards.length > 0 && cards.length < 6 && (
        <button onClick={addCard}
          style={{ width: "100%", marginTop: 12, background: "transparent", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "0.75rem", fontSize: 13, color: "#B5B5B5", cursor: "pointer", fontFamily: "'Rubik',sans-serif", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#3C3C3C"; e.currentTarget.style.color = "#3C3C3C"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.color = "#B5B5B5"; }}>
          + Add another card ({cards.length}/6)
        </button>
      )}
    </div>
  );
}
