"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/security";

// The Cadence brand-voice system prompt, per-section field schemas, and
// prompt builders (including formatBrief) used to live here -- they're now
// server-side only, in src/lib/aiPrompts.js. This component sends only
// { sectionKey, mode: "brief", brief } and the server builds the actual
// prompt from a fixed template. See that file's header comment for why:
// the old design let any authenticated user send an arbitrary systemPrompt
// straight through to Claude, since the route trusted whatever the client
// sent as prompt/systemPrompt verbatim. SECTION_CONFIGS below is now pure
// display metadata (label/icon/desc for the section picker) -- it no
// longer influences what gets generated.
const SECTION_CONFIGS = {
  seo_meta:         { label: "SEO Meta Data",      icon: "\ud83d\udd0d", desc: "Page location, meta title, description and keywords" },
  banner:           { label: "Banner",              icon: "\ud83c\udff7", desc: "Page title, subtitle and CTA buttons" },
  overview:         { label: "Overview",            icon: "\ud83d\udccb", desc: "Section label, impact statement and description" },
  key_benefits:     { label: "Key Benefits",        icon: "\u2b50",       desc: "Section header and 3-4 benefit cards" },
  features_apps:    { label: "Features / Apps",     icon: "\ud83d\udd27", desc: "Section header and feature highlights" },
  customer_stories: { label: "Customer Stories",    icon: "\ud83d\udcac", desc: "Section header and story cards" },
  promo_section:    { label: "Promo Section",       icon: "\ud83c\udfaf", desc: "Promo label, title, description and CTA" },
  related_content:  { label: "Related Content",     icon: "\ud83d\udd17", desc: "Section label and impact statement" },
  training_support: { label: "Training & Support",  icon: "\ud83c\udf93", desc: "Section label and impact statement" },
};

// ── Product Brief Form ────────────────────────────────────────────────────────
function ProductBriefForm({ brief, setBrief, onSave }) {
  const upd = (k, v) => setBrief(p => ({ ...p, [k]: v }));
  const fields = [
    ["productName",  "Product Name *",              "e.g. Xcelium Logic Simulator",                                           false],
    ["category",     "Product Category *",           "e.g. EDA Software, IP, PCB Design, Verification",                       false],
    ["summary",      "What does this product do? *", "Brief 1-2 sentence description...",                                      true],
    ["features",     "Key Features (one per line) *","Mixed-signal simulation\nParallel processing\nUVM support...",         true],
    ["audience",     "Target Audience *",            "e.g. SoC architects, verification engineers, chip designers",            false],
    ["usp",          "Unique Selling Point *",       "e.g. 3x faster simulation with lower memory footprint",                  true],
    ["proofPoints",  "Verified Proof Points (optional)", "Real numbers/certifications you can vouch for, e.g. '3x faster regression vs v20.1, ISO 26262 ASIL D certified'. Leave blank if you don't have one — AI will describe capabilities without inventing a number.", true],
    ["pageGoal",     "Page Goal (optional)",         "e.g. Drive demo requests, promote new release, replace legacy page",     false],
    ["keyMessage",   "Key Message (optional)",       "e.g. Only simulator with native ISO 26262 fault injection built-in",     false],
  ];

  const isComplete = brief.productName && brief.category && brief.summary && brief.features && brief.audience && brief.usp;

  return (
    <div style={{ padding: "1.25rem" }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: "0 0 4px" }}>Tell us about your product</h3>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>This info helps AI generate accurate, on-brand content for every section.</p>
      </div>

      {fields.map(([key, label, placeholder, multi]) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 5, fontWeight: 500 }}>{label}</label>
          {multi
            ? <textarea value={brief[key] || ""} onChange={e => upd(key, e.target.value)} placeholder={placeholder}
                style={{ width: "100%", background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.55rem 0.75rem", fontSize: 13, color: "#181313", outline: "none", fontFamily: "'Rubik',sans-serif", resize: "vertical", minHeight: 72, boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "#1b5793"}
                onBlur={e  => e.target.style.borderColor = "#E0E0E0"} />
            : <input value={brief[key] || ""} onChange={e => upd(key, e.target.value)} placeholder={placeholder}
                style={{ width: "100%", background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.55rem 0.75rem", fontSize: 13, color: "#181313", outline: "none", fontFamily: "'Rubik',sans-serif", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "#1b5793"}
                onBlur={e  => e.target.style.borderColor = "#E0E0E0"} />
          }
        </div>
      ))}

      <button
        type="button"
        disabled={!isComplete}
        onClick={onSave}
        style={{ width: "100%", background: isComplete ? "#1b5793" : "#E0E0E0", color: isComplete ? "#fff" : "#B5B5B5", border: "none", borderRadius: 8, padding: "0.75rem", fontSize: 14, fontWeight: 500, cursor: isComplete ? "pointer" : "not-allowed", fontFamily: "'Rubik',sans-serif", transition: "background 0.15s", marginTop: 4 }}>
        Save & Generate Content →
      </button>
    </div>
  );
}

