"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { PCBLoader } from "@/components/PCBLoader";
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

const EMPTY_SEO = { seo_page_location:"", seo_meta_title:"", seo_meta_description:"", seo_meta_keywords:"" };

const EMPTY_BANNER   = { page_title:"", sub_title:"", cta1_label:"", cta1_link:"", cta2_label:"", cta2_link:"", banner_image:"", banner_image_note:"" };
const EMPTY_OVERVIEW = { overview_label:"", overview_impact:"", overview_description:"", overview_media_url:"", overview_media_type:"image", overview_media_note:"" };

const CHAR_LIMITS = {
  page_title:70, sub_title:120, cta1_label:30, cta2_label:30, cta1_link:300, cta2_link:300, banner_image:500, banner_image_note:300,
  seo_page_location:300, seo_meta_title:70, seo_meta_description:160, seo_meta_keywords:300,
  overview_label:30, overview_impact:100, overview_description:600, overview_media_note:300,
  kb_label:30, kb_impact:100, kb_description:300,
  fa_label:30, fa_impact:100, fa_description:300,
  cs_label:30, cs_impact:100,
  promo_label:30, promo_title:120, promo_description:300, promo_btn_label:30, promo_btn_link:300,
  rc_label:30, rc_impact:100,
  rp_label:30, rp_impact:100, rp_description:300,
  ts_label:40, ts_impact:80,
};

const Field = ({ label, value, onChange, placeholder, multiline, required, hint, fieldKey, pageType, charLimit }) => {
  const limit = charLimit || (fieldKey ? CHAR_LIMITS[fieldKey] : null);
  const len   = (value || "").length;
  const over  = limit && len > limit;
  return (
    <div className="field-wrap">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <label className="field-label" style={{ margin: 0 }}>
          {label}{required && <span className="req"> *</span>}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {limit && (
            <span style={{ fontSize: 10, fontWeight: 500, color: over ? "#c0392b" : len > limit * 0.85 ? "#856404" : "#B5B5B5", fontFamily: "monospace" }}>
              {len}/{limit}
            </span>
          )}
          {fieldKey && (
            <AIAssist fieldKey={fieldKey} currentValue={value} pageType={pageType || "Product"} onAccept={onChange} />
          )}
        </div>
      </div>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="textarea"
            style={over ? { borderColor: "#c0392b" } : {}} />
        : <input    value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input"
            style={over ? { borderColor: "#c0392b" } : {}} />
      }
      {over && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 3 }}>⚠️ Exceeds {limit} character limit</div>}
      {hint && !over && <div className="field-hint">{hint}</div>}
    </div>
  );
};

