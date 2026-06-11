"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

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

// ── Per-section prompt builders ───────────────────────────────────────────────
const buildPrompt = (sectionKey, mode, currentContent, direction) => {
  const base = {
    seo_meta: {
      fields: `{
  "seo_meta_title": "max 60 chars - keyword-rich, includes product name",
  "seo_meta_description": "max 155 chars - compelling with clear value proposition",
  "seo_meta_keywords": "8-12 comma-separated EDA/technical keywords"
}`,
      context: "SEO meta data for a Cadence product page",
    },
    banner: {
      fields: `{
  "page_title": "max 70 chars - Product Name + short powerful descriptor, Title Case, e.g. 'Xcelium Logic Simulator | Accelerate Verification Closure'",
  "sub_title": "max 120 chars - one sentence expanding on the title with the primary engineering benefit, e.g. 'High-speed simulation for functional verification of complex IP, SoC, and system-level designs'",
  "cta1_label": "max 30 chars - primary CTA, action verb e.g. 'Request Demo', 'Download Datasheet', 'Start Free Trial'",
  "cta2_label": "max 30 chars - secondary CTA e.g. 'Watch Overview', 'View Technical Brief', 'Explore Features'"
}`,
      context: "banner section for a Cadence product page",
    },
    overview: {
      fields: `{
  "overview_label": "max 30 chars - uppercase section tag e.g. 'OVERVIEW', 'PRODUCT HIGHLIGHTS', 'ABOUT'",
  "overview_impact": "max 100 chars - bold headline stating the primary engineering outcome, e.g. 'Deliver verification closure faster across complex SoC and full-chip designs'",
  "overview_description": "max 600 chars - 2-3 paragraphs. Para 1: what the product does and who it is for. Para 2: key technical capabilities with specific outcomes. Para 3: how it fits into the broader Cadence Intelligent System Design ecosystem or flow. No bullet points. No buzzwords."
}`,
      context: "overview section for a Cadence product page",
    },
    key_benefits: {
      fields: `{
  "kb_label": "max 30 chars - section label e.g. KEY BENEFITS",
  "kb_impact": "max 100 chars - section headline",
  "kb_description": "max 300 chars - supporting paragraph",
  "kb_cards": [
    { "title": "max 50 chars", "description": "max 150 chars - benefit for the engineer" },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ]
}`,
      context: "key benefits section for a Cadence product page",
    },
    features_apps: {
      fields: `{
  "fa_label": "max 30 chars - e.g. FEATURES, CAPABILITIES",
  "fa_impact": "max 100 chars - compelling section headline",
  "fa_description": "max 300 chars - brief intro to features"
}`,
      context: "features section header for a Cadence product page",
    },
    customer_stories: {
      fields: `{
  "cs_label": "max 30 chars - e.g. CUSTOMER SUCCESS",
  "cs_impact": "max 100 chars - headline showing customer outcomes"
}`,
      context: "customer stories section header for a Cadence product page",
    },
    promo_section: {
      fields: `{
  "promo_label": "max 30 chars - e.g. GET STARTED",
  "promo_title": "max 120 chars - compelling offer headline",
  "promo_description": "max 300 chars - what the user gets and why they should act",
  "promo_btn_label": "max 30 chars - CTA button text"
}`,
      context: "promo section for a Cadence product page",
    },
    related_content: {
      fields: `{
  "rc_label": "max 30 chars - e.g. RELATED CONTENT",
  "rc_impact": "max 100 chars - headline inviting exploration"
}`,
      context: "related content section header for a Cadence product page",
    },
    training_support: {
      fields: `{
  "ts_label": "max 40 chars - e.g. TRAINING & SUPPORT",
  "ts_impact": "max 80 chars - headline about Cadence support"
}`,
      context: "training and support section header for a Cadence product page",
    },
  };

  const config = base[sectionKey];
  if (!config) return null;

  if (mode === "improve") {
    return `A stakeholder has written this draft content for the ${config.context}:

"${currentContent}"

Your task: rewrite it to match cadence.com standards. Keep their intent and key facts but:
- Elevate to Cadence brand voice (authoritative, precise, benefit-led)
- Replace vague language with specific engineering outcomes
- Remove any buzzwords or marketing fluff
- Ensure it reads like it belongs on a live cadence.com product page

Follow all character limits exactly. Return ONLY this JSON (no extra text):
${config.fields}`;
  }

  if (mode === "direction") {
    return `Generate professional cadence.com-standard content for the ${config.context}.

The stakeholder wants to convey:
"${direction}"

${currentContent ? `They also have this existing draft for context (do not copy it, use it as reference only):\n"${currentContent}"\n` : ""}
Write in Cadence brand voice: authoritative, technically precise, outcome-focused. Sound like a cadence.com product page.

Follow all character limits exactly. Return ONLY this JSON (no extra text):
${config.fields}`;
  }

  return null;
};

