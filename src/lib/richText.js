// ── Rich text helpers for the "Others" section's description field ────────
// The app has no rich-text library (Quill/TipTap/etc.) -- every other
// field is a plain string. The Others section is the one exception: its
// description needs paragraphs + bullet/numbered lists, so it's stored as
// a small, tightly-allowlisted HTML string produced by
// src/components/RichTextEditor.js (a hand-built contentEditable editor,
// not a library).
//
// Two sanitization passes exist on purpose (defense in depth):
//   1. Here, via sanitizeRichText() -- called both when persisting
//      (NewRequest.js's buildPayload -> sanitizePayload with richTextKeys)
//      and again at render time (OthersPreview.js) right before
//      dangerouslySetInnerHTML, since live-typed-but-not-yet-saved state
//      in NewRequest.js's own preview never passes through
//      sanitizePayload at all.
//   2. security.js's sanitizeText() strips ALL tags from every other
//      string field -- this file exists specifically so the description
//      field can skip that blanket strip and go through the allowlist
//      version instead.
//
// Allowlist is intentionally small: only what the toolbar can produce.
const ALLOWED_TAGS = new Set(["P", "BR", "STRONG", "B", "EM", "I", "UL", "OL", "LI"]);

// Recursively walk a DOM node, unwrapping/removing anything not on the
// allowlist and stripping every attribute from what's kept (no href,
// style, class, on* handlers -- the editor never produces any of these,
// so anything present came from pasted/injected markup).
function cleanNode(node, doc) {
  // Work over a static array since we mutate the live tree while walking.
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === 3) return; // text node -- always fine
    if (child.nodeType !== 1) { node.removeChild(child); return; } // comments etc.

    cleanNode(child, doc); // clean children first (bottom-up)

    if (!ALLOWED_TAGS.has(child.tagName)) {
      // Unwrap: keep the (now-cleaned) children, drop the wrapper tag
      // itself. Covers spans/divs contentEditable sometimes inserts, and
      // strips anything actively dangerous (script, style, iframe, img
      // with onerror, etc.) along with its content removed via replace.
      if (child.tagName === "SCRIPT" || child.tagName === "STYLE" || child.tagName === "IFRAME") {
        node.removeChild(child);
        return;
      }
      while (child.firstChild) node.insertBefore(child.firstChild, child);
      node.removeChild(child);
      return;
    }

    // Allowed tag -- strip every attribute (belt and suspenders; even a
    // safe-looking attribute like `style` could carry `expression()` in
    // old IE-class parsers, and there's simply no reason our output ever
    // needs one).
    Array.from(child.attributes || []).forEach((attr) => child.removeAttribute(attr.name));
  });
}

// Sanitize an HTML string down to the allowlisted structural tags only,
// with zero attributes anywhere. Browser-only (uses DOMParser) -- every
// call site runs client-side after a user action, never during SSR.
export function sanitizeRichText(html) {
  if (!html || typeof html !== "string") return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    // Defensive fallback if this somehow runs without a DOM -- strip all
    // tags rather than risk passing through anything unsanitized.
    return html.replace(/<[^>]*>/g, "").trim();
  }
  try {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstChild;
    cleanNode(root, doc);
    return root.innerHTML;
  } catch {
    return html.replace(/<[^>]*>/g, "").trim();
  }
}

// Plain-text extraction for previews, char counts, "is this field
// actually filled" checks, and the .docx export (which can't render
// HTML). Adds a space between block-level breaks so words don't run
// together, and renders <li> as a "- " prefixed line.
export function htmlToPlainText(html) {
  if (!html || typeof html !== "string") return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const lines = [];
    const walk = (node, listDepth = 0) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          const text = child.textContent.trim();
          if (text) lines.push(text);
          return;
        }
        if (child.nodeType !== 1) return;
        if (child.tagName === "LI") {
          const text = child.textContent.trim();
          if (text) lines.push(`- ${text}`);
          return;
        }
        if (child.tagName === "BR") { lines.push(""); return; }
        walk(child, listDepth);
      });
    };
    walk(doc.body);
    return lines.filter(Boolean).join("\n").trim();
  } catch {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

// True when the rich text field has no real content -- contentEditable
// divs commonly hold "<br>" or empty <p></p> when "empty", which would
// otherwise look non-empty to a naive `!!value` check.
export function isRichTextEmpty(html) {
  return htmlToPlainText(html).length === 0;
}
