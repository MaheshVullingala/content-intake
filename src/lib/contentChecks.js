// ─────────────────────────────────────────────────────────────────────────
// Content format checks & suggestions (spacing, capitalization,
// punctuation, wording). These are ADVISORY: every issue returned here has
// severity "warning", so they are shown in the Pre-flight panel but never
// block Submit (that's reserved for objectively-wrong things in
// preflightCheck.js: placeholders, CTA mismatches, char limits).
//
// Two exports:
//   findContentSuggestions(payload) -> issue[]   (shown in the panel)
//   autoCleanPayload(payload)       -> payload   (applied at Submit)
//
// Spacing problems that are always safe to repair (extra spaces, leading /
// trailing spaces, hidden characters, stray line breaks in single-line
// fields) are fixed automatically at Submit; the panel still lists them so
// the stakeholder knows. Everything else (case, punctuation, wording) is a
// suggestion only -- a human decides.
//
// Tunable lists (BRAND_TERMS, BANNED_WORDS, MISSPELLINGS, ...) live at the
// top of this file. They are plain constants for now; moving them into an
// admin-managed table is the natural next step.
// ─────────────────────────────────────────────────────────────────────────
import { sectionForField, fieldLabel } from "./fieldMeta";

// Contractions ("don't", "we're") are fine in most web copy; flip this on if
// your style guide prohibits them.
export const CHECK_CONTRACTIONS = false;

// Rule ids that can be switched off without touching the logic.
export const DISABLED_RULES = [];

// Approved product/company spellings. Used for (a) flagging wrong casing
// ("cadence" -> "Cadence") and (b) exempting these words from the
// sentence-case title check. Only distinctive names belong here -- avoid
// ordinary English words ("clarity", "fidelity") or every lowercase use
// would be flagged. EDIT THIS LIST to match your approved names.
export const BRAND_TERMS = [
  "Cadence", "OrCAD", "Allegro", "Virtuoso", "Xcelium", "Innovus", "Voltus",
  "Sigrity", "Cerebrus", "Tensilica", "Protium", "Quantus",
];

// Other proper nouns that are legitimately capitalized inside a title, so
// the sentence-case check doesn't flag them.
const PROPER_NOUNS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "January", "February", "March", "April", "June", "July", "August", "September", "October", "November", "December",
  "English", "Europe", "Asia", "America", "American", "China", "India", "Japan", "Germany", "Korea", "Taiwan",
  "United", "States", "Kingdom", "California", "Microsoft", "Google", "Amazon", "Apple", "Intel", "Nvidia",
  "Samsung", "Arm", "TSMC", "Synopsys", "Siemens", "Linux", "Windows", "Python", "Java", "JavaScript",
  "Verilog", "SystemVerilog", "VHDL", "Excel", "Word", "Outlook", "Teams",
];

// Weak / cliched / vague wording. [pattern, label, suggestion]
const BANNED_WORDS = [
  [/\bclick here\b/i, "click here", "describe where the link goes instead"],
  [/\bbest[- ]in[- ]class\b/i, "best-in-class", "say what makes it better, with evidence"],
  [/\bworld[- ]class\b/i, "world-class", "say what makes it better, with evidence"],
  [/\bcutting[- ]edge\b/i, "cutting-edge", "be specific about what is new"],
  [/\bstate[- ]of[- ]the[- ]art\b/i, "state-of-the-art", "be specific about what is new"],
  [/\bgame[- ]chang(?:er|ing)\b/i, "game-changing", "avoid hype; describe the benefit"],
  [/\brevolutionary\b/i, "revolutionary", "avoid hype; describe the benefit"],
  [/\bsynerg(?:y|ies|ize)\b/i, "synergy", "use plain language"],
  [/\bleverag(?:e|es|ed|ing)\b/i, "leverage", "use \"use\" or \"take advantage of\""],
  [/\butili[sz](?:e|es|ed|ing)\b/i, "utilize", "use \"use\""],
  [/\bvery\b/i, "very", "drop it or pick a stronger word"],
  [/\breally\b/i, "really", "drop it or pick a stronger word"],
  [/\bsimply\b/i, "simply", "drop it; it can sound dismissive"],
  [/\bseamless(?:ly)?\b/i, "seamless", "say what actually works together"],
];

