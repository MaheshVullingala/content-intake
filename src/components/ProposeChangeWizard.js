"use client";
import { useState, useEffect, useRef } from "react";
import { CHAR_LIMITS as DEFAULT_CHAR_LIMITS, getSectionsForPageType, AUDIT_ACTIONS } from "@/lib/constants";
import { useCharLimits } from "@/lib/charLimits";
import { isFastLaneEligible } from "@/lib/fastLane";
import { logAudit } from "@/lib/auditLogger";
import { SECTION_CONFIG } from "@/components/EditSectionModal";
import PagePreview from "@/components/PagePreview";
import ImageField from "@/components/ImageField";
import KeyBenefits from "@/components/sections/KeyBenefits";
import FeaturesApps from "@/components/sections/FeaturesApps";
import CustomerStories from "@/components/sections/CustomerStories";
import PromoSection from "@/components/sections/PromoSection";
import RelatedContent from "@/components/sections/RelatedContent";
import Resources from "@/components/sections/Resources";
import RelatedProducts from "@/components/sections/RelatedProducts";
import TrainingSupport from "@/components/sections/TrainingSupport";

// Same section forms NewRequest.js uses to create a request in the first
// place — reused here (instead of EditSectionModal's field-only-if-
// already-filled modal) so a stakeholder proposing a mid-flight change can
// fill in a section they left blank/N/A the first time around, not just
// tweak ones that already have content. Two-phase: reason gate, then this
// tabbed editor. See handleSubmit: most changes stage a diff into
// content_change_requests for admin review (same contract
// PendingChangeCard.js's approve handler expects) — but a small,
// plain-text-only edit (see src/lib/fastLane.js) writes straight to
// `requests` instead, skipping the review queue entirely.

const EMPTY_SEO     = { seo_page_location:"", seo_meta_title:"", seo_meta_description:"", seo_meta_keywords:"" };
const EMPTY_BANNER  = { page_title:"", sub_title:"", cta1_label:"", cta1_link:"", cta2_label:"", cta2_link:"", banner_image_ref:null };
const EMPTY_OVERVIEW = { overview_label:"OVERVIEW", overview_impact:"", overview_description:"", overview_media_url:"", overview_media_type:"image", overview_media_ref:null };

const parseJSONB = (val, fb = []) => {
  if (!val) return fb;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return fb; } }
  return val;
};

const isEqualValue = (a, b) => {
  if (a === b) return true;
  if (a == null && b == null) return true;
  try { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); } catch { return false; }
};

// Reverse map: field key -> { section, label } — built once from
// EditSectionModal's SECTION_CONFIG so the submitted diff (and the
// per-tab "modified" dot) can show a human label instead of a raw column
// name. Anything not covered (image refs, promo_bg_image/note, etc.)
// falls back to the raw key.
const FIELD_META = (() => {
  const map = {};
  Object.entries(SECTION_CONFIG).forEach(([sectionKey, cfg]) => {
    (cfg.fields || []).forEach(f => { map[f.key] = { section: sectionKey, label: f.label }; });
    if (cfg.arrayField) map[cfg.arrayField.key] = { section: sectionKey, label: `${cfg.arrayField.itemLabel} cards` };
  });
  map.fa_items       = { section: "features_apps", label: "Features / Applications items" };
  map.fa_columns     = { section: "features_apps", label: "Features / Applications table columns" };
  map.fa_rows        = { section: "features_apps", label: "Features / Applications table rows" };
  map.banner_image_ref    = { section: "banner",   label: "Banner Image" };
  map.overview_media_ref  = { section: "overview", label: "Overview Media" };
  map.overview_media_type = { section: "overview", label: "Overview Media Type" };
  map.promo_bg_image_ref  = { section: "promo_section", label: "Promo Background Image" };
  return map;
})();

const fieldMeta = (key) => FIELD_META[key] || { section: "other", label: key };

function Field({ label, value, onChange, placeholder, multiline, required, hint, charLimit }) {
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
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="textarea" style={over ? { borderColor: "#c0392b" } : {}} />
        : <input    value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input"    style={over ? { borderColor: "#c0392b" } : {}} />
      }
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

