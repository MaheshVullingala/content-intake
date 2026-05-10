"use client";

export default function RelatedProductsPreview({ data = {} }) {
  const { rp_label = "", rp_impact = "", rp_description = "", rp_cards = [] } = data;

  if (!rp_impact && rp_cards.length === 0) return null;

  return (
    <div style={{ padding: "3rem 3.5rem", borderTop: "1px solid #F3F3F3", background: "#ffffff", width: "100%", boxSizing: "border-box", fontFamily: "'Rubik', sans-serif" }}>
      {/* Label */}
      <div style={{ fontSize: 11, fontWeight: 600, color: rp_label ? "#646464" : "#E0E0E0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
        {rp_label || "RELATED PRODUCTS"}
      </div>

      {/* Impact */}
      {rp_impact ? (
        <h2 style={{ fontSize: 28, fontWeight: 400, color: "#181313", lineHeight: 1.3, marginBottom: rp_description ? 16 : 32, wordBreak: "break-word" }}>
          {rp_impact}
        </h2>
      ) : (
        <h2 style={{ fontSize: 28, fontWeight: 400, color: "#E0E0E0", lineHeight: 1.3, marginBottom: 32, fontStyle: "italic" }}>
          Impact statement...
        </h2>
      )}

      {/* Description */}
      {rp_description && (
        <p style={{ fontSize: 15, color: "#3C3C3C", lineHeight: 1.75, marginBottom: 32, wordBreak: "break-word" }}>
          {rp_description}
        </p>
      )}

      {/* Cards grid — responsive like Key Benefits */}
      {rp_cards.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: rp_cards.length === 1 ? "1fr" : rp_cards.length === 2 ? "1fr 1fr" : rp_cards.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 20 }}>
          {rp_cards.map((card, i) => (
            <div key={card.id || i} style={{ border: "1px solid #E0E0E0", borderRadius: 8, padding: "1.5rem", background: "#fff" }}>
              {/* Red accent bar */}
              <div style={{ width: 32, height: 3, background: "#c0392b", borderRadius: 2, marginBottom: 20 }} />

              {/* Title */}
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#181313", marginBottom: 12, lineHeight: 1.3, wordBreak: "break-word" }}>
                {card.title || <span style={{ color: "#E0E0E0", fontStyle: "italic" }}>Product title...</span>}
              </h3>

              {/* Description */}
              <p style={{ fontSize: 14, color: "#646464", lineHeight: 1.7, marginBottom: 20, wordBreak: "break-word", flexGrow: 1 }}>
                {card.description || <span style={{ color: "#E0E0E0", fontStyle: "italic" }}>Product description...</span>}
              </p>

              {/* CTA */}
              {card.cta_link && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#181313", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {card.cta_label || "LEARN MORE"} →
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty placeholder */}
      {rp_cards.length === 0 && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#B5B5B5" }}>Product cards will appear here</div>
        </div>
      )}
    </div>
  );
}
