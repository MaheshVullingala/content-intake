"use client";

function getGridCols(count) {
  if (count <= 1) return "1fr";
  if (count === 2) return "1fr 1fr";
  if (count === 3) return "1fr 1fr 1fr";
  return "1fr 1fr"; // 4, 5, 6 → 2 per row
}

export default function KeyBenefitsPreview({ data = {} }) {
  const {
    kb_label = "",
    kb_impact = "",
    kb_description = "",
    kb_cards = [],
  } = data;

  const hasContent = kb_impact || kb_cards.length > 0;
  if (!hasContent) return null;

  return (
    <div style={{ padding: "3rem 0", borderTop: "1px solid #F3F3F3", background: "#ffffff", width: "100%", boxSizing: "border-box", fontFamily: "'Rubik', sans-serif" }}>
      {/* Label */}
      {kb_label ? (
        <div style={{ fontSize: 11, fontWeight: 600, color: "#646464", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          {kb_label}
        </div>
      ) : (
        <div style={{ fontSize: 11, fontWeight: 600, color: "#E0E0E0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          KEY BENEFITS
        </div>
      )}

      {/* Impact Statement */}
      {kb_impact ? (
        <h2 style={{ fontSize: 28, fontWeight: 400, color: "#181313", lineHeight: 1.3, marginBottom: kb_description ? 16 : 40, maxWidth: "100%", wordBreak: "break-word" }}>
          {kb_impact}
        </h2>
      ) : (
        <h2 style={{ fontSize: 28, fontWeight: 400, color: "#E0E0E0", lineHeight: 1.3, marginBottom: 40, fontStyle: "italic" }}>
          Impact statement goes here...
        </h2>
      )}

      {/* Description */}
      {kb_description && (
        <p style={{ fontSize: 15, color: "#3C3C3C", lineHeight: 1.75, marginBottom: 40, wordBreak: "break-word" }}>
          {kb_description}
        </p>
      )}

      {/* Cards grid */}
      {kb_cards.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: getGridCols(kb_cards.length), gap: "2rem 3rem", marginTop: kb_impact ? 40 : 0 }}>
          {kb_cards.map((card, idx) => (
            <div key={card.id || idx}>
              {/* Icon placeholder */}
              <div style={{ width: 48, height: 48, marginBottom: 20, background: "#F3F3F3", border: "1px dashed #E0E0E0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {card.icon_description ? (
                  <span style={{ fontSize: 10, color: "#B5B5B5", textAlign: "center", padding: "0 4px", lineHeight: 1.3 }}>🎨</span>
                ) : (
                  <span style={{ fontSize: 18, opacity: 0.3 }}>◻</span>
                )}
              </div>
              {card.icon_description && (
                <div style={{ fontSize: 10, color: "#B5B5B5", marginBottom: 12, fontStyle: "italic", lineHeight: 1.4 }}>
                  Icon: {card.icon_description}
                </div>
              )}

              {/* Card title */}
              {card.title ? (
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#181313", marginBottom: 12, lineHeight: 1.3 }}>
                  {card.title}
                </h3>
              ) : (
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#E0E0E0", marginBottom: 12, fontStyle: "italic" }}>
                  Card title...
                </h3>
              )}

              {/* Card description */}
              {card.description ? (
                <p style={{ fontSize: 14, color: "#646464", lineHeight: 1.7, wordBreak: "break-word" }}>
                  {card.description}
                </p>
              ) : (
                <p style={{ fontSize: 14, color: "#E0E0E0", lineHeight: 1.7, fontStyle: "italic" }}>
                  Card description...
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty cards placeholder */}
      {kb_cards.length === 0 && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🃏</div>
          <div style={{ fontSize: 12, color: "#B5B5B5" }}>Benefit cards will appear here</div>
        </div>
      )}
    </div>
  );
}
