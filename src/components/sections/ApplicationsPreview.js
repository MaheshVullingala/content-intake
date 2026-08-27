"use client";
import { useState } from "react";
import { getDesignImage, getImagePlaceholder } from "@/lib/imageRef";

export default function ApplicationsPreview({ data = {}, attachments = [] }) {
  const {
    app_label = "", app_impact = "", app_description = "",
    app_view_type = "", app_items = [],
  } = data;

  const [activeTab, setActiveTab] = useState(0);
  const activeTabImage = getDesignImage(`app_item_${activeTab + 1}_image`, attachments);

  const hasContent = app_impact || app_items.length > 0;
  if (!hasContent) return null;

  return (
    <div style={{ background: "#ffffff", width: "100%", boxSizing: "border-box", fontFamily: "'Rubik', sans-serif" }}>
      <div className="section-container">

        {/* Label */}
        <div style={{ fontSize: 11, fontWeight: 600, color: app_label ? "#646464" : "#E0E0E0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          {app_label || "APPLICATIONS"}
        </div>

        {/* Impact Statement */}
        {app_impact ? (
          <h2 style={{ fontSize: 28, fontWeight: 400, color: "#181313", lineHeight: 1.3, marginBottom: app_description ? 16 : 32, wordBreak: "break-word" }}>
            {app_impact}
          </h2>
        ) : (
          <h2 style={{ fontSize: 28, fontWeight: 400, color: "#E0E0E0", lineHeight: 1.3, marginBottom: 32, fontStyle: "italic" }}>
            Impact statement goes here...
          </h2>
        )}

        {/* Description */}
        {app_description && (
          <p style={{ fontSize: 15, color: "#3C3C3C", lineHeight: 1.75, marginBottom: 32, wordBreak: "break-word" }}>
            {app_description}
          </p>
        )}

        {/* ── Horizontal Tabs ── */}
        {app_view_type === "tabs_horizontal" && app_items.length > 0 && (
          <div>
            <div style={{ display: "flex", borderBottom: "1px solid #E0E0E0", marginBottom: 28, overflowX: "auto", gap: 0 }}>
              {app_items.map((tab, i) => (
                <button key={tab.id || i} onClick={() => setActiveTab(i)}
                  style={{ background: "none", border: "none", borderBottom: i === activeTab ? "2px solid #181313" : "2px solid transparent", padding: "0.75rem 1.2rem", fontSize: 14, fontWeight: i === activeTab ? 500 : 400, color: i === activeTab ? "#181313" : "#646464", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Rubik',sans-serif", marginBottom: -1, transition: "all 0.15s" }}>
                  {tab.title || `Tab ${i + 1}`}
                </button>
              ))}
            </div>
            {app_items[activeTab] && (
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 500, color: "#181313", marginBottom: 16 }}>{app_items[activeTab].title}</h3>
                {activeTabImage && (
                  <img src={activeTabImage} alt={app_items[activeTab].image_alt || app_items[activeTab].title}
                    style={{ width: "100%", maxHeight: 340, objectFit: "cover", borderRadius: 8, marginBottom: 20, border: "1px solid #E0E0E0" }}
                    onError={e => { e.target.style.display = "none"; }} />
                )}
                {!activeTabImage && getImagePlaceholder(app_items[activeTab].image_ref) && (
                  <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 8, padding: "1.5rem", marginBottom: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#B5B5B5" }}>🎨 {getImagePlaceholder(app_items[activeTab].image_ref)}</div>
                  </div>
                )}
                <p style={{ fontSize: 15, color: "#3C3C3C", lineHeight: 1.75, marginBottom: 20, wordBreak: "break-word" }}>{app_items[activeTab].description}</p>
                {app_items[activeTab].cta_label && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#181313", letterSpacing: "0.05em", textTransform: "uppercase", cursor: "default" }}>
                    {app_items[activeTab].cta_label} →
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Vertical Tabs ── */}
        {app_view_type === "tabs_vertical" && app_items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {app_items.map((tab, i) => (
                <button key={tab.id || i} onClick={() => setActiveTab(i)}
                  style={{ background: "none", border: "none", borderLeft: i === activeTab ? "2px solid #181313" : "2px solid transparent", padding: "0.6rem 1rem", fontSize: 14, fontWeight: i === activeTab ? 500 : 400, color: i === activeTab ? "#181313" : "#646464", cursor: "pointer", textAlign: "left", fontFamily: "'Rubik',sans-serif", transition: "all 0.15s", lineHeight: 1.4 }}>
                  {tab.title || `Tab ${i + 1}`}
                </button>
              ))}
            </div>
            {app_items[activeTab] && (
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 500, color: "#181313", marginBottom: 16 }}>{app_items[activeTab].title}</h3>
                {activeTabImage && (
                  <img src={activeTabImage} alt={app_items[activeTab].image_alt || app_items[activeTab].title}
                    style={{ width: "100%", maxHeight: 340, objectFit: "cover", borderRadius: 8, marginBottom: 20, border: "1px solid #E0E0E0" }}
                    onError={e => { e.target.style.display = "none"; }} />
                )}
                {!activeTabImage && getImagePlaceholder(app_items[activeTab].image_ref) && (
                  <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 8, padding: "1.5rem", marginBottom: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#B5B5B5" }}>🎨 {getImagePlaceholder(app_items[activeTab].image_ref)}</div>
                  </div>
                )}
                <p style={{ fontSize: 15, color: "#3C3C3C", lineHeight: 1.75, marginBottom: 20, wordBreak: "break-word" }}>{app_items[activeTab].description}</p>
                {app_items[activeTab].cta_label && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#181313", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {app_items[activeTab].cta_label} →
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* No view selected placeholder */}
        {!app_view_type && (
          <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#B5B5B5" }}>Select a view type to see the preview</div>
          </div>
        )}

      </div>
    </div>
  );
}
