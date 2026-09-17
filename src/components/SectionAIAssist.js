"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/security";
import {
  FaSearch, FaTag, FaClipboardList, FaStar, FaTools, FaPuzzlePiece,
  FaCommentDots, FaBullseye, FaLink, FaGraduationCap, FaTimes, FaMagic,
  FaSync, FaCheck, FaArrowLeft, FaArrowRight, FaExclamationTriangle,
} from "react-icons/fa";

// The Cadence brand-voice system prompt and per-section field schemas used
// to live here (and, nearly identically, in AIAssistant.js too). Both are
// now server-side only, in src/lib/aiPrompts.js -- this component sends
// only { sectionKey, mode, currentContent, direction } and the server
// builds the actual prompt. See that file's header comment for why: the
// old design let any authenticated user send an arbitrary systemPrompt
// straight through to Claude, since the route trusted whatever the client
// sent as prompt/systemPrompt verbatim.

// ── Section label map ─────────────────────────────────────────────────────────
const SECTION_LABELS = {
  seo_meta:         { label: "SEO Meta",         icon: FaSearch },
  banner:           { label: "Banner",            icon: FaTag },
  overview:         { label: "Overview",          icon: FaClipboardList },
  key_benefits:     { label: "Key Benefits",      icon: FaStar },
  features_apps:    { label: "Features",          icon: FaTools },
  applications:     { label: "Applications",      icon: FaPuzzlePiece },
  customer_stories: { label: "Customer Stories",  icon: FaCommentDots },
  promo_section:    { label: "Promo Section",     icon: FaBullseye },
  related_content:  { label: "Related Content",   icon: FaLink },
  training_support: { label: "Training & Support",icon: FaGraduationCap },
};

