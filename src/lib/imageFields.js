// Enumerates every stakeholder-facing image field on a request into a flat
// list Design Team can work through one at a time in TaskPanel's "Images
// to Map" section. fieldId is the identifier used (prefixed with
// "design_team:") as task_attachments.section_tag when Design Team maps
// an image to a field.

const parse = (v, fb) => {
  if (!v) return fb;
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return fb; } }
  return v;
};

export function getImageFields(req = {}) {
  const fields = [];

  fields.push({ fieldId: "banner_image",   section: "Banner",   label: "Banner Image",      ref: req.banner_image_ref   || null });
  fields.push({ fieldId: "overview_media", section: "Overview", label: "Overview Media",     ref: req.overview_media_ref || null });
  fields.push({ fieldId: "promo_bg_image", section: "Promo",    label: "Background Image",   ref: req.promo_bg_image_ref || null });

  parse(req.kb_cards, []).forEach((card, i) => {
    fields.push({ fieldId: `kb_card_${i + 1}_image`, section: "Key Benefits", label: `Card ${i + 1} Image`, ref: card.image_ref || null });
  });

  if (["tabs_horizontal", "tabs_vertical"].includes(req.fa_view_type)) {
    parse(req.fa_items, []).forEach((item, i) => {
      fields.push({ fieldId: `fa_item_${i + 1}_image`, section: "Features / Applications", label: `Tab ${i + 1} Image`, ref: item.image_ref || null });
    });
  }

  parse(req.cs_items, []).forEach((item, i) => {
    fields.push({ fieldId: `cs_item_${i + 1}_logo`, section: "Customer Stories", label: `Item ${i + 1} Logo`, ref: item.logo_ref || null });
  });

  parse(req.rc_cards, []).forEach((card, i) => {
    fields.push({ fieldId: `rc_card_${i + 1}_image`, section: "Related Content", label: `Card ${i + 1} Image`, ref: card.image_ref || null });
  });

  parse(req.rp_cards, []).forEach((card, i) => {
    fields.push({ fieldId: `rp_card_${i + 1}_image`, section: "Related Products", label: `Card ${i + 1} Image`, ref: card.image_ref || null });
  });

  return fields;
}

// Only fields where the stakeholder actually provided something.
export function getFlaggedImageFields(req = {}) {
  return getImageFields(req).filter(f => f.ref?.value);
}
