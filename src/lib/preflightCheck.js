// ─────────────────────────────────────────────────────────────────────────
// Pre-flight content checks — run once, right before Submit (never on
// Save Draft, which is allowed to be incomplete). Centralized here so the
// same rules can later back a reviewer-facing badge without duplicating
// logic across section components.
//
// v1 covers exactly the two checks agreed to be unambiguous enough to
// hard-block submission on:
//   1. Leftover placeholder (Lorem Ipsum) text in any field
//   2. A CTA label/link pair where only one side is filled in
// Both are objectively wrong, never a judgment call — unlike tone,
// terminology, or broken-link checks, which are deliberately NOT here
// yet (see CONTEXT.md "Pre-flight check panel" for the fuller reasoning).
// ─────────────────────────────────────────────────────────────────────────

// Distinctive Lorem Ipsum tokens — chosen because they essentially never
// appear in real marketing copy by coincidence, so a plain substring match
// has near-zero false-positive risk without needing anything statistical.
// Catches both testData.js's own output and lorem ipsum pasted from
// anywhere else.
const PLACEHOLDER_MARKERS = ["lorem", "ipsum", "consectetur", "adipiscing", "elit"];

const containsPlaceholder = (val) => {
  if (!val || typeof val !== "string") return false;
  const lower = val.toLowerCase();
  return PLACEHOLDER_MARKERS.some((word) => lower.includes(word));
};

import { sectionForField, fieldLabel } from "./fieldMeta";
import { tsNeedsJustification } from "@/components/sections/TrainingSupport";
import { findContentSuggestions, autoCleanPayload } from "./contentChecks";

/**
 * Walk every string value in the payload (including inside arrays of
 * cards/tabs/items) and flag any that still contain placeholder text.
 * One issue per top-level field/section — doesn't spam one issue per
 * array item, since "Key Benefits has placeholder text" is enough to act
 * on without listing which of the 6 cards it's in.
 */
function findPlaceholderIssues(payload) {
  const issues = [];
  const flagged = new Set();

  const visit = (val, topKey) => {
    if (val == null) return;
    if (typeof val === "string") {
      if (containsPlaceholder(val) && !flagged.has(topKey)) {
        flagged.add(topKey);
        issues.push({
          type: "placeholder",
          section: sectionForField(topKey),
          message: `"${fieldLabel(topKey)}" still contains placeholder (Lorem Ipsum) text — replace it with real content.`,
        });
      }
      return;
    }
    if (Array.isArray(val)) { val.forEach((v) => visit(v, topKey)); return; }
    if (typeof val === "object") { Object.values(val).forEach((v) => visit(v, topKey)); return; }
  };

  Object.entries(payload || {}).forEach(([key, val]) => visit(val, key));
  return issues;
}

/**
 * Every label/link CTA pair in the app. Only flags when exactly one side
 * of the pair is filled — both empty means the stakeholder just doesn't
 * want that CTA, which is fine.
 */
function findCtaMismatches(payload) {
  const issues = [];
  const checkPair = (labelVal, linkVal, section, name) => {
    const hasLabel = !!(labelVal && String(labelVal).trim());
    const hasLink = !!(linkVal && String(linkVal).trim());
    if (hasLabel !== hasLink) {
      issues.push({
        type: "cta_mismatch",
        section,
        message: `${name}: ${hasLabel ? "has a label but no link" : "has a link but no label"} — fill in both, or clear both if you don't need this CTA.`,
      });
    }
  };

  checkPair(payload.cta1_label, payload.cta1_link, "banner", "Banner CTA 1");
  checkPair(payload.cta2_label, payload.cta2_link, "banner", "Banner CTA 2");
  checkPair(payload.promo_btn_label, payload.promo_btn_link, "promo_section", "Promo Button");

  if (payload.ts_card1_title !== undefined && tsNeedsJustification(payload)) {
    issues.push({
      type: "ts_justification",
      section: "training_support",
      message: "Training & Support: the standard content was changed without a justification — add one, or revert to the standard content.",
    });
  }

  [1, 2, 3].forEach((n) => {
    checkPair(payload[`ts_card${n}_cta_label`], payload[`ts_card${n}_cta_link`], "training_support", `Training & Support Card ${n}`);
  });

  if (payload.fa_view_type === "tabs_horizontal" || payload.fa_view_type === "tabs_vertical") {
    (payload.fa_items || []).forEach((tab, i) => {
      checkPair(tab.cta_label, tab.cta_link, "features_apps", `Features Tab ${i + 1}${tab.title ? ` (${tab.title})` : ""}`);
    });
  }

  if (payload.app_view_type === "tabs_horizontal" || payload.app_view_type === "tabs_vertical") {
    (payload.app_items || []).forEach((tab, i) => {
      checkPair(tab.cta_label, tab.cta_link, "applications", `Applications Tab ${i + 1}${tab.title ? ` (${tab.title})` : ""}`);
    });
  }

  (payload.rp_cards || []).forEach((card, i) => {
    checkPair(card.cta_label, card.cta_link, "related_products", `Related Products Card ${i + 1}${card.title ? ` (${card.title})` : ""}`);
  });

  return issues;
}

