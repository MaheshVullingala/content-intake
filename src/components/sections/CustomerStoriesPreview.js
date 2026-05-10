"use client";
import { useState } from "react";

export default function CustomerStoriesPreview({ data = {} }) {
  const { cs_label = "", cs_impact = "", cs_items = [] } = data;
  const [active, setActive] = useState(0);

  if (!cs_impact && cs_items.length === 0) return null;

  const current = cs_items[active] || {};

  return (
    <div style={{ padding: "3.5rem 3.5rem", borderTop: "1px solid #F3F3F3", background: "#ffffff", width: "100%", boxSizing: "border-box", fontFamily: "'Rubik', sans-serif", textAlign: "center" }}>
      {/* Label */}
      <div style={{ fontSize: 11, fontWeight: 600, color: cs_label ? "#646464" : "#E0E0E0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
        {cs_label || "ENDORSEMENTS"}
      </div>

      {/* Impact */}
      {cs_impact && (
        <h2 style={{ fontSize: 28, fontWeight: 400, color: "#181313", lineHeight: 1.3, marginBottom: 36, maxWidth: 700, margin: "0 auto 36px", wordBreak: "break-word" }}>
          {cs_impact}
        </h2>
      )}

      {/* Carousel */}
      {cs_items.length > 0 && (
        <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>
          {/* Prev arrow */}
          {cs_items.length > 1 && (
            <button onClick={() => setActive(a => Math.max(0, a - 1))}
              disabled={active === 0}
              style={{ position: "absolute", left: -40, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: 22, color: active === 0 ? "#E0E0E0" : "#B5B5B5", cursor: active === 0 ? "default" : "pointer" }}>‹</button>
          )}

          {/* Quote */}
          <div style={{ padding: "0 2rem" }}>
            <p style={{ fontSize: 17, color: "#3C3C3C", lineHeight: 1.8, fontStyle: "italic", marginBottom: 20, wordBreak: "break-word" }}>
              "{current.quote || "Customer quote will appear here..."}"
            </p>
            <div style={{ fontSize: 13, color: "#B5B5B5" }}>
              {current.customer || "Customer Name, Company"}
            </div>
          </div>

          {/* Next arrow */}
          {cs_items.length > 1 && (
            <button onClick={() => setActive(a => Math.min(cs_items.length - 1, a + 1))}
              disabled={active === cs_items.length - 1}
              style={{ position: "absolute", right: -40, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: 22, color: active === cs_items.length - 1 ? "#E0E0E0" : "#B5B5B5", cursor: active === cs_items.length - 1 ? "default" : "pointer" }}>›</button>
          )}
        </div>
      )}

      {/* Dots */}
      {cs_items.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 28 }}>
          {cs_items.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              style={{ width: 8, height: 8, borderRadius: "50%", background: i === active ? "#181313" : "#E0E0E0", border: "none", cursor: "pointer", padding: 0, transition: "background 0.2s" }} />
          ))}
        </div>
      )}
    </div>
  );
}
