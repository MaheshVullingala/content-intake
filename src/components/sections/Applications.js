"use client";
import { useState } from "react";
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

// ── Tabs View ──────────────────────────────────────────────────
function TabsView({ items = [], onChange, orientation, requestId = "draft" }) {
  const addTab    = () => { if (items.length >= 10) return; onChange([...items, { id: `app-tab-${Date.now()}`, title: "", description: "", image_ref: null, image_alt: "", cta_label: "", cta_link: "" }]); };
  const updateTab = (id, field, val) => onChange(items.map(t => t.id === id ? { ...t, [field]: val } : t));
  const removeTab = (id) => onChange(items.filter(t => t.id !== id));
  const moveTab   = (idx, dir) => {
    const arr = [...items]; const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    onChange(arr);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{orientation === "horizontal" ? "Horizontal" : "Vertical"} Tabs</h3>
          <p style={{ fontSize: 11, color: "#B5B5B5", marginTop: 2 }}>{items.length}/10 tabs</p>
        </div>
        <button type="button" onClick={addTab} disabled={items.length >= 10}
          style={{ background: items.length >= 10 ? "#F3F3F3" : "#181313", color: items.length >= 10 ? "#B5B5B5" : "#fff", border: "none", borderRadius: 8, padding: "0.45rem 1rem", fontSize: 13, fontWeight: 500, cursor: items.length >= 10 ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
          + Add Tab
        </button>
      </div>

      {items.length === 0 && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📑</div>
          <div style={{ fontSize: 13, color: "#B5B5B5", marginBottom: 12 }}>No tabs yet. Add at least 1 tab.</div>
          <button type="button" onClick={addTab} style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 7, padding: "0.45rem 1rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>+ Add first tab</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(Array.isArray(items) ? items : []).map((tab, idx) => (
          <div key={tab.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #F3F3F3" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#181313", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>{idx + 1}</div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#181313" }}>{tab.title || `Tab ${idx + 1}`}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => moveTab(idx, -1)} disabled={idx === 0}
                  style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.25rem 0.55rem", fontSize: 11, cursor: idx === 0 ? "not-allowed" : "pointer", color: idx === 0 ? "#B5B5B5" : "#646464" }}>↑</button>
                <button type="button" onClick={() => moveTab(idx, 1)} disabled={idx === items.length - 1}
                  style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.25rem 0.55rem", fontSize: 11, cursor: idx === items.length - 1 ? "not-allowed" : "pointer", color: idx === items.length - 1 ? "#B5B5B5" : "#646464" }}>↓</button>
                <button type="button" onClick={() => removeTab(tab.id)}
                  style={{ background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.25rem 0.55rem", fontSize: 11, cursor: "pointer" }}>✕</button>
              </div>
            </div>

            <Field label="Tab Title" required charLimit={50} value={tab.title} onChange={v => updateTab(tab.id, "title", v)} placeholder="e.g. Digital Verification" />
            <Field label="Description" required charLimit={200} value={tab.description} onChange={v => updateTab(tab.id, "description", v)} placeholder="Description for this tab..." multiline />

            <div style={{ paddingTop: 12, borderTop: "1px solid #F3F3F3", marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "#646464", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Image</div>
              <ImageField
                label="Tab Image"
                value={tab.image_ref || null}
                onChange={v => updateTab(tab.id, "image_ref", v)}
                fieldKey={`applications_tab-${idx + 1}_image`}
                requestId={requestId}
              />
              <Field label="Alt Text" required charLimit={150} value={tab.image_alt} onChange={v => updateTab(tab.id, "image_alt", v)}
                placeholder="Describe what this image shows, for screen readers"
                hint="Required for accessibility — describe what the image shows." />
            </div>

            <div style={{ paddingTop: 12, borderTop: "1px solid #F3F3F3", marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "#646464", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>CTA</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="CTA Label" value={tab.cta_label} onChange={v => updateTab(tab.id, "cta_label", v)} placeholder="e.g. Learn More" />
                <Field label="CTA Link" value={tab.cta_link} onChange={v => updateTab(tab.id, "cta_link", v)} placeholder="/products/..." />
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && items.length < 10 && (
        <button type="button" onClick={addTab}
          style={{ width: "100%", marginTop: 10, background: "transparent", border: "2px dashed #E0E0E0", borderRadius: 8, padding: "0.6rem", fontSize: 12, color: "#B5B5B5", cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#3C3C3C"; e.currentTarget.style.color = "#3C3C3C"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.color = "#B5B5B5"; }}>
          + Add another tab ({items.length}/10)
        </button>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function Applications({ data = {}, onChange, isNA, onToggleNA, aiAssistButton, naButton, requestId = "draft" }) {
  // Safely parse JSONB fields that may come as strings from Supabase
  const parseJ = (val, fb = []) => {
    if (!val) return fb;
    if (typeof val === "string") { try { return JSON.parse(val); } catch { return fb; } }
    return val;
  };

  const safeItems = parseJ(data.app_items, []);

  // Always spread parsed versions so stale string values never get re-used
  const safeData = { ...data, app_items: safeItems };
  const upd = (key, val) => onChange({ ...safeData, [key]: val });

  const VIEW_TYPES = [
    {
      key:   "tabs_horizontal",
      label: "Horizontal Tabs",
      icon:  "▭",
      desc:  "Tabs across the top",
      when:  "Best for: 3–6 distinct applications/use cases each needing a title, description and image. Users click to explore.",
    },
    {
      key:   "tabs_vertical",
      label: "Vertical Tabs",
      icon:  "▯",
      desc:  "Tabs on the left side",
      when:  "Best for: same as Horizontal Tabs but with longer tab labels or more items (up to 10). Works well for application categories.",
    },
  ];

  if (isNA) return (
    <div className="na-placeholder">
      <div className="icon">—</div>
      <div className="text">Applications section marked as Not Applicable</div>
      <button type="button" onClick={onToggleNA} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Header fields */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <h3>Applications — Header</h3>
            <p>Common fields for all view types</p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {aiAssistButton}
            {naButton}
          </div>
        </div>
        <Field label="Label" value="APPLICATIONS" onChange={() => {}} readOnly disabled style={{ background: "#F5F5F5", color: "#B5B5B5", cursor: "not-allowed" }} hint="Fixed label — not editable" />
        <Field label="Impact Statement" required value={data.app_impact || ""} onChange={v => upd("app_impact", v)}
          placeholder="e.g. Purpose-Built for Every Stage of the Design Flow"
          multiline hint="Large heading for this section" />
        <Field label="Description" charLimit={300} value={data.app_description || ""} onChange={v => upd("app_description", v)}
          placeholder="Supporting paragraph..." multiline />
      </div>

      {/* View type selector */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Select View Type</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {VIEW_TYPES.map(vt => (
            <button type="button" key={vt.key} onClick={() => { const cur = parseJ(data.app_items, []); upd("app_view_type", vt.key); if (!Array.isArray(cur)) onChange({ ...safeData, app_view_type: vt.key, app_items: [] }); }}
              style={{ background: data.app_view_type === vt.key ? "#0f2744" : "#F9F9F9", border: `2px solid ${data.app_view_type === vt.key ? "#1b5793" : "#E0E0E0"}`, borderRadius: 10, padding: "0.9rem 1rem", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{vt.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: data.app_view_type === vt.key ? "#fff" : "#181313", marginBottom: 3 }}>{vt.label}</div>
              <div style={{ fontSize: 11, color: "#B5B5B5", marginBottom: 6 }}>{vt.desc}</div>
              <div style={{ fontSize: 12, color: data.app_view_type === vt.key ? "#3ec5cb" : "#1b5793", lineHeight: 1.6, borderTop: `1px solid ${data.app_view_type === vt.key ? "#1b579344" : "#E0E0E0"}`, paddingTop: 8, marginTop: 4, fontWeight: 400 }}>{vt.when}</div>
            </button>
          ))}
        </div>
      </div>

      {/* View content */}
      {(data.app_view_type === "tabs_horizontal" || data.app_view_type === "tabs_vertical") && (
        <div className="card">
          <TabsView
            items={safeItems}
            onChange={v => upd("app_items", v)}
            orientation={data.app_view_type === "tabs_horizontal" ? "horizontal" : "vertical"}
            requestId={requestId}
          />
        </div>
      )}

      {!data.app_view_type && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#B5B5B5" }}>Select a view type above to start adding content</div>
        </div>
      )}
    </div>
  );
}