// ── Section Picker ────────────────────────────────────────────────────────────
function SectionPicker({ brief, setBrief, availableSections, onGenerate, onEditBrief }) {
  const [generating, setGenerating] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [done, setDone] = useState({});

  const generate = async (sectionKey) => {
    setGenerating(sectionKey);
    const config = SECTION_CONFIGS[sectionKey];
    if (!config) { setGenerating(null); return; }

    try {
      const token = await getAccessToken(supabase);
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sectionKey, mode: "brief", brief }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Parse JSON from response
      const text = data.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      onGenerate(sectionKey, parsed);
      setDone(p => ({ ...p, [sectionKey]: true }));
    } catch (e) {
      console.error("AI generation error:", e);
    }
    setGenerating(null);
  };

  const generateAll = async () => {
    setGeneratingAll(true);
    for (const key of availableSections) {
      await generate(key);
    }
    setGeneratingAll(false);
  };

  return (
    <div style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: "0 0 2px" }}>Generate content for...</h3>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
            <strong style={{ color: "#1b5793" }}>{brief.productName}</strong> · {brief.category}
          </p>
        </div>
        <button type="button" onClick={onEditBrief}
          style={{ background: "none", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: 11, color: "#646464", cursor: "pointer", fontFamily: "'Rubik',sans-serif", flexShrink: 0 }}>
          ✏️ Edit brief
        </button>
      </div>

      {/* Generate All button */}
      <button type="button" onClick={generateAll} disabled={generatingAll || !!generating}
        style={{ width: "100%", background: generatingAll ? "#E0E0E0" : "linear-gradient(135deg, #1b5793, #3ec5cb)", color: "#fff", border: "none", borderRadius: 8, padding: "0.65rem", fontSize: 13, fontWeight: 600, cursor: generatingAll ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {generatingAll ? "⏳ Generating all sections..." : "⚡ Generate All Sections"}
      </button>

      {/* Per-section buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {availableSections.map(key => {
          const config = SECTION_CONFIGS[key];
          if (!config) return null;
          const isGenerating = generating === key;
          const isDone = done[key];
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, background: isDone ? "#f0fdf4" : "#F9F9F9", border: `1px solid ${isDone ? "#86efac" : "#E0E0E0"}`, borderRadius: 8, padding: "0.6rem 0.9rem" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{config.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#181313" }}>{config.label}</div>
                <div style={{ fontSize: 11, color: "#B5B5B5" }}>{config.desc}</div>
              </div>
              <button type="button" onClick={() => generate(key)} disabled={isGenerating || generatingAll}
                style={{ background: isDone ? "#22c55e" : "#1b5793", color: "#fff", border: "none", borderRadius: 6, padding: "0.35rem 0.75rem", fontSize: 11, fontWeight: 500, cursor: isGenerating || generatingAll ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", flexShrink: 0, whiteSpace: "nowrap", opacity: isGenerating ? 0.7 : 1 }}>
                {isGenerating ? "⏳..." : isDone ? "✓ Redo" : "Generate"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Floating AI Assistant ────────────────────────────────────────────────
const EMPTY_BRIEF = { productName: "", category: "", summary: "", features: "", audience: "", usp: "", proofPoints: "", pageGoal: "", keyMessage: "" };

export default function AIAssistant({ availableSections = [], onGenerate }) {
  const [open,        setOpen]       = useState(false);
  const [screen,      setScreen]     = useState("brief"); // "brief" | "sections"
  const [brief,       setBrief]      = useState(EMPTY_BRIEF);
  const [briefSaved,  setBriefSaved] = useState(false);

  const handleSaveBrief = () => {
    setBriefSaved(true);
    setScreen("sections");
  };

  const handleGenerate = (sectionKey, data) => {
    onGenerate(sectionKey, data);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const content = (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 9998,
          background: open
            ? "linear-gradient(135deg, #154a7e, #216f9f)"
            : "linear-gradient(135deg, #1b5793 0%, #2c90b2 50%, #3ec5cb 100%)",
          color: "#fff",
          border: "none",
          borderRadius: 50,
          padding: "0.8rem 1.4rem",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'Rubik',sans-serif",
          boxShadow: open
            ? "0 4px 20px rgba(27,87,147,0.4)"
            : "0 4px 24px rgba(27,87,147,0.45), 0 0 0 0 rgba(62,197,203,0.4)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "all 0.2s ease",
          animation: open ? "none" : "ai-pulse 2.5s ease-in-out infinite",
          WebkitFontSmoothing: "antialiased",
        }}>
        <span style={{ fontSize: 16 }}>{open ? "✕" : "✨"}</span>
        {open ? "Close" : "AI Assistant"}
      </button>

      <style>{`
        @keyframes ai-pulse {
          0%   { box-shadow: 0 4px 24px rgba(27,87,147,0.45), 0 0 0 0 rgba(62,197,203,0.5); }
          70%  { box-shadow: 0 4px 24px rgba(27,87,147,0.45), 0 0 0 12px rgba(62,197,203,0); }
          100% { box-shadow: 0 4px 24px rgba(27,87,147,0.45), 0 0 0 0 rgba(62,197,203,0); }
        }
      `}</style>

      {/* Panel */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 9996, background: "rgba(0,0,0,0.15)" }}
          />
          <div style={{
            position: "fixed",
            bottom: 88,
            right: 28,
            zIndex: 9997,
            width: 400,
            maxHeight: "75vh",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 16px 60px rgba(27,87,147,0.2)",
            border: "1px solid rgba(27,87,147,0.12)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            fontFamily: "'Rubik',sans-serif",
          }}>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, #1b5793, #2c90b2)", padding: "0.9rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <div>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>AI Content Assistant</div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
                    {screen === "brief" ? "Step 1 — Product Brief" : `Step 2 — Generate · ${brief.productName}`}
                  </div>
                </div>
              </div>
              {briefSaved && screen === "sections" && (
                <button type="button" onClick={() => setScreen("brief")}
                  style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: 11, color: "#fff", cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                  ← Brief
                </button>
              )}
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {screen === "brief" && (
                <ProductBriefForm brief={brief} setBrief={setBrief} onSave={handleSaveBrief} />
              )}
              {screen === "sections" && (
                <SectionPicker
                  brief={brief}
                  setBrief={setBrief}
                  availableSections={availableSections}
                  onGenerate={handleGenerate}
                  onEditBrief={() => setScreen("brief")}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );

  return createPortal(content, document.body);
}
