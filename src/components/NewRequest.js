"use client";
import { sanitizePayload, validateFile, getAuthHeaders } from "@/lib/security";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { PCBLoader } from "@/components/PCBLoader";
import { PAGE_TYPES, getSectionsForPageType, CHAR_LIMITS as DEFAULT_CHAR_LIMITS } from "@/lib/constants";
import { useCharLimits } from "@/lib/charLimits";
import { generateTestData } from "@/lib/testData";
import { runPreflightChecks } from "@/lib/preflightCheck";
import PagePreview from "@/components/PagePreview";
import AIAssistant from "@/components/AIAssistant";
import SectionAIAssist from "@/components/SectionAIAssist";
import ImageField from "@/components/ImageField";
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

const EMPTY_BANNER   = { page_title:"", sub_title:"", cta1_label:"", cta1_link:"", cta2_label:"", cta2_link:"", banner_image_ref:null };
const EMPTY_OVERVIEW = { overview_label:"OVERVIEW", overview_impact:"", overview_description:"", overview_media_url:"", overview_media_type:"image", overview_media_ref:null, overview_media_alt:"" };

const Field = ({ label, value, onChange, placeholder, multiline, required, hint, charLimit, disabled, readOnly, style: fieldStyle }) => {
  const limit = charLimit || null;
  const len   = (value || "").length;
  const over  = limit && len > limit;
  return (
    <div className="field-wrap">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <label className="field-label" style={{ margin: 0 }}>
          {label}{required && <span className="req"> *</span>}
        </label>
        {limit && (
          <span style={{ fontSize: 10, fontWeight: 500, color: over ? "#c0392b" : len > limit * 0.85 ? "#856404" : "#B5B5B5", fontFamily: "monospace" }}>
            {len}/{limit}
          </span>
        )}
      </div>
      {multiline
        ? <textarea value={value} onChange={e => !disabled && !readOnly && onChange(e.target.value)} placeholder={placeholder} className="textarea" disabled={disabled} readOnly={readOnly}
            style={fieldStyle || (over ? { borderColor: "#c0392b" } : {})} />
        : <input    value={value} onChange={e => !disabled && !readOnly && onChange(e.target.value)} placeholder={placeholder} className="input" disabled={disabled} readOnly={readOnly}
            style={fieldStyle || (over ? { borderColor: "#c0392b" } : {})} />
      }
      {over && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 3 }}>⚠️ Exceeds {limit} character limit</div>}
      {hint && !over && <div className="field-hint">{hint}</div>}
    </div>
  );
};

const parseJSONB = (val, fb = []) => {
  if (!val) return fb;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return fb; } }
  return val;
};