// Defined at module scope (NOT inside ProposeChangeWizard's function
// body) — every prop it needs is passed explicitly instead of closed
// over. A component declared inline inside a parent's render gets a new
// function identity on every render, which makes React unmount/remount
// the whole subtree (including any <input>/<textarea> under it) on every
// keystroke, dropping focus after each character. That was the actual
// bug behind "can only type one letter before needing to click back in."
function SectionLayout({ activeSection, pageType, mergedPreview, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
      <div style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto", paddingRight: 4 }}>{children}</div>
      <div style={{ position: "sticky", top: 0, maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
        <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
        <PagePreview req={mergedPreview} pageType={pageType} activeSection={activeSection} />
      </div>
    </div>
  );
}

export default function ProposeChangeWizard({ req, user, supabase, onCancel, onSubmitted }) {
  const CHAR_LIMITS = useCharLimits(supabase, DEFAULT_CHAR_LIMITS);
  const [reasonConfirmed, setReasonConfirmed] = useState(false);
  const [reason,   setReason]   = useState("");
  const [activeSection, setActiveSection] = useState("banner");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const originalRef = useRef(null);

  const [seoData,   setSeoData]   = useState(EMPTY_SEO);
  const [banner,    setBanner]    = useState(EMPTY_BANNER);
  const [overview,  setOverview]  = useState(EMPTY_OVERVIEW);
  const [kbData,    setKbData]    = useState({ kb_label:"KEY BENEFITS", kb_impact:"", kb_description:"", kb_cards:[] });
  const [faData,    setFaData]    = useState({ fa_label:"FEATURES", fa_impact:"", fa_description:"", fa_view_type:"", fa_items:[], fa_columns:[], fa_rows:[] });
  const [csData,    setCsData]    = useState({ cs_label:"CUSTOMER STORIES", cs_impact:"", cs_items:[] });
  const [promoData, setPromoData] = useState({ promo_bg_image_ref:null, promo_label:"", promo_title:"", promo_description:"", promo_btn_label:"", promo_btn_link:"" });
  const [rcData,    setRcData]    = useState({ rc_label:"RELATED CONTENT", rc_impact:"", rc_cards:[] });
  const [resData,   setResData]   = useState({ res_label:"", res_impact:"", res_selected:[], res_video_carousel:{}, res_mixed_carousel:{}, res_resources:{}, res_news:{}, res_blogs:{} });
  const [rpData,    setRpData]    = useState({ rp_label:"RELATED PRODUCTS", rp_impact:"", rp_description:"", rp_cards:[] });
  const [tsData,    setTsData]    = useState({});

  // Seed every section slice from the request currently in flight —
  // unlike NewRequest.js's loadDraft (which only seeds a slice when it
  // already has content, as a cheap no-op skip), this seeds
  // unconditionally so an empty/N/A section still gets a fully-formed,
  // editable default rather than being left out.
  useEffect(() => {
    setSeoData({
      seo_page_location: req.seo_page_location||"", seo_meta_title: req.seo_meta_title||"",
      seo_meta_description: req.seo_meta_description||"", seo_meta_keywords: req.seo_meta_keywords||"",
    });
    setBanner({
      page_title: req.page_title||"", sub_title: req.sub_title||"",
      cta1_label: req.cta1_label||"", cta1_link: req.cta1_link||"",
      cta2_label: req.cta2_label||"", cta2_link: req.cta2_link||"",
      banner_image_ref: req.banner_image_ref||null,
    });
    setOverview({
      overview_label: "OVERVIEW", overview_impact: req.overview_impact||"",
      overview_description: req.overview_description||"", overview_media_url: req.overview_media_url||"",
      overview_media_type: req.overview_media_type||"image", overview_media_ref: req.overview_media_ref||null,
    });
    setKbData({ kb_label: "KEY BENEFITS", kb_impact: req.kb_impact||"", kb_description: req.kb_description||"", kb_cards: parseJSONB(req.kb_cards,[]) });
    setFaData({ fa_label: "FEATURES", fa_impact: req.fa_impact||"", fa_description: req.fa_description||"", fa_view_type: req.fa_view_type||"", fa_items: parseJSONB(req.fa_items,[]), fa_columns: parseJSONB(req.fa_columns,[]), fa_rows: parseJSONB(req.fa_rows,[]) });
    setCsData({ cs_label: "CUSTOMER STORIES", cs_impact: req.cs_impact||"", cs_items: parseJSONB(req.cs_items,[]) });
    setPromoData({ promo_bg_image_ref: req.promo_bg_image_ref||null, promo_label: req.promo_label||"", promo_title: req.promo_title||"", promo_description: req.promo_description||"", promo_btn_label: req.promo_btn_label||"", promo_btn_link: req.promo_btn_link||"" });
    setRcData({ rc_label: "RELATED CONTENT", rc_impact: req.rc_impact||"", rc_cards: parseJSONB(req.rc_cards,[]) });
    setResData({ res_label: req.res_label||"", res_impact: req.res_impact||"", res_selected: parseJSONB(req.res_selected,[]), res_video_carousel: req.res_video_carousel||{}, res_mixed_carousel: req.res_mixed_carousel||{}, res_resources: req.res_resources||{}, res_news: req.res_news||{}, res_blogs: req.res_blogs||{} });
    setRpData({ rp_label: "RELATED PRODUCTS", rp_impact: req.rp_impact||"", rp_description: req.rp_description||"", rp_cards: parseJSONB(req.rp_cards,[]) });
    setTsData({
      ts_label: "TRAINING AND SUPPORT", ts_impact: req.ts_impact||"",
      ts_card1_icon: req.ts_card1_icon||"", ts_card1_title: req.ts_card1_title||"", ts_card1_description: req.ts_card1_description||"", ts_card1_cta_label: req.ts_card1_cta_label||"", ts_card1_cta_link: req.ts_card1_cta_link||"",
      ts_card2_icon: req.ts_card2_icon||"", ts_card2_title: req.ts_card2_title||"", ts_card2_description: req.ts_card2_description||"", ts_card2_cta_label: req.ts_card2_cta_label||"", ts_card2_cta_link: req.ts_card2_cta_link||"",
      ts_card3_icon: req.ts_card3_icon||"", ts_card3_title: req.ts_card3_title||"", ts_card3_description: req.ts_card3_description||"", ts_card3_cta_label: req.ts_card3_cta_label||"", ts_card3_cta_link: req.ts_card3_cta_link||"",
    });
    originalRef.current = { ...req };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req.id]);

  const sections = req.page_type ? getSectionsForPageType(req.page_type) : [];
  const mergedPreview = { ...banner, ...overview, ...seoData, ...kbData, ...faData, ...csData, ...promoData, ...rcData, ...resData, ...rpData, ...tsData };

  const buildChangedFields = () => {
    const original = originalRef.current || {};
    const fields = [];
    Object.keys(mergedPreview).forEach(key => {
      if (!isEqualValue(original[key], mergedPreview[key])) {
        const meta = fieldMeta(key);
        fields.push({ section: meta.section, key, label: meta.label, old_value: original[key] ?? null, new_value: mergedPreview[key] ?? null });
      }
    });
    return fields;
  };

  const changedFields = buildChangedFields();
  const sectionModified = (key) => changedFields.some(f => f.section === key);
  // Small, plain-text-only edits (typo fixes, short wording tweaks) skip
  // admin review entirely and apply straight to `requests` — see
  // src/lib/fastLane.js for the eligibility rule (all-or-nothing across
  // every changed field) and CONTEXT.md for the design rationale.
  const fastLane = isFastLaneEligible(changedFields, req.overall_status);

  const handleSubmit = async () => {
    if (changedFields.length === 0) { setError("No changes to submit yet."); return; }
    setSaving(true);
    setError("");

    if (fastLane) {
      const payload = Object.fromEntries(changedFields.map(f => [f.key, f.new_value]));
      const { error: err } = await supabase.from("requests").update(payload).eq("id", req.id);
      if (err) { setSaving(false); setError(err.message || "Failed to apply changes."); return; }
      logAudit(supabase, user, AUDIT_ACTIONS.CONTENT_CHANGE_FAST_LANED, "request", req.id, {
        field_name: changedFields.map(f => f.label).join(", "),
      });
      setSaving(false);
      onSubmitted?.();
      return;
    }

    const { error: err } = await supabase.from("content_change_requests").insert({
      request_id:   req.id,
      submitted_by: user.id,
      reason:       reason.trim(),
      changed_fields: changedFields,
    });
    if (err) { setSaving(false); setError(err.message || "Failed to submit for review."); return; }
    try {
      const { data: admins } = await supabase.from("users").select("id").in("role", ["admin", "super_admin"]);
      const notifications = (admins || []).map(a => ({
        user_id:    a.id,
        type:       "content_change_submitted",
        title:      "Content change proposed",
        message:    `${user.name || "A stakeholder"} proposed changes to "${req.page_title || "a request"}".`,
        request_id: req.id,
        action_url: `/requests/${req.id}`,
      }));
      if (notifications.length) await supabase.from("notifications").insert(notifications);
    } catch { /* notification failure must not block submission */ }
    setSaving(false);
    onSubmitted?.();
  };

  // ── Phase 1: reason gate ──────────────────────────────────────────────
  if (!reasonConfirmed) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: "3rem auto" }}>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>✎ Suggest a Change</h3>
        </div>
        <p className="text-sm text-muted" style={{ marginTop: 0 }}>
          Why does this need to change? Once you continue, you'll be able to
          edit any section the same way you did when you first submitted —
          including sections you left blank or marked N/A.
        </p>
        <textarea
          className="textarea"
          rows={3}
          placeholder="Reason for this change"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={!reason.trim()}
            onClick={() => setReasonConfirmed(true)}
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Phase 2: tabbed editor (mirrors NewRequest.js step 2) ──────────────
  const COMPONENT_SECTIONS = {
    key_benefits:     { Component: KeyBenefits,     data: kbData,    onChange: setKbData    },
    features_apps:    { Component: FeaturesApps,    data: faData,    onChange: setFaData    },
    customer_stories: { Component: CustomerStories, data: csData,    onChange: setCsData    },
    promo_section:    { Component: PromoSection,    data: promoData, onChange: setPromoData },
    related_content:  { Component: RelatedContent,  data: rcData,    onChange: setRcData    },
    resources:        { Component: Resources,       data: resData,   onChange: setResData   },
    related_products: { Component: RelatedProducts, data: rpData,    onChange: setRpData    },
    training_support: { Component: TrainingSupport, data: tsData,    onChange: setTsData    },
  };

  return (
    <div>
      {/* Sticky action bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: "var(--color-silver)", maxWidth: "60%" }}>
          <strong style={{ color: "var(--color-night)" }}>Reason:</strong> {reason}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {changedFields.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: fastLane ? "#2a7a4b" : "#9333ea", whiteSpace: "nowrap" }}>
              {fastLane ? "✅ Small edit — applies immediately" : "👁️ Will need admin review"}
            </span>
          )}
          <button className="btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || changedFields.length === 0}>
            {saving
              ? (fastLane ? "Applying…" : "Submitting…")
              : fastLane
                ? `Apply Changes${changedFields.length ? ` (${changedFields.length})` : ""}`
                : `Submit for Review${changedFields.length ? ` (${changedFields.length})` : ""}`}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error mb-12">{error}</div>}

      {/* Section tab bar */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e2e8f0", overflowX: "auto",
        whiteSpace: "nowrap", padding: "0 4px", position: "sticky", top: 0, zIndex: 5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}>
        {sections.map(s => {
          const isActive   = activeSection === s.key;
          const isModified = sectionModified(s.key);
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              style={{
                display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
                padding: "10px 16px", marginRight: 2,
                background: isActive ? "#181313" : "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid #3ec5cb" : "2px solid transparent",
                cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Rubik',sans-serif",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: isActive ? "#fff" : "#181313" }}>{s.label}</span>
                {isModified && <span style={{ fontSize: 11, color: "#3ec5cb", fontWeight: 700 }}>●</span>}
              </div>
              <span style={{ fontSize: 10, color: isActive ? "#94a3b8" : (s.required ? "#c0392b" : "#94a3b8") }}>
                {s.required ? "Required" : "Optional"}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ paddingTop: 16 }}>
        {activeSection === "seo_meta" && (
          <SectionLayout activeSection={activeSection} pageType={req.page_type} mergedPreview={mergedPreview}>
            <div className="card">
              <div className="card-header"><div><h3>🔍 SEO Meta Data</h3></div></div>
              <Field label="Page Location" charLimit={CHAR_LIMITS.seo_page_location} value={seoData.seo_page_location} onChange={v => setSeoData(p => ({ ...p, seo_page_location: v }))} placeholder="e.g. /products/xcelium-logic-simulator" />
              <Field label="Meta Title" charLimit={CHAR_LIMITS.seo_meta_title} value={seoData.seo_meta_title} onChange={v => setSeoData(p => ({ ...p, seo_meta_title: v }))} placeholder="e.g. Xcelium Logic Simulator | Cadence" />
              <Field label="Meta Description" charLimit={CHAR_LIMITS.seo_meta_description} value={seoData.seo_meta_description} onChange={v => setSeoData(p => ({ ...p, seo_meta_description: v }))} multiline />
              <Field label="Meta Keywords" charLimit={CHAR_LIMITS.seo_meta_keywords} value={seoData.seo_meta_keywords} onChange={v => setSeoData(p => ({ ...p, seo_meta_keywords: v }))} multiline />
            </div>
          </SectionLayout>
        )}

        {activeSection === "banner" && (
          <SectionLayout activeSection={activeSection} pageType={req.page_type} mergedPreview={mergedPreview}>
            <div className="card">
              <div className="card-header"><div><h3>Banner Section</h3></div></div>
              <Field label="Page Title" required charLimit={CHAR_LIMITS.page_title} value={banner.page_title} onChange={v => setBanner(p => ({ ...p, page_title: v }))} />
              <Field label="Sub Title" charLimit={CHAR_LIMITS.sub_title} value={banner.sub_title} onChange={v => setBanner(p => ({ ...p, sub_title: v }))} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="CTA 1 Label" charLimit={CHAR_LIMITS.cta1_label} value={banner.cta1_label} onChange={v => setBanner(p => ({ ...p, cta1_label: v }))} />
                <Field label="CTA 1 Link" value={banner.cta1_link} onChange={v => setBanner(p => ({ ...p, cta1_link: v }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="CTA 2 Label" charLimit={CHAR_LIMITS.cta2_label} value={banner.cta2_label} onChange={v => setBanner(p => ({ ...p, cta2_label: v }))} />
                <Field label="CTA 2 Link" value={banner.cta2_link} onChange={v => setBanner(p => ({ ...p, cta2_link: v }))} />
              </div>
              <ImageField label="Banner Image" value={banner.banner_image_ref} onChange={v => setBanner(p => ({ ...p, banner_image_ref: v }))} fieldKey="banner_bg-image" requestId={req.id} />
            </div>
          </SectionLayout>
        )}

        {activeSection === "overview" && (
          <SectionLayout activeSection={activeSection} pageType={req.page_type} mergedPreview={mergedPreview}>
            <div className="card">
              <div className="card-header"><div><h3>Overview — Content</h3></div></div>
              <Field label="Impact Statement" required charLimit={CHAR_LIMITS.overview_impact} value={overview.overview_impact} onChange={v => setOverview(p => ({ ...p, overview_impact: v }))} multiline />
              <Field label="Description" required charLimit={CHAR_LIMITS.overview_description} value={overview.overview_description} onChange={v => setOverview(p => ({ ...p, overview_description: v }))} multiline />
              <div className="divider" />
              <p className="field-label">Image / Diagram / Video — Optional</p>
              <div className="field-wrap">
                <label className="field-label">Media Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["image", "video", "diagram"].map(t => (
                    <button key={t} onClick={() => setOverview(p => ({ ...p, overview_media_type: t }))}
                      style={{
                        background: overview.overview_media_type === t ? "#181313" : "#F3F3F3",
                        color: overview.overview_media_type === t ? "#fff" : "#646464",
                        border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.35rem 0.8rem",
                        fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", textTransform: "capitalize",
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <ImageField label="Media / Image" value={overview.overview_media_ref} onChange={v => setOverview(p => ({ ...p, overview_media_ref: v }))} fieldKey="overview_media" requestId={req.id} hideDescription />
            </div>
          </SectionLayout>
        )}

        {Object.keys(COMPONENT_SECTIONS).includes(activeSection) && (() => {
          const { Component, data, onChange } = COMPONENT_SECTIONS[activeSection];
          return (
            <SectionLayout activeSection={activeSection} pageType={req.page_type} mergedPreview={mergedPreview}>
              <Component data={data} onChange={onChange} requestId={req.id} />
            </SectionLayout>
          );
        })()}
      </div>
    </div>
  );
}
