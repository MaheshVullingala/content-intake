"use client";
import { useState } from "react";

// Field-specific AI configuration
const FIELD_CONFIG = {
  page_title: {
    label: "Page Title",
    instruction: "Generate a compelling page title for a B2B tech product page.",
    rules: "Max 60 characters. Title case. No special characters at the end. Should be clear and descriptive.",
    example: "Xcelium Logic Simulator",
    maxLength: 60,
  },
  sub_title: {
    label: "Sub Title",
    instruction: "Generate a supporting subtitle that expands on the page title.",
    rules: "Max 160 characters. Should complement the title without repeating it. Professional tone.",
    example: "Industry-leading, highest performance simulation platform",
    maxLength: 160,
  },
  cta1_label: {
    label: "CTA 1 Label",
    instruction: "Generate a primary call-to-action button label.",
    rules: "Max 20 characters. Must start with an action verb. Examples: Explore, Download, Learn More, Get Started, Watch Demo.",
    example: "Learn More",
    maxLength: 20,
  },
  cta2_label: {
    label: "CTA 2 Label",
    instruction: "Generate a secondary call-to-action button label.",
    rules: "Max 20 characters. Must start with an action verb. Should be different from CTA 1.",
    example: "Watch Demo",
    maxLength: 20,
  },
  overview_label: {
    label: "Overview Label",
    instruction: "Generate a short section label tag.",
    rules: "Max 20 characters. 1-2 words only. All caps style. Examples: OVERVIEW, HIGHLIGHTS, ABOUT, FEATURES.",
    example: "OVERVIEW",
    maxLength: 20,
  },
  overview_impact: {
    label: "Impact Statement",
    instruction: "Generate a bold, compelling impact statement headline.",
    rules: "Max 100 characters. Should highlight the key benefit. Strong and benefit-focused. No buzzwords.",
    example: "Run More Validation Cycles on Bigger SoCs in Less Time",
    maxLength: 100,
  },
  overview_description: {
    label: "Description",
    instruction: "Generate a professional product/solution description paragraph.",
    rules: "Between 50-150 words. Professional B2B tone. No buzzwords or jargon. Focus on benefits and capabilities.",
    example: "A detailed paragraph describing the product capabilities and benefits.",
    maxLength: 1000,
  },
  overview_media_note: {
    label: "Media Note",
    instruction: "Generate a description for the Design QA team about what image or diagram is needed.",
    rules: "Max 200 characters. Should describe the visual style, content and mood needed. Clear and actionable.",
    example: "Use a technical diagram showing the simulation workflow with clean lines on white background.",
    maxLength: 200,
  },
};