// Frequent typos. Not a dictionary spell-check (that would need a
// dictionary dependency) -- it catches the common ones deterministically.
const MISSPELLINGS = {
  teh: "the", adn: "and", recieve: "receive", recieved: "received", seperate: "separate", seperately: "separately",
  occured: "occurred", occurence: "occurrence", definately: "definitely", definitly: "definitely", adress: "address",
  enviroment: "environment", enviornment: "environment", goverment: "government", accomodate: "accommodate",
  acheive: "achieve", acheived: "achieved", wich: "which", untill: "until", begining: "beginning", beleive: "believe",
  calender: "calendar", collegue: "colleague", comming: "coming", commited: "committed", completly: "completely",
  dependant: "dependent", embarass: "embarrass", existance: "existence", foward: "forward", freind: "friend",
  guarentee: "guarantee", happend: "happened", immediatly: "immediately", independant: "independent",
  interupt: "interrupt", knowlege: "knowledge", maintainance: "maintenance", neccessary: "necessary",
  necesary: "necessary", noticable: "noticeable", occassion: "occasion", paralell: "parallel", persistant: "persistent",
  posession: "possession", prefered: "preferred", privelege: "privilege", proffesional: "professional",
  publically: "publicly", realy: "really", refered: "referred", relevent: "relevant", resouce: "resource",
  resouces: "resources", responsability: "responsibility", succesful: "successful", succesfully: "successfully",
  suprise: "surprise", tommorow: "tomorrow", transfered: "transferred", truely: "truly", unfortunatly: "unfortunately",
  usefull: "useful", wether: "whether", writting: "writing", managment: "management", developement: "development",
  performace: "performance", sevices: "services", solutoin: "solution", solutons: "solutions", custmer: "customer",
  custumer: "customer", cutomer: "customer", verfication: "verification", simulaton: "simulation",
};

