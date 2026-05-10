"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { PAGE_TYPES, getSectionsForPageType } from "@/lib/constants";
import PagePreview from "@/components/PagePreview";
import AIAssist from "@/components/AIAssist";
import KeyBenefits from "@/components/sections/KeyBenefits";
import KeyBenefitsPreview from "@/components/sections/KeyBenefitsPreview";
import FeaturesApps from "@/components/sections/FeaturesApps";
import FeaturesAppsPreview from "@/components/sections/FeaturesAppsPreview";
import CustomerStories from "@/components/sections/CustomerStories";
import CustomerStoriesPreview from "@/components/sections/CustomerStoriesPreview";
import PromoSection from "@/components/sections/PromoSection";
import PromoSectionPreview from "@/components/sections/PromoSectionPreview";
import RelatedContent from "@/components/sections/RelatedContent";
import RelatedContentPreview from "@/components/sections/RelatedContentPreview";
import Resources from "@/components/sections/Resources";
import ResourcesPreview from "@/components/sections/ResourcesPreview";
import RelatedProducts from "@/components/sections/RelatedProducts";
import RelatedProductsPreview from "@/components/sections/RelatedProductsPreview";
import TrainingSupport from "@/components/sections/TrainingSupport";
import TrainingSupportPreview from "@/components/sections/TrainingSupportPreview";

const EMPTY_BANNER   = { page_title:"", sub_title:"", cta1_label:"", cta1_link:"", cta2_label:"", cta2_link:"", banner_image:"" };
const EMPTY_OVERVIEW = { overview_label:"", overview_impact:"", overview_description:"", overview_media_url:"", overview_media_type:"image", overview_media_note:"" };

const Field = ({ label, value, onChange, placeholder, multiline, required, hint, fieldKey, pageType }) => (
  <div className="field-wrap">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
      <label className="field-label" style={{ margin: 0 }}>
        {label}{required && <span className="req"> *</span>}
      </label>
      {fieldKey && (
        <AIAssist
          fieldKey={fieldKey}
          currentValue={value}
          pageType={pageType || "Product"}
          onAccept={onChange}
        />
      )}
    </div>
    {multiline
      ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="textarea" />
      : <input    value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input" />
    }
    {hint && <div className="field-hint">{hint}</div>}
  </div>
);

