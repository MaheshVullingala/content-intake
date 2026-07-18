// Resolves what a preview component should actually render for an image
// field: Design Team's own uploaded replacement if one exists, otherwise
// a placeholder box describing what the stakeholder provided. Stakeholder
// refs (link/attachment/description) are never rendered as a real image —
// only Design Team's mapped upload is.

// attachments: task_attachments rows for this request, already filtered/
// fetched by the caller (see TaskBoard.js), where section_tag is stored
// as `design_team:{fieldId}` — see src/lib/imageFields.js for fieldId's.
export function getDesignImage(fieldId, attachments) {
  if (!attachments?.length || !fieldId) return null;
  const match = attachments.find(a => a.section_tag === `design_team:${fieldId}`);
  return match?.public_url || null;
}

// Text to show in a placeholder box in place of the image, or null to
// show nothing at all.
export function getImagePlaceholder(ref) {
  if (!ref?.value) return null;
  if (ref.type === "description") return ref.value;
  if (ref.type === "link" || ref.type === "attachment") return "Image pending Design Team";
  return null;
}
