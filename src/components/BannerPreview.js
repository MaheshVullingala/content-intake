"use client";

export default function BannerPreview({ banner = {}, pageType = "Product" }) {
  const { page_title="", sub_title="", cta1_label="", cta2_label="", banner_image="" } = banner;
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E0E0E0", boxShadow: "0 2px 16px #0001", fontFamily: "'Rubik',sans-serif" }}>
      <div style={{ background: "#F3F3F3", padding: "7px 12px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #E0E0E0" }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#f87171" }} />
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#fbbf24" }} />
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#34d399" }} />
        <div style={{ flex: 1, background: "#fff", borderRadius: 4, padding: "2px 12px", marginLeft: 10, fontSize: 11, color: "#B5B5B5", fontFamily: "monospace", border: "1px solid #E0E0E0" }}>
          yoursite.com/{pageType.toLowerCase().replace(/ /g,"-")}/preview
        </div>
      </div>
      <div style={{ minHeight: 210, display: "flex", alignItems: "center", padding: "2.5rem 3rem", position: "relative", overflow: "hidden", background: banner_image ? `linear-gradient(to right,rgba(24,19,19,0.92) 38%,rgba(24,19,19,0.5)),url('${banner_image}') center/cover` : "linear-gradient(135deg,#181313,#3C3C3C)" }}>
        {!banner_image && <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 70% 50%,#646464 1px,transparent 1px)", backgroundSize: "28px 28px", opacity: 0.1 }} />}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 480 }}>
          <span style={{ background: "#F3F3F3", color: "#181313", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 4, display: "inline-block", marginBottom: 12 }}>{pageType}</span>
          <h1 style={{ color: "#F3F3F3", fontWeight: 500, fontSize: 26, marginBottom: 8, lineHeight: 1.25 }}>{page_title || <span style={{ color: "#646464", fontStyle: "italic", fontWeight: 400 }}>Page Title</span>}</h1>
          <p style={{ color: "#B5B5B5", fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>{sub_title || <span style={{ color: "#646464" }}>Subtitle goes here</span>}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {cta1_label && <div style={{ background: "#F3F3F3", color: "#181313", borderRadius: 5, padding: "7px 16px", fontSize: 12, fontWeight: 500 }}>↗ {cta1_label}</div>}
            {cta2_label && <div style={{ border: "1px solid #B5B5B5", color: "#F3F3F3", borderRadius: 5, padding: "7px 16px", fontSize: 12, fontWeight: 500 }}>▷ {cta2_label}</div>}
          </div>
        </div>
      </div>
      <div style={{ background: "#F9F9F9", borderTop: "1px dashed #E0E0E0", padding: "5px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#B5B5B5" }} />
        <span style={{ fontSize: 11, color: "#B5B5B5" }}>Live Preview — Banner Section</span>
      </div>
    </div>
  );
}
