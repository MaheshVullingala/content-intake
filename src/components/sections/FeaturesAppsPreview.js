"use client";
import { useState } from "react";
import { getImageUrl, getImagePlaceholder } from "@/lib/imageRef";

export default function FeaturesAppsPreview({ data = {} }) {
  const {
    fa_label = "", fa_impact = "", fa_description = "",
    fa_view_type = "", fa_items = [], fa_columns = [], fa_rows = [],
  } = data;

  const [activeTab, setActiveTab] = useState(0);

  const hasContent = fa_impact || fa_items.length > 0 || fa_columns.length > 0;
  if (!hasContent) return null;

  return (
    <div style={{ background: "#ffffff", width: "100%", boxSizing: "border-box", fontFamily: "'Rubik', sans-serif" }}>
      <div className="section-container">

        {/* Label */}
        <div style={{ fontSize: 11, fontWeight: 600, color: fa_label ? "#646464" : "#E0E0E0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          {fa_label || "FEATURES"}
        </div>

        {/* Impact Statement */}
        {fa_impact ? (
          <h2 style={{ fontSize: 28, fontWeight: 400, color: "#181313", lineHeight: 1.3, marginBottom: fa_description ? 16 : 32, wordBreak: "break-word" }}>
            {fa_impact}
          </h2>
        ) : (
          <h2 style={{ fontSize: 28, fontWeight: 400, color: "#E0E0E0", lineHeight: 1.3, marginBottom: 32, fontStyle: "italic" }}>
            Impact statement goes here...
          </h2>
        )}

        {/* Description */}
        {fa_description && (
          <p style={{ fontSize: 15, color: "#3C3C3C", lineHeight: 1.75, marginBottom: 32, wordBreak: "break-word" }}>
            {fa_description}
          </p>
        )}

        {/* ── List View ── */}
        {fa_view_type === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {fa_items.length === 0 && (
              <div style={{ color: "#E0E0E0", fontSize: 14, fontStyle: "italic" }}>List items will appear here...</div>
            )}
            {fa_items.map((item, i) => (
              <div key={item.id || i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{ color: "#181313", fontWeight: 500, fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
                <p style={{ fontSize: 15, color: "#3C3C3C", lineHeight: 1.7, margin: 0, wordBreak: "break-word" }}>
                  {item.text || <span style={{ color: "#E0E0E0", fontStyle: "italic" }}>List item text...</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Horizontal Tabs ── */}
        {fa_view_type === "tabs_horizontal" && fa_items.length > 0 && (
          <div>
            <div style={{ display: "flex", borderBottom: "1px solid #E0E0E0", marginBottom: 28, overflowX: "auto", gap: 0 }}>
              {fa_items.map((tab, i) => (
                <button key={tab.id || i} onClick={() => setActiveTab(i)}
                  style={{ background: "none", border: "none", borderBottom: i === activeTab ? "2px solid #181313" : "2px solid transparent", padding: "0.75rem 1.2rem", fontSize: 14, fontWeight: i === activeTab ? 500 : 400, color: i === activeTab ? "#181313" : "#646464", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Rubik',sans-serif", marginBottom: -1, transition: "all 0.15s" }}>
                  {tab.title || `Tab ${i + 1}`}
                </button>
              ))}
            </div>
            {fa_items[activeTab] && (
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 500, color: "#181313", marginBottom: 16 }}>{fa_items[activeTab].title}</h3>
                {getImageUrl(fa_items[activeTab].image_ref) && (
                  <img src={getImageUrl(fa_items[activeTab].image_ref)} alt={fa_items[activeTab].title}
                    style={{ width: "100%", maxHeight: 340, objectFit: "cover", borderRadius: 8, marginBottom: 20, border: "1px solid #E0E0E0" }}
                    onError={e => { e.target.style.display = "none"; }} />
                )}
                {!getImageUrl(fa_items[activeTab].image_ref) && getImagePlaceholder(fa_items[activeTab].image_ref) && (
                  <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 8, padding: "1.5rem", marginBottom: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#B5B5B5" }}>🎨 {getImagePlaceholder(fa_items[activeTab].image_ref)}</div>
                  </div>
                )}
                <p style={{ fontSize: 15, color: "#3C3C3C", lineHeight: 1.75, marginBottom: 20, wordBreak: "break-word" }}>{fa_items[activeTab].description}</p>
                {fa_items[activeTab].cta_label && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#181313", letterSpacing: "0.05em", textTransform: "uppercase", cursor: "default" }}>
                    {fa_items[activeTab].cta_label} →
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Vertical Tabs ── */}
        {fa_view_type === "tabs_vertical" && fa_items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {fa_items.map((tab, i) => (
                <button key={tab.id || i} onClick={() => setActiveTab(i)}
                  style={{ background: "none", border: "none", borderLeft: i === activeTab ? "2px solid #181313" : "2px solid transparent", padding: "0.6rem 1rem", fontSize: 14, fontWeight: i === activeTab ? 500 : 400, color: i === activeTab ? "#181313" : "#646464", cursor: "pointer", textAlign: "left", fontFamily: "'Rubik',sans-serif", transition: "all 0.15s", lineHeight: 1.4 }}>
                  {tab.title || `Tab ${i + 1}`}
                </button>
              ))}
            </div>
            {fa_items[activeTab] && (
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 500, color: "#181313", marginBottom: 16 }}>{fa_items[activeTab].title}</h3>
                {getImageUrl(fa_items[activeTab].image_ref) && (
                  <img src={getImageUrl(fa_items[activeTab].image_ref)} alt={fa_items[activeTab].title}
                    style={{ width: "100%", maxHeight: 340, objectFit: "cover", borderRadius: 8, marginBottom: 20, border: "1px solid #E0E0E0" }}
                    onError={e => { e.target.style.display = "none"; }} />
                )}
                {!getImageUrl(fa_items[activeTab].image_ref) && getImagePlaceholder(fa_items[activeTab].image_ref) && (
                  <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 8, padding: "1.5rem", marginBottom: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#B5B5B5" }}>🎨 {getImagePlaceholder(fa_items[activeTab].image_ref)}</div>
                  </div>
                )}
                <p style={{ fontSize: 15, color: "#3C3C3C", lineHeight: 1.75, marginBottom: 20, wordBreak: "break-word" }}>{fa_items[activeTab].description}</p>
                {fa_items[activeTab].cta_label && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#181313", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {fa_items[activeTab].cta_label} →
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Table View ── */}
        {fa_view_type === "table" && fa_columns.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E0E0E0" }}>
                  {fa_columns.map((col, i) => (
                    <th key={col.id || i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#181313", borderRight: i < fa_columns.length - 1 ? "1px solid #F3F3F3" : "none" }}>
                      {col.header || `Column ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fa_rows.length === 0 && (
                  <tr>
                    <td colSpan={fa_columns.length} style={{ padding: "1rem", color: "#E0E0E0", fontSize: 13, fontStyle: "italic" }}>
                      Table rows will appear here...
                    </td>
                  </tr>
                )}
                {fa_rows.map((row, rIdx) => (
                  <tr key={row.id || rIdx} style={{ borderBottom: "1px solid #F3F3F3", background: rIdx % 2 === 0 ? "#fff" : "#F9F9F9" }}>
                    {fa_columns.map((col, cIdx) => (
                      <td key={col.id || cIdx} style={{ padding: "0.85rem 1rem", fontSize: 14, color: "#3C3C3C", lineHeight: 1.6, borderRight: cIdx < fa_columns.length - 1 ? "1px solid #F3F3F3" : "none", wordBreak: "break-word" }}>
                        {row[col.id] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* No view selected placeholder */}
        {!fa_view_type && (
          <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#B5B5B5" }}>Select a view type to see the preview</div>
          </div>
        )}

      </div>
    </div>
  );
}