// Top-level fields whose section form enforces a different limit than the
// shared CHAR_LIMITS map (PromoSection.js hardcodes these) -- the check
// must match what the stakeholder actually saw in the counter.
const FORM_LIMIT_OVERRIDES = { promo_title: 100, promo_btn_label: 25 };

// Per-item limits for repeatable cards/tabs/items, hardcoded in each
// section form (see the charLimit props in src/components/sections/*).
// Same numbers as the forms -- keep in sync if those change.
const ITEM_LIMITS = {
  kb_cards:    { title: 50, description: 150 },
  fa_items:    { title: 50, description: 200, image_alt: 150, text: 200 }, // tabs use title/description/alt, list view uses text
  app_items:   { title: 50, description: 200, image_alt: 150 },
  cs_items:    { customer: 100 },
};
const ITEM_FIELD_NAMES = { title: "Title", description: "Description", image_alt: "Alt Text", text: "Text", customer: "Customer Details" };
const ITEM_SECTION = { kb_cards: "key_benefits", fa_items: "features_apps", app_items: "applications", cs_items: "customer_stories" };

const OTHERS_LIMITS = { label: 40, impact_statement: 100, description: 800, explanation: 300 };
const stripTags = (html) => String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");

/**
 * Flags any field over its character limit. The inputs now hard-block
 * typing past the limit, but content can still arrive over-limit via
 * AI Assist, Fill Test Data, drafts saved before a limit was tightened,
 * or an admin lowering a limit in Settings -- so submit re-checks.
 * `charLimits` is the live map (constants defaults + admin overrides).
 */
function findCharLimitIssues(payload, charLimits = {}) {
  const issues = [];
  const over = (len, limit) => limit && len > limit;

  Object.entries(payload || {}).forEach(([key, val]) => {
    const limit = FORM_LIMIT_OVERRIDES[key] ?? charLimits[key];
    if (typeof val === "string" && over(val.length, limit)) {
      issues.push({
        type: "char_limit",
        section: sectionForField(key),
        message: `"${fieldLabel(key)}" is ${val.length - limit} character${val.length - limit > 1 ? "s" : ""} over the ${limit}-character limit (${val.length}/${limit}).`,
      });
    }
  });

  Object.entries(ITEM_LIMITS).forEach(([key, limits]) => {
    const items = Array.isArray(payload?.[key]) ? payload[key] : [];
    items.forEach((item, i) => {
      Object.entries(limits).forEach(([field, limit]) => {
        const v = item?.[field];
        if (typeof v === "string" && over(v.length, limit)) {
          issues.push({
            type: "char_limit",
            section: ITEM_SECTION[key],
            message: `${fieldLabel(key)} #${i + 1}: ${ITEM_FIELD_NAMES[field]} is ${v.length - limit} character${v.length - limit > 1 ? "s" : ""} over the ${limit}-character limit (${v.length}/${limit}).`,
          });
        }
      });
    });
  });

  (Array.isArray(payload?.oth_items) ? payload.oth_items : []).forEach((item, i) => {
    Object.entries(OTHERS_LIMITS).forEach(([field, limit]) => {
      const raw = item?.[field];
      if (typeof raw !== "string") return;
      const len = field === "description" ? stripTags(raw).length : raw.length;
      if (over(len, limit)) {
        issues.push({
          type: "char_limit",
          section: "others",
          message: `Others #${i + 1}: ${field.replace("_", " ")} is ${len - limit} character${len - limit > 1 ? "s" : ""} over the ${limit}-character limit (${len}/${limit}).`,
        });
      }
    });
  });

  return issues;
}

/**
 * Run every pre-flight check against an assembled request payload (the
 * same shape buildPayload() produces). Returns a flat list of issues —
 * empty array means clean. Every issue here is blocking in v1; a future
 * advisory tier (e.g. broken-link checking) would add a `severity` field.
 *
 * `checkPlaceholders` (default true) lets an admin temporarily turn off
 * just the Lorem-Ipsum check (AdminPanel → Settings, settings.
 * placeholder_check_enabled) — e.g. for a QA pass that deliberately pushes
 * Fill Test Data content through Submit rather than stopping at preview.
 * The CTA-mismatch and character-limit checks always run regardless —
 * they catch real mistakes, not test content.
 *
 * `charLimits` is the live limits map (NewRequest.js's useCharLimits()).
 */
export function runPreflightChecks(payload, { checkPlaceholders = true, charLimits = {} } = {}) {
  // Blocking checks run on the auto-cleaned payload (what will actually be
  // saved at Submit -- trimming extra spaces can bring a field back under
  // its limit). Advisory suggestions run on the raw payload so the
  // stakeholder sees what was typed.
  const cleaned = autoCleanPayload(payload);
  const blocking = [
    ...(checkPlaceholders ? findPlaceholderIssues(cleaned) : []),
    ...findCtaMismatches(cleaned),
    ...findCharLimitIssues(cleaned, charLimits),
  ].map((i) => ({ severity: "error", ...i }));
  return [...blocking, ...findContentSuggestions(payload)];
}

export { autoCleanPayload };
