"use client";
import ImageField from "@/components/ImageField";

const Field = ({ label, value, onChange, placeholder, multiline, required, hint, disabled, readOnly, style: fieldStyle }) => (
  <div className="field-wrap">
    <label className="field-label">
      {label}{required && <span className="req"> *</span>}
    </label>
    {multiline
      ? <textarea value={value} onChange={e => !disabled && !readOnly && onChange(e.target.value)} placeholder={placeholder} className="textarea" disabled={disabled} readOnly={readOnly} style={fieldStyle} />
      : <input    value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input" />
    }
    {hint && <div className="field-hint">{hint}</div>}
  </div>
);

const CARD_LABELS = ["Blog", "Webinar", "White Paper", "Case Study", "Video", "Data Sheet", "eBook", "Article", "News", "Tutorial"];

export default function RelatedContent({ data = {}, onChange, isNA, onToggleNA, aiAssistButton, naButton, requestId = "draft" }) {
  const cards = data.rc_cards || [];
  const upd   = (key, val) => onChange({ ...data, [key]: val });

  const addCard    = () => { if (cards.length >= 3) return; upd("rc_cards", [...cards, { id: `rc-${Date.now()}`, image_ref: null, label: "", title: "", description: "", link: "" }]); };
  const updateCard = (id, field, val) => upd("rc_cards", cards.map(c => c.id === id ? { ...c, [field]: val } : c));
  const removeCard = (id) => upd("rc_cards", cards.filter(c => c.id !== id));

  if (isNA) return (
    <div className="na-placeholder">
      <div className="icon">—</div>
      <div className="text">Related Content marked as Not Applicable</div>
      <button onClick={onToggleNA} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Rubik', sans-serif" }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div><h3>Related Content — Header</h3><p>Label and impact statement</p></div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {aiAssistButton}
            {naButton}
          </div>
        </div>
        <Field label="Label" value="RELATED CONTENT" onChange={() => {}} readOnly disabled style={{ background: "#F5F5F5", color: "#B5B5B5", cursor: "not-allowed" }} hint="Fixed label — not editable" />
        <Field label="Impact Statement" required value={data.rc_impact || ""} onChange={v => upd("rc_impact", v)}
          placeholder='e.g. "Discover Inspiring Success Stories..."' multiline />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Content Cards</h3>
          <p style={{ fontSize: 11, color: "#B5B5B5", marginTop: 2 }}>{cards.length}/3 cards · 3 column layout</p>
        </div>
        <button onClick={addCard} disabled={cards.length >= 3}
          style={{ background: cards.length >= 3 ? "#F3F3F3" : "#181313", color: cards.length >= 3 ? "#B5B5B5" : "#fff", border: "none", borderRadius: 8, padding: "0.45rem 1rem", fontSize: 13, fontWeight: 500, cursor: cards.length >= 3 ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
          + Add Card {cards.length >= 3 ? "(Max 3)" : `(${cards.length}/3)`}
        </button>
      </div>

      {cards.length === 0 && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: 13, color: "#B5B5B5", marginBottom: 12 }}>No cards yet. Add up to 3 content cards.</div>
          <button onClick={addCard} style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 7, padding: "0.45rem 1rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>+ Add first card</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {cards.map((card, idx) => (
          <div key={card.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #F3F3F3" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#181313", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>{idx + 1}</div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{card.title || `Card ${idx + 1}`}</span>
              </div>
              <button onClick={() => removeCard(card.id)}
                style={{ background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.25rem 0.6rem", fontSize: 11, cursor: "pointer" }}>✕</button>
            </div>

            {/* Image */}
            <div style={{ paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #F3F3F3" }}>
              <div style={{ fontSize: 11, color: "#646464", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Card Image</div>
              <Field label="Image URL" value={card.image_url} onChange={v => updateCard(card.id, "image_url", v)}
                placeholder="https://... or leave for Design QA" />
              <Field label="Image Description / Note for Design QA" value={card.image_note} onChange={v => updateCard(card.id, "image_note", v)}
                placeholder='e.g. "Circuit board close-up photograph"'
                hint="Describe the image — Design QA will source from library" />
            </div>

            {/* Category label */}
            <div className="field-wrap">
              <label className="field-label">Category Tag <span className="req">*</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {CARD_LABELS.map(l => (
                  <button key={l} type="button" onClick={() => updateCard(card.id, "label", l)}
                    style={{ background: card.label === l ? "#181313" : "#F3F3F3", color: card.label === l ? "#fff" : "#646464", border: `1px solid ${card.label === l ? "#181313" : "#E0E0E0"}`, borderRadius: 20, padding: "3px 12px", fontSize: 11, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                    {l}
                  </button>
                ))}
              </div>
              {card.label && !CARD_LABELS.includes(card.label) && (
                <input value={card.label} onChange={e => updateCard(card.id, "label", e.target.value)}
                  placeholder="Custom category tag..." className="input" style={{ marginTop: 6 }} />
              )}
              {!CARD_LABELS.includes(card.label) && (
                <button onClick={() => updateCard(card.id, "label", " ")}
                  style={{ marginTop: 6, background: "none", border: "1px dashed #E0E0E0", borderRadius: 6, padding: "0.3rem 0.8rem", fontSize: 11, color: "#B5B5B5", cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                  + Custom tag
                </button>
              )}
            </div>

            <Field label="Title" required value={card.title} onChange={v => updateCard(card.id, "title", v)}
              placeholder='e.g. "Qorvo and Cadence - GaN Discrete Power Amplifier Design"' />
            <Field label="Description" required value={card.description} onChange={v => updateCard(card.id, "description", v)}
              placeholder="Brief description of this content piece..." multiline />
            <Field label="Learn More Link" required value={card.link} onChange={v => updateCard(card.id, "link", v)}
              placeholder="/resources/... or https://..." />
          </div>
        ))}
      </div>
    </div>
  );
}
