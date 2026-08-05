"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CHAR_LIMITS, AUDIT_ACTIONS } from "@/lib/constants";
import { logAudit } from "@/lib/auditLogger";
import { useCharLimits } from "@/lib/charLimits";

// Sub-field char limits for JSONB card/item arrays — not covered by the
// top-level CHAR_LIMITS map in constants.js, so kept local to this modal.
// One shared set applied across every section's card items (not
// per-section-granular) — admin-overridable via char_limit_overrides,
// same table AdminPanel.js's Char Limits tab writes to.
const DEFAULT_ITEM_LIMITS = { title: 60, description: 200, quote: 300, customer: 60 };

const VIEW_TYPE_LABELS = {
  list: "List", tabs_horizontal: "Horizontal Tabs",
  tabs_vertical: "Vertical Tabs", table: "Table",
};

// Which scalar fields + which array field (if any) each section exposes.
// Exported so ProposeChangePanel.js can build readable field labels for a
// stakeholder-proposed change diff without duplicating this map.
export const SECTION_CONFIG = {
  banner: {
    title: "Banner",
    fields: [
      { key: "page_title", label: "Page Title" },
      { key: "sub_title",  label: "Sub Title" },
      { key: "cta1_label", label: "CTA 1 Label" },
      { key: "cta1_link",  label: "CTA 1 Link" },
      { key: "cta2_label", label: "CTA 2 Label" },
      { key: "cta2_link",  label: "CTA 2 Link" },
    ],
  },
  overview: {
    title: "Overview",
    fields: [
      { key: "overview_label",       label: "Label" },
      { key: "overview_impact",      label: "Impact Statement", multiline: true },
      { key: "overview_description", label: "Description",      multiline: true },
    ],
  },
  key_benefits: {
    title: "Key Benefits",
    fields: [
      { key: "kb_label",       label: "Label" },
      { key: "kb_impact",      label: "Impact Statement", multiline: true },
      { key: "kb_description", label: "Description",      multiline: true },
    ],
    arrayField: { key: "kb_cards", itemLabel: "Benefit", itemFields: ["title", "description"] },
  },
  features_apps: {
    title: "Features / Applications",
    fields: [
      { key: "fa_label",       label: "Label" },
      { key: "fa_impact",      label: "Impact Statement", multiline: true },
      { key: "fa_description", label: "Description",      multiline: true },
    ],
    custom: "features_apps", // handled by the dedicated fa_* renderer below, not the generic arrayField path
  },
  customer_stories: {
    title: "Customer Stories",
    fields: [
      { key: "cs_label",  label: "Label" },
      { key: "cs_impact", label: "Impact Statement", multiline: true },
    ],
    arrayField: { key: "cs_items", itemLabel: "Story", itemFields: ["quote", "customer"] },
  },
  promo_section: {
    title: "Promo Section",
    fields: [
      { key: "promo_label",       label: "Label" },
      { key: "promo_title",       label: "Title",       multiline: true },
      { key: "promo_description", label: "Description", multiline: true },
      { key: "promo_btn_label",   label: "Button Label" },
      { key: "promo_btn_link",    label: "Button Link" },
    ],
  },
  related_content: {
    title: "Related Content",
    fields: [
      { key: "rc_label",  label: "Label" },
      { key: "rc_impact", label: "Impact Statement", multiline: true },
    ],
    arrayField: { key: "rc_cards", itemLabel: "Card", itemFields: ["title", "description"] },
  },
  resources: {
    title: "Resources",
    fields: [
      { key: "res_label",  label: "Label" },
      { key: "res_impact", label: "Impact Statement", multiline: true },
    ],
  },
  related_products: {
    title: "Related Products",
    fields: [
      { key: "rp_label",       label: "Label" },
      { key: "rp_impact",      label: "Impact Statement", multiline: true },
      { key: "rp_description", label: "Description",      multiline: true },
    ],
    arrayField: { key: "rp_cards", itemLabel: "Product", itemFields: ["title", "description"] },
  },
  training_support: {
    title: "Training & Support",
    fields: [
      { key: "ts_label",             label: "Label" },
      { key: "ts_impact",            label: "Impact Statement", multiline: true },
      { key: "ts_card1_title",       label: "Card 1 — Title" },
      { key: "ts_card1_description", label: "Card 1 — Description", multiline: true },
      { key: "ts_card1_cta_label",   label: "Card 1 — CTA Label" },
      { key: "ts_card2_title",       label: "Card 2 — Title" },
      { key: "ts_card2_description", label: "Card 2 — Description", multiline: true },
      { key: "ts_card2_cta_label",   label: "Card 2 — CTA Label" },
      { key: "ts_card3_title",       label: "Card 3 — Title" },
      { key: "ts_card3_description", label: "Card 3 — Description", multiline: true },
      { key: "ts_card3_cta_label",   label: "Card 3 — CTA Label" },
    ],
  },
  seo_meta: {
    title: "SEO Meta Data",
    fields: [
      { key: "seo_page_location",        label: "Page Location" },
      { key: "seo_meta_title",           label: "Meta Title" },
      { key: "seo_meta_description",     label: "Meta Description",  multiline: true },
      { key: "seo_meta_keywords",        label: "Meta Keywords",     multiline: true },
    ],
  },
};

