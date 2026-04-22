"use client";

export default function BannerPreview({ banner = {}, pageType = "Product" }) {
  const { pageTitle = "", subTitle = "", cta1Label = "", cta2Label = "", bannerImage = "" } = banner;

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E0E0E0", boxShadow: "0 2px 16px rgba(0,0,0,0.08)", fontFamily: "'Rubik', sans-serif" }}>
      {/* Browser bar */}
      <div style={{ background: "#F3F3F3", padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #E0E0E0" }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#f87171" }} />
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#fbbf24" }} />
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#34d399" }} />
        <div style={{ flex: 1, background: "#fff", borderRadius: 4, padding: "2px 12px", marginLeft: 10, fontSize: 11, color: "#B5B5B5", fontFamily: "monospace", border: "1px solid #E0E0E0" }}>
          yoursite.com/{pageType.toLowerCase().replace(/ /g, "-")}/preview
        </div>
      </div>

      {/* Banner area */}
      <div style={{
        minHeight: 220, display: "flex", alignItems: "center", padding: "2.5rem 3rem", position: "relative", overflow: "hidden",
        background: bannerImage
          ? `linear-gradient(to right, rgba(24,19,19,0.92) 38%, rgba(24,19,19,0.6)), url('${bannerImage}') center/cover`
          : "linear-gradient(135deg, #181313 0%, #3C3C3C 100%)",
      }}>
        {!bannerImage && (
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 70% 50%, #646464 1px, transparent 1px)", backgroundSize: "28px 28px", opacity: 0.12 }} />
        )}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 500 }}>
          <span style={{ background: "#F3F3F3", color: "#181313", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 4, display: "inline-block", marginBottom: 14 }}>{pageType}</span>
          <h1 style={{ color: "#F3F3F3", fontWeight: 500, fontSize: 28, marginBottom: 10, lineHeight: 1.25 }}>
            {pageTitle || <span style={{ color: "#646464", fontStyle: "italic", fontWeight: 400 }}>Page Title</span>}
          </h1>
          <p style={{ color: "#B5B5B5", fontSize: 14, marginBottom: 20, lineHeight: 1.6, fontWeight: 400 }}>
            {subTitle || <span style={{ color: "#646464" }}>Subtitle goes here</span>}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {cta1Label && <div style={{ background: "#F3F3F3", color: "#181313", borderRadius: 5, padding: "8px 18px", fontSize: 12, fontWeight: 500, cursor: "default" }}>↗ {cta1Label}</div>}
            {cta2Label && <div style={{ border: "1px solid #B5B5B5", color: "#F3F3F3", borderRadius: 5, padding: "8px 18px", fontSize: 12, fontWeight: 500, cursor: "default" }}>▷ {cta2Label}</div>}
          </div>
        </div>
        {!bannerImage && (
          <div style={{ position: "absolute", right: "8%", top: "50%", transform: "translateY(-50%)", fontSize: 90, color: "#B5B5B5", opacity: 0.1, fontWeight: 700 }}>CI</div>
        )}
      </div>

      {/* Label */}
      <div style={{ background: "#F9F9F9", borderTop: "1px dashed #E0E0E0", padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#B5B5B5" }} />
        <span style={{ fontSize: 11, color: "#B5B5B5", fontFamily: "'Rubik', sans-serif" }}>Live Preview — Banner Section</span>
      </div>
    </div>
  );
}
