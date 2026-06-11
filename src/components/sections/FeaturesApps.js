"use client";
import { useState } from "react";
import ImageField from "@/components/ImageField";

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

// ── List View ──────────────────────────────────────────────────
function ListView({ items = [], onChange }) {
  const addItem    = () => { if (items.length >= 20) return; onChange([...items, { id: `li-${Date.now()}`, text: "" }]); };
  const updateItem = (id, text) => onChange(items.map(i => i.id === id ? { ...i, text } : i));
  const removeItem = (id) => onChange(items.filter(i => i.id !== id));
  const moveItem   = (idx, dir) => {
    const arr = [...items]; const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    onChange(arr);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>List Items</h3>
          <p style={{ fontSize: 11, color: "#B5B5B5", marginTop: 2 }}>{items.length}/20 items · Checkmark style</p>
        </div>
        <button type="button" onClick={addItem} disabled={items.length >= 20}
          style={{ background: items.length >= 20 ? "#F3F3F3" : "#181313", color: items.length >= 20 ? "#B5B5B5" : "#fff", border: "none", borderRadius: 8, padding: "0.45rem 1rem", fontSize: 13, fontWeight: 500, cursor: items.length >= 20 ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
          + Add Item
        </button>
      </div>

      {items.length === 0 && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 13, color: "#B5B5B5", marginBottom: 12 }}>No items yet. Add at least 1 list item.</div>
          <button type="button" onClick={addItem} style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 7, padding: "0.45rem 1rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>+ Add first item</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
            <span style={{ color: "#181313", fontWeight: 600, fontSize: 14, flexShrink: 0 }}>✓</span>
            <input value={item.text} onChange={e => updateItem(item.id, e.target.value)}
              placeholder="Enter list item text..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#181313", fontFamily: "'Rubik',sans-serif" }} />
            <div style={{ display: "flex", gap: 4 }}>
              <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                style={{ background: "#fff", border: "1px solid #E0E0E0", borderRadius: 5, padding: "0.2rem 0.5rem", fontSize: 11, cursor: idx === 0 ? "not-allowed" : "pointer", color: idx === 0 ? "#B5B5B5" : "#646464" }}>↑</button>
              <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}
                style={{ background: "#fff", border: "1px solid #E0E0E0", borderRadius: 5, padding: "0.2rem 0.5rem", fontSize: 11, cursor: idx === items.length - 1 ? "not-allowed" : "pointer", color: idx === items.length - 1 ? "#B5B5B5" : "#646464" }}>↓</button>
              <button type="button" onClick={() => removeItem(item.id)}
                style={{ background: "#fff5f5", border: "1px solid #c0392b33", borderRadius: 5, padding: "0.2rem 0.5rem", fontSize: 11, cursor: "pointer", color: "#c0392b" }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && items.length < 20 && (
        <button type="button" onClick={addItem}
          style={{ width: "100%", marginTop: 10, background: "transparent", border: "2px dashed #E0E0E0", borderRadius: 8, padding: "0.6rem", fontSize: 12, color: "#B5B5B5", cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#3C3C3C"; e.currentTarget.style.color = "#3C3C3C"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.color = "#B5B5B5"; }}>
          + Add another item ({items.length}/20)
        </button>
      )}
    </div>
  );
}

