"use client";
import { useState, useEffect } from "react";
import { FaPen, FaCheck, FaPalette, FaImage, FaPlay, FaArrowRight, FaChevronRight, FaQuestionCircle } from "react-icons/fa";
import { getDesignImage, getImagePlaceholder } from "@/lib/imageRef";
import SectionCommentBubble from "@/components/SectionCommentBubble";
import KeyBenefitsPreview from "@/components/sections/KeyBenefitsPreview";
import FeaturesAppsPreview from "@/components/sections/FeaturesAppsPreview";
import ApplicationsPreview from "@/components/sections/ApplicationsPreview";
import CustomerStoriesPreview from "@/components/sections/CustomerStoriesPreview";
import PromoSectionPreview from "@/components/sections/PromoSectionPreview";
import RelatedContentPreview from "@/components/sections/RelatedContentPreview";
import ResourcesPreview from "@/components/sections/ResourcesPreview";
import RelatedProductsPreview from "@/components/sections/RelatedProductsPreview";
import TrainingSupportPreview from "@/components/sections/TrainingSupportPreview";
import OthersPreview from "@/components/sections/OthersPreview";

export default function PagePreview({ req = {}, pageType = "Product", activeSection = "", fullPage = false, editorialMode = false, activeEditSection = null, onEditSection = null, attachments = [], highlightSection = null, user = null, supabase = null }) {
  // Force parse all fields at entry point — handles both raw DB strings and JS objects
  const p = (v, fb) => { if (!v) return fb; if (typeof v === "string") { try { return JSON.parse(v); } catch { return fb; } } return v; };

  const page_title    = req.page_title    || "";
  const sub_title     = req.sub_title     || "";
  const cta1_label    = req.cta1_label    || "";
  const cta2_label    = req.cta2_label    || "";
  const banner_image_ref = p(req.banner_image_ref, null);
  const banner_image      = getDesignImage("banner_image", attachments) || "";
  const banner_placeholder = getImagePlaceholder(banner_image_ref);
  const banner_tags = p(req.banner_tags, []);
  const overview_label       = req.overview_label       || "";
  const overview_impact      = req.overview_impact      || "";
  const overview_description = req.overview_description || "";
  const overview_media_ref   = p(req.overview_media_ref, null);
  const overview_media_url   = getDesignImage("overview_media", attachments) || "";
  const overview_media_placeholder = getImagePlaceholder(overview_media_ref);
  const overview_media_type  = req.overview_media_type  || "image";
  const overview_media_alt   = req.overview_media_alt   || "";
  const kb_label       = req.kb_label       || "";
  const kb_impact      = req.kb_impact      || "";
  const kb_description = req.kb_description || "";
  const kb_cards       = p(req.kb_cards, []);
  const fa_label       = req.fa_label       || "";
  const fa_impact      = req.fa_impact      || "";
  const fa_description = req.fa_description || "";
  const fa_view_type   = req.fa_view_type   || "";
  const fa_items       = p(req.fa_items,   []);
  const fa_columns     = p(req.fa_columns, []);
  const fa_rows        = p(req.fa_rows,    []);
  const app_label       = req.app_label       || "";
  const app_impact      = req.app_impact      || "";
  const app_description = req.app_description || "";
  const app_view_type   = req.app_view_type   || "";
  const app_items       = p(req.app_items, []);
  const cs_label  = req.cs_label  || "";
  const cs_impact = req.cs_impact || "";
  const cs_items  = p(req.cs_items, []);
  const promo_title     = req.promo_title     || "";
  const promo_btn_label = req.promo_btn_label || "";
  const rc_label  = req.rc_label  || "";
  const rc_impact = req.rc_impact || "";
  const rc_cards  = p(req.rc_cards, []);
  const res_label    = req.res_label    || "";
  const res_impact   = req.res_impact   || "";
  const res_selected = p(req.res_selected, []);
  const res_video_carousel = p(req.res_video_carousel, {});
  const res_mixed_carousel = p(req.res_mixed_carousel, {});
  const res_resources      = p(req.res_resources,      {});
  const res_news           = p(req.res_news,           {});
  const res_blogs          = p(req.res_blogs,          {});
  const rp_label       = req.rp_label       || "";
  const rp_impact      = req.rp_impact      || "";
  const rp_description = req.rp_description || "";
  const rp_cards       = p(req.rp_cards, []);
  const ts_label          = req.ts_label          || "";
  const ts_card1_cta_link = req.ts_card1_cta_link || "";
  const ts_card2_cta_link = req.ts_card2_cta_link || "";
  const ts_card3_cta_link = req.ts_card3_cta_link || "";
  const oth_items = p(req.oth_items, []);

  // Build parsedReq with all correctly typed fields
  const parsedReq = { ...req,
    page_title, sub_title, cta1_label, cta2_label, banner_image, banner_tags,
    overview_label, overview_impact, overview_description, overview_media_url, overview_media_type,
    kb_label, kb_impact, kb_description, kb_cards,
    fa_label, fa_impact, fa_description, fa_view_type, fa_items, fa_columns, fa_rows,
    app_label, app_impact, app_description, app_view_type, app_items,
    cs_label, cs_impact, cs_items,
    promo_title, promo_btn_label,
    rc_label, rc_impact, rc_cards,
    res_label, res_impact, res_selected, res_video_carousel, res_mixed_carousel, res_resources, res_news, res_blogs,
    rp_label, rp_impact, rp_description, rp_cards,
    ts_label, ts_card1_cta_link, ts_card2_cta_link, ts_card3_cta_link,
    oth_items,
  };

  // Editorial mode: hoverable edit button per section
  const [hoverSection, setHoverSection] = useState(null);

  // Per-section comment bubbles — replaces the old dropdown-driven
  // sidebar discussion panel. One fetch for the whole request's
  // comments (not one query per section/bubble), sliced by section_key
  // for each bubble. Only active when a caller passes user+supabase
  // (every TaskBoard.js view does); harmless no-op otherwise.
  const [allComments, setAllComments] = useState([]);
  const fetchComments = async () => {
    if (!supabase || !req.id) return;
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("request_id", req.id)
      .order("created_at", { ascending: true });
    if (!error) setAllComments(data || []);
  };
  useEffect(() => { fetchComments(); }, [req.id, supabase]);

  const commentsBySection = {};
  allComments.forEach(c => {
    const key = c.section_key || "";
    (commentsBySection[key] ||= []).push(c);
  });

  const handlePostComment = async (sectionKey, text) => {
    if (!supabase || !user) return;
    await supabase.from("comments").insert({
      request_id:  req.id,
      user_id:     user.id,
      user_name:   user.name,
      user_role:   user.role,
      text,
      section_key: sectionKey || null,
    });
    fetchComments();
  };

  const Bubble = ({ sectionKey, label }) => {
    if (!supabase || !user) return null;
    return (
      <SectionCommentBubble
        sectionKey={sectionKey}
        label={label}
        comments={commentsBySection[sectionKey || ""] || []}
        onPost={(text) => handlePostComment(sectionKey, text)}
        user={user}
        hovered={hoverSection === sectionKey}
      />
    );
  };
  const HighlightBanner = ({ sectionKey }) => {
    if (highlightSection !== sectionKey) return null;
    return (
      <div style={{
        background: '#fffbeb',
        border: '1px solid #d97706',
        borderRadius: 6,
        padding: '6px 12px',
        fontSize: 12,
        color: '#92400e',
        marginBottom: 8,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <FaQuestionCircle size={12} /> Editorial Team has a question about this section
      </div>
    );
  };
  const EditBtn = ({ sectionKey }) => {
    if (!editorialMode || !onEditSection) return null;
    const isActive = activeEditSection === sectionKey;
    return (
      <button
        onClick={() => onEditSection?.(sectionKey)}
        style={{
          position: "absolute", top: 10, right: 10,
          background: isActive ? "#1b5793" : "#fff",
          color: isActive ? "#fff" : "#1b5793",
          border: `1.5px solid ${isActive ? "#1b5793" : "#1b5793"}`,
          borderRadius: 7, padding: "4px 10px",
          fontSize: 11, fontWeight: 600, cursor: "pointer",
          fontFamily: "'Rubik',sans-serif",
          boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
          // Was opacity:0 when neither hovered nor active -- invisible with
          // no way to discover it on touch devices (no hover state exists).
          // Dimmed-but-present by default, full opacity on hover/active, so
          // touch users can see and tap it without ever hovering.
          opacity: hoverSection === sectionKey || isActive ? 1 : 0.55,
          transition: "opacity 0.15s, background 0.15s",
          zIndex: 10,
          display: "inline-flex", alignItems: "center", gap: 5,
        }}>
        {isActive ? <><FaCheck size={10} /> Editing</> : <><FaPen size={10} /> Edit</>}
      </button>
    );
  };

  const hasOverview         = overview_impact || overview_description || activeSection === "overview";
  const hasKeyBenefits      = kb_impact || kb_cards.length > 0 || activeSection === "key_benefits";
  const hasFeatures         = fa_impact || fa_items.length > 0 || fa_columns.length > 0 || activeSection === "features_apps";
  const hasApplications     = app_impact || app_items.length > 0 || activeSection === "applications";
  const hasCustomerStories  = cs_impact || cs_items.length > 0 || activeSection === "customer_stories";
  const hasPromo            = promo_title || promo_btn_label || activeSection === "promo_section";
  const hasRelatedContent   = rc_impact || rc_cards.length > 0 || activeSection === "related_content";
  const hasResources        = res_impact || res_selected.length > 0 || activeSection === "resources";
  const hasRelatedProducts  = rp_impact || rp_cards.length > 0 || activeSection === "related_products";
  const hasTrainingSupport  = ts_label || ts_card1_cta_link || ts_card2_cta_link || ts_card3_cta_link || activeSection === "training_support";
  const hasOthers           = oth_items.length > 0 || activeSection === "others";

  return (
    <div className={fullPage ? "preview-window-full" : "preview-window"}>
      {/* Browser bar — hidden in full page mode */}
      {!fullPage && <div className="preview-browser-bar" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="preview-dot red" />
        <div className="preview-dot yellow" />
        <div className="preview-dot green" />
        <div className="preview-url" style={{ flex: 1 }}>
          yoursite.com/{pageType.toLowerCase().replace(/ /g, "-")}/preview
        </div>
        {supabase && user && (
          <SectionCommentBubble
            inline
            sectionKey=""
            label="General"
            comments={commentsBySection[""] || []}
            onPost={(text) => handlePostComment("", text)}
            user={user}
          />
        )}
      </div>}

      {/* Banner Section */}
      <div data-section="banner" className="banner-section" style={{position:"relative"}} onMouseEnter={()=>setHoverSection("banner")} onMouseLeave={()=>setHoverSection(null)}><EditBtn sectionKey="banner" /><Bubble sectionKey="banner" label="Banner" />
        {/* Background image */}
        <img
          src={banner_image || "/defasult-banner-image.png"}
          alt=""
          className="banner-bg-img"
          onError={e => { e.currentTarget.style.display = "none"; }}
        />
        <div className="banner-inner">
          <HighlightBanner sectionKey="banner" />
          <span className="banner-tag">{pageType}</span>
          <h1 className={`banner-title${!page_title ? " placeholder" : ""}`}>
            {page_title || "Page Title"}
          </h1>
          <p className={`banner-subtitle${!sub_title ? " placeholder" : ""}`}>
            {sub_title || "Subtitle goes here"}
          </p>
          {!banner_image && banner_placeholder && (
            <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, background: "#F3F3F3", border: "1px dashed #D0D0D0", borderRadius: 6, padding: "8px 14px", fontSize: 12, color: "#646464" }}>
              <FaPalette size={12} /> {banner_placeholder}
            </div>
          )}
          <div className="banner-ctas">
            {cta1_label && <div className="banner-cta-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><FaArrowRight size={11} /> {cta1_label}</div>}
            {cta2_label && <div className="banner-cta-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><FaChevronRight size={11} /> {cta2_label}</div>}
          </div>
          {banner_tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
              {banner_tags.map(t => (
                <span key={t.id} style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 20,
                  background: "rgba(255,255,255,0.15)", color: "#fff",
                  border: "1px solid rgba(255,255,255,0.35)",
                }}>
                  {t.category ? `${t.category} / ${t.name}` : t.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overview Section */}
      {hasOverview && (
        <>
          <div className="preview-section-divider" />
          <div data-section="overview" className="overview-section" style={{position:"relative"}} onMouseEnter={()=>setHoverSection("overview")} onMouseLeave={()=>setHoverSection(null)}><EditBtn sectionKey="overview" /><Bubble sectionKey="overview" label="Overview" />
            <div className="section-container overview">
            <HighlightBanner sectionKey="overview" />
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
                  ? <div className="overview-media-video" style={{ display: "flex", alignItems: "center", gap: 6 }}><FaPlay size={11} /> Video: {overview_media_url}</div>
                  : <img src={overview_media_url} alt={overview_media_alt || "Overview media"} className="overview-media-img"
                      onError={e => { e.target.style.display = "none"; }} />
                }
              </div>
            ) : overview_media_placeholder ? (
              <div className="overview-media-placeholder">
                <div className="icon" style={{ display: "flex", justifyContent: "center" }}><FaPalette /></div>
                <div className="text">{overview_media_placeholder}</div>
              </div>
            ) : (
              <div className="overview-media-placeholder">
                <div className="icon" style={{ display: "flex", justifyContent: "center" }}><FaImage /></div>
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
          <div data-section="key_benefits" style={{width:"100%",position:"relative"}} onMouseEnter={()=>setHoverSection("key_benefits")} onMouseLeave={()=>setHoverSection(null)}><EditBtn sectionKey="key_benefits" /><Bubble sectionKey="key_benefits" label="Key Benefits" /><HighlightBanner sectionKey="key_benefits" /><KeyBenefitsPreview data={parsedReq} attachments={attachments} /></div>
        </>
      )}

      {/* Features */}
      {hasFeatures && (
        <>
          <div className="preview-section-divider" />
          <div data-section="features_apps" style={{width:"100%",position:"relative"}} onMouseEnter={()=>setHoverSection("features_apps")} onMouseLeave={()=>setHoverSection(null)}><EditBtn sectionKey="features_apps" /><Bubble sectionKey="features_apps" label="Features" /><HighlightBanner sectionKey="features_apps" /><FeaturesAppsPreview data={parsedReq} attachments={attachments} /></div>
        </>
      )}

      {/* Applications */}
      {hasApplications && (
        <>
          <div className="preview-section-divider" />
          <div data-section="applications" style={{width:"100%",position:"relative"}} onMouseEnter={()=>setHoverSection("applications")} onMouseLeave={()=>setHoverSection(null)}><EditBtn sectionKey="applications" /><Bubble sectionKey="applications" label="Applications" /><HighlightBanner sectionKey="applications" /><ApplicationsPreview data={parsedReq} attachments={attachments} /></div>
        </>
      )}

      {/* Customer Stories */}
      {hasCustomerStories && (
        <>
          <div className="preview-section-divider" />
          <div data-section="customer_stories" style={{width:"100%",position:"relative"}} onMouseEnter={()=>setHoverSection("customer_stories")} onMouseLeave={()=>setHoverSection(null)}><EditBtn sectionKey="customer_stories" /><Bubble sectionKey="customer_stories" label="Customer Stories" /><HighlightBanner sectionKey="customer_stories" /><CustomerStoriesPreview data={parsedReq} attachments={attachments} /></div>
        </>
      )}

      {/* Promo Section */}
      {hasPromo && (
        <>
          <div className="preview-section-divider" />
          <div data-section="promo_section" style={{width:"100%",position:"relative"}} onMouseEnter={()=>setHoverSection("promo_section")} onMouseLeave={()=>setHoverSection(null)}><EditBtn sectionKey="promo_section" /><Bubble sectionKey="promo_section" label="Promo Section" /><HighlightBanner sectionKey="promo_section" /><PromoSectionPreview data={parsedReq} attachments={attachments} /></div>
        </>
      )}

      {/* Related Content */}
      {hasRelatedContent && (
        <>
          <div className="preview-section-divider" />
          <div data-section="related_content" style={{width:"100%",position:"relative"}} onMouseEnter={()=>setHoverSection("related_content")} onMouseLeave={()=>setHoverSection(null)}><EditBtn sectionKey="related_content" /><Bubble sectionKey="related_content" label="Related Content" /><HighlightBanner sectionKey="related_content" /><RelatedContentPreview data={parsedReq} attachments={attachments} /></div>
        </>
      )}

      {/* Resources */}
      {hasResources && (
        <>
          <div className="preview-section-divider" />
          <div data-section="resources" style={{width:"100%",position:"relative"}} onMouseEnter={()=>setHoverSection("resources")} onMouseLeave={()=>setHoverSection(null)}><EditBtn sectionKey="resources" /><Bubble sectionKey="resources" label="Resources" /><HighlightBanner sectionKey="resources" /><ResourcesPreview data={parsedReq} /></div>
        </>
      )}

      {/* Related Products */}
      {hasRelatedProducts && (
        <>
          <div className="preview-section-divider" />
          <div data-section="related_products" style={{width:"100%",position:"relative"}} onMouseEnter={()=>setHoverSection("related_products")} onMouseLeave={()=>setHoverSection(null)}><EditBtn sectionKey="related_products" /><Bubble sectionKey="related_products" label="Related Products" /><HighlightBanner sectionKey="related_products" /><RelatedProductsPreview data={parsedReq} attachments={attachments} /></div>
        </>
      )}

      {/* Training & Support */}
      {hasTrainingSupport && (
        <>
          <div className="preview-section-divider" />
          <div data-section="training_support" style={{width:"100%",position:"relative"}} onMouseEnter={()=>setHoverSection("training_support")} onMouseLeave={()=>setHoverSection(null)}><EditBtn sectionKey="training_support" /><Bubble sectionKey="training_support" label="Training & Support" /><HighlightBanner sectionKey="training_support" /><TrainingSupportPreview data={parsedReq} /></div>
        </>
      )}

      {/* Others */}
      {hasOthers && (
        <>
          <div className="preview-section-divider" />
          <div data-section="others" style={{width:"100%",position:"relative"}} onMouseEnter={()=>setHoverSection("others")} onMouseLeave={()=>setHoverSection(null)}><EditBtn sectionKey="others" /><Bubble sectionKey="others" label="Others" /><HighlightBanner sectionKey="others" /><OthersPreview data={parsedReq} /></div>
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
            hasApplications ? "Applications" : null,
            hasCustomerStories ? "Stories" : null,
            hasPromo ? "Promo" : null,
            hasRelatedContent ? "Related" : null,
            hasResources ? "Resources" : null,
            hasRelatedProducts ? "Related Products" : null,
            hasTrainingSupport ? "Training & Support" : null,
            hasOthers ? "Others" : null,
          ].filter(Boolean).join(" + ")}
        </span>
      </div>
    </div>
  );
}
