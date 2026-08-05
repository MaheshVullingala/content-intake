// Fast lane for small stakeholder-proposed edits — lets a genuinely small
// text change (typo fix, short wording tweak) apply to `requests`
// immediately instead of sitting in content_change_requests for admin
// review. See CONTEXT.md "Fast lane for small edits" for the full design
// discussion. Used by ProposeChangeWizard.js only.
import { SECTION_CONFIG } from "@/components/EditSectionModal";

// Overall_status values where a proposed change is eligible for the fast
// lane. Deliberately excludes:
//  - pending_stakeholder: a parallel team's work is already sitting in
//    front of the stakeholder for their own approval — a second,
//    simultaneous content change (even a small one) is exactly the kind
//    of overlap that needs a human to reconcile.
//  - pending_web / published: web_team is already assembling the page or
//    it has already gone out — any change here, however small, needs a
//    deliberate review, not a silent auto-apply.
export const FAST_LANE_STAGES = ["pending_admin", "in_progress"];

// A field only ever qualifies for the fast lane if it's plain text
// content — never a link/URL (a wrong link silently breaks a CTA with no
// visual cue to catch it) and never the SEO page location (changes what
// URL the page actually lives at). Built from EditSectionModal's own
// SECTION_CONFIG rather than a hand-maintained list, so this can never
// drift from what "content" fields really exist. Array fields (kb_cards,
// cs_items, rc_cards, rp_cards, etc.), image refs, and the
// features_apps custom renderer's fa_items/fa_columns/fa_rows are never
// in cfg.fields to begin with, so whole-card add/remove and image swaps
// are excluded automatically — those always need a human look.
const EXCLUDED_SAFE_KEYS = new Set(["seo_page_location"]);

export const SAFE_FAST_LANE_FIELDS = (() => {
  const set = new Set();
  Object.values(SECTION_CONFIG).forEach(cfg => {
    (cfg.fields || []).forEach(f => {
      if (f.key.endsWith("_link") || f.key.endsWith("_url")) return;
      if (EXCLUDED_SAFE_KEYS.has(f.key)) return;
      set.add(f.key);
    });
  });
  return set;
})();

// Small, dependency-free Levenshtein distance. Fields eligible for the
// fast lane are always short (titles/labels/short descriptions, never a
// whole page), so no need for a faster algorithm.
function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return prev[n];
}

// A "small edit" = at most this many characters of combined
// insertions/deletions/substitutions per field. Roughly a typo fix, a
// word swap, or a short phrase tweak — not a rewrite.
export const MAX_FAST_LANE_EDIT_DISTANCE = 25;

// changedFields: [{key, old_value, new_value, ...}] from
// ProposeChangeWizard's buildChangedFields(). Deliberately all-or-
// nothing — if even one changed field isn't safe/small, the whole
// submission goes through full admin review, so a stakeholder never has
// to guess which of several edits applied immediately vs. which are
// still pending.
export function isFastLaneEligible(changedFields, overallStatus) {
  if (!FAST_LANE_STAGES.includes(overallStatus)) return false;
  if (!changedFields || changedFields.length === 0) return false;
  return changedFields.every(f => {
    if (!SAFE_FAST_LANE_FIELDS.has(f.key)) return false;
    const oldStr = f.old_value == null ? "" : String(f.old_value);
    const newStr = f.new_value == null ? "" : String(f.new_value);
    return editDistance(oldStr, newStr) <= MAX_FAST_LANE_EDIT_DISTANCE;
  });
}