const ITEM_FIELD_LABELS = { title: "Title", description: "Description", quote: "Quote", customer: "Customer" };

const parseJSON = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

function CharCount({ value, limit }) {
  if (!limit) return null;
  const len  = (value || "").length;
  const cls  = len > limit ? "over" : len > limit * 0.85 ? "warn" : "ok";
  return <span className={`field-char-count ${cls}`}>{len}/{limit}</span>;
}

function EditField({ label, value, onChange, multiline, limit }) {
  return (
    <div className="field-wrap">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <label className="field-label" style={{ margin: 0 }}>{label}</label>
        <CharCount value={value} limit={limit} />
      </div>
      {multiline
        ? <textarea className="textarea" rows={3} value={value} onChange={e => onChange(e.target.value)} />
        : <input className="input" type="text" value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

export default function EditSectionModal({
  section = null, data = {}, requestId, supabase, user, onClose, onSaved,
  // When true, Save does NOT write to `requests` or log an audit entry —
  // it just hands the built payload to onSaved(payload, section) and lets
  // the caller decide what to do with it (used by ProposeChangePanel to
  // stage a stakeholder-proposed change for admin review instead of
  // applying it immediately). Default false preserves the original
  // immediate-write behavior for every existing caller.
  deferApply = false,
}) {
  const ITEM_LIMITS = useCharLimits(supabase, DEFAULT_ITEM_LIMITS);
  // section=null → no section chosen yet; show a picker first. allowPicker
  // stays true for the modal's lifetime even after a section is picked, so
  // a "← Back" control can return to the picker (only relevant when the
  // caller didn't pass a concrete section up front).
  const allowPicker = !section;
  const [pickedSection, setPickedSection] = useState(section);
  const config = SECTION_CONFIG[pickedSection];

  const [values,    setValues]    = useState({});
  const [items,     setItems]     = useState([]);
  const [visible,   setVisible]   = useState([]);
  const [faItems,   setFaItems]   = useState([]);
  const [faColumns, setFaColumns] = useState([]);
  const [faRows,    setFaRows]    = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    if (!config) return;
    const vals = {};
    const vis  = [];
    config.fields.forEach(f => {
      const v = data[f.key] || "";
      if (v.trim?.() || v) { vals[f.key] = v; vis.push(f); }
    });
    setValues(vals);
    setVisible(vis);
    setItems(config.arrayField ? parseJSON(data[config.arrayField.key]) : []);
    if (config.custom === "features_apps") {
      setFaItems(parseJSON(data.fa_items));
      setFaColumns(parseJSON(data.fa_columns));
      setFaRows(parseJSON(data.fa_rows));
    }
    setError("");
  }, [pickedSection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Picker mode — no section chosen yet, show a list to pick from
  if (allowPicker && !pickedSection) {
    return createPortal(
      <div
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "1rem",
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "#fff", borderRadius: 12, width: "100%", maxWidth: 440,
            maxHeight: "80vh", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            padding: "1.1rem 1.5rem", borderBottom: "1px solid var(--color-border)",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
          }}>
            <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600 }}>
              Select a Section to Edit
            </h3>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--color-silver)", lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1 }}>
            <div className="flex-col gap-8">
              {Object.entries(SECTION_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setPickedSection(key)}
                  style={{
                    textAlign: "left", padding: "0.75rem 1rem",
                    border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)",
                    background: "var(--color-ghost)", cursor: "pointer",
                    fontFamily: "'Rubik',sans-serif", fontSize: 14, color: "var(--color-night)",
                  }}
                >
                  {cfg.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (!config) return null;

  const updateValue = (key, v) => setValues(prev => ({ ...prev, [key]: v }));
  const updateItem  = (idx, key, v) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: v } : it));

  const updateFaItem         = (idx, key, v) => setFaItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: v } : it));
  const updateFaColumnHeader = (idx, v)      => setFaColumns(prev => prev.map((c, i) => i === idx ? { ...c, header: v } : c));
  const updateFaCell         = (rowIdx, colId, v) => setFaRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [colId]: v } : r));

  const hasArrayItems = config.arrayField && items.length > 0;
  const isFeaturesApps = config.custom === "features_apps";
  const faViewType     = data.fa_view_type || "";
  const faIsTable       = faViewType === "table";
  const faHasContent    = isFeaturesApps && (faIsTable ? faColumns.length > 0 : faItems.length > 0);
  const isEmpty = visible.length === 0 && !hasArrayItems && !faHasContent;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const payload = { ...values };
    if (config.arrayField) payload[config.arrayField.key] = items;
    if (isFeaturesApps) {
      if (faIsTable) { payload.fa_columns = faColumns; payload.fa_rows = faRows; }
      else            { payload.fa_items = faItems; }
    }

    if (deferApply) {
      // Staged mode — nothing written yet, caller (ProposeChangePanel)
      // accumulates this section's payload into a pending changeset.
      setSaving(false);
      onSaved?.(payload, pickedSection);
      return;
    }

    const { error: err } = await supabase.from("requests").update(payload).eq("id", requestId);
    setSaving(false);
    if (err) { setError(err.message || "Failed to save."); return; }
    logAudit(supabase, user, AUDIT_ACTIONS.CONTENT_EDITED, "request", requestId, {
      field_name: section,
    });
    onSaved?.();
  };

  const modal = (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 12, width: "100%", maxWidth: 640,
          maxHeight: "80vh", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "1.1rem 1.5rem", borderBottom: "1px solid var(--color-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
            {allowPicker && (
              <button
                onClick={() => setPickedSection(null)}
                title="Back to section list"
                style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "var(--color-silver)", padding: 0 }}
              >
                ←
              </button>
            )}
            Edit {config.title}
          </h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--color-silver)", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1 }}>
          {isEmpty && (
            <div className="text-sm text-muted" style={{ textAlign: "center", padding: "1.5rem 0" }}>
              This section has no content yet.
            </div>
          )}

          {visible.map(f => (
            <EditField
              key={f.key}
              label={f.label}
              value={values[f.key] || ""}
              multiline={f.multiline}
              limit={CHAR_LIMITS[f.key]}
              onChange={v => updateValue(f.key, v)}
            />
          ))}

          {hasArrayItems && (
            <div className="flex-col gap-8" style={{ marginTop: visible.length ? 8 : 0 }}>
              {items.map((item, idx) => (
                <div key={item.id || idx} style={{
                  border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)",
                  padding: "0.9rem 1rem", background: "var(--color-ghost)",
                }}>
                  <div className="text-xs text-uppercase text-muted" style={{ marginBottom: 8, fontWeight: 600 }}>
                    {config.arrayField.itemLabel} {idx + 1}
                  </div>
                  {config.arrayField.itemFields.map(fk => (
                    <EditField
                      key={fk}
                      label={ITEM_FIELD_LABELS[fk] || fk}
                      value={item[fk] || ""}
                      multiline={fk === "description" || fk === "quote"}
                      limit={ITEM_LIMITS[fk]}
                      onChange={v => updateItem(idx, fk, v)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {faHasContent && (
            <div style={{ marginTop: visible.length ? 8 : 0 }}>
              <div className="text-xs text-uppercase text-muted" style={{ marginBottom: 10 }}>
                View Type: <strong style={{ color: "var(--color-night)" }}>{VIEW_TYPE_LABELS[faViewType] || faViewType}</strong>
                <span style={{ marginLeft: 6, fontWeight: 400, textTransform: "none" }}>(fixed — can't be changed here)</span>
              </div>

              {faViewType === "list" && faItems.map((item, idx) => (
                <div className="field-wrap" key={item.id || idx}>
                  <label className="field-label">Item {idx + 1}</label>
                  <input className="input" value={item.text || ""} onChange={e => updateFaItem(idx, "text", e.target.value)} />
                </div>
              ))}

              {(faViewType === "tabs_horizontal" || faViewType === "tabs_vertical") && faItems.map((item, idx) => (
                <div key={item.id || idx} style={{
                  border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)",
                  padding: "0.9rem 1rem", background: "var(--color-ghost)", marginBottom: 10,
                }}>
                  <div className="text-xs text-uppercase text-muted" style={{ marginBottom: 8, fontWeight: 600 }}>Tab {idx + 1}</div>
                  <EditField label="Title"       value={item.title || ""}       onChange={v => updateFaItem(idx, "title", v)} />
                  <EditField label="Description" value={item.description || ""} onChange={v => updateFaItem(idx, "description", v)} multiline />
                  <EditField label="CTA Label"   value={item.cta_label || ""}   onChange={v => updateFaItem(idx, "cta_label", v)} />
                  <EditField label="CTA Link"    value={item.cta_link || ""}    onChange={v => updateFaItem(idx, "cta_link", v)} />
                </div>
              ))}

              {faIsTable && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {faColumns.map((col, ci) => (
                          <th key={col.id} style={{ padding: "4px 6px" }}>
                            <input className="input" value={col.header || ""} onChange={e => updateFaColumnHeader(ci, e.target.value)} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {faRows.map((row, ri) => (
                        <tr key={row.id || ri}>
                          {faColumns.map(col => (
                            <td key={col.id} style={{ padding: "4px 6px" }}>
                              <input className="input" value={row[col.id] || ""} onChange={e => updateFaCell(ri, col.id, e.target.value)} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {error && <div className="alert alert-error mt-8">{error}</div>}
        </div>

        {/* Footer */}
        <div style={{
          padding: "1rem 1.5rem", borderTop: "1px solid var(--color-border)",
          display: "flex", gap: 8, flexShrink: 0,
        }}>
          <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          {!isEmpty && (
            <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
