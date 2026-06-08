"use client";

export default function BannerPreview({ banner = {}, pageType = "Product" }) {
  const {
    page_title = "", sub_title = "",
    cta1_label = "", cta2_label = "",
    banner_image = "", banner_image_note = ""
  } = banner;

  const isDefault = !banner_image;

  return (
    <div className="preview-window">
      {/* Browser chrome */}
      <div className="preview-browser-bar">
        <div className="preview-dot red" />
        <div className="preview-dot yellow" />
        <div className="preview-dot green" />
        <div className="preview-url">
          yoursite.com/{pageType.toLowerCase().replace(/ /g, "-")}/preview
        </div>
      </div>

      {/* Banner — .preview-window .banner-section overrides min-height to 400px */}
      <div className="banner-section">
        <img
          src={banner_image || "/defasult-banner-image.png"}
          alt=""
          className="banner-bg-img"
          onError={e => { e.currentTarget.style.display = "none"; }}
        />
        <div className="banner-overlay" />

        {isDefault && (
          <div className="banner-placeholder-badge">
            <span>🎨</span>
            <span>Placeholder — Design QA will upload final image</span>
          </div>
        )}

        <div className="banner-inner">
          <span className="banner-tag">{pageType}</span>
          <h1 className={`banner-title${!page_title ? " placeholder" : ""}`}>
            {page_title || "Page Title"}
          </h1>
          <p className={`banner-subtitle${!sub_title ? " placeholder" : ""}`}>
            {sub_title || "Subtitle goes here"}
          </p>
          <div className="banner-ctas">
            {cta1_label && <div className="banner-cta-primary">↗ {cta1_label}</div>}
            {cta2_label && <div className="banner-cta-secondary">▷ {cta2_label}</div>}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="preview-label-bar">
        <div className={`preview-label-dot ${isDefault ? "pending" : "done"}`} />
        <span className="preview-label-text">
          {isDefault
            ? banner_image_note
              ? `🎨 Image note: "${banner_image_note}"`
              : "Placeholder image — pending Design QA"
            : "Live Preview — Banner Section"}
        </span>
      </div>
    </div>
  );
}
