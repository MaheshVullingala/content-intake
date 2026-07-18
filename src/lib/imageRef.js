// Resolves an ImageField value ({ type, value, url, path }) for display
// in PagePreview.
//
// Stakeholder-provided refs are NEVER rendered as an actual image here —
// only Design Team's uploaded replacement (matched via task_attachments
// section_tag, wired in separately) should ever show as a real <img>.
// getImageUrl always returns null for a raw stakeholder ref; it exists so
// callers have one place to resolve a real image once the Design Team
// overlay is wired in.

export function getImageUrl(ref) {
  return null;
}

// Text to show in a placeholder box in place of the image, or null to
// show nothing at all.
export function getImagePlaceholder(ref) {
  if (!ref?.value) return null;
  if (ref.type === "description") return ref.value;
  if (ref.type === "link" || ref.type === "attachment") return "Image pending Design Team";
  return null;
}