export default function NewRequest({ go, user, draftId, saveDraftRef, pendingNav, onClearPendingNav }) {
  const CHAR_LIMITS = useCharLimits(supabase, DEFAULT_CHAR_LIMITS);
  const [step,          setStep]         = useState(draftId ? 2 : 1);
  const [draftDbId,     setDraftDbId]    = useState(draftId || null);
  const [pageType,      setPageType]     = useState("");
  const [activeSection, setActiveSection]= useState("banner");
  const [needsBrand,    setNeedsBrand]   = useState(false);
  const [priority,      setPriority]     = useState("normal");
  const [priorityReason,setPriorityReason] = useState("");
  const [seoData,       setSeoData]      = useState(EMPTY_SEO);
  const previewRef = useRef(null);
  const [banner,        setBanner]       = useState(EMPTY_BANNER);
  const [overview,      setOverview]     = useState(EMPTY_OVERVIEW);
  const [naMap,         setNaMap]        = useState({});
  const [loadingDraft,  setLoadingDraft] = useState(!!draftId);
  const [kbData,        setKbData]       = useState({ kb_label:"KEY BENEFITS", kb_impact:"", kb_description:"", kb_cards:[] });
  const [faData,        setFaData]       = useState({ fa_label:"FEATURES", fa_impact:"", fa_description:"", fa_view_type:"", fa_items:[], fa_columns:[], fa_rows:[] });
  const [csData,        setCsData]       = useState({ cs_label:"CUSTOMER STORIES", cs_impact:"", cs_items:[] });
  const [promoData,     setPromoData]    = useState({ promo_bg_image:"", promo_bg_note:"", promo_label:"", promo_title:"", promo_description:"", promo_btn_label:"", promo_btn_link:"" });
  const [rcData,        setRcData]       = useState({ rc_label:"RELATED CONTENT", rc_impact:"", rc_cards:[] });
  const [resData,       setResData]      = useState({ res_label:"", res_impact:"", res_selected:[], res_video_carousel:{}, res_mixed_carousel:{}, res_resources:{}, res_news:{}, res_blogs:{} });
  const [rpData,        setRpData]       = useState({ rp_label:"RELATED PRODUCTS", rp_impact:"", rp_description:"", rp_cards:[] });
  const [tsData,        setTsData]       = useState({});
  const [saving,        setSaving]       = useState(false);
  const [draftSaved,    setDraftSaved]   = useState(false); // shows "Draft saved" toast
  const [error,         setError]        = useState("");
  const [showExitModal, setShowExitModal]= useState(false);
  const [returnComments,  setReturnComments]  = useState([]);
  const [showReturnPanel, setShowReturnPanel] = useState(true);
  const isSavingRef = useRef(false); // Prevent concurrent saves

  // Fill Test Data is dead-code-eliminated from production builds by
  // default (NODE_ENV check below), but an admin can temporarily force it
  // back on in production via AdminPanel → Settings, e.g. for QA on a
  // live-configured deployment before real launch. Defaults to `true` so
  // the button doesn't flicker in/out during dev while this loads — the
  // NODE_ENV check already covers dev regardless of this flag's value.
  const [testDataEnabled, setTestDataEnabled] = useState(true);

  // Placeholder/Lorem-Ipsum detection is one of the two pre-flight checks
  // (src/lib/preflightCheck.js) — normally always on, but an admin can
  // temporarily turn it off (AdminPanel → Settings) when doing QA runs
  // with Fill Test Data content that's meant to actually go through
  // Submit, not just preview. The CTA-mismatch check is unaffected by
  // this flag — that one catches real mistakes, not test content, so
  // there's no reason to ever want it off. Defaults to `true` (fail
  // toward stricter behavior while this loads).
  const [placeholderCheckEnabled, setPlaceholderCheckEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.from("settings").select("test_data_enabled, placeholder_check_enabled").eq("id", "global").maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setTestDataEnabled(data?.test_data_enabled !== false);
        setPlaceholderCheckEnabled(data?.placeholder_check_enabled !== false);
      });
    return () => { cancelled = true; };
  }, []);

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
    let cancelled = false;
    // Safety net matching the same pattern saveDraft() already uses below —
    // without this, any unhandled failure in the query (a network blip, the
    // 10s abort in src/lib/supabase.js's fetch wrapper firing, anything
    // that makes the awaited call *reject* rather than resolve with an
    // {error} field) left loadingDraft stuck true forever with nothing to
    // catch it, since the whole function had no try/catch — the spinner
    // just spun indefinitely instead of failing visibly.
    const safetyTimeout = setTimeout(() => {
      if (!cancelled) { setLoadingDraft(false); setError("Draft took too long to load. Check your connection and try again."); }
    }, 10000);
    const loadDraft = async () => {
      try {
        const { data, error } = await supabase.from("requests").select("*").eq("id", draftId).single();
        if (cancelled) return;
        if (error || !data) { go("dashboard"); return; }
        setPageType(data.page_type || "");
        setSeoData({ seo_page_location: data.seo_page_location||"", seo_meta_title: data.seo_meta_title||"", seo_meta_description: data.seo_meta_description||"", seo_meta_keywords: data.seo_meta_keywords||"" });
        setBanner({ page_title: data.page_title||"", sub_title: data.sub_title||"", cta1_label: data.cta1_label||"", cta1_link: data.cta1_link||"", cta2_label: data.cta2_label||"", cta2_link: data.cta2_link||"", banner_image_ref: data.banner_image_ref||null });
        setOverview({ overview_label: "OVERVIEW", overview_impact: data.overview_impact||"", overview_description: data.overview_description||"", overview_media_url: data.overview_media_url||"", overview_media_type: data.overview_media_type||"image", overview_media_ref: data.overview_media_ref||null, overview_media_alt: data.overview_media_alt||"" });
        if (data.kb_impact || data.kb_cards?.length) setKbData({ kb_label: "KEY BENEFITS", kb_impact: data.kb_impact||"", kb_description: data.kb_description||"", kb_cards: data.kb_cards||[] });
        if (data.fa_impact || data.fa_view_type) setFaData({ fa_label: "FEATURES", fa_impact: data.fa_impact||"", fa_description: data.fa_description||"", fa_view_type: data.fa_view_type||"", fa_items: parseJSONB(data.fa_items,[]), fa_columns: parseJSONB(data.fa_columns,[]), fa_rows: parseJSONB(data.fa_rows,[]) });
        if (data.cs_impact || data.cs_items?.length) setCsData({ cs_label: "CUSTOMER STORIES", cs_impact: data.cs_impact||"", cs_items: data.cs_items||[] });
        if (data.promo_title) setPromoData({ promo_bg_image: data.promo_bg_image||"", promo_bg_note: data.promo_bg_note||"", promo_label: data.promo_label||"", promo_title: data.promo_title||"", promo_description: data.promo_description||"", promo_btn_label: data.promo_btn_label||"", promo_btn_link: data.promo_btn_link||"" });
        if (data.rc_impact || data.rc_cards?.length) setRcData({ rc_label: "RELATED CONTENT", rc_impact: data.rc_impact||"", rc_cards: data.rc_cards||[] });
        if (data.res_impact || data.res_selected?.length) setResData({ res_label: data.res_label||"", res_impact: data.res_impact||"", res_selected: data.res_selected||[], res_video_carousel: data.res_video_carousel||{}, res_mixed_carousel: data.res_mixed_carousel||{}, res_resources: data.res_resources||{}, res_news: data.res_news||{}, res_blogs: data.res_blogs||{} });
        if (data.rp_impact || data.rp_cards?.length) setRpData({ rp_label: "RELATED PRODUCTS", rp_impact: data.rp_impact||"", rp_description: data.rp_description||"", rp_cards: data.rp_cards||[] });
        if (data.ts_label || data.ts_card1_cta_link) setTsData({ ts_label: "TRAINING AND SUPPORT", ts_impact: data.ts_impact, ts_card1_icon: data.ts_card1_icon, ts_card1_title: data.ts_card1_title, ts_card1_description: data.ts_card1_description, ts_card1_cta_label: data.ts_card1_cta_label, ts_card1_cta_link: data.ts_card1_cta_link, ts_card2_icon: data.ts_card2_icon, ts_card2_title: data.ts_card2_title, ts_card2_description: data.ts_card2_description, ts_card2_cta_label: data.ts_card2_cta_label, ts_card2_cta_link: data.ts_card2_cta_link, ts_card3_icon: data.ts_card3_icon, ts_card3_title: data.ts_card3_title, ts_card3_description: data.ts_card3_description, ts_card3_cta_label: data.ts_card3_cta_label, ts_card3_cta_link: data.ts_card3_cta_link });
        if (data.needs_brand) setNeedsBrand(true);
        setPriority(data.priority || "normal");
        setPriorityReason(data.stakeholder_priority_reason || "");
        if (cancelled) return;
        const { data: rc } = await supabase.from("comments").select("*").eq("request_id", draftId).eq("is_return", true).order("created_at", { ascending: false });
        if (cancelled) return;
        setReturnComments(rc || []);
      } catch (e) {
        console.error("Load draft error:", e);
        if (!cancelled) go("dashboard");
      } finally {
        if (!cancelled) { clearTimeout(safetyTimeout); setLoadingDraft(false); }
      }
    };
    loadDraft();
    return () => { cancelled = true; clearTimeout(safetyTimeout); };
  }, [draftId]);

  const updSeo      = (k, v) => setSeoData(p  => ({ ...p, [k]: v }));
  const updBanner   = (k, v) => setBanner(p  => ({ ...p,  [k]: v }));
  const updOverview = (k, v) => setOverview(p => ({ ...p,  [k]: v }));
  const toggleNA    = (key)  => setNaMap(p   => ({ ...p,  [key]: !p[key] }));

  // Fill every applicable section with placeholder Lorem Ipsum content —
  // QA/testing convenience only. Purely client-side state, nothing is
  // written to the DB until Save Draft / Submit is clicked. Also clears
  // any N/A marks on sections it fills so the generated content is
  // actually visible in the preview.
  const fillTestData = () => {
    if (!pageType) return;
    const sectionKeys = getSectionsForPageType(pageType).map(s => s.key);
    const t = generateTestData(pageType, sectionKeys, CHAR_LIMITS);
    if (t.seoData)   setSeoData(p   => ({ ...p, ...t.seoData }));
    if (t.banner)    setBanner(p    => ({ ...p, ...t.banner }));
    if (t.overview)  setOverview(p  => ({ ...p, ...t.overview }));
    if (t.kbData)    setKbData(p    => ({ ...p, ...t.kbData }));
    if (t.faData)    setFaData(p    => ({ ...p, ...t.faData }));
    if (t.csData)    setCsData(p    => ({ ...p, ...t.csData }));
    if (t.promoData) setPromoData(p => ({ ...p, ...t.promoData }));
    if (t.rcData)    setRcData(p    => ({ ...p, ...t.rcData }));
    if (t.resData)   setResData(p   => ({ ...p, ...t.resData }));
    if (t.rpData)    setRpData(p    => ({ ...p, ...t.rpData }));
    if (t.tsData)    setTsData(p    => ({ ...p, ...t.tsData }));
    setNaMap(p => {
      const next = { ...p };
      sectionKeys.forEach(k => { delete next[k]; });
      return next;
    });
  };

  const sections   = pageType ? getSectionsForPageType(pageType) : [];
  const hasContent = banner.page_title || overview.overview_impact;

  const isValid = () => {
    if (!banner.page_title) return false;
    // SEO fields are optional — no required validation
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

  const buildPayload = (status, extra = {}) => ({
    page_type: pageType, status, created_by: user.id,
    needs_brand: needsBrand,
    priority:    priority,
    // Stakeholder's own justification for High/Urgent — kept separate from
    // priority_override_reason, which is the admin's reason for changing it.
    stakeholder_priority_reason: (priority === "high" || priority === "urgent")
      ? priorityReason.trim()
      : null,
    ...extra,
    seo_page_location: seoData.seo_page_location,
    seo_meta_title: seoData.seo_meta_title,
    seo_meta_description: seoData.seo_meta_description,
    seo_meta_keywords: seoData.seo_meta_keywords,
    // Banner
    page_title: banner.page_title, sub_title: banner.sub_title,
    cta1_label: banner.cta1_label, cta1_link: banner.cta1_link,
    cta2_label: banner.cta2_label, cta2_link: banner.cta2_link,
    banner_image_ref:  banner.banner_image_ref,
    // Overview
    ...(!naMap["overview"] ? {
      overview_label:       overview.overview_label,
      overview_impact:      overview.overview_impact,
      overview_description: overview.overview_description,
      overview_media_url:   overview.overview_media_url,
      overview_media_type:  overview.overview_media_type,
      overview_media_ref:   overview.overview_media_ref,
      overview_media_alt:   overview.overview_media_alt,
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
      promo_bg_image_ref: promoData.promo_bg_image_ref,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveDraft = useCallback(async (navigate = false, isAutoSave = false) => {
    if (isSavingRef.current) return; // Prevent concurrent saves
    // pageType is required at the DB level (page_type NOT NULL) — nothing
    // meaningful exists to save before it's picked in Step 1 anyway, so
    // it's safe to no-op here even for auto-save.
    if (!pageType) { if (!isAutoSave) setError("Please select a page type first."); return; }
    // page_title is only a client-side UX guard for the manual Save Draft
    // button (DB column is nullable) — auto-save runs right before a
    // forced idle-timeout logout, so it must never block on this or
    // everything typed in every other section gets silently lost the
    // moment someone works out of order (e.g. fills Key Benefits before
    // circling back to the Banner title).
    if (!isAutoSave && !banner.page_title) { setError("Please enter a page title before saving."); return; }

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
      const payload = sanitizePayload(buildPayload("draft"));
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      // Real session JWT, not the anon key — RLS needs auth.uid() to
      // resolve to the caller, which the anon key alone can never do (see
      // getAuthHeaders in @/lib/security). saveAndExit() and submit() in
      // this same file already did this correctly; this function was the
      // one place still sending the anon key directly, which made every
      // Save Draft click hit requests_insert/requests_update as an
      // unauthenticated request — get_user_role()/get_user_id() both
      // resolve to NULL, so the RLS check always fails with 42501,
      // regardless of who's actually logged in.
      const authHeaders = await getAuthHeaders(supabase);
      if (draftDbId) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/requests?id=eq.${draftDbId}`,
          {
            method: "PATCH",
            headers: authHeaders,
            body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
          }
        );
        if (!res.ok) {
          const errText = await res.text();
          setError(`Save failed: ${errText}`);
          return;
        }
      } else {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/requests`,
          {
            method: "POST",
            headers: { ...authHeaders, "Prefer": "return=representation" },
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, draftDbId, step, pageType, seoData, banner, overview, kbData, faData, csData, promoData, rcData, resData, rpData, tsData, naMap, user]);

  // Register saveDraft into parent ref so auto-logout can trigger it
  useEffect(() => {
    if (saveDraftRef) saveDraftRef.current = () => saveDraft(false, true);
    return () => { if (saveDraftRef) saveDraftRef.current = null; };
  }, [saveDraftRef, saveDraft]);

  // When Navbar triggers navigation while form has content — show exit modal
  useEffect(() => {
    if (!pendingNav) return;
    if (pageType || banner.page_title) {
      setShowExitModal(true);
    } else {
      onClearPendingNav?.();
      go(pendingNav);
    }
  }, [pendingNav]);

  // Browser close/refresh — show native "Leave site?" dialog when form has content
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (pageType || banner.page_title) {
        e.preventDefault();
        e.returnValue = "You have unsaved content. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pageType, banner.page_title]);

  // Save draft without navigating (used from exit modal)
  const saveAndExit = async () => {
    if (!pageType || !banner.page_title) { go("dashboard"); return; }
    setSaving(true);
    const dest = pendingNav || "dashboard";
    const timeout = setTimeout(() => { setSaving(false); setShowExitModal(false); onClearPendingNav?.(); go(dest); }, 8000);
    try {
      const payload = sanitizePayload(buildPayload("draft"));
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      // Use JWT token for authenticated requests (Option A security fix)
      const authHeaders = await getAuthHeaders(supabase);
      const sanitized   = sanitizePayload({ ...payload, updated_at: new Date().toISOString() });

      if (draftDbId) {
        await fetch(`${supabaseUrl}/rest/v1/requests?id=eq.${draftDbId}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify(sanitized),
        });
      } else {
        const res = await fetch(`${supabaseUrl}/rest/v1/requests`, {
          method: "POST",
          headers: { ...authHeaders, "Prefer": "return=representation" },
          body: JSON.stringify(sanitized),
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


  // Auto-compute design_flag_* based on image_ref fields set by stakeholder.
  // A flag is set when a stakeholder has provided ANY image reference (attachment, link, or description)
  // so Design QA knows that section needs image work.
  const computeDesignFlags = () => {
    const hasRef = (ref) => !!(ref && ref.type && ref.value);

    return {
      // Banner — flagged if stakeholder provided any image reference
      design_flag_banner: hasRef(banner.banner_image_ref),

      // Overview — flagged if stakeholder provided media reference
      design_flag_overview: hasRef(overview.overview_media_ref),

      // Key Benefits — any card has an image_ref
      design_flag_kb: (kbData.kb_cards || []).some(c => hasRef(c.image_ref)),

      // Features / Apps — any item has an image_ref
      design_flag_fa: (faData.fa_items || []).some(i => hasRef(i.image_ref)),

      // Customer Stories — any item has a logo_ref
      design_flag_cs: (csData.cs_items || []).some(i => hasRef(i.logo_ref)),

      // Promo — has a background image reference
      design_flag_promo: hasRef(promoData.promo_bg_image_ref),

      // Related Content — any card has an image_ref
      design_flag_rc: (rcData.rc_cards || []).some(c => hasRef(c.image_ref)),

      // Related Products — any card has an image_ref
      design_flag_rp: (rpData.rp_cards || []).some(c => hasRef(c.image_ref)),

      // Training & Support — no image refs, no flag needed
      design_flag_ts: false,
    };
  };

  const submit = async () => {
    if ((priority === "high" || priority === "urgent") && !priorityReason.trim()) {
      setError("Please provide a reason for High/Urgent priority before submitting.");
      return;
    }
    const preflightIssues = runPreflightChecks(buildPayload("draft"), { checkPlaceholders: placeholderCheckEnabled });
    if (preflightIssues.length > 0) {
      setError(`Pre-flight check found ${preflightIssues.length} issue${preflightIssues.length > 1 ? "s" : ""} — see the Pre-flight Check panel above and fix ${preflightIssues.length > 1 ? "them" : "it"} before submitting.`);
      return;
    }
    setSaving(true);
    setError("");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const authHeaders = await getAuthHeaders(supabase);

    try {
      const designFlags = computeDesignFlags();
      const payload = sanitizePayload({ ...buildPayload("draft"), overall_status: "pending_admin", needs_brand: needsBrand, ...designFlags });
      let requestId = draftDbId;

      if (draftDbId) {
        // Update existing draft — set overall_status to pending_admin
        const res = await fetch(
          `${supabaseUrl}/rest/v1/requests?id=eq.${draftDbId}`,
          {
            method: "PATCH",
            headers: { ...authHeaders, "Prefer": "return=representation" },
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
            headers: { ...authHeaders, "Prefer": "return=representation" },
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
        to_status: "pending_admin"
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

  // ── AI Section Generation handler ──────────────────────────────────────────
  const handleAIGenerate = (sectionKey, data) => {
    if (sectionKey === "seo_meta")         setSeoData(p   => ({ ...p, ...data }));
    else if (sectionKey === "banner")      setBanner(p    => ({ ...p, ...data }));
    else if (sectionKey === "overview")    setOverview(p  => ({ ...p, ...data }));
    else if (sectionKey === "key_benefits") {
      const { kb_cards, ...rest } = data;
      setKbData(p => ({ ...p, ...rest, ...(kb_cards ? { kb_cards: kb_cards.map((c, i) => ({ ...c, id: `kb-ai-${i}-${Date.now()}` })) } : {}) }));
    }
    else if (sectionKey === "features_apps") {
      // Mirrors the key_benefits pattern above: fa_items needs a stable
      // `id` per item (ListView matches/updates/reorders items by id —
      // see FeaturesApps.js), but the model has no reason to know that
      // internal shape, so ids are injected here after generation rather
      // than asked for in the prompt.
      const { fa_items, ...rest } = data;
      setFaData(p => ({ ...p, ...rest, ...(fa_items ? { fa_items: fa_items.map((it, i) => ({ ...it, id: `li-ai-${i}-${Date.now()}` })) } : {}) }));
    }
    else if (sectionKey === "customer_stories") setCsData(p    => ({ ...p, ...data }));
    else if (sectionKey === "promo_section")    setPromoData(p => ({ ...p, ...data }));
    else if (sectionKey === "related_content")  setRcData(p    => ({ ...p, ...data }));
    else if (sectionKey === "training_support") setTsData(p    => ({ ...p, ...data }));
  };

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
              <button onClick={() => { onClearPendingNav?.(); go(pendingNav || "dashboard"); }} className="btn-secondary btn-full">
                Discard & Leave
              </button>
              <button onClick={() => { setShowExitModal(false); onClearPendingNav?.(); }} className="btn-ghost btn-full">
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
                  background: done ? "rgba(62,197,203,0.12)" : active ? "#181313" : "#f1f5f9",
                  border: done ? "1px solid rgba(62,197,203,0.3)" : active ? "1px solid #3ec5cb" : "1px solid #E0E0E0",
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: done ? "#3ec5cb" : active ? "#3ec5cb" : "#E0E0E0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 600,
                    color: done ? "#0f2744" : active ? "#fff" : "#94a3b8",
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
          {step === 2 && pageType && (process.env.NODE_ENV !== "production" || testDataEnabled) && (
            <button type="button" onClick={fillTestData} title="Fill every section with placeholder Lorem Ipsum content — for testing only, nothing is saved until you click Save/Submit"
              style={{
                background: "#fff", color: "#856404",
                border: "1px dashed #d4a72c", borderRadius: 8,
                padding: "0.55rem 1.2rem", fontSize: 13, fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'Rubik', sans-serif", whiteSpace: "nowrap",
              }}>
              🎲 Fill Test Data
            </button>
          )}
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
                background: isValid() ? "#3ec5cb" : "#f9f9f9",
                color: isValid() ? "#fff" : "#B5B5B5",
                border: isValid() ? "1.5px solid #3ec5cb" : "1.5px solid #E0E0E0",
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

          {/* Priority selector */}
          <div className="field-wrap" style={{ marginTop: 20 }}>
            <label className="field-label">Priority</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { key: "normal", label: "Normal", color: "#1b5793", bg: "#eff6ff" },
                { key: "high",   label: "High",   color: "#d97706", bg: "#fffbeb" },
                { key: "urgent", label: "Urgent", color: "#c0392b", bg: "#fef2f2" },
              ].map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPriority(p.key)}
                  style={{
                    padding: "0.45rem 1.1rem", borderRadius: 8,
                    border: `1.5px solid ${priority === p.key ? p.color : "#E0E0E0"}`,
                    background: priority === p.key ? p.bg : "#fff",
                    color: priority === p.key ? p.color : "#B5B5B5",
                    fontWeight: priority === p.key ? 600 : 400,
                    fontSize: 13, cursor: "pointer",
                    fontFamily: "'Rubik', sans-serif",
                    transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason — required when priority is High or Urgent */}
          {(priority === "high" || priority === "urgent") && (
            <div className="field-wrap" style={{ marginTop: 4 }}>
              <label className="field-label">
                Reason for {priority === "urgent" ? "Urgent" : "High"} priority
                <span className="req"> *</span>
              </label>
              <textarea
                className="textarea"
                value={priorityReason}
                onChange={e => setPriorityReason(e.target.value)}
                placeholder="Explain why this request needs elevated priority…"
                rows={3}
              />
            </div>
          )}

          {/* Brand team checkbox */}
          <div className="field-wrap" style={{ marginTop: 4 }}>
            <label
              style={{ display: "flex", alignItems: "flex-start", gap: 12,
                       cursor: "pointer", userSelect: "none" }}
              onClick={() => setNeedsBrand(v => !v)}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
                border: `2px solid ${needsBrand ? "#1b5793" : "#D0D0D0"}`,
                background: needsBrand ? "#1b5793" : "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}>
                {needsBrand && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#181313" }}>
                  🎨 Needs Brand Team involvement
                </div>
                <p className="field-hint">
                  Select if this page requires new custom images, graphics, or brand assets
                  to be created. The admin will make the final decision on Brand Team involvement.
                </p>
              </div>
            </label>
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
                ? true // SEO tab always considered complete — all fields optional
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
                    borderBottom: isActive ? "2px solid #3ec5cb" : "2px solid transparent",
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
                      <span style={{ fontSize: 11, color: "#3ec5cb", fontWeight: 600 }}>✓</span>
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
                      <SectionAIAssist sectionKey="seo_meta" currentContent={`${seoData.seo_meta_title} ${seoData.seo_meta_description}`} onAccept={(d) => setSeoData(p => ({ ...p, ...d }))} />
                    </div>
                    <Field label="Page Location" charLimit={CHAR_LIMITS.seo_page_location} value={seoData.seo_page_location} onChange={v => updSeo("seo_page_location", v)} placeholder="e.g. /products/xcelium-logic-simulator" hint="The URL path where this page will live on the site" />
                    <Field label="Meta Title" charLimit={CHAR_LIMITS.seo_meta_title} value={seoData.seo_meta_title} onChange={v => updSeo("seo_meta_title", v)} placeholder="e.g. Xcelium Logic Simulator | Cadence" hint="Shown in browser tabs and search results — 50–70 characters" />
                    <Field label="Meta Description" charLimit={CHAR_LIMITS.seo_meta_description} value={seoData.seo_meta_description} onChange={v => updSeo("seo_meta_description", v)} placeholder="e.g. Accelerate SoC verification with Cadence Xcelium..." multiline hint="Shown in search results — 120–160 characters" />
                    <Field label="Meta Keywords" charLimit={CHAR_LIMITS.seo_meta_keywords} value={seoData.seo_meta_keywords} onChange={v => updSeo("seo_meta_keywords", v)} placeholder="e.g. logic simulator, SoC verification, mixed-signal" multiline hint="Comma-separated keywords" />
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
                    <div><h3>Banner Section</h3><p>Common to all page types · Required</p></div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <SectionAIAssist sectionKey="banner" currentContent={`${banner.page_title} ${banner.sub_title}`} onAccept={(d) => setBanner(p => ({ ...p, ...d }))} />
                    </div>
                  </div>
                  <Field label="Page Title" required charLimit={CHAR_LIMITS.page_title} value={banner.page_title} onChange={v => updBanner("page_title", v)} placeholder="e.g. Xcelium Logic Simulator" />
                  <Field label="Sub Title" charLimit={CHAR_LIMITS.sub_title} value={banner.sub_title}  onChange={v => updBanner("sub_title",  v)} placeholder="e.g. Industry-leading simulation platform" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="CTA 1 Label" charLimit={CHAR_LIMITS.cta1_label} value={banner.cta1_label} onChange={v => updBanner("cta1_label", v)} placeholder="Read Blog" />
                    <Field label="CTA 1 Link"  value={banner.cta1_link}  onChange={v => updBanner("cta1_link",  v)} placeholder="/blog/..." />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="CTA 2 Label" charLimit={CHAR_LIMITS.cta2_label} value={banner.cta2_label} onChange={v => updBanner("cta2_label", v)} placeholder="Watch Video" />
                    <Field label="CTA 2 Link"  value={banner.cta2_link}  onChange={v => updBanner("cta2_link",  v)} placeholder="/video/..." />
                  </div>
                  <ImageField label="Banner Image" value={banner.banner_image_ref} onChange={v => updBanner("banner_image_ref", v)} fieldKey="banner_bg-image" requestId={draftId || "draft"} />
                </div>
                </div>
                <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}>
                  <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                  <PagePreview req={previewData} activeSection={activeSection} />
                </div>
              </div>
            )}

            {/* Key Benefits */}
            {activeSection === "key_benefits" && (
              <>
              <div>
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
                        isNA={false}
                        onToggleNA={() => toggleNA("key_benefits")}
                        requestId={draftId || "draft"}
                        aiAssistButton={<SectionAIAssist sectionKey="key_benefits" currentContent={kbData.kb_impact} onAccept={(d) => { const { kb_cards, ...rest } = d; setKbData(p => ({ ...p, ...rest, ...(kb_cards ? { kb_cards: kb_cards.map((c,i) => ({ ...c, id:`kb-ai-${i}-${Date.now()}` })) } : {}) })); }} />}
                        naButton={<button onClick={() => toggleNA("key_benefits")} className={`btn-na${naMap["key_benefits"] ? " active" : ""}`}>{naMap["key_benefits"] ? "✓ N/A — Undo" : "Mark as N/A"}</button>}
                      />
                    </div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}>
                      <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                      <PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} activeSection={activeSection} />
                    </div>
                  </div>
                )}
              </div>
            </>
            )}

            {/* Features / Applications */}
            {activeSection === "features_apps" && (
              <>
              <div>
                {naMap["features_apps"] ? (
                  <div className="na-placeholder">
                    <div className="icon">—</div>
                    <div className="text">Features / Applications marked as Not Applicable</div>
                    <button onClick={() => toggleNA("features_apps")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}>
                      <FeaturesApps data={faData} onChange={setFaData} isNA={false} onToggleNA={() => toggleNA("features_apps")} requestId={draftId || "draft"} aiAssistButton={<SectionAIAssist sectionKey="features_apps" currentContent={faData.fa_impact} onAccept={(d) => { const { fa_items, ...rest } = d; setFaData(p => ({ ...p, ...rest, ...(fa_items ? { fa_items: fa_items.map((it,i) => ({ ...it, id:`li-ai-${i}-${Date.now()}` })) } : {}) })); }} />} naButton={<button onClick={() => toggleNA("features_apps")} className={`btn-na${naMap["features_apps"] ? " active" : ""}`}>{naMap["features_apps"] ? "✓ N/A — Undo" : "Mark as N/A"}</button>} />
                    </div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}>
                      <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                      <PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} activeSection={activeSection} />
                    </div>
                  </div>
                )}
              </div>
            </>
            )}

            {/* Customer Stories */}
            {activeSection === "customer_stories" && (
              <>
              <div>
                {naMap["customer_stories"] ? (
                  <div className="na-placeholder"><div className="icon">—</div><div className="text">Customer Stories marked as Not Applicable</div><button onClick={() => toggleNA("customer_stories")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}><CustomerStories data={csData} onChange={setCsData} isNA={false} onToggleNA={() => toggleNA("customer_stories")} requestId={draftId || "draft"} aiAssistButton={<SectionAIAssist sectionKey="customer_stories" currentContent={csData.cs_impact} onAccept={(d) => setCsData(p => ({ ...p, ...d }))} />} naButton={<button onClick={() => toggleNA("customer_stories")} className={`btn-na${naMap["customer_stories"] ? " active" : ""}`}>{naMap["customer_stories"] ? "✓ N/A — Undo" : "Mark as N/A"}</button>} /></div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}><p className="text-xs text-uppercase text-muted mb-8">Live Preview</p><PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} activeSection={activeSection} /></div>
                  </div>
                )}
              </div>
            </>
            )}

            {/* Promo Section */}
            {activeSection === "promo_section" && (
              <>
              <div>
                {naMap["promo_section"] ? (
                  <div className="na-placeholder"><div className="icon">—</div><div className="text">Promo Section marked as Not Applicable</div><button onClick={() => toggleNA("promo_section")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div><PromoSection data={promoData} onChange={setPromoData} isNA={false} onToggleNA={() => toggleNA("promo_section")} requestId={draftId || "draft"} aiAssistButton={<SectionAIAssist sectionKey="promo_section" currentContent={promoData.promo_title} onAccept={(d) => setPromoData(p => ({ ...p, ...d }))} />} naButton={<button onClick={() => toggleNA("promo_section")} className={`btn-na${naMap["promo_section"] ? " active" : ""}`}>{naMap["promo_section"] ? "✓ N/A — Undo" : "Mark as N/A"}</button>} /></div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}><p className="text-xs text-uppercase text-muted mb-8">Live Preview</p><PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} activeSection={activeSection} /></div>
                  </div>
                )}
              </div>
            </>
            )}

            {/* Related Content */}
            {activeSection === "related_content" && (
              <>
              <div>
                {naMap["related_content"] ? (
                  <div className="na-placeholder"><div className="icon">—</div><div className="text">Related Content marked as Not Applicable</div><button onClick={() => toggleNA("related_content")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}><RelatedContent data={rcData} onChange={setRcData} isNA={false} onToggleNA={() => toggleNA("related_content")} requestId={draftId || "draft"} aiAssistButton={<SectionAIAssist sectionKey="related_content" currentContent={rcData.rc_impact} onAccept={(d) => setRcData(p => ({ ...p, ...d }))} />} naButton={<button onClick={() => toggleNA("related_content")} className={`btn-na${naMap["related_content"] ? " active" : ""}`}>{naMap["related_content"] ? "✓ N/A — Undo" : "Mark as N/A"}</button>} /></div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}><p className="text-xs text-uppercase text-muted mb-8">Live Preview</p><PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} activeSection={activeSection} /></div>
                  </div>
                )}
              </div>
            </>
            )}

            {/* Resources */}
            {activeSection === "resources" && (
              <div>
                {naMap["resources"] ? (
                  <div className="na-placeholder"><div className="icon">—</div><div className="text">Resources marked as Not Applicable</div><button onClick={() => toggleNA("resources")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}><Resources data={resData} onChange={setResData} isNA={false} onToggleNA={() => toggleNA("resources")} requestId={draftId || "draft"} /></div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}><p className="text-xs text-uppercase text-muted mb-8">Live Preview</p><PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} activeSection={activeSection} /></div>
                  </div>
                )}
              </div>
            )}

            {/* Related Products */}
            {activeSection === "related_products" && (
              <div>
                {naMap["related_products"] ? (
                  <div className="na-placeholder"><div className="icon">—</div><div className="text">Related Products marked as Not Applicable</div><button onClick={() => toggleNA("related_products")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}>
                      <RelatedProducts data={rpData} onChange={setRpData} isNA={false} onToggleNA={() => toggleNA("related_products")} requestId={draftId || "draft"} />
                    </div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}>
                      <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                      <PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} activeSection={activeSection} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Training & Support */}
            {activeSection === "training_support" && (
              <>
              <div>
                {naMap["training_support"] ? (
                  <div className="na-placeholder"><div className="icon">—</div><div className="text">Training & Support marked as Not Applicable</div><button onClick={() => toggleNA("training_support")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button></div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ height: "100vh", overflowY: "auto", paddingRight: 4, paddingBottom: "2rem" }}>
                      <TrainingSupport data={tsData} onChange={setTsData} isNA={false} onToggleNA={() => toggleNA("training_support")} requestId={draftId || "draft"} aiAssistButton={<SectionAIAssist sectionKey="training_support" currentContent={tsData.ts_impact} onAccept={(d) => setTsData(p => ({ ...p, ...d }))} />} naButton={<button onClick={() => toggleNA("training_support")} className={`btn-na${naMap["training_support"] ? " active" : ""}`}>{naMap["training_support"] ? "✓ N/A — Undo" : "Mark as N/A"}</button>} />
                    </div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}>
                      <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                      <PagePreview req={{ ...banner, ...overview, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData }} activeSection={activeSection} />
                    </div>
                  </div>
                )}
              </div>
            </>
            )}

            {/* Overview */}
            {activeSection === "overview" && (
              <div>
                {naMap["overview"] ? (
                  <div className="na-placeholder">
                    <div className="icon">—</div>
                    <div className="text">Overview section marked as Not Applicable</div>
                    <button onClick={() => toggleNA("overview")} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                    <div className="card">
                      <div className="card-header">
                        <div><h3>Overview — Content</h3><p>Impact statement, description and optional media</p></div>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <SectionAIAssist sectionKey="overview" currentContent={overview.overview_impact} onAccept={(d) => setOverview(p => ({ ...p, ...d }))} />
                          <button onClick={() => toggleNA("overview")} className={`btn-na${naMap["overview"] ? " active" : ""}`}>
                            {naMap["overview"] ? "✓ N/A — Undo" : "Mark as N/A"}
                          </button>
                        </div>
                      </div>
                      <Field label="Label" value="OVERVIEW" onChange={() => {}} readOnly disabled style={{ background: "#F5F5F5", color: "#B5B5B5", cursor: "not-allowed" }} hint="Fixed label — not editable" />
                      <Field label="Impact Statement" required charLimit={CHAR_LIMITS.overview_impact} value={overview.overview_impact} onChange={v => updOverview("overview_impact", v)} placeholder="e.g. Run More Validation Cycles on Bigger SoCs" multiline hint="Large heading — make it compelling" />
                      <Field label="Description" required charLimit={CHAR_LIMITS.overview_description} value={overview.overview_description} onChange={v => updOverview("overview_description", v)} placeholder="Describe the product or solution in detail..." multiline />

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
                      <ImageField label="Media / Image" value={overview.overview_media_ref} onChange={v => updOverview("overview_media_ref", v)} fieldKey="overview_media" requestId={draftId || "draft"} />
                      {overview.overview_media_type !== "video" && (
                        <Field label="Alt Text" required charLimit={CHAR_LIMITS.overview_media_alt} value={overview.overview_media_alt} onChange={v => updOverview("overview_media_alt", v)}
                          placeholder="Describe what this image shows, for screen readers"
                          hint="Required for accessibility — not needed for purely decorative images, but this one is content, so describe what it shows." />
                      )}
                    </div>
                    <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", paddingBottom: "2rem" }} ref={previewRef}>
                      <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                      <PagePreview req={previewData} activeSection={activeSection} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}



      {/* ── Step 3: Preview & Submit ── */}
      {step === 3 && (() => {
        const preflightIssues = runPreflightChecks(buildPayload("draft"), { checkPlaceholders: placeholderCheckEnabled });
        return (
        <>
          <div style={{ marginBottom: 20 }}>
            <p className="text-xs text-uppercase text-muted mb-8">Full Page Preview</p>
            <PagePreview req={previewData} activeSection={activeSection} />
          </div>

          {/* Pre-flight check */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 14 }}>Pre-flight Check</h3>
            {!placeholderCheckEnabled && (
              <div style={{ fontSize: 11, color: "#d97706", background: "#fffbeb", border: "1px solid #f59e0b44", borderRadius: 6, padding: "0.4rem 0.7rem", marginBottom: 10 }}>
                ⚠ Placeholder/Lorem Ipsum checking is turned off (AdminPanel → Settings) — temporary QA setting.
              </div>
            )}
            {preflightIssues.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#2a7a4b", fontWeight: 500 }}>
                ✓ No issues found
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {preflightIssues.map((issue, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#fef2f2", border: "1px solid #c0392b33", borderRadius: 8, padding: "0.65rem 0.9rem" }}>
                    <div style={{ fontSize: 13, color: "#181313" }}>⚠ {issue.message}</div>
                    {issue.section && (
                      <button type="button" onClick={() => { setStep(2); handleSectionChange(issue.section); }}
                        style={{ background: "#fff", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: 11, fontWeight: 500, color: "#181313", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Rubik',sans-serif" }}>
                        Fix →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
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
            ℹ️ Submitting will send this to an <strong style={{ color: "#181313" }}>Admin</strong> who will set up the parallel task workflow.
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setStep(2)} className="btn-ghost">
              ← Back to Edit
            </button>
            <button onClick={submit} disabled={saving} className="btn-primary">
              {saving ? "Submitting..." : "Submit Request →"}
            </button>
          </div>
        </>
        );
      })()}

      {/* ── Floating AI Assistant ── */}
      {step === 2 && (
        <AIAssistant
          availableSections={[
            "seo_meta", "banner", "overview",
            ...(sections.some(s => s.key === "key_benefits")     ? ["key_benefits"]     : []),
            ...(sections.some(s => s.key === "features_apps")    ? ["features_apps"]    : []),
            ...(sections.some(s => s.key === "customer_stories") ? ["customer_stories"] : []),
            ...(sections.some(s => s.key === "promo_section")    ? ["promo_section"]    : []),
            ...(sections.some(s => s.key === "related_content")  ? ["related_content"]  : []),
            ...(sections.some(s => s.key === "training_support") ? ["training_support"] : []),
          ]}
          onGenerate={handleAIGenerate}
        />
      )}
    </div>
  );
}