export default function NewRequest({ go, user, draftId }) {
  const [step,          setStep]         = useState(draftId ? 2 : 1);
  const [draftDbId,     setDraftDbId]    = useState(draftId || null);
  const [pageType,      setPageType]     = useState("");
  const [activeSection, setActiveSection]= useState("seo_meta");
  const [seoData,       setSeoData]      = useState(EMPTY_SEO);
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
  const [draftSaved,    setDraftSaved]   = useState(false); // shows "Draft saved" toast
  const [error,         setError]        = useState("");
  const [showExitModal, setShowExitModal]= useState(false);
  const [returnComments,  setReturnComments]  = useState([]);
  const [showReturnPanel, setShowReturnPanel] = useState(true);
  const isSavingRef = useRef(false); // Prevent concurrent saves

  // Auto-scroll preview to the active section — scroll WITHIN the preview container only
  useEffect(() => {
    if (!previewRef.current) return;
    const timer = setTimeout(() => {
      const container = previewRef.current;
      const target = container.querySelector(`[data-section="${activeSection}"]`);
      if (target) {
        // Scroll only inside the preview container — never the page
        const containerScrollTop = container.scrollTop;
        const containerTop = container.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        const newScrollTop = containerScrollTop + (targetTop - containerTop);
        container.scrollTo({ top: newScrollTop, behavior: "smooth" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [activeSection]);

  // Prevent page from scrolling when section tab is clicked
  const handleSectionChange = (key) => {
    const pageScrollY = window.scrollY;
    setActiveSection(key);
    // Restore page scroll position after state update
    requestAnimationFrame(() => { window.scrollTo(0, pageScrollY); });
  };

  // Load draft data if editing
  useEffect(() => {
    if (!draftId) return;
    const loadDraft = async () => {
      const { data, error } = await supabase.from("requests").select("*").eq("id", draftId).single();
      if (error || !data) { go("dashboard"); return; }
      setPageType(data.page_type || "");
      setSeoData({ seo_page_location: data.seo_page_location||"", seo_meta_title: data.seo_meta_title||"", seo_meta_description: data.seo_meta_description||"", seo_meta_keywords: data.seo_meta_keywords||"" });
      setBanner({ page_title: data.page_title||"", sub_title: data.sub_title||"", cta1_label: data.cta1_label||"", cta1_link: data.cta1_link||"", cta2_label: data.cta2_label||"", cta2_link: data.cta2_link||"", banner_image: data.banner_image||"", banner_image_note: data.banner_image_note||"" });
      setOverview({ overview_label: data.overview_label||"", overview_impact: data.overview_impact||"", overview_description: data.overview_description||"", overview_media_url: data.overview_media_url||"", overview_media_type: data.overview_media_type||"image", overview_media_note: data.overview_media_note||"" });
      if (data.kb_impact || data.kb_cards?.length) setKbData({ kb_label: data.kb_label||"", kb_impact: data.kb_impact||"", kb_description: data.kb_description||"", kb_cards: data.kb_cards||[] });
      if (data.fa_impact || data.fa_view_type) setFaData({ fa_label: data.fa_label||"", fa_impact: data.fa_impact||"", fa_description: data.fa_description||"", fa_view_type: data.fa_view_type||"", fa_items: data.fa_items||[], fa_columns: data.fa_columns||[], fa_rows: data.fa_rows||[] });
      if (data.cs_impact || data.cs_items?.length) setCsData({ cs_label: data.cs_label||"", cs_impact: data.cs_impact||"", cs_items: data.cs_items||[] });
      if (data.promo_title) setPromoData({ promo_bg_image: data.promo_bg_image||"", promo_bg_note: data.promo_bg_note||"", promo_label: data.promo_label||"", promo_title: data.promo_title||"", promo_description: data.promo_description||"", promo_btn_label: data.promo_btn_label||"", promo_btn_link: data.promo_btn_link||"" });
      if (data.rc_impact || data.rc_cards?.length) setRcData({ rc_label: data.rc_label||"", rc_impact: data.rc_impact||"", rc_cards: data.rc_cards||[] });
      if (data.res_impact || data.res_selected?.length) setResData({ res_label: data.res_label||"", res_impact: data.res_impact||"", res_selected: data.res_selected||[], res_video_carousel: data.res_video_carousel||{}, res_mixed_carousel: data.res_mixed_carousel||{}, res_resources: data.res_resources||{}, res_news: data.res_news||{}, res_blogs: data.res_blogs||{} });
      if (data.rp_impact || data.rp_cards?.length) setRpData({ rp_label: data.rp_label||"", rp_impact: data.rp_impact||"", rp_description: data.rp_description||"", rp_cards: data.rp_cards||[] });
      if (data.ts_label || data.ts_card1_cta_link) setTsData({ ts_label: data.ts_label, ts_impact: data.ts_impact, ts_card1_icon: data.ts_card1_icon, ts_card1_title: data.ts_card1_title, ts_card1_description: data.ts_card1_description, ts_card1_cta_label: data.ts_card1_cta_label, ts_card1_cta_link: data.ts_card1_cta_link, ts_card2_icon: data.ts_card2_icon, ts_card2_title: data.ts_card2_title, ts_card2_description: data.ts_card2_description, ts_card2_cta_label: data.ts_card2_cta_label, ts_card2_cta_link: data.ts_card2_cta_link, ts_card3_icon: data.ts_card3_icon, ts_card3_title: data.ts_card3_title, ts_card3_description: data.ts_card3_description, ts_card3_cta_label: data.ts_card3_cta_label, ts_card3_cta_link: data.ts_card3_cta_link });
      const { data: rc } = await supabase.from("comments").select("*").eq("request_id", draftId).eq("is_return", true).order("created_at", { ascending: false });
      setReturnComments(rc || []);
      setLoadingDraft(false);
    };
    loadDraft();
  }, [draftId]);

  const updSeo      = (k, v) => setSeoData(p  => ({ ...p, [k]: v }));
  const updBanner   = (k, v) => setBanner(p  => ({ ...p,  [k]: v }));
  const updOverview = (k, v) => setOverview(p => ({ ...p,  [k]: v }));
  const toggleNA    = (key)  => setNaMap(p   => ({ ...p,  [key]: !p[key] }));

  const sections   = pageType ? getSectionsForPageType(pageType) : [];
  const hasContent = banner.page_title || overview.overview_impact;

  const isValid = () => {
    if (!banner.page_title) return false;
    if (!seoData.seo_meta_title || !seoData.seo_meta_description) return false;
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
    seo_page_location: seoData.seo_page_location,
    seo_meta_title: seoData.seo_meta_title,
    seo_meta_description: seoData.seo_meta_description,
    seo_meta_keywords: seoData.seo_meta_keywords,
    // Banner
    page_title: banner.page_title, sub_title: banner.sub_title,
    cta1_label: banner.cta1_label, cta1_link: banner.cta1_link,
    cta2_label: banner.cta2_label, cta2_link: banner.cta2_link,
    banner_image:      banner.banner_image,
    banner_image_note: banner.banner_image_note,
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

  // saveDraft: pass navigate=true to go to dashboard after saving
  const saveDraft = async (navigate = false) => {
    if (isSavingRef.current) return; // Prevent concurrent saves
    if (!pageType) { setError("Please select a page type first."); return; }
    if (!banner.page_title) { setError("Please enter a page title before saving."); return; }

    isSavingRef.current = true;
    setSaving(true);
    setError("");

    // Safety timeout — always unblock UI after 8 seconds
    const timeout = setTimeout(() => {
      isSavingRef.current = false;
      setSaving(false);
      setError("Save timed out. Check your connection and try again.");
    }, 8000);

    try {
      // Small delay to ensure React state has flushed before reading values
      await new Promise(resolve => setTimeout(resolve, 50));
      const payload = buildPayload("draft");
      if (draftDbId) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const res = await fetch(
          `${supabaseUrl}/rest/v1/requests?id=eq.${draftDbId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
          }
        );
        if (!res.ok) {
          const errText = await res.text();
          setError(`Save failed: ${errText}`);
          return;
        }
      } else {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const res = await fetch(
          `${supabaseUrl}/rest/v1/requests`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=representation",
            },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const errText = await res.text();
          setError(`Save failed: ${errText}`);
          return;
        }
        const data = await res.json();
        if (data && data[0]) setDraftDbId(data[0].id);
      }

      // Show success toast
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);

      if (navigate) {
        // Wait for Supabase to fully commit before navigating
        await new Promise(r => setTimeout(r, 800));
        go("dashboard");
        return; // don't run finally setSaving — we're navigating away
      }
    } catch (e) {
      console.error("Save exception:", e);
      setError(`Error: ${e.message}`);
    } finally {
      clearTimeout(timeout);
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  // Save draft without navigating (used from exit modal)
  const saveAndExit = async () => {
    if (!pageType || !banner.page_title) { go("dashboard"); return; }
    setSaving(true);
    const timeout = setTimeout(() => { setSaving(false); setShowExitModal(false); go("dashboard"); }, 8000);
    try {
      const payload = buildPayload("draft");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const headers = {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal",
      };
      if (draftDbId) {
        await fetch(`${supabaseUrl}/rest/v1/requests?id=eq.${draftDbId}`, {
          method: "PATCH", headers,
          body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
        });
      } else {
        const res = await fetch(`${supabaseUrl}/rest/v1/requests`, {
          method: "POST",
          headers: { ...headers, "Prefer": "return=representation" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data && data[0]) setDraftDbId(data[0].id);
      }
    } catch (e) {
      console.error("Save and exit error:", e);
    } finally {
      clearTimeout(timeout);
      setSaving(false);
      setShowExitModal(false);
      await new Promise(r => setTimeout(r, 300));
      go("dashboard");
    }
  };


  // Option C: auto-compute design_flag_* based on image description content.
  // Called at submission time — flags are set once and Editorial QA can override.
  const computeDesignFlags = () => {
    const isUrl = (s) => s && (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/"));

    return {
      // Banner — always needs image work if no URL is set
      design_flag_banner: !banner.banner_image || !!banner.banner_image_note,

      // Overview — has a media note or existing media URL that needs replacement
      design_flag_overview: !!overview.overview_media_note,

      // Key Benefits — any card has an icon_description (text, not a URL)
      design_flag_kb: (kbData.kb_cards || []).some(
        c => c.icon_description && !isUrl(c.icon_description)
      ),

      // Features / Apps — any item has an image_note
      design_flag_fa: (faData.fa_items || []).some(
        i => !!i.image_note
      ),

      // Related Content — any card has an image_note
      design_flag_rc: (rcData.rc_cards || []).some(
        c => !!c.image_note
      ),

      // Promo — has a background image note
      design_flag_promo: !!promoData.promo_bg_note,

      // Training & Support — any card icon is a text description (not a URL)
      design_flag_ts: [tsData.ts_card1_icon, tsData.ts_card2_icon, tsData.ts_card3_icon].some(
        icon => icon && !isUrl(icon)
      ),
    };
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const headers = {
      "Content-Type": "application/json",
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
    };

    try {
      const designFlags = computeDesignFlags();
      const payload = { ...buildPayload("editorial_qa"), ...designFlags };
      let requestId = draftDbId;

      if (draftDbId) {
        // Update existing draft — change status to editorial_qa
        const res = await fetch(
          `${supabaseUrl}/rest/v1/requests?id=eq.${draftDbId}`,
          {
            method: "PATCH",
            headers: { ...headers, "Prefer": "return=representation" },
            body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
          }
        );
        const data = await res.json();
        if (!res.ok) { setError(`Failed to submit: ${JSON.stringify(data)}`); return; }
        requestId = draftDbId;
      } else {
        // No draft exists — insert new record
        const res = await fetch(
          `${supabaseUrl}/rest/v1/requests`,
          {
            method: "POST",
            headers: { ...headers, "Prefer": "return=representation" },
            body: JSON.stringify(payload),
          }
        );
        const data = await res.json();
        if (!res.ok) { setError(`Failed to submit: ${JSON.stringify(data)}`); return; }
        requestId = data[0]?.id;
      }

      // Add status history entry
      await supabase.from("status_history").insert({
        request_id: requestId,
        user_id: user.id,
        user_name: user.name,
        from_status: "draft",
        to_status: "editorial_qa"
      });

      go("detail", requestId, { submitted: true });
    } catch (e) {
      setError(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Merged data for unified preview
  const previewData = { ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData };
  const steps = ["Select Page Type", "Fill Sections", "Preview & Submit"];

  if (loadingDraft) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <PCBLoader label="LOADING DRAFT..." />
    </div>
  );

  return (
    <div className="fade-in" style={{ maxWidth: "100%", margin: "0 auto", fontFamily: "'Rubik', sans-serif" }}>

      {/* Draft Saved Toast */}
      {draftSaved && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
          background: "#181313", color: "#fff", borderRadius: 10, padding: "0.75rem 1.4rem",
          display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          fontSize: 13, fontWeight: 500, animation: "fadeIn 0.2s ease", fontFamily: "'Rubik',sans-serif",
          border: "1px solid rgba(0,155,114,0.4)" }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span>Draft saved successfully</span>
        </div>
      )}

      {/* Revision Notes Panel */}
      {draftId && returnComments.length > 0 && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:500, width:showReturnPanel ? 340 : "auto",
          background:"#fff", borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.18)", border:"2px solid #ffc107", overflow:"hidden" }}>
          <div onClick={() => setShowReturnPanel(p => !p)}
            style={{ background:"#fff3cd", padding:"0.75rem 1rem", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>↩</span>
              <span style={{ fontSize:13, fontWeight:600, color:"#856404" }}>Revision Notes ({returnComments.length})</span>
            </div>
            <span style={{ fontSize:12, color:"#856404", fontWeight:500 }}>{showReturnPanel ? "▼" : "▲"}</span>
          </div>
          {showReturnPanel && (
            <div style={{ maxHeight:320, overflowY:"auto", padding:"0.75rem" }}>
              {returnComments.map((c, i) => (
                <div key={c.id} style={{ marginBottom: i < returnComments.length-1 ? 10 : 0, padding:"0.65rem 0.8rem",
                  background:"#fff8e6", border:"1px solid #ffc10744", borderRadius:8, borderLeft:"3px solid #ffc107" }}>
                  <div style={{ fontSize:11, color:"#856404", fontWeight:600, marginBottom:4, display:"flex", justifyContent:"space-between" }}>
                    <span>{c.user_name} ({c.user_role?.replace("_"," ")})</span>
                    <span style={{ fontWeight:400 }}>{new Date(c.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</span>
                  </div>
                  <div style={{ fontSize:13, color:"#3C3C3C", lineHeight:1.55 }}>{c.text.replace(/^\[(Returned|Design Query)\]\s*/,"")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Header + Progress Pills */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>

        {/* Left: Title only */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 20, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>New Content Request</h1>
            <p style={{ color: "#B5B5B5", fontSize: 12, margin: 0 }}>{pageType || "Select a page type to begin"}</p>
          </div>
        </div>

        {/* Center: Step pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {steps.map((s, i) => {
            const n = i + 1, done = n < step, active = n === step;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  borderRadius: 999,
                  padding: "5px 14px 5px 8px",
                  background: done ? "rgba(20,184,166,0.12)" : active ? "#181313" : "#f1f5f9",
                  border: done ? "1px solid rgba(20,184,166,0.3)" : active ? "1px solid #14b8a6" : "1px solid #E0E0E0",
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: done ? "#14b8a6" : active ? "#14b8a6" : "#E0E0E0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 600,
                    color: done ? "#0f172a" : active ? "#fff" : "#94a3b8",
                    flexShrink: 0,
                  }}>
                    {done ? "✓" : n}
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
                    color: done ? "#0F6E56" : active ? "#fff" : "#94a3b8",
                  }}>
                    {s}
                  </span>
                </div>
                {i < 2 && <div style={{ width: 20, height: 1, background: "#E0E0E0", flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>

        {/* Right: Save as Draft + Preview & Submit */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {step === 2 && pageType && (
            <button onClick={saveDraft} disabled={saving}
              style={{
                background: "#F3F3F3", color: "#3C3C3C",
                border: "1px solid #E0E0E0", borderRadius: 8,
                padding: "0.55rem 1.2rem", fontSize: 13, fontWeight: 500,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "'Rubik', sans-serif", whiteSpace: "nowrap",
                opacity: saving ? 0.5 : 1,
              }}>
              {saving ? "Saving..." : "💾 Save as Draft"}
            </button>
          )}
          {step === 2 && (
            <button onClick={() => setStep(3)} disabled={!isValid()}
              style={{
                background: isValid() ? "#14b8a6" : "#f9f9f9",
                color: isValid() ? "#fff" : "#B5B5B5",
                border: isValid() ? "1.5px solid #14b8a6" : "1.5px solid #E0E0E0",
                borderRadius: 8, padding: "0.55rem 1.2rem",
                fontSize: 13, fontWeight: 500,
                cursor: isValid() ? "pointer" : "not-allowed",
                fontFamily: "'Rubik', sans-serif", whiteSpace: "nowrap",
              }}>
              Preview & Submit →
            </button>
          )}

        </div>

      </div>

      {/* Save error display */}
      {error && step !== 3 && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
      )}

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
          <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", overflowX: "auto", whiteSpace: "nowrap", padding: "0 4px", position: "sticky", top: 56, zIndex: 40, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {sections.map(s => {
              const isNA     = naMap[s.key];
              const isActive = activeSection === s.key;
              const isDone   = s.key === "seo_meta"
                ? (!!seoData.seo_meta_title && !!seoData.seo_meta_description)
                : s.key === "banner"
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
                <button key={s.key} onClick={() => handleSectionChange(s.key)}
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
          <div style={{ paddingTop: 16 }}>
            {/* SEO Meta Data */}
            {activeSection === "seo_meta" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}>
                  <div className="card">
                    <div className="card-header">
                      <div><h3>🔍 SEO Meta Data</h3><p>Required for all page types · Helps search engines find and rank your page</p></div>
                    </div>
                    <Field label="Page Location" required value={seoData.seo_page_location} onChange={v => updSeo("seo_page_location", v)} placeholder="e.g. /products/xcelium-logic-simulator" fieldKey="seo_page_location" hint="The URL path where this page will live on the site" />
                    <Field label="Meta Title" required value={seoData.seo_meta_title} onChange={v => updSeo("seo_meta_title", v)} placeholder="e.g. Xcelium Logic Simulator | Cadence" fieldKey="seo_meta_title" hint="Shown in browser tabs and search results — 50–70 characters" />
                    <Field label="Meta Description" required value={seoData.seo_meta_description} onChange={v => updSeo("seo_meta_description", v)} placeholder="e.g. Accelerate SoC verification with Cadence Xcelium..." multiline fieldKey="seo_meta_description" hint="Shown in search results — 120–160 characters" />
                    <Field label="Meta Keywords" value={seoData.seo_meta_keywords} onChange={v => updSeo("seo_meta_keywords", v)} placeholder="e.g. logic simulator, SoC verification, mixed-signal" multiline fieldKey="seo_meta_keywords" hint="Comma-separated keywords" />
                    <div style={{ marginTop:20, background:"#fff", border:"1px solid #E0E0E0", borderRadius:10, padding:"1rem 1.2rem" }}>
                      <p style={{ fontSize:10, color:"#B5B5B5", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10, fontWeight:600 }}>Google Search Preview</p>
                      <div style={{ fontSize:12, color:"#1a0dab", fontWeight:500, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{seoData.seo_meta_title || <span style={{ color:"#B5B5B5", fontStyle:"italic" }}>Meta title will appear here</span>}</div>
                      <div style={{ fontSize:11, color:"#006621", marginBottom:4 }}>cadence.com{seoData.seo_page_location || "/products/..."}</div>
                      <div style={{ fontSize:12, color:"#545454", lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{seoData.seo_meta_description || <span style={{ color:"#B5B5B5", fontStyle:"italic" }}>Meta description will appear here...</span>}</div>
                    </div>
                  </div>
                </div>
                <div style={{ position:"sticky", top:0, height:"100vh", overflowY:"auto", paddingBottom:"2rem" }}>
                  <p className="text-xs text-uppercase text-muted mb-8">SEO Guidelines</p>
                  <div className="card" style={{ gap:14 }}>
                    {[["🔍","Meta Title","50–70 characters. Include the primary keyword and brand name."],["📝","Meta Description","120–160 characters. Summarise the page value clearly."],["🔗","Page Location","Use lowercase, hyphens (not underscores). e.g. /products/xcelium"],["🏷️","Keywords","3–8 comma-separated terms your audience searches for."]].map(([icon,title,desc]) => (
                      <div key={title} style={{ display:"flex", gap:12, paddingBottom:14, borderBottom:"1px solid #F3F3F3" }}>
                        <div style={{ fontSize:20, flexShrink:0 }}>{icon}</div>
                        <div><div style={{ fontSize:13, fontWeight:600, color:"#181313", marginBottom:4 }}>{title}</div><div style={{ fontSize:12, color:"#646464", lineHeight:1.6 }}>{desc}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
                  <Field label="Banner Image URL" value={banner.banner_image} onChange={v => updBanner("banner_image", v)} placeholder="https://... (leave blank — Design QA will upload)" fieldKey="banner_image" hint="Paste a URL if you have one, otherwise leave blank and describe below" />
                  <Field label="Banner Image Description" value={banner.banner_image_note} onChange={v => updBanner("banner_image_note", v)} placeholder='e.g. "Engineer working on a PCB board in a lab setting, bright lighting, blue tones"' multiline fieldKey="banner_image_note" hint="Describe the image you need — Design QA will source or create it" />
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
            <button onClick={() => setStep(2)} className="btn-ghost">
              ← Back to Edit
            </button>
            <button onClick={submit} disabled={saving} className="btn-primary">
              {saving ? "Submitting..." : "Submit for Editorial QA →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
