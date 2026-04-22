"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { PAGE_TYPES } from "@/lib/constants";
import BannerPreview from "@/components/BannerPreview";

const EMPTY = { pageTitle:"", subTitle:"", cta1Label:"", cta1Link:"", cta2Label:"", cta2Link:"", bannerImage:"" };

const inputStyle = {
  width: "100%", background: "#F9F9F9", border: "1px solid #E0E0E0",
  borderRadius: 7, padding: "0.62rem 0.85rem", fontSize: 13,
  color: "#181313", outline: "none", fontFamily: "'Rubik', sans-serif",
  fontWeight: 400, boxSizing: "border-box", transition: "border-color 0.15s",
};

export default function NewRequest({ go }) {
  const { createRequest } = useApp();
  const [step, setStep] = useState(1);
  const [type, setType] = useState("");
  const [banner, set]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const upd = (k, v) => set(p => ({ ...p, [k]: v }));
  const submit = () => {
    setSaving(true);
    setTimeout(() => { const id = createRequest(type, banner); go("detail", id); }, 700);
  };

  const stepLabel = ["Select Page Type", "Fill Banner Content", "Preview & Submit"];

  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Rubik', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <button onClick={() => go("dashboard")} style={{ background: "none", border: "none", color: "#B5B5B5", cursor: "pointer", fontSize: 14, fontFamily: "'Rubik', sans-serif" }}>← Back</button>
        <div style={{ width: 1, height: 20, background: "#E0E0E0" }} />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: "#181313", margin: 0 }}>New Content Request</h1>
          <p style={{ color: "#B5B5B5", fontSize: 12, margin: 0 }}>Banner Section · MVP</p>
        </div>
      </div>

      {/* Step bar */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 32, background: "#fff", borderRadius: 10, border: "1px solid #E0E0E0", padding: "0.9rem 1.5rem" }}>
        {stepLabel.map((s, i) => {
          const n = i + 1, done = n < step, active = n === step;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: done ? "#181313" : active ? "#3C3C3C" : "#F3F3F3",
                  color: done || active ? "#fff" : "#B5B5B5",
                  border: `1px solid ${done || active ? "transparent" : "#E0E0E0"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 500,
                }}>{done ? "✓" : n}</div>
                <span style={{ fontSize: 13, color: active ? "#181313" : done ? "#646464" : "#B5B5B5", fontWeight: active ? 500 : 400 }}>{s}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 1, background: done ? "#3C3C3C" : "#E0E0E0", margin: "0 18px" }} />}
            </div>
          );
        })}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {PAGE_TYPES.map(pt => (
              <button key={pt} onClick={() => setType(pt)} style={{
                background: type === pt ? "#181313" : "#fff",
                border: `1.5px solid ${type === pt ? "#181313" : "#E0E0E0"}`,
                borderRadius: 12, padding: "1.3rem 1.5rem", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: type === pt ? "#F3F3F3" : "#181313", marginBottom: 5 }}>{pt}</div>
                <div style={{ fontSize: 12, color: type === pt ? "#B5B5B5" : "#B5B5B5", fontWeight: 400 }}>
                  {pt === "Product" && "Product detail pages with specs and CTAs"}
                  {pt === "Solutions" && "Solutions overview with benefits and use cases"}
                  {pt === "Glossary" && "Technical definitions and explanations"}
                  {pt === "On-demand Webinar" && "Webinar landing page with registration"}
                </div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <button disabled={!type} onClick={() => setStep(2)} style={{ background: type ? "#181313" : "#F3F3F3", color: type ? "#fff" : "#B5B5B5", border: "none", borderRadius: 8, padding: "0.65rem 2rem", fontSize: 14, fontWeight: 500, cursor: type ? "pointer" : "not-allowed", fontFamily: "'Rubik', sans-serif" }}>Continue →</button>
          </div>
        </>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", padding: "1.5rem" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#181313", marginBottom: 4 }}>Banner Section</div>
              <div style={{ fontSize: 11, color: "#B5B5B5", marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #F3F3F3" }}>Common to all page types</div>

              {[
                ["pageTitle","Page Title *","e.g. Xcelium Logic Simulator"],
                ["subTitle","Sub Title","e.g. Industry-leading simulation platform"],
                ["cta1Label","CTA 1 — Label","Read Blog"],
                ["cta1Link","CTA 1 — Link","/blog/..."],
                ["cta2Label","CTA 2 — Label","Watch Video"],
                ["cta2Link","CTA 2 — Link","/video/..."],
                ["bannerImage","Banner Image URL","https://... or describe what's needed"],
              ].map(([k, label, ph]) => (
                <div key={k} style={{ marginBottom: 13 }}>
                  <label style={{ fontSize: 11, color: "#646464", fontWeight: 500, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                  <input value={banner[k]} onChange={e => upd(k, e.target.value)} placeholder={ph} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "#3C3C3C"}
                    onBlur={e => e.target.style.borderColor = "#E0E0E0"} />
                </div>
              ))}
              <div style={{ background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.65rem 0.85rem", fontSize: 12, color: "#646464", marginTop: 6 }}>
                💡 Design QA will finalize the banner image during their review.
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#B5B5B5", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Live Preview</div>
              <BannerPreview banner={banner} pageType={type} />
            </div>
          </div>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(1)} style={{ background: "transparent", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.6rem 1.5rem", fontSize: 13, cursor: "pointer", color: "#646464", fontFamily: "'Rubik', sans-serif" }}>← Back</button>
            <button disabled={!banner.pageTitle} onClick={() => setStep(3)} style={{ background: banner.pageTitle ? "#181313" : "#F3F3F3", color: banner.pageTitle ? "#fff" : "#B5B5B5", border: "none", borderRadius: 8, padding: "0.65rem 2rem", fontSize: 14, fontWeight: 500, cursor: banner.pageTitle ? "pointer" : "not-allowed", fontFamily: "'Rubik', sans-serif" }}>Preview & Submit →</button>
          </div>
        </>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <>
          <BannerPreview banner={banner} pageType={type} />
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", padding: "1.3rem 1.5rem", marginTop: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: "#181313", marginBottom: 14 }}>Review your submission</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Page Type",type],["Title",banner.pageTitle],["Sub Title",banner.subTitle],["CTA 1",`${banner.cta1Label||"—"} → ${banner.cta1Link||"—"}`],["CTA 2",`${banner.cta2Label||"—"} → ${banner.cta2Link||"—"}`],["Banner Image",banner.bannerImage||"To be added by Design QA"]].map(([k,v])=>(
                <div key={k} style={{ background: "#F9F9F9", borderRadius: 8, padding: "0.65rem 0.9rem", border: "1px solid #F3F3F3" }}>
                  <div style={{ fontSize: 10, color: "#B5B5B5", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, color: "#181313", fontWeight: 400 }}>{v||"—"}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 10, padding: "0.8rem 1.2rem", fontSize: 13, color: "#646464", marginBottom: 22 }}>
            ℹ️ Submitting will send this to <strong style={{ color: "#181313" }}>Editorial QA</strong> for content review.
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(2)} style={{ background: "transparent", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.6rem 1.5rem", fontSize: 13, cursor: "pointer", color: "#646464", fontFamily: "'Rubik', sans-serif" }}>← Edit</button>
            <button onClick={submit} disabled={saving} style={{ background: saving ? "#B5B5B5" : "#181313", color: "#fff", border: "none", borderRadius: 8, padding: "0.65rem 2rem", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Rubik', sans-serif" }}>
              {saving ? "Submitting..." : "Submit for Editorial QA →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
