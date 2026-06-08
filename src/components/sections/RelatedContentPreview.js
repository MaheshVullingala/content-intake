"use client";

export default function RelatedContentPreview({ data = {} }) {
  const { rc_label = "", rc_impact = "", rc_cards = [] } = data;
  if (!rc_impact && rc_cards.length === 0) return null;

  return (
    <div style={{ background: "#fff", width: "100%", boxSizing: "border-box", fontFamily: "'Rubik', sans-serif" }}>
      <div className="section-container">

        <div style={{ fontSize: 11, fontWeight: 600, color: rc_label ? "#646464" : "#E0E0E0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          {rc_label || "RELATED CONTENT"}
        </div>

        {rc_impact ? (
          <h2 style={{ fontSize: 28, fontWeight: 400, color: "#181313", lineHeight: 1.3, marginBottom: 32, wordBreak: "break-word" }}>{rc_impact}</h2>
        ) : (
          <h2 style={{ fontSize: 28, fontWeight: 400, color: "#E0E0E0", lineHeight: 1.3, marginBottom: 32, fontStyle: "italic" }}>Impact statement...</h2>
        )}

        {rc_cards.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {rc_cards.map((card, i) => (
              <div key={card.id || i} style={{ border: "1px solid #E0E0E0", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                <div style={{ height: 180, background: "#F3F3F3", overflow: "hidden", position: "relative" }}>
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={e => { e.target.style.display = "none"; }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 24 }}>🖼️</span>
                      {card.image_note && <span style={{ fontSize: 10, color: "#B5B5B5", textAlign: "center", padding: "0 8px" }}>{card.image_note}</span>}
                    </div>
                  )}
                </div>
                <div style={{ padding: "1rem" }}>
                  {card.label && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#181313", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      {card.label}
                    </div>
                  )}
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#181313", lineHeight: 1.4, marginBottom: 10, wordBreak: "break-word" }}>
                    {card.title || <span style={{ color: "#E0E0E0", fontStyle: "italic" }}>Card title...</span>}
                  </h3>
                  {card.description && (
                    <p style={{ fontSize: 13, color: "#646464", lineHeight: 1.6, marginBottom: 12 }}>
                      {card.description}
                    </p>
                  )}
                  {card.link && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#181313", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
                      LEARN MORE →
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {rc_cards.length === 0 && (
          <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#B5B5B5" }}>Content cards will appear here</div>
          </div>
        )}

      </div>
    </div>
  );
}
