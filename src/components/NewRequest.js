"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { PAGE_TYPES, getSectionsForPageType } from "@/lib/constants";
import PagePreview from "@/components/PagePreview";

const EMPTY_BANNER   = { page_title:"", sub_title:"", cta1_label:"", cta1_link:"", cta2_label:"", cta2_link:"", banner_image:"" };
const EMPTY_OVERVIEW = { overview_label:"", overview_impact:"", overview_description:"", overview_media_url:"", overview_media_type:"image", overview_media_note:"" };

const Field = ({ label, value, onChange, placeholder, multiline, required, hint }) => (
  <div className="field-wrap">
    <label className="field-label">
      {label}{required && <span className="req"> *</span>}
    </label>
    {multiline
      ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="textarea" />
      : <input    value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input" />
    }
    {hint && <div className="field-hint">{hint}</div>}
  </div>
);

export default function NewRequest({ go, user }) {
  const [step,          setStep]         = useState(1);
  const [pageType,      setPageType]     = useState("");
  const [activeSection, setActiveSection]= useState("banner");
  const [banner,        setBanner]       = useState(EMPTY_BANNER);
  const [overview,      setOverview]     = useState(EMPTY_OVERVIEW);
  const [naMap,         setNaMap]        = useState({});
  const [saving,        setSaving]       = useState(false);
  const [error,         setError]        = useState("");
  const [showExitModal, setShowExitModal]= useState(false);

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
    return true;
  };

  const buildPayload = (status) => ({
    page_type: pageType, status, created_by: user.id,
    page_title: banner.page_title, sub_title: banner.sub_title,
    cta1_label: banner.cta1_label, cta1_link: banner.cta1_link,
    cta2_label: banner.cta2_label, cta2_link: banner.cta2_link,
    banner_image: banner.banner_image,
    ...(!naMap["overview"] ? {
      overview_label: overview.overview_label,
      overview_impact: overview.overview_impact,
      overview_description: overview.overview_description,
      overview_media_url: overview.overview_media_url,
      overview_media_type: overview.overview_media_type,
      overview_media_note: overview.overview_media_note,
    } : {}),
  });

  const saveDraft = async () => {
    if (!banner.page_title || !pageType) { go("dashboard"); return; }
    setSaving(true);
    setError("");
    try {
      await supabase.from("requests").insert(buildPayload("draft"));
      go("dashboard");
    } catch {
      setError("Failed to save draft. Please try again.");
      setSaving(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const { data, error: err } = await supabase.from("requests").insert(buildPayload("editorial_qa")).select().single();
      if (err) throw err;
      await supabase.from("status_history").insert({ request_id: data.id, user_id: user.id, user_name: user.name, from_status: null, to_status: "editorial_qa" });
      go("detail", data.id);
    } catch {
      setError("Failed to submit. Please try again.");
      setSaving(false);
    }
  };

  // Merged data for unified preview
  const previewData = { ...banner, ...overview };
  const steps = ["Select Page Type", "Fill Sections", "Preview & Submit"];

  return (
    <div className="fade-in" style={{ maxWidth: "100%", margin: "0 auto", fontFamily: "'Rubik', sans-serif" }}>

      {/* Exit Modal */}
      {showExitModal && (
        <div className="modal-overlay" onClick={() => setShowExitModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>Leave without saving?</h2>
            <p>You have unsaved content. Save it as a draft so you can continue later.</p>
            <div className="modal-actions">
              <button onClick={saveDraft} className="btn-primary btn-full">
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
                        {s.icon} {s.label} · {s.required ? "Required" : "Optional"}
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
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20 }}>
          {/* Section nav */}
          <div>
            <p className="text-xs text-uppercase text-muted mb-8">Sections</p>
            {sections.map(s => {
              const isNA     = naMap[s.key];
              const isActive = activeSection === s.key;
              const isDone   = s.key === "banner"
                ? !!banner.page_title
                : s.key === "overview"
                ? (isNA || (!!overview.overview_impact && !!overview.overview_description))
                : false;
              return (
                <button key={s.key} onClick={() => setActiveSection(s.key)}
                  className={`section-nav-btn${isActive ? " active" : ""}`}>
                  <div>
                    <div className="section-nav-label">{s.icon} {s.label}</div>
                    <div className={`section-nav-sub${!isActive && s.required && !isNA ? " required" : ""}`}>
                      {isNA ? "Marked N/A" : s.required ? "Required" : "Optional"}
                    </div>
                  </div>
                  <div className="section-nav-status" style={{ color: isActive ? "#fff" : isDone ? "#2a7a4b" : "#B5B5B5" }}>
                    {isNA ? "—" : isDone ? "✓" : "○"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Section form */}
          <div>
            {/* Banner */}
            {activeSection === "banner" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h3>🖼️ Banner Section</h3>
                      <p>Common to all page types · Required</p>
                    </div>
                  </div>
                  <Field label="Page Title" required value={banner.page_title} onChange={v => updBanner("page_title", v)} placeholder="e.g. Xcelium Logic Simulator" />
                  <Field label="Sub Title"  value={banner.sub_title}  onChange={v => updBanner("sub_title",  v)} placeholder="e.g. Industry-leading simulation platform" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="CTA 1 Label" value={banner.cta1_label} onChange={v => updBanner("cta1_label", v)} placeholder="Read Blog" />
                    <Field label="CTA 1 Link"  value={banner.cta1_link}  onChange={v => updBanner("cta1_link",  v)} placeholder="/blog/..." />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="CTA 2 Label" value={banner.cta2_label} onChange={v => updBanner("cta2_label", v)} placeholder="Watch Video" />
                    <Field label="CTA 2 Link"  value={banner.cta2_link}  onChange={v => updBanner("cta2_link",  v)} placeholder="/video/..." />
                  </div>
                  <Field label="Banner Image URL" value={banner.banner_image} onChange={v => updBanner("banner_image", v)} placeholder="https://... or describe image" hint="Design QA will finalize the image" />
                </div>
                <div>
                  <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                  <PagePreview req={previewData} pageType={pageType} />
                </div>
              </div>
            )}

            {/* Overview */}
            {activeSection === "overview" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 14, margin: 0 }}>📋 Overview Section</h3>
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div className="card">
                      <Field label="Label" value={overview.overview_label} onChange={v => updOverview("overview_label", v)} placeholder='e.g. "OVERVIEW"' hint="Small caps tag above the heading (optional)" />
                      <Field label="Impact Statement" required value={overview.overview_impact} onChange={v => updOverview("overview_impact", v)} placeholder="e.g. Run More Validation Cycles on Bigger SoCs" multiline hint="Large heading — make it compelling" />
                      <Field label="Description" required value={overview.overview_description} onChange={v => updOverview("overview_description", v)} placeholder="Describe the product or solution in detail..." multiline />

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
                      <Field label="Notes for Design QA" value={overview.overview_media_note} onChange={v => updOverview("overview_media_note", v)} placeholder="e.g. Diagram showing the simulation workflow" hint="Describe what image or diagram you need" />
                    </div>
                    <div>
                      <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                      <PagePreview req={previewData} pageType={pageType} />
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
            <PagePreview req={previewData} pageType={pageType} />
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
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.icon} {s.label}</div>
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
