"use client";
import KeyBenefitsPreview from "@/components/sections/KeyBenefitsPreview";
import FeaturesAppsPreview from "@/components/sections/FeaturesAppsPreview";
import CustomerStoriesPreview from "@/components/sections/CustomerStoriesPreview";
import PromoSectionPreview from "@/components/sections/PromoSectionPreview";
import RelatedContentPreview from "@/components/sections/RelatedContentPreview";
import ResourcesPreview from "@/components/sections/ResourcesPreview";
import RelatedProductsPreview from "@/components/sections/RelatedProductsPreview";
import TrainingSupportPreview from "@/components/sections/TrainingSupportPreview";

export default function PagePreview({ req = {}, pageType = "Product", activeSection = "" }) {
  const {
    page_title = "", sub_title = "", cta1_label = "", cta2_label = "",
    banner_image = "", overview_label = "", overview_impact = "",
    overview_description = "", overview_media_url = "",
    overview_media_note = "", overview_media_type = "image",
    kb_label = "", kb_impact = "", kb_description = "", kb_cards = [],
    fa_label = "", fa_impact = "", fa_description = "", fa_view_type = "", fa_items = [], fa_columns = [], fa_rows = [],
    cs_label = "", cs_impact = "", cs_items = [],
    promo_title = "", promo_btn_label = "",
    rc_label = "", rc_impact = "", rc_cards = [],
    res_label = "", res_impact = "", res_selected = [],
    rp_label = "", rp_impact = "", rp_cards = [],
    ts_label, ts_card1_cta_link, ts_card2_cta_link, ts_card3_cta_link,
  } = req;

  const hasOverview    = overview_impact || overview_description || activeSection === "overview";
  const hasKeyBenefits  = kb_impact || kb_cards.length > 0 || activeSection === "key_benefits";
  const hasFeatures      = fa_impact || fa_items.length > 0 || fa_columns.length > 0 || activeSection === "features_apps";
  const hasCustomerStories = cs_impact || cs_items.length > 0 || activeSection === "customer_stories";
  const hasPromo           = promo_title || promo_btn_label || activeSection === "promo_section";
  const hasRelatedContent  = rc_impact || rc_cards.length > 0 || activeSection === "related_content";
  const hasResources        = res_impact || res_selected.length > 0 || activeSection === "resources";
  const hasRelatedProducts  = rp_impact || rp_cards.length > 0 || activeSection === "related_products";
  const hasTrainingSupport  = ts_label || ts_card1_cta_link || ts_card2_cta_link || ts_card3_cta_link || activeSection === "training_support";

  return (
    <div className="preview-window">
      {/* Browser bar */}
      <div className="preview-browser-bar">
        <div className="preview-dot red" />
        <div className="preview-dot yellow" />
        <div className="preview-dot green" />
        <div className="preview-url">
          yoursite.com/{pageType.toLowerCase().replace(/ /g, "-")}/preview
        </div>
      </div>

      {/* Banner Section */}
      <div data-section="banner" className="banner-section" style={{
        background: banner_image
          ? `linear-gradient(to right, rgba(24,19,19,0.92) 38%, rgba(24,19,19,0.5)), url('${banner_image}') center/cover`
          : "linear-gradient(135deg, #181313, #3C3C3C)",
      }}>
        {!banner_image && <div className="banner-bg-pattern" />}
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

      {/* Overview Section */}
      {hasOverview && (
        <>
          <div className="preview-section-divider" />
          <div data-section="overview" className="overview-section">
            <div className="section-container">
            <div className={`overview-label ${overview_label ? "filled" : "placeholder"}`}>
              {overview_label || "OVERVIEW"}
            </div>
            <h2 className={`overview-impact ${overview_impact ? "filled" : "placeholder"}`}>
              {overview_impact || "Impact statement goes here..."}
            </h2>
            <p className={`overview-description ${overview_description ? "filled" : "placeholder"}`}>
              {overview_description || "Description paragraph goes here..."}
            </p>
            {overview_media_url ? (
              <div className="overview-media-wrap">
                {overview_media_type === "video"
                  ? <div className="overview-media-video">▶ Video: {overview_media_url}</div>
                  : <img src={overview_media_url} alt="Overview media" className="overview-media-img"
                      onError={e => { e.target.style.display = "none"; }} />
                }
                {overview_media_note && (
                  <div className="overview-media-caption">{overview_media_note}</div>
                )}
              </div>
            ) : (
              <div className="overview-media-placeholder">
                <div className="icon">🖼️</div>
                <div className="text">Image / Diagram / Video — Optional</div>
                <div className="sub">To be added by Design QA</div>
              </div>
            )}
            </div>
          </div>
        </>
      )}

      {/* Key Benefits Section */}
      {hasKeyBenefits && (
        <>
          <div className="preview-section-divider" />
          <div data-section="key_benefits" className="preview-section-white"><div className="section-container"><KeyBenefitsPreview data={req} /></div></div>
        </>
      )}

      {/* Features / Applications */}
      {hasFeatures && (
        <>
          <div className="preview-section-divider" />
          <div data-section="features_apps" className="preview-section-white"><div className="section-container"><FeaturesAppsPreview data={req} /></div></div>
        </>
      )}

      {/* Customer Stories */}
      {hasCustomerStories && (
        <>
          <div className="preview-section-divider" />
          <div data-section="customer_stories" className="preview-section-white"><div className="section-container"><CustomerStoriesPreview data={req} /></div></div>
        </>
      )}

      {/* Promo Section — full width, no section-container */}
      {hasPromo && (
        <>
          <div className="preview-section-divider" />
          <div data-section="promo_section"><PromoSectionPreview data={req} /></div>
        </>
      )}

      {/* Related Content */}
      {hasRelatedContent && (
        <>
          <div className="preview-section-divider" />
          <div data-section="related_content" className="preview-section-white"><div className="section-container"><RelatedContentPreview data={req} /></div></div>
        </>
      )}

      {/* Resources */}
      {hasResources && (
        <>
          <div className="preview-section-divider" />
          <div data-section="resources" className="preview-section-muted"><div className="section-container"><ResourcesPreview data={req} /></div></div>
        </>
      )}

      {/* Related Products */}
      {hasRelatedProducts && (
        <>
          <div className="preview-section-divider" />
          <div data-section="related_products" className="preview-section-white"><div className="section-container"><RelatedProductsPreview data={req} /></div></div>
        </>
      )}

      {/* Training & Support */}
      {hasTrainingSupport && (
        <>
          <div className="preview-section-divider" />
          <div data-section="training_support" className="preview-section-white"><div className="section-container"><TrainingSupportPreview data={req} /></div></div>
        </>
      )}

      {/* Preview label */}
      <div className="preview-label-bar">
        <div className="preview-label-dot" />
        <span className="preview-label-text">
          Live Preview — {[
            "Banner",
            hasOverview ? "Overview" : null,
            hasKeyBenefits ? "Key Benefits" : null,
            hasFeatures ? "Features" : null,
            hasCustomerStories ? "Stories" : null,
            hasPromo ? "Promo" : null,
            hasRelatedContent ? "Related" : null,
            hasResources ? "Resources" : null,
            hasRelatedProducts ? "Related Products" : null,
            hasTrainingSupport ? "Training & Support" : null,
          ].filter(Boolean).join(" + ")}
        </span>
      </div>
    </div>
  );
}