// ── Section label map ─────────────────────────────────────────────────────────
const SECTION_LABELS = {
  seo_meta:         { label: "SEO Meta",         icon: "🔍" },
  banner:           { label: "Banner",            icon: "🏷" },
  overview:         { label: "Overview",          icon: "📋" },
  key_benefits:     { label: "Key Benefits",      icon: "⭐" },
  features_apps:    { label: "Features / Apps",   icon: "🔧" },
  customer_stories: { label: "Customer Stories",  icon: "💬" },
  promo_section:    { label: "Promo Section",     icon: "🎯" },
  related_content:  { label: "Related Content",   icon: "🔗" },
  training_support: { label: "Training & Support",icon: "🎓" },
};

// ── Main SectionAIAssist component ────────────────────────────────────────────
export default function SectionAIAssist({ sectionKey, currentContent = "", onAccept, buttonLabel }) {
  const [open,      setOpen]      = useState(false);
  const [mode,      setMode]      = useState(null);   // null | "improve" | "direction"
  const [direction, setDirection] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState("");
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => setMounted(true), []);

  const hasContent = currentContent && currentContent.trim().length > 10;
  const config = SECTION_LABELS[sectionKey];
  if (!config) return null;

  const reset = () => {
    setMode(null);
    setDirection("");
    setResult(null);
    setError("");
    setLoading(false);
  };

  const close = () => { setOpen(false); reset(); };

  const generate = async (selectedMode) => {
    setLoading(true);
    setError("");
    setResult(null);

    const prompt = buildPrompt(sectionKey, selectedMode, currentContent, direction);
    if (!prompt) { setError("Section not supported."); setLoading(false); return; }

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt: SYSTEM_PROMPT }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const text = data.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch (e) {
      setError("Failed to generate. Please try again.");
    }
    setLoading(false);
  };

  const accept = () => {
    if (result) onAccept(result);
    close();
  };

  // ── Popup content ─────────────────────────────────────────────────────────
  const popup = open && (
    <>
      {/* Backdrop */}
      <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(0,0,0,0.45)" }} />

      {/* Panel */}
      <div style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9991,
        width: "min(560px, 92vw)",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 24px 80px rgba(27,87,147,0.25)",
        border: "1px solid rgba(27,87,147,0.15)",
        overflow: "hidden",
        fontFamily: "'Rubik', sans-serif",
      }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1b5793, #2c90b2)", padding: "0.85rem 1.1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{config.icon}</span>
            <div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>AI Assist — {config.label}</div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>Cadence brand voice</div>
            </div>
          </div>
          <button type="button" onClick={close}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: "1.1rem", overflowY: "auto", flex: 1 }}>

          {/* ── Step 1: Mode selection ── */}
          {!mode && !result && (
            <>
              {hasContent ? (
                <>
                  {/* Has content — show two options */}
                  <p style={{ fontSize: 13, color: "#475569", marginBottom: 14, lineHeight: 1.5 }}>
                    You have content written. What would you like to do?
                  </p>

                  {/* Current content preview */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.6rem 0.8rem", fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 14, maxHeight: 80, overflowY: "auto" }}>
                    {currentContent.slice(0, 200)}{currentContent.length > 200 ? "..." : ""}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button type="button" onClick={() => { setMode("improve"); generate("improve"); }}
                      style={{ background: "#1b5793", color: "#fff", border: "none", borderRadius: 9, padding: "0.7rem 1rem", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}>
                      <span style={{ fontSize: 16 }}>✨</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>Improve what I wrote</div>
                        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 1 }}>AI rewrites it in Cadence brand voice</div>
                      </div>
                    </button>

                    <button type="button" onClick={() => setMode("direction")}
                      style={{ background: "#f0f6ff", color: "#1b5793", border: "1px solid rgba(27,87,147,0.2)", borderRadius: 9, padding: "0.7rem 1rem", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}>
                      <span style={{ fontSize: 16 }}>🔄</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>Start fresh with new direction</div>
                        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 1 }}>Tell AI what you want to say instead</div>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* No content — ask for direction */}
                  <p style={{ fontSize: 13, color: "#475569", marginBottom: 12, lineHeight: 1.5 }}>
                    What do you want this section to say?
                  </p>
                  <textarea
                    value={direction}
                    onChange={e => setDirection(e.target.value)}
                    placeholder={`e.g. "Focus on simulation speed and mention 3x performance improvement over competitors"`}
                    autoFocus
                    style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.65rem 0.8rem", fontSize: 13, color: "#0f172a", outline: "none", fontFamily: "'Rubik',sans-serif", resize: "none", minHeight: 90, boxSizing: "border-box", lineHeight: 1.5 }}
                    onFocus={e => e.target.style.borderColor = "#1b5793"}
                    onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
                  />
                  <button type="button"
                    onClick={() => { setMode("direction"); generate("direction"); }}
                    disabled={!direction.trim()}
                    style={{ width: "100%", marginTop: 10, background: direction.trim() ? "linear-gradient(135deg, #1b5793, #3ec5cb)" : "#e2e8f0", color: direction.trim() ? "#fff" : "#94a3b8", border: "none", borderRadius: 8, padding: "0.7rem", fontSize: 13, fontWeight: 600, cursor: direction.trim() ? "pointer" : "not-allowed", fontFamily: "'Rubik',sans-serif", transition: "all 0.15s" }}>
                    ✨ Generate content →
                  </button>
                </>
              )}
            </>
          )}

          {/* ── Direction input (from "start fresh") ── */}
          {mode === "direction" && !loading && !result && (
            <>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: 12, lineHeight: 1.5 }}>
                What do you want this section to say?
              </p>
              <textarea
                value={direction}
                onChange={e => setDirection(e.target.value)}
                placeholder={`e.g. "Focus on simulation speed and mention 3x performance improvement"`}
                autoFocus
                style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.65rem 0.8rem", fontSize: 13, color: "#0f172a", outline: "none", fontFamily: "'Rubik',sans-serif", resize: "none", minHeight: 90, boxSizing: "border-box", lineHeight: 1.5 }}
                onFocus={e => e.target.style.borderColor = "#1b5793"}
                onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={reset}
                  style={{ flex: 1, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.65rem", fontSize: 13, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                  ← Back
                </button>
                <button type="button"
                  onClick={() => generate("direction")}
                  disabled={!direction.trim()}
                  style={{ flex: 2, background: direction.trim() ? "linear-gradient(135deg, #1b5793, #3ec5cb)" : "#e2e8f0", color: direction.trim() ? "#fff" : "#94a3b8", border: "none", borderRadius: 8, padding: "0.65rem", fontSize: 13, fontWeight: 600, cursor: direction.trim() ? "pointer" : "not-allowed", fontFamily: "'Rubik',sans-serif" }}>
                  ✨ Generate →
                </button>
              </div>
            </>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ fontSize: 28, marginBottom: 12, animation: "spin 1.5s linear infinite", display: "inline-block" }}>✨</div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>Writing in Cadence voice...</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>This takes a few seconds</div>
              <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
            </div>
          )}

          {/* ── Error ── */}
          {error && !loading && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.7rem 0.9rem", fontSize: 13, color: "#dc2626", marginBottom: 10 }}>
              {error}
              <button type="button" onClick={reset} style={{ display: "block", marginTop: 8, background: "none", border: "none", color: "#dc2626", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", textDecoration: "underline", padding: 0 }}>Try again</button>
            </div>
          )}

          {/* ── Result ── */}
          {result && !loading && (
            <>
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "0.75rem 0.9rem", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>✓ AI Generated Content</div>
                {Object.entries(result).map(([key, val]) => (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                      {key.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: 12, color: "#0f172a", lineHeight: 1.5, wordBreak: "break-word" }}>
                      {typeof val === "object" ? JSON.stringify(val) : String(val)}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={accept}
                  style={{ flex: 2, background: "#1b5793", color: "#fff", border: "none", borderRadius: 8, padding: "0.65rem", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                  ✅ Apply to section
                </button>
                <button type="button" onClick={() => { setResult(null); mode === "improve" ? generate("improve") : setMode(mode); }}
                  style={{ flex: 1, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.65rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                  🔄 Redo
                </button>
                <button type="button" onClick={close}
                  style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.65rem 0.75rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                  ✕
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Trigger button — sits inline next to section heading */}
      <button
        type="button"
        onClick={() => { reset(); setOpen(true); }}
        style={{
          background: "linear-gradient(135deg, #1b5793, #3ec5cb)",
          color: "#fff",
          border: "none",
          borderRadius: 20,
          padding: "0.35rem 0.85rem",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'Rubik',sans-serif",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          boxShadow: "0 2px 8px rgba(27,87,147,0.25)",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}>
        <span>✨</span>
        {buttonLabel || "AI Assist"}
      </button>

      {/* Portal */}
      {mounted && createPortal(popup, document.body)}
    </>
  );
}
