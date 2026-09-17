"use client";
// Renders each custom "Others" block stacked in the order the stakeholder
// added them. The description is real page copy (rich text, rendered as
// HTML); the explanation is guidance *about* the section rather than
// content that would ever appear on the live page, so it's set apart in
// its own note callout rather than styled like body copy.
import { sanitizeRichText } from "@/lib/richText";

export default function OthersPreview({ data = {} }) {
  const { oth_items = [] } = data;

  if (oth_items.length === 0) return null;

  return (
    <div style={{ background: "#ffffff", width: "100%", boxSizing: "border-box", fontFamily: "'Rubik', sans-serif" }}>
      <div className="section-container">
        <div style={{ fontSize: 11, fontWeight: 600, color: "#646464", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          OTHERS
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {oth_items.map((item, i) => (
            <div key={item.id || i} style={{ border: "1px solid #E0E0E0", borderRadius: 10, padding: "1.75rem" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#B5B5B5", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                {item.label || `Custom Section ${i + 1}`}
              </div>

              {item.impact_statement ? (
                <h3 style={{ fontSize: 22, fontWeight: 400, color: "#181313", lineHeight: 1.3, marginBottom: 14, wordBreak: "break-word" }}>
                  {item.impact_statement}
                </h3>
              ) : (
                <h3 style={{ fontSize: 22, fontWeight: 400, color: "#E0E0E0", lineHeight: 1.3, marginBottom: 14, fontStyle: "italic" }}>
                  Impact statement...
                </h3>
              )}

              {item.description ? (
                <div
                  className="rich-text-content"
                  style={{ fontSize: 14, color: "#3C3C3C", wordBreak: "break-word", marginBottom: item.explanation ? 16 : 0 }}
                  dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.description) }}
                />
              ) : (
                <p style={{ fontSize: 14, color: "#E0E0E0", fontStyle: "italic", marginBottom: item.explanation ? 16 : 0 }}>
                  Description will appear here...
                </p>
              )}

              {item.explanation && (
                <div style={{ background: "#F9F9F9", border: "1px dashed #E0E0E0", borderRadius: 8, padding: "0.75rem 1rem", fontSize: 12, color: "#646464", lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 600, color: "#3C3C3C" }}>Layout guidance: </span>
                  {item.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