// ── Field selection ─────────────────────────────────────────────────────
// Only genuine copy is checked: skip links, refs, ids, types, slugs,
// keywords, etc. (token-matched on underscore-separated key parts so
// "image_alt" is checked but "image_ref" is not).
const SKIP_TOKENS = new Set([
  "link", "url", "href", "ref", "id", "type", "status", "priority", "slug", "location", "keywords",
  "icon", "color", "date", "email", "tags", "size", "order", "mode", "layout", "align", "position", "target",
]);
const skipName = (name) => String(name).toLowerCase().split("_").some((t) => SKIP_TOKENS.has(t));
const SKIP_VALUE = /^(https?:\/\/|mailto:|\/|#)\S*$|^[\w.+-]+@[\w-]+\.[\w.-]+$|^[0-9a-f]{8}-[0-9a-f]{4}-/i;

const HTML_RE = /<\/?[a-z][^>]*>/i;
const INVISIBLE_RE = /[​-‍⁠﻿­]/g;
const URL_RE = /(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gi;

const leafOf = (topKey, path) => {
  for (let i = path.length - 1; i >= 0; i--) if (typeof path[i] === "string") return path[i];
  return topKey;
};

const isEligible = (topKey, path, val) =>
  sectionForField(topKey) !== null &&
  !skipName(topKey) &&
  !path.some((p) => typeof p === "string" && skipName(p)) &&
  !SKIP_VALUE.test(val.trim());

// "title" | "impact" | "button" | "alt" | "meta" | "body"
function kindOf(topKey, path) {
  const leaf = leafOf(topKey, path);
  if (/^seo_meta_(title|description)$/.test(topKey)) return "meta";
  if (/(^|_)alt(_text)?$/.test(leaf)) return "alt";
  if ((/cta/.test(leaf) && /label/.test(leaf)) || /btn_label|button_label/.test(leaf)) return "button";
  if (leaf === "sub_title") return "body"; // a sentence-style subtitle, not a heading
  if (/(^|_)title$/.test(leaf)) return "title";
  if (/(^|_)label$/.test(leaf)) return "title";
  if (/(^|_)impact(_statement)?$/.test(leaf)) return "impact";
  return "body";
}
const SINGLE_LINE = new Set(["title", "impact", "button", "alt", "meta"]);

function mapStrings(val, topKey, path, fn) {
  if (typeof val === "string") return isEligible(topKey, path, val) ? fn(val, topKey, path) : val;
  if (Array.isArray(val)) return val.map((v, i) => mapStrings(v, topKey, [...path, i], fn));
  if (val && typeof val === "object") {
    const out = {};
    Object.entries(val).forEach(([k, v]) => { out[k] = mapStrings(v, topKey, [...path, k], fn); });
    return out;
  }
  return val;
}
function mapPayload(payload, fn) {
  const out = {};
  Object.entries(payload || {}).forEach(([k, v]) => { out[k] = mapStrings(v, k, [], fn); });
  return out;
}

const locOf = (topKey, path) =>
  fieldLabel(topKey) + path.map((p) => (typeof p === "number" ? ` #${p + 1}` : ` › ${p}`)).join("");

// ── Auto-clean (applied at Submit) ──────────────────────────────────────
export function autoCleanPayload(payload) {
  return mapPayload(payload, (val, topKey, path) => {
    const html = HTML_RE.test(val);
    let s = val.replace(INVISIBLE_RE, "");
    if (!html) s = s.replace(/ /g, " ");
    if (!html && SINGLE_LINE.has(kindOf(topKey, path))) s = s.replace(/[\r\n\t]+/g, " ");
    return s.replace(/[ \t]{2,}/g, " ").trim();
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────
function toPlain(val) {
  if (!HTML_RE.test(val)) return { text: val, html: false };
  const text = val
    .replace(/<\/(?:p|div|li|h\d|ul|ol)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return { text, html: true };
}

const EXEMPT = new Set([...BRAND_TERMS, ...PROPER_NOUNS].map((w) => w.toLowerCase()));
const cleanWord = (w) => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "").replace(/['’]s$/i, "");
const isAcronymOrMixed = (w) => w === w.toUpperCase() || /[a-z][A-Z]/.test(w) || /^[A-Z][a-z]*[A-Z]/.test(w);

/** True when most of the "ordinary" words after the first are Capitalized. */
function looksTitleCased(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return false;
  let capped = 0, eligible = 0;
  for (let i = 1; i < tokens.length; i++) {
    const prev = tokens[i - 1];
    if (/[:–—-]$/.test(prev) || prev === "-") continue; // a new clause may legitimately start capitalized
    const w = cleanWord(tokens[i]);
    if (w.length < 3 || !/^[A-Za-z]/.test(w)) continue;
    if (isAcronymOrMixed(w) || EXEMPT.has(w.toLowerCase())) continue;
    eligible++;
    if (/^[A-Z]/.test(w)) capped++;
  }
  return capped >= 2 && eligible > 0 && capped / eligible >= 0.6;
}

const ABBREVIATIONS = new Set(["e.g", "i.e", "vs", "etc", "approx", "inc", "ltd", "co", "corp", "no", "fig", "cf", "al", "dr", "mr", "mrs", "ms", "st"]);

/** Letters-only case style of a short label, for the CTA consistency check. */
function labelStyle(label) {
  const t = label.trim();
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (!letters) return "neutral";
  if (letters.length >= 4 && letters === letters.toUpperCase()) return "upper";
  if (/^[a-z]/.test(t)) return "lower";
  const words = t.split(/\s+/);
  if (words.length < 2) return "neutral";
  if (words.length === 2) {
    const w = cleanWord(words[1]);
    const ordinary = w.length >= 3 && !isAcronymOrMixed(w) && !EXEMPT.has(w.toLowerCase());
    return ordinary && /^[A-Z]/.test(w) ? "title" : "sentence";
  }
  return looksTitleCased(t) ? "title" : "sentence";
}

const PASSIVE_EXCLUDE = new Set(["speed", "need", "feed", "seed", "indeed", "embed", "hundred", "thousand", "proceed", "succeed", "exceed", "bleed", "breed", "greed", "deed", "weed", "steed", "shed", "bed", "red"]);
const PASSIVE_RE = /\b(?:is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(\w+)\b/gi;
const IRREGULAR_PARTICIPLES = new Set(["made", "built", "given", "done", "seen", "known", "shown", "taken", "written", "chosen", "found", "held", "kept", "sent", "brought", "driven"]);
function findPassive(text) {
  PASSIVE_RE.lastIndex = 0;
  let m;
  while ((m = PASSIVE_RE.exec(text))) {
    const w = m[1].toLowerCase();
    if (IRREGULAR_PARTICIPLES.has(w) || (/^\w{3,}ed$/.test(w) && !PASSIVE_EXCLUDE.has(w))) return m[0];
  }
  return null;
}

const MISSPELL_RE = new RegExp(`\\b(${Object.keys(MISSPELLINGS).join("|")})\\b`, "gi");
const BRAND_RE = new RegExp(`\\b(${BRAND_TERMS.join("|")})\\b`, "gi");
const BRAND_CANON = Object.fromEntries(BRAND_TERMS.map((b) => [b.toLowerCase(), b]));
const CONTRACTION_RE = /\b\w+(?:n['’]t|['’](?:re|ve|ll|m|d))\b|\b(?:it|that|here|there|let|what|who)['’]s\b/gi;

const RULES = {
  double_space:        "Extra spaces between words",
  edge_space:          "Leading or trailing spaces",
  invisible_char:      "Hidden or non-breaking space characters",
  line_break:          "Line break or tab inside a single-line field",
  space_before_punct:  "Space before punctuation",
  no_space_after_punct:"Missing space after punctuation",
  title_case:          "Not in sentence case (capitalize only the first word and proper nouns)",
  all_caps:            "ALL CAPS text",
  sentence_start:      "Sentence doesn't start with a capital letter",
  cta_case:            "CTA / button labels use mixed capitalization",
  end_period:          "Title or button ends with a period",
  missing_end_punct:   "Description has no end punctuation",
  repeated_punct:      "Repeated punctuation",
  exclamation:         "Exclamation mark in a title or button",
  dash_style:          "Hyphen used as a dash (use – or —)",
  unbalanced:          "Unmatched brackets or quotes",
  quote_style:         "Mixed straight and curly quotes",
  repeated_word:       "Repeated word",
  misspelling:         "Possible misspelling",
  brand_spelling:      "Brand or product name spelled or capitalized incorrectly",
  banned_word:         "Weak or discouraged wording",
  contraction:         "Contraction (style guide prefers the full form)",
  passive:             "Possible passive voice (consider active voice)",
  long_sentence:       "Long sentence (over 25 words)",
};
const AUTO_FIXED = new Set(["double_space", "edge_space", "invisible_char", "line_break"]);

// ── Main entry ──────────────────────────────────────────────────────────
export function findContentSuggestions(payload, { disabledRules = DISABLED_RULES } = {}) {
  const off = new Set(disabledRules);
  const found = []; // { rule, section, loc }
  const add = (rule, entry, detail) => {
    if (off.has(rule)) return;
    found.push({ rule, section: entry ? entry.section : null, loc: entry ? entry.loc + (detail ? ` (${detail})` : "") : detail || "" });
  };

  const entries = [];
  mapPayload(payload, (val, topKey, path) => {
    const { text, html } = toPlain(val);
    entries.push({
      raw: val, text, html,
      kind: kindOf(topKey, path),
      leaf: leafOf(topKey, path),
      topKey,
      section: sectionForField(topKey),
      loc: locOf(topKey, path),
    });
    return val;
  });

  let anyStraight = false, anyCurly = false;

  entries.forEach((e) => {
    const { text, html, kind, leaf, raw } = e;
    if (!text.trim()) return;
    const lines = text.split("\n");
    const noUrl = text.replace(URL_RE, " ");
    const singleLine = SINGLE_LINE.has(kind);

    // 1. Spacing
    if (/\S[ \t]{2,}\S/.test(text)) add("double_space", e);
    if (lines.some((l) => l !== l.trim())) add("edge_space", e);
    if (INVISIBLE_RE.test(raw) || (!html && / /.test(raw))) add("invisible_char", e);
    INVISIBLE_RE.lastIndex = 0;
    if (singleLine && !html && /[\r\n\t]/.test(raw.trim())) add("line_break", e);
    if (/\s[,;:!?]|\s\.(?=\s|$)/.test(noUrl)) add("space_before_punct", e);
    if (/[a-z]{2,}[,;:][A-Za-z]/.test(noUrl) || /[a-z]{2,}[.!?][A-Z][a-z]/.test(noUrl)) add("no_space_after_punct", e);

    // 2. Capitalization
    const trimmed = text.trim();
    const letters = trimmed.replace(/[^A-Za-z]/g, "");
    const wordCount = trimmed.split(/\s+/).length;
    if (kind !== "alt") {
      if (letters.length >= 4 && letters === letters.toUpperCase() && wordCount >= 2) {
        add("all_caps", e);
      } else {
        const shout = trimmed.split(/\s+/).map(cleanWord).find((w) => w.length >= 5 && w === w.toUpperCase() && /^[A-Z]+$/.test(w) && !EXEMPT.has(w.toLowerCase()));
        if (shout) add("all_caps", e, shout);
      }
    }
    if ((kind === "title" || kind === "impact") && looksTitleCased(trimmed)) add("title_case", e);
    if (kind !== "alt") {
      const first = cleanWord(trimmed.split(/\s+/)[0] || "");
      let startBad = /^[a-z]{2,}$/.test(first) && !EXEMPT.has(first.toLowerCase());
      if (!startBad && (kind === "body" || kind === "meta" || kind === "impact")) {
        const re = /([\w.]+)[.!?]\s+([a-z]\w*)/g;
        let m;
        while ((m = re.exec(noUrl))) {
          const prev = m[1].toLowerCase();
          if (prev.length <= 2 || prev.includes(".") || ABBREVIATIONS.has(prev)) continue;
          startBad = true; break;
        }
      }
      if (startBad) add("sentence_start", e);
    }

    // 3. Punctuation & typography
    if ((kind === "title" || kind === "button") && /(^|[^.])\.$/.test(trimmed) && !/^(inc|ltd|co|corp|etc|vs)\.$/i.test(trimmed.split(/\s+/).pop())) add("end_period", e);
    if (!html && kind === "body" && /description|explanation/.test(leaf) && wordCount >= 5 && !/[.!?:;)"”’…]$/.test(trimmed)) add("missing_end_punct", e);
    if (/[!?]{2,}|,{2,}|;{2,}|:{2,}|(^|[^.])\.\.([^.]|$)/.test(noUrl)) add("repeated_punct", e);
    if ((kind === "title" || kind === "button" || kind === "impact") && trimmed.includes("!")) add("exclamation", e);
    if (/\s-\s|--/.test(noUrl)) add("dash_style", e);
    {
      const count = (re) => (noUrl.match(re) || []).length;
      const bad = count(/\(/g) !== count(/\)/g) || count(/\[/g) !== count(/\]/g) || count(/\{/g) !== count(/\}/g) ||
        count(/“/g) !== count(/”/g) || count(/"/g) % 2 === 1;
      if (bad) add("unbalanced", e);
    }
    if (/['"]/.test(noUrl)) anyStraight = true;
    if (/[‘’“”]/.test(noUrl)) anyCurly = true;

    // 4. Wording
    {
      const re = /\b([A-Za-z]{2,})\s+\1\b/gi;
      let m;
      while ((m = re.exec(text))) {
        if (["had", "that"].includes(m[1].toLowerCase())) continue;
        add("repeated_word", e, `"${m[0].replace(/\s+/g, " ")}"`);
        break;
      }
    }
    {
      MISSPELL_RE.lastIndex = 0;
      const seen = new Set();
      let m;
      while ((m = MISSPELL_RE.exec(text))) {
        const w = m[1].toLowerCase();
        if (seen.has(w)) continue;
        seen.add(w);
        add("misspelling", e, `"${m[1]}" → "${MISSPELLINGS[w]}"`);
      }
      BRAND_RE.lastIndex = 0;
      while ((m = BRAND_RE.exec(text))) {
        const canon = BRAND_CANON[m[1].toLowerCase()];
        if (m[1] !== canon && !seen.has(m[1])) { seen.add(m[1]); add("brand_spelling", e, `"${m[1]}" → "${canon}"`); }
      }
    }
    if (kind !== "alt") {
      BANNED_WORDS.some(([re, label, hint]) => { if (re.test(text)) { add("banned_word", e, `"${label}": ${hint}`); return true; } return false; });
    }
    if (CHECK_CONTRACTIONS) {
      CONTRACTION_RE.lastIndex = 0;
      const m = CONTRACTION_RE.exec(text);
      if (m) add("contraction", e, `"${m[0]}"`);
    }
    if (kind === "body" || kind === "meta") {
      const p = findPassive(noUrl);
      if (p) add("passive", e, `"${p}"`);
      const long = noUrl.split(/[.!?]+\s+|\n+/).find((s) => s.trim().split(/\s+/).length > 25);
      if (long) add("long_sentence", e, `${long.trim().split(/\s+/).length} words`);
    }
  });

  // Cross-field: CTA / button capitalization should be consistent.
  {
    const buttons = entries.filter((e) => e.kind === "button" && e.text.trim());
    const styled = buttons.map((e) => ({ e, style: labelStyle(e.text) })).filter((x) => x.style !== "neutral");
    const styles = new Set(styled.map((x) => x.style));
    if (styles.size > 1 && !off.has("cta_case")) {
      const example = (s) => styled.find((x) => x.style === s);
      const [a, b] = [...styles].map((s) => `"${example(s).e.text.trim()}"`);
      found.push({ rule: "cta_case", section: "banner", loc: `e.g. ${a} vs ${b}` });
    }
  }

  // Cross-field: straight vs curly quotes should not be mixed.
  if (anyStraight && anyCurly && !off.has("quote_style")) {
    found.push({ rule: "quote_style", section: null, loc: "pick one style across the whole request" });
  }

  // Group: one issue per (rule, section), listing up to 3 locations.
  const groups = new Map();
  found.forEach((f) => {
    const key = `${f.rule}|${f.section ?? ""}`;
    if (!groups.has(key)) groups.set(key, { rule: f.rule, section: f.section, locs: [] });
    groups.get(key).locs.push(f.loc);
  });
  return [...groups.values()].map((g) => {
    const shown = g.locs.slice(0, 3).join("; ");
    const more = g.locs.length > 3 ? ` +${g.locs.length - 3} more` : "";
    return {
      type: "content",
      severity: "warning",
      rule: g.rule,
      section: g.section,
      autoFix: AUTO_FIXED.has(g.rule),
      message: `${RULES[g.rule]}: ${shown}${more}${AUTO_FIXED.has(g.rule) ? " — fixed automatically on submit" : ""}`,
    };
  });
}
