"use client";

export default function OverviewPreview({ overview = {} }) {
  const {
    overview_label = "",
    overview_impact = "",
    overview_description = "",
    overview_media_url = "",
    overview_media_note = "",
    overview_media_type = "image",
  } = overview;

  const hasContent = overview_impact || overview_description;

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E0E0E0", boxShadow: "0 2px 16px #0001", fontFamily: "'Rubik',sans-serif" }}>
      {/* Browser bar */}
      <div style={{ background: "#F3F3F3", padding: "7px 12px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #E0E0E0" }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#f87171" }} />
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#fbbf24" }} />
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#34d399" }} />
        <div style={{ flex: 1, background: "#fff", borderRadius: 4, padding: "2px 12px", marginLeft: 10, fontSize: 11, color: "#B5B5B5", fontFamily: "monospace", border: "1px solid #E0E0E0" }}>
          yoursite.com/product/preview#overview
        </div>
      </div>

      {/* Overview section */}
      <div style={{ background: "#ffffff", padding: "3rem 3.5rem" }}>
        {/* Label */}
        {overview_label ? (
          <div style={{ fontSize: 11, fontWeight: 600, color: "#646464", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
            {overview_label}
          </div>
        ) : (
          <div style={{ fontSize: 11, fontWeight: 600, color: "#E0E0E0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
            OVERVIEW
          </div>
        )}

        {/* Impact Statement */}
        {overview_impact ? (
          <h2 style={{ fontSize: 28, fontWeight: 400, color: "#181313", lineHeight: 1.3, marginBottom: 20, maxWidth: 740 }}>
            {overview_impact}
          </h2>
        ) : (
          <h2 style={{ fontSize: 28, fontWeight: 400, color: "#E0E0E0", lineHeight: 1.3, marginBottom: 20, fontStyle: "italic" }}>
            Impact statement goes here...
          </h2>
        )}

        {/* Description */}
        {overview_description ? (
          <p style={{ fontSize: 15, color: "#3C3C3C", lineHeight: 1.75, maxWidth: 740, marginBottom: overview_media_url ? 32 : 0 }}>
            {overview_description}
          </p>
        ) : (
          <p style={{ fontSize: 15, color: "#E0E0E0", lineHeight: 1.75, fontStyle: "italic", marginBottom: overview_media_url ? 32 : 0 }}>
            Description paragraph goes here...
          </p>
        )}

        {/* Media */}
        {overview_media_url && (
          <div style={{ marginTop: 32, textAlign: "center" }}>
            {overview_media_type === "video" ? (
              <div style={{ background: "#181313", borderRadius: 10, padding: "4rem 2rem", color: "#B5B5B5", fontSize: 14 }}>
                ▶ Video: {overview_media_url}
              </div>
            ) : (
              <img
                src={overview_media_url}
                alt="Overview media"
                style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #E0E0E0" }}
                onError={e => { e.target.style.display = "none"; }}
              />
            )}
            {overview_media_note && (
              <div style={{ fontSize: 12, color: "#B5B5B5", marginTop: 12, fontStyle: "italic" }}>
                {overview_media_note}
              </div>
            )}
          </div>
        )}

        {/* Placeholder media box */}
        {!overview_media_url && (
          <div style={{ marginTop: 32, background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2.5rem", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🖼️</div>
            <div style={{ fontSize: 12, color: "#B5B5B5" }}>Image / Diagram / Video — Optional</div>
            <div style={{ fontSize: 11, color: "#E0E0E0", marginTop: 4 }}>To be added by Design QA</div>
          </div>
        )}
      </div>

      {/* Preview label */}
      <div style={{ background: "#F9F9F9", borderTop: "1px dashed #E0E0E0", padding: "5px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#B5B5B5" }} />
        <span style={{ fontSize: 11, color: "#B5B5B5" }}>Live Preview — Overview Section</span>
      </div>
    </div>
  );
}
