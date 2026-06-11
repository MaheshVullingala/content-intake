"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ── Cadence system prompt ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior B2B content writer for Cadence Design Systems — a world-leading EDA and Intelligent System Design company whose computational software powers nearly every semiconductor chip designed worldwide. You write exclusively for cadence.com product pages.

CADENCE BRAND IDENTITY:
- Cadence is a market leader in AI, digital twins, and computational software for silicon-to-systems design
- Tagline: "Intelligent System Design™" — always imply intelligence, precision, and systems-level thinking
- Markets served: hyperscale computing, mobile communications, automotive, aerospace, industrial, life sciences, robotics
- Cadence customers are "the world's most innovative companies" — write to match their ambition

TONE OF VOICE (learned from cadence.com):
- Authoritative, not arrogant — state facts and outcomes, not opinions
- Precision-first — engineers trust specificity ("5X faster regression throughput", "ISO 26262 certification") over vague claims
- Benefit-led — every sentence answers "what does this do for my design?"
- Active voice, strong verbs: "accelerates", "delivers", "enables", "achieves", "powers", "drives"
- Outcome-oriented: tie features directly to engineering outcomes (tapeout, time-to-market, verification closure, coverage)
- Professional warmth — confident peer-to-peer, never salesy or breathless

REAL CADENCE HEADLINE PATTERNS (match this style):
- "High-speed logic simulation for functional verification of complex IP, SoC, and system-level designs"
- "Empowering high-performance product design with a complete, intuitive system innovation platform"
- "Accelerate verification bring-up while expanding beyond the resource capacity of a single simulation"
- "Ensure performance, security, and streamlined design from chip to package to board to case"
- "Achieve verification closure and meet your time-to-market goals"

BANNED WORDS (never use these):
"cutting-edge", "revolutionary", "game-changing", "robust", "seamless", "leverage", "utilize", "synergy",
"best-in-breed", "world-class", "unlock potential", "harness the power", "take your design to the next level",
"innovative solution", "comprehensive solution" (use specific descriptors instead)

PREFERRED WORDS & PHRASES:
"verification closure", "time-to-market", "design productivity", "tapeout confidence", "signoff accuracy",
"computational software", "Intelligent System Design", "silicon-to-systems", "full-chip", "SoC-level",
"achieve", "accelerate", "enable", "deliver", "advance", "drive", "power"

AUDIENCE: SoC architects, chip designers, verification engineers, PCB designers, hardware engineering managers at tier-1 semiconductor, hyperscale, automotive and aerospace companies. They are experts — write as a knowledgeable peer, not a salesperson.

OUTPUT RULES:
- Return ONLY valid JSON — no markdown, no backticks, no preamble, no explanation
- Follow character limits strictly — count carefully
- Never include field names or labels in the output values
- Write as if already live on cadence.com — polished, publication-ready
- For headlines: use sentence case unless it is a product name (product names use Title Case)
- For descriptions: 2-3 focused paragraphs, no bullet points in prose fields`;

// ── Section configs ───────────────────────────────────────────────────────────
const SECTION_CONFIGS = {
  seo_meta: {
    label: "SEO Meta Data",
    icon: "🔍",
    desc: "Page location, meta title, description and keywords",
    fields: ["seo_page_location","seo_meta_title","seo_meta_description","seo_meta_keywords"],
    prompt: (brief) => `Generate SEO meta data for this Cadence product page.

PRODUCT BRIEF:
${formatBrief(brief)}

Return ONLY this JSON (no extra text):
{
  "seo_meta_title": "max 60 chars - keyword-rich title including product name",
  "seo_meta_description": "max 155 chars - compelling description with a clear value proposition",
  "seo_meta_keywords": "8-12 comma-separated EDA/technical keywords relevant to this product"
}`,
  },
  banner: {
    label: "Banner",
    icon: "🏷",
    desc: "Page title, subtitle and CTA buttons",
    fields: ["page_title","sub_title","cta1_label","cta2_label"],
    prompt: (brief) => `Generate banner content for this Cadence product page.

PRODUCT BRIEF:
${formatBrief(brief)}

Return ONLY this JSON (no extra text):
{
  "page_title": "max 70 chars - product name + powerful descriptor, Title Case",
  "sub_title": "max 120 chars - expands on title with key value proposition",
  "cta1_label": "max 30 chars - primary action verb e.g. Request Demo, Download Datasheet",
  "cta2_label": "max 30 chars - secondary action e.g. Watch Video, Learn More"
}`,
  },
  overview: {
    label: "Overview",
    icon: "📋",
    desc: "Section label, impact statement and description",
    fields: ["overview_label","overview_impact","overview_description"],
    prompt: (brief) => `Generate overview section content for this Cadence product page.

PRODUCT BRIEF:
${formatBrief(brief)}

