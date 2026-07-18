"use client";
import { getImageUrl, getImagePlaceholder } from "@/lib/imageRef";

function getGridCols(count) {
  if (count <= 1) return "1fr";
  if (count === 2) return "1fr 1fr";
  if (count === 3) return "1fr 1fr 1fr";
  return "1fr 1fr";
}

export default function KeyBenefitsPreview({ data = {} }) {
  const { kb_label = "", kb_impact = "", kb_description = "", kb_cards = [] } = data;

  const hasContent = kb_impact || kb_cards.length > 0;
  if (!hasContent) return null;

  return (
    <div style={{ background: "#ffffff", width: "100%", boxSizing: "border-box", fontFamily: "'Rubik', sans-serif" }}>
      <div className="section-container">

        <div style={{ fontSize: 11, fontWeight: 600, color: kb_label ? "#646464" : "#E0E0E0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          {kb_label || "KEY BENEFITS"}
        </div>

        {kb_impact ? (
          <h2 style={{ fontSize: 28, fontWeight: 400, color: "#181313", lineHeight: 1.3, marginBottom: kb_description ? 16 : 40, wordBreak: "break-word" }}>
            {kb_impact}
          </h2>
        ) : (
          <h2 style={{ fontSize: 28, fontWeight: 400, color: "#E0E0E0", lineHeight: 1.3, marginBottom: 40, fontStyle: "italic" }}>
            Impact statement goes here...
          </h2>
        )}

        {kb_description && (
          <p style={{ fontSize: 15, color: "#3C3C3C", lineHeight: 1.75, marginBottom: 40, wordBreak: "break-word" }}>
            {kb_description}
          </p>
        )}

        {kb_cards.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: getGridCols(kb_cards.length), gap: "2rem 3rem", marginTop: kb_impact ? 40 : 0 }}>
            {kb_cards.map((card, idx) => {
              const iconUrl         = getImageUrl(card.image_ref);
              const iconPlaceholder = getImagePlaceholder(card.image_ref);
              return (
              <div key={card.id || idx}>
                <div style={{ width: 48, height: 48, marginBottom: 20, background: "#F3F3F3", border: "1px dashed #E0E0E0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {iconUrl ? (
                    <img src={iconUrl} alt={iconPlaceholder || "icon"} style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      onError={e => { e.target.style.display = "none"; }} />
                  ) : iconPlaceholder ? (
                    <span style={{ fontSize: 10, color: "#B5B5B5", textAlign: "center", padding: "0 4px", lineHeight: 1.3 }}>🎨</span>
                  ) : (
                    <span style={{ fontSize: 18, opacity: 0.3 }}>◻</span>
                  )}
                </div>
                {iconPlaceholder && (
                  <div style={{ fontSize: 10, color: "#B5B5B5", marginBottom: 12, fontStyle: "italic", lineHeight: 1.4 }}>
                    Icon: {iconPlaceholder}
                  </div>
                )}
                <h3 style={{ fontSize: 16, fontWeight: 600, color: card.title ? "#181313" : "#E0E0E0", marginBottom: 12, lineHeight: 1.3, fontStyle: card.title ? "normal" : "italic" }}>
                  {card.title || "Card title..."}
                </h3>
                <p style={{ fontSize: 14, color: card.description ? "#646464" : "#E0E0E0", lineHeight: 1.7, wordBreak: "break-word", fontStyle: card.description ? "normal" : "italic" }}>
                  {card.description || "Card description..."}
                </p>
              </div>
              );
            })}
          </div>
        )}

        {kb_cards.length === 0 && (
          <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🃏</div>
            <div style={{ fontSize: 12, color: "#B5B5B5" }}>Benefit cards will appear here</div>
          </div>
        )}

      </div>
    </div>
  );
}
