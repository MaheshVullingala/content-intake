"use client";

const DEFAULTS = {
  ts_label: "TRAINING AND SUPPORT",
  ts_impact: "Need Help?",
  ts_card1_icon: "Training icon - person with checklist",
  ts_card1_title: "Training",
  ts_card1_description: "The Training Learning Maps help you get a comprehensive visual overview of learning opportunities.",
  ts_card1_cta_label: "BROWSE TRAINING",
  ts_card1_cta_link: "",
  ts_card2_icon: "Cloud with question mark - online support",
  ts_card2_title: "Online Support",
  ts_card2_description: "The Cadence ASK system fields our entire library of accessible materials for self-study and step-by-step instruction.",
  ts_card2_cta_label: "REQUEST SUPPORT",
  ts_card2_cta_link: "",
  ts_card3_icon: "People group icon - technical forums",
  ts_card3_title: "Technical Forums",
  ts_card3_description: "Find community on the technical forums to discuss and elaborate on your design ideas.",
  ts_card3_cta_label: "FIND ANSWERS",
  ts_card3_cta_link: "",
};

export default function TrainingSupportPreview({ data = {} }) {
  const d = { ...DEFAULTS, ...data };

  if (!data.ts_label && !data.ts_impact && !data.ts_card1_cta_link &&
      !data.ts_card2_cta_link && !data.ts_card3_cta_link) return null;

  const cards = [1, 2, 3].map(n => ({
    icon:        d[`ts_card${n}_icon`],
    title:       d[`ts_card${n}_title`],
    description: d[`ts_card${n}_description`],
    cta_label:   d[`ts_card${n}_cta_label`],
    cta_link:    d[`ts_card${n}_cta_link`],
  }));

  return (
    <div style={{ background: "#ffffff", width: "100%", boxSizing: "border-box", fontFamily: "'Rubik', sans-serif" }}>
      <div className="section-container training">

        <div style={{ fontSize: 11, fontWeight: 600, color: "#646464", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          {d.ts_label}
        </div>

        <h2 style={{ fontSize: 28, fontWeight: 400, color: "#181313", lineHeight: 1.3, marginBottom: 36, wordBreak: "break-word" }}>
          {d.ts_impact}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
          {cards.map((card, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ width: 52, height: 52, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 52, height: 52, background: "#F9F9F9", border: "1px dashed #E0E0E0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 22 }}>
                    {i === 0 ? "📋" : i === 1 ? "☁️" : "👥"}
                  </span>
                </div>
              </div>
              {card.icon && (
                <div style={{ fontSize: 10, color: "#B5B5B5", marginBottom: 10, fontStyle: "italic" }}>
                  🎨 {card.icon}
                </div>
              )}
              <h3 style={{ fontSize: 18, fontWeight: 400, color: "#181313", marginBottom: 12, lineHeight: 1.3 }}>
                {card.title}
              </h3>
              <p style={{ fontSize: 14, color: "#646464", lineHeight: 1.7, marginBottom: 20, wordBreak: "break-word", flexGrow: 1 }}>
                {card.description}
              </p>
              {card.cta_label && (
                <div style={{ display: "inline-block", border: "1px solid #181313", borderRadius: 2, padding: "0.65rem 1.2rem", fontSize: 12, fontWeight: 600, color: "#181313", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "default" }}>
                  {card.cta_label}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