// ── Tabs View ──────────────────────────────────────────────────
function TabsView({ items = [], onChange, orientation }) {
  const addTab    = () => { if (items.length >= 10) return; onChange([...items, { id: `tab-${Date.now()}`, title: "", description: "", image_ref: null, cta_label: "", cta_link: "" }]); };
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
        {items.map((tab, idx) => (
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

            <Field label="Tab Title" required value={tab.title} onChange={v => updateTab(tab.id, "title", v)} placeholder="e.g. Verisium Manager" />
            <Field label="Description" required value={tab.description} onChange={v => updateTab(tab.id, "description", v)} placeholder="Description for this tab..." multiline />

            <div style={{ paddingTop: 12, borderTop: "1px solid #F3F3F3", marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "#646464", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Image</div>
              <ImageField
                label="Tab Image"
                value={tab.image_ref || null}
                onChange={v => updateTab(tab.id, "image_ref", v)}
                fieldKey={`features-apps_tab-${idx + 1}_image`}
                requestId={requestId}
              />
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

// ── Table View ─────────────────────────────────────────────────
function TableView({ columns = [], rows = [], onUpdate }) {
  const addColumn = () => {
    if (columns.length >= 6) return;
    const newCol = { id: `col-${Date.now()}`, header: "" };
    const newCols = [...columns, newCol];
    onUpdate({ fa_columns: newCols, fa_rows: rows.map(r => ({ ...r, [newCol.id]: "" })) });
  };

  const removeColumn = (colId) => {
    onUpdate({
      fa_columns: columns.filter(c => c.id !== colId),
      fa_rows: rows.map(r => { const nr = { ...r }; delete nr[colId]; return nr; })
    });
  };

  const updateColumnHeader = (colId, val) => {
    onUpdate({ fa_columns: columns.map(c => c.id === colId ? { ...c, header: val } : c), fa_rows: rows });
  };

  const addRow = () => {
    if (rows.length >= 20) return;
    const newRow = { id: `row-${Date.now()}` };
    columns.forEach(c => { newRow[c.id] = ""; });
    onUpdate({ fa_columns: columns, fa_rows: [...rows, newRow] });
  };

  const removeRow = (rowId) => onUpdate({ fa_columns: columns, fa_rows: rows.filter(r => r.id !== rowId) });

  const updateCell = (rowId, colId, val) => {
    onUpdate({ fa_columns: columns, fa_rows: rows.map(r => r.id === rowId ? { ...r, [colId]: val } : r) });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Table</h3>
          <p style={{ fontSize: 11, color: "#B5B5B5", marginTop: 2 }}>{columns.length}/6 columns · {rows.length}/20 rows</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={addColumn} disabled={columns.length >= 6}
            style={{ background: "#F3F3F3", color: columns.length >= 6 ? "#B5B5B5" : "#3C3C3C", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.45rem 0.9rem", fontSize: 12, fontWeight: 500, cursor: columns.length >= 6 ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
            + Column
          </button>
          <button type="button" onClick={addRow} disabled={rows.length >= 20 || columns.length === 0}
            style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 7, padding: "0.45rem 0.9rem", fontSize: 12, fontWeight: 500, cursor: rows.length >= 20 || columns.length === 0 ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", opacity: columns.length === 0 ? 0.4 : 1 }}>
            + Row
          </button>
        </div>
      </div>

      {columns.length === 0 && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, color: "#B5B5B5", marginBottom: 12 }}>Start by adding columns, then add rows.</div>
          <button type="button" onClick={addColumn} style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 7, padding: "0.45rem 1rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>+ Add first column</button>
        </div>
      )}

      {columns.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #E0E0E0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: columns.length * 180 }}>
            {/* Column headers */}
            <thead>
              <tr style={{ background: "#181313" }}>
                <th style={{ width: 36, padding: "0.5rem", borderRight: "1px solid #2e2a2a" }}>
                  <span style={{ fontSize: 10, color: "#646464" }}>#</span>
                </th>
                {columns.map((col, idx) => (
                  <th key={col.id} style={{ padding: "0.5rem 0.75rem", borderRight: idx < columns.length - 1 ? "1px solid #2e2a2a" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input value={col.header} onChange={e => updateColumnHeader(col.id, e.target.value)}
                        placeholder={`Column ${idx + 1} header`}
                        style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#F3F3F3", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }} />
                      <button type="button" onClick={() => removeColumn(col.id)}
                        style={{ background: "transparent", border: "none", color: "#646464", cursor: "pointer", fontSize: 12, padding: "0 2px", flexShrink: 0 }}>✕</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} style={{ padding: "1.5rem", textAlign: "center", color: "#B5B5B5", fontSize: 13 }}>
                    No rows yet. Click "+ Row" to add data.
                  </td>
                </tr>
              )}
              {rows.map((row, rIdx) => (
                <tr key={row.id} style={{ background: rIdx % 2 === 0 ? "#fff" : "#F9F9F9", borderTop: "1px solid #F3F3F3" }}>
                  <td style={{ padding: "0.4rem 0.6rem", borderRight: "1px solid #F3F3F3", textAlign: "center" }}>
                    <button type="button" onClick={() => removeRow(row.id)}
                      style={{ background: "transparent", border: "none", color: "#c0392b", cursor: "pointer", fontSize: 12 }}>✕</button>
                  </td>
                  {columns.map((col, cIdx) => (
                    <td key={col.id} style={{ padding: "0.4rem", borderRight: cIdx < columns.length - 1 ? "1px solid #F3F3F3" : "none" }}>
                      <input value={row[col.id] || ""} onChange={e => updateCell(row.id, col.id, e.target.value)}
                        placeholder="..."
                        style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#181313", fontFamily: "'Rubik',sans-serif", padding: "0.2rem 0.4rem", boxSizing: "border-box" }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {columns.length > 0 && rows.length < 20 && (
        <button type="button" onClick={addRow}
          style={{ width: "100%", marginTop: 10, background: "transparent", border: "2px dashed #E0E0E0", borderRadius: 8, padding: "0.6rem", fontSize: 12, color: "#B5B5B5", cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#3C3C3C"; e.currentTarget.style.color = "#3C3C3C"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.color = "#B5B5B5"; }}>
          + Add row ({rows.length}/20)
        </button>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function FeaturesApps({ data = {}, onChange, isNA, onToggleNA, aiAssistButton, naButton, requestId = "draft" }) {
  // Safely parse JSONB fields that may come as strings from Supabase
  const parseJ = (val, fb = []) => {
    if (!val) return fb;
    if (typeof val === "string") { try { return JSON.parse(val); } catch { return fb; } }
    return val;
  };

  const safeColumns = parseJ(data.fa_columns, []);
  const safeRows    = parseJ(data.fa_rows,    []);
  const safeItems   = parseJ(data.fa_items,   []);

  // Always spread parsed versions so stale string values never get re-used
  const safeData = { ...data, fa_columns: safeColumns, fa_rows: safeRows, fa_items: safeItems };
  const upd = (key, val) => onChange({ ...safeData, [key]: val });

  const VIEW_TYPES = [
    { key: "list",             label: "List",             icon: "✓", desc: "Checkmark bullet list" },
    { key: "tabs_horizontal",  label: "Horizontal Tabs",  icon: "▭", desc: "Tabs across the top" },
    { key: "tabs_vertical",    label: "Vertical Tabs",    icon: "▯", desc: "Tabs on the left side" },
    { key: "table",            label: "Table",            icon: "⊞", desc: "Rows and columns" },
  ];

  if (isNA) return (
    <div className="na-placeholder">
      <div className="icon">—</div>
      <div className="text">Features / Applications section marked as Not Applicable</div>
      <button type="button" onClick={onToggleNA} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Header fields */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <h3>Features / Applications — Header</h3>
            <p>Common fields for all view types</p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {aiAssistButton}
            {naButton}
          </div>
        </div>
        <Field label="Label" value={data.fa_label || ""} onChange={v => upd("fa_label", v)}
          placeholder='e.g. "FEATURES" or "APPLICATIONS"'
          hint="Small caps tag above the heading (optional)" />
        <Field label="Impact Statement" required value={data.fa_impact || ""} onChange={v => upd("fa_impact", v)}
          placeholder="e.g. Transforming Semiconductor Design with Cadence Cerebrus AI Studio"
          multiline hint="Large heading for this section" />
        <Field label="Description" value={data.fa_description || ""} onChange={v => upd("fa_description", v)}
          placeholder="Supporting paragraph..." multiline />
      </div>

      {/* View type selector */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Select View Type</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {VIEW_TYPES.map(vt => (
            <button type="button" key={vt.key} onClick={() => upd("fa_view_type", vt.key)}
              style={{ background: data.fa_view_type === vt.key ? "#181313" : "#F9F9F9", border: `2px solid ${data.fa_view_type === vt.key ? "#181313" : "#E0E0E0"}`, borderRadius: 10, padding: "0.9rem 1rem", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{vt.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: data.fa_view_type === vt.key ? "#F3F3F3" : "#181313" }}>{vt.label}</div>
              <div style={{ fontSize: 11, color: data.fa_view_type === vt.key ? "#B5B5B5" : "#B5B5B5", marginTop: 2 }}>{vt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* View content */}
      {data.fa_view_type === "list" && (
        <div className="card">
          <ListView
            items={safeItems}
            onChange={v => upd("fa_items", v)}
          />
        </div>
      )}

      {(data.fa_view_type === "tabs_horizontal" || data.fa_view_type === "tabs_vertical") && (
        <div className="card">
          <TabsView
            items={safeItems}
            onChange={v => upd("fa_items", v)}
            orientation={data.fa_view_type === "tabs_horizontal" ? "horizontal" : "vertical"}
          />
        </div>
      )}

      {data.fa_view_type === "table" && (
        <div className="card">
          <TableView
            columns={safeColumns}
            rows={safeRows}
            onUpdate={({ fa_columns, fa_rows }) => onChange({ ...safeData, fa_columns, fa_rows })}
          />
        </div>
      )}

      {!data.fa_view_type && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#B5B5B5" }}>Select a view type above to start adding content</div>
        </div>
      )}
    </div>
  );
}