export default function NewRequest({ go, user, draftId }) {
  const [step,          setStep]         = useState(draftId ? 2 : 1);
  const [draftDbId,     setDraftDbId]    = useState(draftId || null);
  const [pageType,      setPageType]     = useState("");
  const [activeSection, setActiveSection]= useState("banner");
  const previewRef = useRef(null);
  const [banner,        setBanner]       = useState(EMPTY_BANNER);
  const [overview,      setOverview]     = useState(EMPTY_OVERVIEW);
  const [naMap,         setNaMap]        = useState({});
  const [loadingDraft,  setLoadingDraft] = useState(!!draftId);
  const [kbData,        setKbData]       = useState({ kb_label:"", kb_impact:"", kb_description:"", kb_cards:[] });
  const [faData,        setFaData]       = useState({ fa_label:"", fa_impact:"", fa_description:"", fa_view_type:"", fa_items:[], fa_columns:[], fa_rows:[] });
  const [csData,        setCsData]       = useState({ cs_label:"", cs_impact:"", cs_items:[] });
  const [promoData,     setPromoData]    = useState({ promo_bg_image:"", promo_bg_note:"", promo_label:"", promo_title:"", promo_description:"", promo_btn_label:"", promo_btn_link:"" });
  const [rcData,        setRcData]       = useState({ rc_label:"", rc_impact:"", rc_cards:[] });
  const [resData,       setResData]      = useState({ res_label:"", res_impact:"", res_selected:[], res_video_carousel:{}, res_mixed_carousel:{}, res_resources:{}, res_news:{}, res_blogs:{} });
  const [rpData,        setRpData]       = useState({ rp_label:"", rp_impact:"", rp_description:"", rp_cards:[] });
  const [tsData,        setTsData]       = useState({});
  const [saving,        setSaving]       = useState(false);
  const [error,         setError]        = useState("");
  const [showExitModal, setShowExitModal]= useState(false);

  // Auto-scroll preview to the active section
  useEffect(() => {
    if (!previewRef.current) return;
    // Small delay so React renders the section into DOM before we scroll
    const timer = setTimeout(() => {
      const target = previewRef.current?.querySelector(`[data-section="${activeSection}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [activeSection]);

  // Load draft data if editing
  useEffect(() => {
    if (!draftId) return;
    const loadDraft = async () => {
      const { data, error } = await supabase.from("requests").select("*").eq("id", draftId).single();
      if (error || !data) { go("dashboard"); return; }
      setPageType(data.page_type || "");
      setBanner({ page_title: data.page_title||"", sub_title: data.sub_title||"", cta1_label: data.cta1_label||"", cta1_link: data.cta1_link||"", cta2_label: data.cta2_label||"", cta2_link: data.cta2_link||"", banner_image: data.banner_image||"" });
      setOverview({ overview_label: data.overview_label||"", overview_impact: data.overview_impact||"", overview_description: data.overview_description||"", overview_media_url: data.overview_media_url||"", overview_media_type: data.overview_media_type||"image", overview_media_note: data.overview_media_note||"" });
      if (data.kb_impact || data.kb_cards?.length) setKbData({ kb_label: data.kb_label||"", kb_impact: data.kb_impact||"", kb_description: data.kb_description||"", kb_cards: data.kb_cards||[] });
      if (data.fa_impact || data.fa_view_type) setFaData({ fa_label: data.fa_label||"", fa_impact: data.fa_impact||"", fa_description: data.fa_description||"", fa_view_type: data.fa_view_type||"", fa_items: data.fa_items||[], fa_columns: data.fa_columns||[], fa_rows: data.fa_rows||[] });
      if (data.cs_impact || data.cs_items?.length) setCsData({ cs_label: data.cs_label||"", cs_impact: data.cs_impact||"", cs_items: data.cs_items||[] });
      if (data.promo_title) setPromoData({ promo_bg_image: data.promo_bg_image||"", promo_bg_note: data.promo_bg_note||"", promo_label: data.promo_label||"", promo_title: data.promo_title||"", promo_description: data.promo_description||"", promo_btn_label: data.promo_btn_label||"", promo_btn_link: data.promo_btn_link||"" });
      if (data.rc_impact || data.rc_cards?.length) setRcData({ rc_label: data.rc_label||"", rc_impact: data.rc_impact||"", rc_cards: data.rc_cards||[] });
      if (data.res_impact || data.res_selected?.length) setResData({ res_label: data.res_label||"", res_impact: data.res_impact||"", res_selected: data.res_selected||[], res_video_carousel: data.res_video_carousel||{}, res_mixed_carousel: data.res_mixed_carousel||{}, res_resources: data.res_resources||{}, res_news: data.res_news||{}, res_blogs: data.res_blogs||{} });
      if (data.rp_impact || data.rp_cards?.length) setRpData({ rp_label: data.rp_label||"", rp_impact: data.rp_impact||"", rp_description: data.rp_description||"", rp_cards: data.rp_cards||[] });
      if (data.ts_label || data.ts_card1_cta_link) setTsData({ ts_label: data.ts_label, ts_impact: data.ts_impact, ts_card1_icon: data.ts_card1_icon, ts_card1_title: data.ts_card1_title, ts_card1_description: data.ts_card1_description, ts_card1_cta_label: data.ts_card1_cta_label, ts_card1_cta_link: data.ts_card1_cta_link, ts_card2_icon: data.ts_card2_icon, ts_card2_title: data.ts_card2_title, ts_card2_description: data.ts_card2_description, ts_card2_cta_label: data.ts_card2_cta_label, ts_card2_cta_link: data.ts_card2_cta_link, ts_card3_icon: data.ts_card3_icon, ts_card3_title: data.ts_card3_title, ts_card3_description: data.ts_card3_description, ts_card3_cta_label: data.ts_card3_cta_label, ts_card3_cta_link: data.ts_card3_cta_link });
      setLoadingDraft(false);
    };
    loadDraft();
  }, [draftId]);

  const updBanner   = (k, v) => setBanner(p  => ({ ...p,  [k]: v }));
  const updOverview = (k, v) => setOverview(p => ({ ...p,  [k]: v }));
  const toggleNA    = (key)  => setNaMap(p   => ({ ...p,  [key]: !p[key] }));

  const sections   = pageType ? getSectionsForPageType(pageType) : [];
  const hasContent = banner.page_title || overview.overview_impact;

  const isValid = () => {
    if (!banner.page_title) return false;
    const ov = sections.find(s => s.key === "overview");
    if (ov && ov.required && !naMap["overview"]) {
      if (!overview.overview_impact || !overview.overview_description) return false;
    }
    const kb = sections.find(s => s.key === "key_benefits");
    if (kb && kb.required && !naMap["key_benefits"]) {
      if (!kbData.kb_impact) return false;
      if (kbData.kb_cards.length === 0) return false;
      if (kbData.kb_cards.some(c => !c.title || !c.description)) return false;
    }
    const fa = sections.find(s => s.key === "features_apps");
    if (fa && fa.required && !naMap["features_apps"]) {
      if (!faData.fa_impact || !faData.fa_view_type) return false;
    }
    return true;
  };

  const buildPayload = (status) => ({
    page_type: pageType, status, created_by: user.id,
    // Banner
    page_title: banner.page_title, sub_title: banner.sub_title,
    cta1_label: banner.cta1_label, cta1_link: banner.cta1_link,
    cta2_label: banner.cta2_label, cta2_link: banner.cta2_link,
    banner_image: banner.banner_image,
    // Overview
    ...(!naMap["overview"] ? {
      overview_label:       overview.overview_label,
      overview_impact:      overview.overview_impact,
      overview_description: overview.overview_description,
      overview_media_url:   overview.overview_media_url,
      overview_media_type:  overview.overview_media_type,
      overview_media_note:  overview.overview_media_note,
    } : {}),
    // Key Benefits
    ...(!naMap["key_benefits"] ? {
      kb_label:       kbData.kb_label,
      kb_impact:      kbData.kb_impact,
      kb_description: kbData.kb_description,
      kb_cards:       kbData.kb_cards,
    } : {}),
    // Features / Applications
    ...(!naMap["features_apps"] ? {
      fa_label:       faData.fa_label,
      fa_impact:      faData.fa_impact,
      fa_description: faData.fa_description,
      fa_view_type:   faData.fa_view_type,
      fa_items:       faData.fa_items,
      fa_columns:     faData.fa_columns,
      fa_rows:        faData.fa_rows,
    } : {}),
    // Customer Stories
    ...(!naMap["customer_stories"] ? {
      cs_label:  csData.cs_label,
      cs_impact: csData.cs_impact,
      cs_items:  csData.cs_items,
    } : {}),
    // Promo Section
    ...(!naMap["promo_section"] ? {
      promo_bg_image:    promoData.promo_bg_image,
      promo_bg_note:     promoData.promo_bg_note,
      promo_label:       promoData.promo_label,
      promo_title:       promoData.promo_title,
      promo_description: promoData.promo_description,
      promo_btn_label:   promoData.promo_btn_label,
      promo_btn_link:    promoData.promo_btn_link,
    } : {}),
    // Related Content
    ...(!naMap["related_content"] ? {
      rc_label:  rcData.rc_label,
      rc_impact: rcData.rc_impact,
      rc_cards:  rcData.rc_cards,
    } : {}),
    // Training & Support
    ...(!naMap["training_support"] ? {
      ts_label:               tsData.ts_label,
      ts_impact:              tsData.ts_impact,
      ts_card1_icon:          tsData.ts_card1_icon,
      ts_card1_title:         tsData.ts_card1_title,
      ts_card1_description:   tsData.ts_card1_description,
      ts_card1_cta_label:     tsData.ts_card1_cta_label,
      ts_card1_cta_link:      tsData.ts_card1_cta_link,
      ts_card2_icon:          tsData.ts_card2_icon,
      ts_card2_title:         tsData.ts_card2_title,
      ts_card2_description:   tsData.ts_card2_description,
      ts_card2_cta_label:     tsData.ts_card2_cta_label,
      ts_card2_cta_link:      tsData.ts_card2_cta_link,
      ts_card3_icon:          tsData.ts_card3_icon,
      ts_card3_title:         tsData.ts_card3_title,
      ts_card3_description:   tsData.ts_card3_description,
      ts_card3_cta_label:     tsData.ts_card3_cta_label,
      ts_card3_cta_link:      tsData.ts_card3_cta_link,
    } : {}),
    // Related Products
    ...(!naMap["related_products"] ? {
      rp_label:       rpData.rp_label,
      rp_impact:      rpData.rp_impact,
      rp_description: rpData.rp_description,
      rp_cards:       rpData.rp_cards,
    } : {}),
    // Resources
    ...(!naMap["resources"] ? {
      res_label:          resData.res_label,
      res_impact:         resData.res_impact,
      res_selected:       resData.res_selected,
      res_video_carousel: resData.res_video_carousel,
      res_mixed_carousel: resData.res_mixed_carousel,
      res_resources:      resData.res_resources,
      res_news:           resData.res_news,
      res_blogs:          resData.res_blogs,
    } : {}),
  });

  const saveDraft = async () => {
    // Validate minimum required fields
    if (!pageType) {
      setError("Please select a page type first.");
      return;
    }
    if (!banner.page_title) {
      setError("Please enter a page title before saving.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setError("Session expired. Please sign out and log in again.");
        setSaving(false);
        return;
      }

      const payload = buildPayload("draft");

      let err;
      if (draftDbId) {
        // Update existing draft
        const { error } = await supabase.from("requests").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", draftDbId);
        err = error;
      } else {
        // Insert new draft
        const { data, error } = await supabase.from("requests").insert(payload).select().single();
        err = error;
        if (!err && data) setDraftDbId(data.id);
      }

      if (err) {
        console.error("Save error:", err);
        setError(`Save failed: ${err.message}`);
        setSaving(false);
        return;
      }

      setSaving(false);
      go("dashboard");
    } catch (e) {
      console.error("Unexpected error:", e);
      setError(`Unexpected error: ${e.message}`);
      setSaving(false);
    }
  };

  // Save draft without navigating (used from exit modal)
  const saveAndExit = async () => {
    if (!pageType || !banner.page_title) { go("dashboard"); return; }
    setSaving(true);
    try {
      const payload = buildPayload("draft");
      if (draftDbId) {
        await supabase.from("requests").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", draftDbId);
      } else {
        await supabase.from("requests").insert(payload);
      }
    } catch (e) {
      console.error("Save and exit error:", e);
    }
    setSaving(false);
    setShowExitModal(false);
    go("dashboard");
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    const payload = buildPayload("editorial_qa");
    console.log("Submitting payload:", payload);
    const { data, error: err } = await supabase.from("requests").insert(payload).select().single();
    if (err) {
      console.error("Submit error:", err);
      setError(`Failed to submit: ${err.message}`);
      setSaving(false);
      return;
    }
    const { error: histErr } = await supabase.from("status_history").insert({ request_id: data.id, user_id: user.id, user_name: user.name, from_status: null, to_status: "editorial_qa" });
    if (histErr) console.error("History error:", histErr);
    go("detail", data.id);
    setSaving(false);
  };

  // Merged data for unified preview
  const previewData = { ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData };
  const steps = ["Select Page Type", "Fill Sections", "Preview & Submit"];

  if (loadingDraft) return (
    <div style={{ padding: "4rem", textAlign: "center", color: "#B5B5B5", fontFamily: "'Rubik',sans-serif" }}>
      Loading draft...
    </div>
  );

  return (
    <div className="fade-in" style={{ maxWidth: "100%", margin: "0 auto", fontFamily: "'Rubik', sans-serif" }}>

      {/* Exit Modal */}
      {showExitModal && (
        <div className="modal-overlay" onClick={() => setShowExitModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>Leave without saving?</h2>
            <p>You have unsaved content. Save it as a draft so you can continue later.</p>
            <div className="modal-actions">
              <button onClick={saveAndExit} disabled={saving} className="btn-primary btn-full">
                {saving ? "Saving..." : "💾 Save as Draft & Exit"}
              </button>
              <button onClick={() => go("dashboard")} className="btn-secondary btn-full">
                Discard & Exit
              </button>
              <button onClick={() => setShowExitModal(false)} className="btn-ghost btn-full">
                Cancel — Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={() => hasContent ? setShowExitModal(true) : go("dashboard")} className="btn-ghost">
          ← Back
        </button>
        <div style={{ width: 1, height: 20, background: "#E0E0E0" }} />
        <div>
          <h1 style={{ fontSize: 20, margin: 0 }}>New Content Request</h1>
          <p style={{ color: "#B5B5B5", fontSize: 12, margin: 0 }}>{pageType || "Select a page type to begin"}</p>
        </div>
      </div>

      {/* Step bar */}
      <div className="step-bar">
        {steps.map((s, i) => {
          const n = i + 1, done = n < step, active = n === step;
          return (
            <div key={s} className={`step-item${i < 2 ? " step-item-flex" : ""}`}>
              <div className={`step-circle ${done ? "done" : active ? "active" : ""}`}>
                {done ? "✓" : n}
              </div>
              <span className={`step-label ${done ? "done" : active ? "active" : ""}`}>{s}</span>
              {i < 2 && <div className={`step-line${done ? " done" : ""}`} />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Page Type ── */}
      {step === 1 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {PAGE_TYPES.map(pt => (
              <button key={pt} onClick={() => setPageType(pt)}
                style={{ background: pageType === pt ? "#181313" : "#fff", border: `2px solid ${pageType === pt ? "#181313" : "#E0E0E0"}`, borderRadius: 12, padding: "1.3rem 1.5rem", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: pageType === pt ? "#F3F3F3" : "#181313", marginBottom: 5 }}>{pt}</div>
                <div style={{ fontSize: 12, color: "#B5B5B5" }}>
                  {pt === "Product"          && "Product pages with specs and CTAs"}
                  {pt === "Solutions"         && "Solutions overview with benefits"}
                  {pt === "Glossary"          && "Technical definitions"}
                  {pt === "On-demand Webinar" && "Webinar landing with registration"}
                </div>
                {pageType === pt && (
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {getSectionsForPageType(pt).map(s => (
                      <span key={s.key} style={{ fontSize: 10, background: s.required ? "#181313" : "#F3F3F3", color: s.required ? "#fff" : "#646464", borderRadius: 10, padding: "2px 8px", fontWeight: 500 }}>
                        {s.label} · {s.required ? "Required" : "Optional"}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
            <button disabled={!pageType} onClick={() => setStep(2)} className="btn-primary" style={{ opacity: pageType ? 1 : 0.4 }}>
              Continue →
            </button>
          </div>
        </>
      )}

      {/* ── Step 2: Fill Sections ── */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

          {/* ── Horizontal section tab bar ── */}
          <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", overflowX: "auto", whiteSpace: "nowrap", padding: "0 4px" }}>
            {sections.map(s => {
              const isNA     = naMap[s.key];
              const isActive = activeSection === s.key;
              const isDone   = s.key === "banner"
                ? !!banner.page_title
                : s.key === "overview"
                ? (isNA || (!!overview.overview_impact && !!overview.overview_description))
                : s.key === "key_benefits"
                ? (isNA || (!!kbData.kb_impact && kbData.kb_cards.length > 0 && kbData.kb_cards.every(c => c.title && c.description)))
                : s.key === "features_apps"
                ? (isNA || (!!faData.fa_impact && !!faData.fa_view_type))
                : s.key === "customer_stories"
                ? (isNA || (!!csData.cs_impact && csData.cs_items.length > 0))
                : s.key === "promo_section"
                ? (isNA || (!!promoData.promo_title && !!promoData.promo_btn_label))
                : s.key === "related_content"
                ? (isNA || (!!rcData.rc_impact && rcData.rc_cards.length > 0))
                : s.key === "resources"
                ? (isNA || (!!resData.res_impact && resData.res_selected.length > 0))
                : s.key === "related_products"
                ? (isNA || (!!rpData.rp_impact && rpData.rp_cards.length > 0))
                : s.key === "training_support"
                ? true
                : false;
              return (
                <button key={s.key} onClick={() => setActiveSection(s.key)}
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 2,
                    padding: "10px 16px",
                    marginRight: 2,
                    background: isActive ? "#181313" : "transparent",
                    border: "none",
                    borderBottom: isActive ? "2px solid #14b8a6" : "2px solid transparent",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s",
                    fontFamily: "'Rubik', sans-serif",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: isActive ? "#fff" : "#181313" }}>
                      {s.label}
                    </span>
                    {isDone && !isNA && (
                      <span style={{ fontSize: 11, color: "#14b8a6", fontWeight: 600 }}>✓</span>
                    )}
                    {isNA && (
                      <span style={{ fontSize: 10, color: "#94a3b8" }}>—</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10,
                    color: isActive ? "#94a3b8" : (s.required && !isNA ? "#c0392b" : "#94a3b8"),
                    fontWeight: 400,
                  }}>
                    {isNA ? "Marked N/A" : s.required ? "Required" : "Optional"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Section form + preview */}
          <div>
            {/* Banner */}
            {activeSection === "banner" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}>
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h3>Banner Section</h3>
                      <p>Common to all page types · Required</p>
                    </div>
                  </div>
                  <Field label="Page Title" required value={banner.page_title} onChange={v => updBanner("page_title", v)} placeholder="e.g. Xcelium Logic Simulator" fieldKey="page_title" pageType={pageType} />
                  <Field label="Sub Title"  value={banner.sub_title}  onChange={v => updBanner("sub_title",  v)} placeholder="e.g. Industry-leading simulation platform" fieldKey="sub_title" pageType={pageType} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="CTA 1 Label" value={banner.cta1_label} onChange={v => updBanner("cta1_label", v)} placeholder="Read Blog" fieldKey="cta1_label" pageType={pageType} />
                    <Field label="CTA 1 Link"  value={banner.cta1_link}  onChange={v => updBanner("cta1_link",  v)} placeholder="/blog/..." />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="CTA 2 Label" value={banner.cta2_label} onChange={v => updBanner("cta2_label", v)} placeholder="Watch Video" fieldKey="cta2_label" pageType={pageType} />
                    <Field label="CTA 2 Link"  value={banner.cta2_link}  onChange={v => updBanner("cta2_link",  v)} placeholder="/video/..." />
                  </div>
                  <Field label="Banner Image URL" value={banner.banner_image} onChange={v => updBanner("banner_image", v)} placeholder="https://... or describe image" hint="Design QA will finalize the image" />
                </div>
                </div>
                <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}>
                  <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                  <PagePreview req={previewData} pageType={pageType} activeSection={activeSection} />
                </div>
              </div>
            )}

            {/* Key Benefits */}
            {activeSection === "key_benefits" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 14, margin: 0 }}>Key Benefits Section</h3>
                    <p className="text-xs text-muted mt-4">
                      {sections.find(s => s.key === "key_benefits")?.required ? "Required for this page type" : "Optional for this page type"}
                    </p>
                  </div>
                  <button onClick={() => toggleNA("key_benefits")}
                    style={{ background: naMap["key_benefits"] ? "#181313" : "#F3F3F3", color: naMap["key_benefits"] ? "#fff" : "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.9rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                    {naMap["key_benefits"] ? "✓ Marked N/A — Undo" : "Mark as N/A"}
                  </button>
                </div>

                {naMap["key_benefits"] ? (
                  <div className="na-placeholder">
                    <div className="icon">—</div>
                    <div className="text">Key Benefits section marked as Not Applicable</div>
                    <button onClick={() => toggleNA("key_benefits")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}>
                      <KeyBenefits
                        data={kbData}
                        onChange={setKbData}
                        pageType={pageType}
                        isNA={false}
                        onToggleNA={() => toggleNA("key_benefits")}
                      />
                    </div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}>
                      <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                      <PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} pageType={pageType} activeSection={activeSection} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Features / Applications */}
            {activeSection === "features_apps" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 14, margin: 0 }}>🔧 Features / Applications</h3>
                    <p className="text-xs text-muted mt-4">
                      {sections.find(s => s.key === "features_apps")?.required ? "Required for this page type" : "Optional for this page type"}
                    </p>
                  </div>
                  <button onClick={() => toggleNA("features_apps")}
                    style={{ background: naMap["features_apps"] ? "#181313" : "#F3F3F3", color: naMap["features_apps"] ? "#fff" : "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.9rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                    {naMap["features_apps"] ? "✓ Marked N/A — Undo" : "Mark as N/A"}
                  </button>
                </div>
                {naMap["features_apps"] ? (
                  <div className="na-placeholder">
                    <div className="icon">—</div>
                    <div className="text">Features / Applications marked as Not Applicable</div>
                    <button onClick={() => toggleNA("features_apps")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}>
                      <FeaturesApps data={faData} onChange={setFaData} isNA={false} onToggleNA={() => toggleNA("features_apps")} />
                    </div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}>
                      <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                      <PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} pageType={pageType} activeSection={activeSection} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customer Stories */}
            {activeSection === "customer_stories" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div><h3 style={{ fontSize: 14, margin: 0 }}>💬 Customer Stories</h3></div>
                  <button onClick={() => toggleNA("customer_stories")} style={{ background: naMap["customer_stories"] ? "#181313" : "#F3F3F3", color: naMap["customer_stories"] ? "#fff" : "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.9rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                    {naMap["customer_stories"] ? "✓ Marked N/A — Undo" : "Mark as N/A"}
                  </button>
                </div>
                {naMap["customer_stories"] ? (
                  <div className="na-placeholder"><div className="icon">—</div><div className="text">Customer Stories marked as Not Applicable</div><button onClick={() => toggleNA("customer_stories")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}><CustomerStories data={csData} onChange={setCsData} isNA={false} onToggleNA={() => toggleNA("customer_stories")} /></div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}><p className="text-xs text-uppercase text-muted mb-8">Live Preview</p><PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} pageType={pageType} activeSection={activeSection} /></div>
                  </div>
                )}
              </div>
            )}

            {/* Promo Section */}
            {activeSection === "promo_section" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div><h3 style={{ fontSize: 14, margin: 0 }}>📣 Promo Section</h3></div>
                  <button onClick={() => toggleNA("promo_section")} style={{ background: naMap["promo_section"] ? "#181313" : "#F3F3F3", color: naMap["promo_section"] ? "#fff" : "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.9rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                    {naMap["promo_section"] ? "✓ Marked N/A — Undo" : "Mark as N/A"}
                  </button>
                </div>
                {naMap["promo_section"] ? (
                  <div className="na-placeholder"><div className="icon">—</div><div className="text">Promo Section marked as Not Applicable</div><button onClick={() => toggleNA("promo_section")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div><PromoSection data={promoData} onChange={setPromoData} isNA={false} onToggleNA={() => toggleNA("promo_section")} /></div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}><p className="text-xs text-uppercase text-muted mb-8">Live Preview</p><PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} pageType={pageType} activeSection={activeSection} /></div>
                  </div>
                )}
              </div>
            )}

            {/* Related Content */}
            {activeSection === "related_content" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div><h3 style={{ fontSize: 14, margin: 0 }}>📄 Related Content</h3></div>
                  <button onClick={() => toggleNA("related_content")} style={{ background: naMap["related_content"] ? "#181313" : "#F3F3F3", color: naMap["related_content"] ? "#fff" : "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.9rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                    {naMap["related_content"] ? "✓ Marked N/A — Undo" : "Mark as N/A"}
                  </button>
                </div>
                {naMap["related_content"] ? (
                  <div className="na-placeholder"><div className="icon">—</div><div className="text">Related Content marked as Not Applicable</div><button onClick={() => toggleNA("related_content")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}><RelatedContent data={rcData} onChange={setRcData} isNA={false} onToggleNA={() => toggleNA("related_content")} /></div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}><p className="text-xs text-uppercase text-muted mb-8">Live Preview</p><PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} pageType={pageType} activeSection={activeSection} /></div>
                  </div>
                )}
              </div>
            )}

            {/* Resources */}
            {activeSection === "resources" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div><h3 style={{ fontSize: 14, margin: 0 }}>📚 Resources</h3></div>
                  <button onClick={() => toggleNA("resources")} style={{ background: naMap["resources"] ? "#181313" : "#F3F3F3", color: naMap["resources"] ? "#fff" : "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.9rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                    {naMap["resources"] ? "✓ Marked N/A — Undo" : "Mark as N/A"}
                  </button>
                </div>
                {naMap["resources"] ? (
                  <div className="na-placeholder"><div className="icon">—</div><div className="text">Resources marked as Not Applicable</div><button onClick={() => toggleNA("resources")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}><Resources data={resData} onChange={setResData} isNA={false} onToggleNA={() => toggleNA("resources")} /></div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}><p className="text-xs text-uppercase text-muted mb-8">Live Preview</p><PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} pageType={pageType} activeSection={activeSection} /></div>
                  </div>
                )}
              </div>
            )}

            {/* Related Products */}
            {activeSection === "related_products" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 14, margin: 0 }}>Related Products</h3>
                    <p className="text-xs text-muted mt-4">Optional for this page type</p>
                  </div>
                  <button onClick={() => toggleNA("related_products")}
                    style={{ background: naMap["related_products"] ? "#181313" : "#F3F3F3", color: naMap["related_products"] ? "#fff" : "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.9rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                    {naMap["related_products"] ? "✓ Marked N/A — Undo" : "Mark as N/A"}
                  </button>
                </div>
                {naMap["related_products"] ? (
                  <div className="na-placeholder"><div className="icon">—</div><div className="text">Related Products marked as Not Applicable</div><button onClick={() => toggleNA("related_products")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}>
                      <RelatedProducts data={rpData} onChange={setRpData} isNA={false} onToggleNA={() => toggleNA("related_products")} />
                    </div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}>
                      <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                      <PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} pageType={pageType} activeSection={activeSection} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Training & Support */}
            {activeSection === "training_support" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 14, margin: 0 }}>Training & Support</h3>
                    <p className="text-xs text-muted mt-4">Optional — pre-filled with default content</p>
                  </div>
                  <button onClick={() => toggleNA("training_support")}
                    style={{ background: naMap["training_support"] ? "#181313" : "#F3F3F3", color: naMap["training_support"] ? "#fff" : "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.9rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                    {naMap["training_support"] ? "✓ Marked N/A — Undo" : "Mark as N/A"}
                  </button>
                </div>
                {naMap["training_support"] ? (
                  <div className="na-placeholder"><div className="icon">—</div><div className="text">Training & Support marked as Not Applicable</div><button onClick={() => toggleNA("training_support")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}>
                      <TrainingSupport data={tsData} onChange={setTsData} isNA={false} onToggleNA={() => toggleNA("training_support")} />
                    </div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}>
                      <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                      <PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} pageType={pageType} activeSection={activeSection} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Overview */}
            {activeSection === "overview" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 14, margin: 0 }}>Overview Section</h3>
                    <p className="text-xs text-muted mt-4">
                      {sections.find(s => s.key === "overview")?.required ? "Required for this page type" : "Optional for this page type"}
                    </p>
                  </div>
                  <button onClick={() => toggleNA("overview")}
                    style={{ background: naMap["overview"] ? "#181313" : "#F3F3F3", color: naMap["overview"] ? "#fff" : "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.9rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                    {naMap["overview"] ? "✓ Marked N/A — Undo" : "Mark as N/A"}
                  </button>
                </div>

                {naMap["overview"] ? (
                  <div className="na-placeholder">
                    <div className="icon">—</div>
                    <div className="text">Overview section marked as Not Applicable</div>
                    <button onClick={() => toggleNA("overview")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div className="card">
                      <Field label="Label" value={overview.overview_label} onChange={v => updOverview("overview_label", v)} placeholder='e.g. "OVERVIEW"' hint="Small caps tag above the heading (optional)" fieldKey="overview_label" pageType={pageType} />
                      <Field label="Impact Statement" required value={overview.overview_impact} onChange={v => updOverview("overview_impact", v)} placeholder="e.g. Run More Validation Cycles on Bigger SoCs" multiline hint="Large heading — make it compelling" fieldKey="overview_impact" pageType={pageType} />
                      <Field label="Description" required value={overview.overview_description} onChange={v => updOverview("overview_description", v)} placeholder="Describe the product or solution in detail..." multiline fieldKey="overview_description" pageType={pageType} />

                      <div className="divider" />
                      <p className="field-label">Image / Diagram / Video — Optional</p>

                      <div className="field-wrap">
                        <label className="field-label">Media Type</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          {["image", "video", "diagram"].map(t => (
                            <button key={t} onClick={() => updOverview("overview_media_type", t)}
                              style={{ background: overview.overview_media_type === t ? "#181313" : "#F3F3F3", color: overview.overview_media_type === t ? "#fff" : "#646464", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.35rem 0.8rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", textTransform: "capitalize" }}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Field label="Media URL" value={overview.overview_media_url} onChange={v => updOverview("overview_media_url", v)} placeholder="https://... or leave for Design QA" />
                      <Field label="Notes for Design QA" value={overview.overview_media_note} onChange={v => updOverview("overview_media_note", v)} placeholder="e.g. Diagram showing the simulation workflow" hint="Describe what image or diagram you need" fieldKey="overview_media_note" pageType={pageType} />
                    </div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}>
                      <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                      <PagePreview req={previewData} pageType={pageType} activeSection={activeSection} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setStep(1)} className="btn-ghost">← Back</button>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {banner.page_title && pageType && (
              <button onClick={saveDraft} disabled={saving} style={{
                background: "#F3F3F3", color: "#3C3C3C", border: "1px solid #E0E0E0",
                borderRadius: 8, padding: "0.6rem 1.4rem", fontSize: 13, fontWeight: 500,
                cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Rubik', sans-serif",
                display: "flex", alignItems: "center", gap: 6, opacity: saving ? 0.5 : 1,
              }}>
                {saving ? "Saving..." : "💾 Save as Draft"}
              </button>
            )}
            <button onClick={() => setStep(3)} disabled={!isValid()} className="btn-primary" style={{ opacity: isValid() ? 1 : 0.4 }}>
              Preview & Submit →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview & Submit ── */}
      {step === 3 && (
        <>
          <div style={{ marginBottom: 20 }}>
            <p className="text-xs text-uppercase text-muted mb-8">Full Page Preview</p>
            <PagePreview req={previewData} pageType={pageType} activeSection={activeSection} />
          </div>

          {/* Section summary */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 14 }}>Section Summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sections.map(s => {
                const isNA   = naMap[s.key];
                const isDone = s.key === "banner"
                  ? !!banner.page_title
                  : s.key === "overview"
                  ? (isNA || (!!overview.overview_impact && !!overview.overview_description))
                  : false;
                return (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F9F9F9", borderRadius: 8, padding: "0.65rem 0.9rem", border: "1px solid #F3F3F3" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: s.required ? "#c0392b" : "#B5B5B5", fontWeight: 500 }}>{s.required ? "Required" : "Optional"}</span>
                      <span style={{ fontSize: 12, color: isNA ? "#B5B5B5" : isDone ? "#2a7a4b" : "#c0392b", fontWeight: 500 }}>
                        {isNA ? "N/A" : isDone ? "✓ Complete" : "⚠ Incomplete"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          <div className="alert alert-info" style={{ marginBottom: 22 }}>
            ℹ️ Submitting will send this to <strong style={{ color: "#181313" }}>Editorial QA</strong> for content review.
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setStep(2)} className="btn-ghost">← Edit</button>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={saveDraft} disabled={saving} style={{
                background: "#F3F3F3", color: "#3C3C3C",
                border: "1px solid #E0E0E0", borderRadius: 8,
                padding: "0.6rem 1.4rem", fontSize: 13,
                fontWeight: 500, cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "'Rubik', sans-serif", display: "flex",
                alignItems: "center", gap: 6, opacity: saving ? 0.5 : 1,
              }}>
                💾 Save as Draft
              </button>
              <button onClick={submit} disabled={saving} className="btn-primary">
                {saving ? "Submitting..." : "Submit for Editorial QA →"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