export default function AIAssist({ fieldKey, currentValue, pageType, onAccept }) {
  const [open,         setOpen]         = useState(false);
  const [instructions, setInstructions] = useState("");
  const [loading,      setLoading]      = useState(false);
  const [suggestion,   setSuggestion]   = useState("");
  const [error,        setError]        = useState("");

  const config = FIELD_CONFIG[fieldKey];
  if (!config) return null;

  const generate = async () => {
    setLoading(true);
    setError("");
    setSuggestion("");

    const prompt = `You are a professional B2B tech content writer helping create web page content.

Field: ${config.label}
Page Type: ${pageType}
Task: ${config.instruction}
Rules: ${config.rules}
${currentValue ? `User's draft content: "${currentValue}"` : "No draft provided yet."}
${instructions ? `Additional instructions from user: "${instructions}"` : ""}

Generate ONLY the content for this field. Do not include explanations, labels, or quotes.
The content must follow the rules exactly.
Return only the generated text, nothing else.`;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error || "Failed to generate. Please try again.");
      } else {
        const text = data.text || "";
        // Enforce max length
        setSuggestion(config.maxLength ? text.slice(0, config.maxLength) : text);
      }
    } catch (e) {
      setError("Failed to generate. Please try again.");
    }
    setLoading(false);
  };

  const accept = () => {
    onAccept(suggestion);
    setOpen(false);
    setSuggestion("");
    setInstructions("");
  };

  const regenerate = () => {
    setSuggestion("");
    generate();
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* AI Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={`AI assist for ${config.label}`}
        style={{
          background: open ? "#181313" : "#F3F3F3",
          color: open ? "#fff" : "#646464",
          border: "1px solid #E0E0E0",
          borderRadius: 6,
          padding: "0.3rem 0.6rem",
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "'Rubik',sans-serif",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 4,
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}>
        ✨ AI
      </button>

      {/* AI Popup */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          width: 340,
          background: "#fff",
          border: "1px solid #E0E0E0",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          zIndex: 999,
          fontFamily: "'Rubik',sans-serif",
          overflow: "hidden",
        }}>
          {/* Popup header */}
          <div style={{ background: "#181313", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>✨</span>
              <span style={{ color: "#F3F3F3", fontSize: 13, fontWeight: 500 }}>AI Assist — {config.label}</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#646464", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>

          <div style={{ padding: "1rem" }}>
            {/* Current value preview */}
            {currentValue && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#B5B5B5", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Your current input</div>
                <div style={{ background: "#F9F9F9", border: "1px solid #F3F3F3", borderRadius: 7, padding: "0.5rem 0.75rem", fontSize: 12, color: "#3C3C3C", lineHeight: 1.5, wordBreak: "break-word" }}>
                  {currentValue}
                </div>
              </div>
            )}

            {/* Instructions input */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: "#646464", fontWeight: 500, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Additional instructions <span style={{ color: "#B5B5B5", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder={`e.g. "Make it more technical" or "Focus on performance"`}
                style={{ width: "100%", background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.55rem 0.75rem", fontSize: 12, color: "#181313", outline: "none", fontFamily: "'Rubik',sans-serif", resize: "none", minHeight: 60, boxSizing: "border-box", lineHeight: 1.5 }}
                onFocus={e => e.target.style.borderColor = "#3C3C3C"}
                onBlur={e  => e.target.style.borderColor = "#E0E0E0"}
              />
            </div>

            {/* Rules hint */}
            <div style={{ background: "#F9F9F9", border: "1px solid #F3F3F3", borderRadius: 7, padding: "0.5rem 0.75rem", fontSize: 11, color: "#B5B5B5", lineHeight: 1.5, marginBottom: 12 }}>
              📏 Rules: {config.rules}
            </div>

            {/* Generate button */}
            {!suggestion && (
              <button
                onClick={generate}
                disabled={loading}
                style={{ width: "100%", background: loading ? "#B5B5B5" : "#181313", color: "#fff", border: "none", borderRadius: 8, padding: "0.65rem", fontSize: 13, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? (
                  <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> Generating...</>
                ) : "✨ Generate"}
              </button>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: "#3a1010", border: "1px solid #c0392b44", borderRadius: 8, padding: "0.6rem 0.8rem", fontSize: 12, color: "#f87171", marginTop: 10 }}>
                {error}
              </div>
            )}

            {/* Suggestion result */}
            {suggestion && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, color: "#2a7a4b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontWeight: 500 }}>✓ AI Suggestion</div>
                <div style={{ background: "#ecfdf5", border: "1px solid #2a7a4b33", borderRadius: 8, padding: "0.75rem", fontSize: 13, color: "#181313", lineHeight: 1.6, marginBottom: 10, wordBreak: "break-word" }}>
                  {suggestion}
                  {config.maxLength && (
                    <div style={{ fontSize: 10, color: "#B5B5B5", marginTop: 6 }}>
                      {suggestion.length}/{config.maxLength} characters
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={accept} style={{ flex: 1, background: "#181313", color: "#fff", border: "none", borderRadius: 7, padding: "0.55rem", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                    ✅ Use this
                  </button>
                  <button onClick={regenerate} disabled={loading} style={{ flex: 1, background: "#F3F3F3", color: "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.55rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                    🔄 Regenerate
                  </button>
                  <button onClick={() => setSuggestion("")} style={{ background: "#F3F3F3", color: "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.55rem 0.7rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close popup */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
      )}
    </div>
  );
}
