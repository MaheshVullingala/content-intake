// Server-only. Owns the Cadence brand-voice system prompt and every
// per-section output schema/prompt template used by AI Assist. This file
// must only ever be imported by src/app/api/ai/route.js (a server route
// handler) — never by a "use client" component.
//
// Why this exists as its own module: /api/ai previously accepted a raw
// `prompt` and `systemPrompt` straight from the client request body and
// passed both to Claude unmodified. Any authenticated user (any role,
// including a brand-new self-serve stakeholder) could send an arbitrary
// system prompt and have the app's own Anthropic API key/budget run
// whatever instructions they wanted — the route was an open LLM proxy
// gated only by login + a soft rate limit. Fix: the client now only ever
// sends { sectionKey, mode, currentContent, direction, brief } — plain
// structured data, never prompt text — and the server builds the actual
// prompt from the fixed templates below. See CONTEXT.md "AI Assist:
// server owns the prompt" for the full writeup.
//
// This also fixes a duplication bug: the system prompt and per-section
// field schemas used to live twice — once in SectionAIAssist.js (used for
// "improve"/"direction" modes) and once in AIAssistant.js (used for
// "brief" mode) — close enough to identical that nobody would notice a
// future edit landing in only one copy. There is now exactly one copy of
// each, reused by all three modes.

export const SYSTEM_PROMPT = `You are a senior B2B content writer for Cadence Design Systems — a world-leading EDA and Intelligent System Design company whose computational software powers nearly every semiconductor chip designed worldwide. You write exclusively for cadence.com product pages.

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

FACTUAL ACCURACY — CRITICAL:
- Never invent a specific number, statistic, benchmark, or certification (e.g. "3x faster", "40% reduction", "ISO 26262 certified") unless it was explicitly provided to you as a verified fact, already present in a stakeholder's own draft text, or given in a "direction" instruction.
- If no specific metric was provided, describe the capability qualitatively (e.g. "delivers faster verification throughput") instead of inventing a number to sound more precise.
- It is better to be accurate and general than specific and wrong — a fabricated number in published product content is a real business risk, not just a style issue.
- This rule overrides the "precision-first" tone guidance above when the two conflict: precision only applies to language, never to facts you were not given.

AUDIENCE: SoC architects, chip designers, verification engineers, PCB designers, hardware engineering managers at tier-1 semiconductor, hyperscale, automotive and aerospace companies. They are experts — write as a knowledgeable peer, not a salesperson.

OUTPUT RULES:
- Return ONLY valid JSON — no markdown, no backticks, no preamble, no explanation
- Follow character limits strictly — count carefully
- Never include field names or labels in the output values
- Write as if already live on cadence.com — polished, publication-ready
- For headlines: use sentence case unless it is a product name (product names use Title Case)
- For descriptions: 2-3 focused paragraphs, no bullet points in prose fields`;

// One schema per section, reused by all three modes below. Sections not
// listed here (resources, related_products) are not yet AI-generatable —
// same as before this consolidation, not a new gap introduced by it.
const SECTION_SCHEMAS = {
  seo_meta: {
    context: "SEO meta data for a Cadence product page",
    fields: `{
  "seo_meta_title": "max 60 chars - keyword-rich, includes product name",
  "seo_meta_description": "max 155 chars - compelling with clear value proposition",
  "seo_meta_keywords": "8-12 comma-separated EDA/technical keywords relevant to this product"
}`,
  },
  banner: {
    context: "banner section for a Cadence product page",
    fields: `{
  "page_title": "max 70 chars - Product Name + short powerful descriptor, Title Case, e.g. 'Xcelium Logic Simulator | Accelerate Verification Closure'",
  "sub_title": "max 120 chars - one sentence expanding on the title with the primary engineering benefit, e.g. 'High-speed simulation for functional verification of complex IP, SoC, and system-level designs'",
  "cta1_label": "max 30 chars - primary CTA, action verb e.g. 'Request Demo', 'Download Datasheet', 'Start Free Trial'",
  "cta2_label": "max 30 chars - secondary CTA e.g. 'Watch Overview', 'View Technical Brief', 'Explore Features'"
}`,
  },
  overview: {
    context: "overview section for a Cadence product page",
    fields: `{
  "overview_label": "max 30 chars - uppercase section tag e.g. 'OVERVIEW', 'PRODUCT HIGHLIGHTS', 'ABOUT'",
  "overview_impact": "max 100 chars - bold headline stating the primary engineering outcome, e.g. 'Deliver verification closure faster across complex SoC and full-chip designs'",
  "overview_description": "max 600 chars - 2-3 paragraphs. Para 1: what the product does and who it is for. Para 2: key technical capabilities with specific outcomes. Para 3: how it fits into the broader Cadence Intelligent System Design ecosystem or flow. No bullet points. No buzzwords."
}`,
  },
  key_benefits: {
    context: "key benefits section for a Cadence product page",
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
  },
  features_apps: {
    // This section supports 4 layouts (list, horizontal tabs, vertical
    // tabs, table — see VIEW_TYPES in FeaturesApps.js), but only "list"
    // is something AI output can ever be complete for: tabs require a
    // Design-QA-supplied image + required alt text per tab, and table
    // needs a bespoke column structure (spec-sheet comparison) the model
    // has no basis to invent. Asking the model to fill in tabs/table would
    // just produce content that looks generated but is missing required
    // fields. So AI Assist always targets "list" here; a stakeholder who
    // wants tabs or a table switches the view type manually and either
    // writes those items themselves or asks AI Assist per-field there.
    context: "features section header and content for a Cadence product page",
    fields: `{
  "fa_label": "max 30 chars - e.g. FEATURES, CAPABILITIES",
  "fa_impact": "max 100 chars - compelling section headline",
  "fa_description": "max 300 chars - brief intro to features",
  "fa_view_type": "always the exact string \\"list\\"",
  "fa_items": [
    { "text": "max 200 chars - one specific feature or capability, concrete and outcome-focused, no leading bullet/dash" },
    { "text": "..." },
    { "text": "..." },
    { "text": "..." }
  ]
}`,
  },
  customer_stories: {
    context: "customer stories section header for a Cadence product page",
    fields: `{
  "cs_label": "max 30 chars - e.g. CUSTOMER SUCCESS",
  "cs_impact": "max 100 chars - headline showing customer outcomes"
}`,
  },
  promo_section: {
    context: "promo section for a Cadence product page",
    fields: `{
  "promo_label": "max 30 chars - e.g. GET STARTED",
  "promo_title": "max 120 chars - compelling offer headline",
  "promo_description": "max 300 chars - what the user gets and why they should act",
  "promo_btn_label": "max 30 chars - CTA button text"
}`,
  },
  related_content: {
    context: "related content section header for a Cadence product page",
    fields: `{
  "rc_label": "max 30 chars - e.g. RELATED CONTENT",
  "rc_impact": "max 100 chars - headline inviting exploration"
}`,
  },
  training_support: {
    context: "training and support section header for a Cadence product page",
    fields: `{
  "ts_label": "max 40 chars - e.g. TRAINING & SUPPORT",
  "ts_impact": "max 80 chars - headline about Cadence support"
}`,
  },
};