// ── Main SectionAIAssist component ────────────────────────────────────────────
// `pageContent`: optional. When passed (currently only by NewRequest.js for
// sectionKey="seo_meta", built from buildPageContentSummary()), it's a
// compiled dump of everything the stakeholder has written in every OTHER
// section.
// `usePageContent`: opt-in flag (only seo_meta sets it). When true, this
// instance skips the generic "improve what I wrote / start fresh"
// mode-picker entirely — opening AI Assist immediately checks pageContent
// and either generates straight away or shows a "no content yet" notice,
// per the actual point of this button on the SEO tab: there's nothing of
// its own to "improve", it should read the rest of the page instead.
export default function SectionAIAssist({ sectionKey, currentContent = "", pageContent = "", usePageContent = false, onAccept, buttonLabel }) {
  const [open,      setOpen]      = useState(false);
  const [mode,      setMode]      = useState(null);   // null | "improve" | "direction"
  const [direction, setDirection] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState("");
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => setMounted(true), []);

  const hasContent = currentContent && currentContent.trim().length > 10;
  const hasPageContent = pageContent && pageContent.trim().length > 20;
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

    try {
      const token = await getAccessToken(supabase);
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sectionKey, mode: selectedMode, currentContent, direction, pageContent }),
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
            <span style={{ fontSize: 16, display: "flex" }}><config.icon /></span>
            <div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>AI Assist — {config.label}</div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>Cadence brand voice</div>
            </div>
          </div>
          <button type="button" onClick={close}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4, display: "flex" }}><FaTimes /></button>
        </div>

        <div style={{ padding: "1.1rem", overflowY: "auto", flex: 1 }}>

          {/* ── Step 1: Mode selection ── */}
          {/* usePageContent sections (SEO Meta Data): the trigger button's
              onClick already fired generate("from_page") when hasPageContent
              was true, so mode is already set and this whole block is
              skipped in that case. This block only ever renders here for
              usePageContent when there's genuinely nothing to read yet. */}
          {!mode && !result && usePageContent && (
            <>
              <div style={{ background: "#fffbeb", border: "1px solid rgba(217,119,6,0.35)", borderRadius: 8, padding: "0.85rem 1rem", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 15, color: "#d97706", display: "flex", marginTop: 1 }}><FaExclamationTriangle /></span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>No content added yet</div>
                  <div style={{ fontSize: 12, color: "#92400e", marginTop: 3, lineHeight: 1.5 }}>
                    Fill in Banner, Overview, or another section first — AI Assist reads that content to generate SEO meta data automatically.
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setMode("direction")}
                style={{ width: "100%", background: "#f8fafc", color: "#1b5793", border: "1px solid rgba(27,87,147,0.2)", borderRadius: 9, padding: "0.6rem 1rem", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                Or write SEO content myself
              </button>
            </>
          )}

          {!mode && !result && !usePageContent && (
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
                      <span style={{ fontSize: 16, display: "flex" }}><FaMagic /></span>
                      <div>
                        <div style={{ fontWeight: 600 }}>Improve what I wrote</div>
                        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 1 }}>AI rewrites it in Cadence brand voice</div>
                      </div>
                    </button>

                    <button type="button" onClick={() => setMode("direction")}
                      style={{ background: "#f0f6ff", color: "#1b5793", border: "1px solid rgba(27,87,147,0.2)", borderRadius: 9, padding: "0.7rem 1rem", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}>
                      <span style={{ fontSize: 16, display: "flex" }}><FaSync /></span>
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
                    style={{ width: "100%", marginTop: 10, background: direction.trim() ? "linear-gradient(135deg, #1b5793, #3ec5cb)" : "#e2e8f0", color: direction.trim() ? "#fff" : "#94a3b8", border: "none", borderRadius: 8, padding: "0.7rem", fontSize: 13, fontWeight: 600, cursor: direction.trim() ? "pointer" : "not-allowed", fontFamily: "'Rubik',sans-serif", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <FaMagic size={12} /> Generate content <FaArrowRight size={11} />
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
                  style={{ flex: 1, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.65rem", fontSize: 13, cursor: "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <FaArrowLeft size={11} /> Back
                </button>
                <button type="button"
                  onClick={() => generate("direction")}
                  disabled={!direction.trim()}
                  style={{ flex: 2, background: direction.trim() ? "linear-gradient(135deg, #1b5793, #3ec5cb)" : "#e2e8f0", color: direction.trim() ? "#fff" : "#94a3b8", border: "none", borderRadius: 8, padding: "0.65rem", fontSize: 13, fontWeight: 600, cursor: direction.trim() ? "pointer" : "not-allowed", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <FaMagic size={12} /> Generate <FaArrowRight size={11} />
                </button>
              </div>
            </>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ fontSize: 28, marginBottom: 12, animation: "spin 1.5s linear infinite", display: "inline-flex" }}><FaMagic /></div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>
                {mode === "from_page" ? "Reading your page content..." : "Writing in Cadence voice..."}
              </div>
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
                <div style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}><FaCheck size={10} /> AI Generated Content</div>
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
                  style={{ flex: 2, background: "#1b5793", color: "#fff", border: "none", borderRadius: 8, padding: "0.65rem", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <FaCheck size={12} /> Apply to section
                </button>
                <button type="button" onClick={() => { setResult(null); (mode === "improve" || mode === "from_page") ? generate(mode) : setMode(mode); }}
                  style={{ flex: 1, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.65rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <FaSync size={11} /> Redo
                </button>
                <button type="button" onClick={close}
                  style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.65rem 0.75rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center" }}>
                  <FaTimes size={12} />
                </button>
              </div>

              {/* usePageContent auto-generated straight from the page, with
                  no manual-editing detour along the way — this is the only
                  point in that flow where one is offered, in case the
                  stakeholder wants to override the auto-generated result
                  with their own wording instead of applying/redoing it. */}
              {usePageContent && (
                <button type="button" onClick={() => { setResult(null); setMode("direction"); }}
                  style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: "#94a3b8", fontSize: 11, textDecoration: "underline", cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                  Write SEO content myself instead
                </button>
              )}
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
        onClick={() => {
          reset();
          setOpen(true);
          // usePageContent sections (SEO Meta Data) skip the mode-picker —
          // check pageContent right away and act on it. hasPageContent is
          // recomputed from the latest pageContent prop on every render, so
          // this always reflects whatever's currently filled in elsewhere
          // on the page, not a stale snapshot from when the button first
          // mounted.
          if (usePageContent && hasPageContent) {
            setMode("from_page");
            generate("from_page");
          }
        }}
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
        <span style={{ display: "flex" }}><FaMagic /></span>
        {buttonLabel || "AI Assist"}
      </button>

      {/* Portal */}
      {mounted && createPortal(popup, document.body)}
    </>
  );
}
