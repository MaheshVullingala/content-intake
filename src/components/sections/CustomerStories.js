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

export default function CustomerStories({ data = {}, onChange, isNA, onToggleNA, aiAssistButton, naButton, requestId = "draft" }) {
  const items = data.cs_items || [];
  const upd   = (key, val) => onChange({ ...data, [key]: val });

  const addItem    = () => { if (items.length >= 10) return; upd("cs_items", [...items, { id: `cs-${Date.now()}`, quote: "", customer: "", logo_ref: null }]); };
  const updateItem = (id, field, val) => upd("cs_items", items.map(i => i.id === id ? { ...i, [field]: val } : i));
  const removeItem = (id) => upd("cs_items", items.filter(i => i.id !== id));
  const moveItem   = (idx, dir) => {
    const arr = [...items]; const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    upd("cs_items", arr);
  };

  if (isNA) return (
    <div className="na-placeholder">
      <div className="icon">—</div>
      <div className="text">Customer Stories marked as Not Applicable</div>
      <button onClick={onToggleNA} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Rubik', sans-serif" }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div><h3>Customer Stories — Header</h3><p>Label and impact statement</p></div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {aiAssistButton}
            {naButton}
          </div>
        </div>
        <Field label="Label" value="CUSTOMER STORIES" onChange={() => {}} readOnly disabled style={{ background: "#F5F5F5", color: "#B5B5B5", cursor: "not-allowed" }} hint="Fixed label — not editable" />
        <Field label="Impact Statement" required value={data.cs_impact || ""} onChange={v => upd("cs_impact", v)}
          placeholder='e.g. "See What Customers Have to Say"' multiline />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Customer Quotes</h3>
          <p style={{ fontSize: 11, color: "#B5B5B5", marginTop: 2 }}>{items.length}/10 quotes · Carousel display</p>
        </div>
        <button onClick={addItem} disabled={items.length >= 10}
          style={{ background: items.length >= 10 ? "#F3F3F3" : "#181313", color: items.length >= 10 ? "#B5B5B5" : "#fff", border: "none", borderRadius: 8, padding: "0.45rem 1rem", fontSize: 13, fontWeight: 500, cursor: items.length >= 10 ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
          + Add Quote
        </button>
      </div>

      {items.length === 0 && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
          <div style={{ fontSize: 13, color: "#B5B5B5", marginBottom: 12 }}>No quotes yet. Add at least 1 customer quote.</div>
          <button onClick={addItem} style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 7, padding: "0.45rem 1rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>+ Add first quote</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item, idx) => (
          <div key={item.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #F3F3F3" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#181313", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>{idx + 1}</div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#181313" }}>{item.customer || `Quote ${idx + 1}`}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                  style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.25rem 0.55rem", fontSize: 11, cursor: idx === 0 ? "not-allowed" : "pointer", color: idx === 0 ? "#B5B5B5" : "#646464" }}>↑</button>
                <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}
                  style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.25rem 0.55rem", fontSize: 11, cursor: idx === items.length - 1 ? "not-allowed" : "pointer", color: idx === items.length - 1 ? "#B5B5B5" : "#646464" }}>↓</button>
                <button onClick={() => removeItem(item.id)}
                  style={{ background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.25rem 0.55rem", fontSize: 11, cursor: "pointer" }}>✕</button>
              </div>
            </div>
            <Field label="Customer Quote" required value={item.quote}
              onChange={v => updateItem(item.id, "quote", v)}
              placeholder='"These simulations are more than just experiments..."'
              multiline hint="The full testimonial text — do not include quotes, they will be added automatically" />
            <Field label="Customer Details" charLimit={100} required value={item.customer}
              onChange={v => updateItem(item.id, "customer", v)}
              placeholder="e.g. Joe Citeno, GE Power"
              hint="Name and company of the customer" />
            <ImageField
              label="Customer Logo"
              value={item.logo_ref || null}
              onChange={v => updateItem(item.id, "logo_ref", v)}
              fieldKey={`customer-stories_item-${idx + 1}_logo`}
              requestId={requestId}
            />
          </div>
        ))}
      </div>

      {items.length > 0 && items.length < 10 && (
        <button onClick={addItem}
          style={{ width: "100%", marginTop: 10, background: "transparent", border: "2px dashed #E0E0E0", borderRadius: 8, padding: "0.6rem", fontSize: 12, color: "#B5B5B5", cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#3C3C3C"; e.currentTarget.style.color = "#3C3C3C"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.color = "#B5B5B5"; }}>
          + Add another quote ({items.length}/10)
        </button>
      )}
    </div>
  );
}
