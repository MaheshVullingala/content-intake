"use client";

export default function PromoSectionPreview({ data = {} }) {
  const { promo_bg_image = "", promo_bg_note = "", promo_label = "", promo_title = "", promo_description = "", promo_btn_label = "", promo_btn_link = "" } = data;

  if (!promo_title && !promo_btn_label) return null;

  return (
    <div style={{
      borderTop: "1px solid #F3F3F3",
      background: promo_bg_image
        ? `linear-gradient(to right, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0.4)), url('${promo_bg_image}') center/cover`
        : "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
      width: "100%", boxSizing: "border-box",
      fontFamily: "'Rubik', sans-serif",
    }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "2.5rem 3rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, minHeight: 140, boxSizing: "border-box", width: "100%" }}>
        {/* Left content */}
        <div style={{ flex: 1 }}>
          {promo_label && (
            <div style={{ fontSize: 10, fontWeight: 600, color: "#B5B5B5", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
              {promo_label}
            </div>
          )}
          {promo_title ? (
            <h2 style={{ fontSize: 22, fontWeight: 400, color: "#F3F3F3", lineHeight: 1.4, margin: 0, wordBreak: "break-word" }}>
              {promo_title}
            </h2>
          ) : (
            <h2 style={{ fontSize: 22, fontWeight: 400, color: "#646464", lineHeight: 1.4, margin: 0, fontStyle: "italic" }}>
              Promo title goes here...
            </h2>
          )}
          {promo_description && (
            <p style={{ fontSize: 13, color: "#B5B5B5", marginTop: 10, lineHeight: 1.6 }}>{promo_description}</p>
          )}
          {!promo_bg_image && promo_bg_note && (
            <div style={{ marginTop: 10, fontSize: 11, color: "#646464", fontStyle: "italic" }}>
              🎨 Background: {promo_bg_note}
            </div>
          )}
        </div>

        {/* Right CTA */}
        {promo_btn_label && (
          <div style={{ flexShrink: 0 }}>
            <div style={{ background: "#0078d4", color: "#fff", borderRadius: 4, padding: "0.75rem 1.8rem", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "default" }}>
              {promo_btn_label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