Return ONLY this JSON (no extra text):
{
  "overview_label": "max 30 chars - short section tag e.g. OVERVIEW, HIGHLIGHTS, ABOUT",
  "overview_impact": "max 100 chars - bold headline highlighting the #1 key benefit",
  "overview_description": "max 600 chars - 2-3 paragraph professional description of the product capabilities and benefits. No buzzwords."
}`,
  },
  key_benefits: {
    label: "Key Benefits",
    icon: "⭐",
    desc: "Section header and 3-4 benefit cards",
    fields: ["kb_label","kb_impact","kb_description","kb_cards"],
    prompt: (brief) => `Generate key benefits section content for this Cadence product page.

PRODUCT BRIEF:
${formatBrief(brief)}

Return ONLY this JSON (no extra text):
{
  "kb_label": "max 30 chars - section label e.g. KEY BENEFITS, WHY CADENCE",
  "kb_impact": "max 100 chars - section headline",
  "kb_description": "max 300 chars - supporting paragraph",
  "kb_cards": [
    { "title": "max 50 chars - benefit title", "description": "max 150 chars - what this benefit means for the engineer" },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ]
}`,
  },
  features_apps: {
    label: "Features / Apps",
    icon: "🔧",
    desc: "Section header and feature highlights",
    fields: ["fa_label","fa_impact","fa_description"],
    prompt: (brief) => `Generate features section header content for this Cadence product page.

PRODUCT BRIEF:
${formatBrief(brief)}

Return ONLY this JSON (no extra text):
{
  "fa_label": "max 30 chars - section label e.g. FEATURES, CAPABILITIES, APPLICATIONS",
  "fa_impact": "max 100 chars - compelling section headline",
  "fa_description": "max 300 chars - brief intro to the features listed below"
}`,
  },
  customer_stories: {
    label: "Customer Stories",
    icon: "💬",
    desc: "Section header and story cards",
    fields: ["cs_label","cs_impact"],
    prompt: (brief) => `Generate customer stories section header for this Cadence product page.

PRODUCT BRIEF:
${formatBrief(brief)}

Return ONLY this JSON (no extra text):
{
  "cs_label": "max 30 chars - section label e.g. CUSTOMER SUCCESS, CASE STUDIES",
  "cs_impact": "max 100 chars - headline showing customer outcomes e.g. How leading teams achieve breakthrough results"
}`,
  },
  promo_section: {
    label: "Promo Section",
    icon: "🎯",
    desc: "Promo label, title, description and CTA",
    fields: ["promo_label","promo_title","promo_description","promo_btn_label"],
    prompt: (brief) => `Generate promo section content for this Cadence product page.

PRODUCT BRIEF:
${formatBrief(brief)}

Return ONLY this JSON (no extra text):
{
  "promo_label": "max 30 chars - short label e.g. GET STARTED, FREE TRIAL, WEBINAR",
  "promo_title": "max 120 chars - compelling offer headline",
  "promo_description": "max 300 chars - brief description of what the user gets and why they should act",
  "promo_btn_label": "max 30 chars - CTA button text e.g. Register Now, Download Free"
}`,
  },
  related_content: {
    label: "Related Content",
    icon: "🔗",
    desc: "Section label and impact statement",
    fields: ["rc_label","rc_impact"],
    prompt: (brief) => `Generate related content section header for this Cadence product page.

PRODUCT BRIEF:
${formatBrief(brief)}

Return ONLY this JSON (no extra text):
{
  "rc_label": "max 30 chars - section label e.g. RELATED CONTENT, EXPLORE MORE, RESOURCES",
  "rc_impact": "max 100 chars - headline inviting further exploration"
}`,
  },
  training_support: {
    label: "Training & Support",
    icon: "🎓",
    desc: "Section label and impact statement",
    fields: ["ts_label","ts_impact"],
    prompt: (brief) => `Generate training and support section header for this Cadence product page.

PRODUCT BRIEF:
${formatBrief(brief)}

Return ONLY this JSON (no extra text):
{
  "ts_label": "max 40 chars - section label e.g. TRAINING & SUPPORT, LEARN & GROW",
  "ts_impact": "max 80 chars - headline about Cadence's support ecosystem"
}`,
  },
};

function formatBrief(brief) {
  return `Product Name: ${brief.productName}
Category: ${brief.category}
What it does: ${brief.summary}
Key Features / Capabilities:
${brief.features}
Target Audience: ${brief.audience}
Unique Selling Point / Key Differentiator: ${brief.usp}${brief.pageGoal ? `
Page Goal: ${brief.pageGoal}` : ""}${brief.keyMessage ? `
Key Message: ${brief.keyMessage}` : ""}

IMPORTANT: Generate content that sounds like it belongs on cadence.com — authoritative, technical, benefit-led. Use the product name exactly as given. Reference specific engineering outcomes where possible.`;
}

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
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: config.prompt(brief),
          systemPrompt: SYSTEM_PROMPT,
        }),
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
const EMPTY_BRIEF = { productName: "", category: "", summary: "", features: "", audience: "", usp: "", pageGoal: "", keyMessage: "" };

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