export const SUPPORTED_SECTIONS = Object.keys(SECTION_SCHEMAS);

// brief is the structured "product brief" AIAssistant.js collects once
// per session (mode: "brief"). proofPoints is deliberately kept separate
// from usp — usp is allowed to be a general marketing claim, proofPoints
// must be a real, verifiable number/certification the stakeholder is
// vouching for. When it's empty, the model is told explicitly not to
// invent one rather than silently staying quiet about the omission.
function formatBrief(brief) {
  const b = brief || {};
  const proof = (b.proofPoints || "").trim()
    ? `Verified Proof Points (real numbers/certifications — safe to cite exactly as given, do not alter or exaggerate): ${b.proofPoints}`
    : "No verified numeric proof points were provided — do not invent any statistics, percentages, benchmark numbers, or certifications for this product.";

  return `Product Name: ${b.productName || ""}
Category: ${b.category || ""}
What it does: ${b.summary || ""}
Key Features / Capabilities:
${b.features || ""}
Target Audience: ${b.audience || ""}
Unique Selling Point / Key Differentiator: ${b.usp || ""}
${proof}${b.pageGoal ? `\nPage Goal: ${b.pageGoal}` : ""}${b.keyMessage ? `\nKey Message: ${b.keyMessage}` : ""}

IMPORTANT: Generate content that sounds like it belongs on cadence.com — authoritative, technical, benefit-led. Use the product name exactly as given. Only reference specific engineering outcomes/numbers that were explicitly provided above.`;
}

// Builds the actual user-turn prompt from structured, server-validated
// inputs. Returns null if the section/mode combination isn't supported or
// is missing what it needs — callers must treat null as "bad request."
export function buildPrompt({ sectionKey, mode, currentContent, direction, brief }) {
  const config = SECTION_SCHEMAS[sectionKey];
  if (!config) return null;

  if (mode === "improve") {
    if (!currentContent || !currentContent.trim()) return null;
    return `A stakeholder has written this draft content for the ${config.context}:

"${currentContent}"

Your task: rewrite it to match cadence.com standards. Keep their intent and key facts but:
- Elevate to Cadence brand voice (authoritative, precise, benefit-led)
- Replace vague language with specific engineering outcomes
- Remove any buzzwords or marketing fluff
- Ensure it reads like it belongs on a live cadence.com product page
- Do not introduce any new numbers, statistics, or certifications that are not already present in the draft above

Follow all character limits exactly. Return ONLY this JSON (no extra text):
${config.fields}`;
  }

  if (mode === "direction") {
    if (!direction || !direction.trim()) return null;
    return `Generate professional cadence.com-standard content for the ${config.context}.

The stakeholder wants to convey:
"${direction}"

${currentContent ? `They also have this existing draft for context (do not copy it, use it as reference only):\n"${currentContent}"\n` : ""}Write in Cadence brand voice: authoritative, technically precise, outcome-focused. Sound like a cadence.com product page. Do not introduce any specific numbers, statistics, or certifications unless they explicitly appear in the direction or reference draft above.

Follow all character limits exactly. Return ONLY this JSON (no extra text):
${config.fields}`;
  }

  if (mode === "brief") {
    if (!brief) return null;
    return `Generate professional cadence.com-standard content for the ${config.context}.

PRODUCT BRIEF:
${formatBrief(brief)}

Return ONLY this JSON (no extra text):
${config.fields}`;
  }

  return null;
}
