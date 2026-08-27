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

  const kbCards = parse(req.kb_cards, []);
  if (Array.isArray(kbCards)) {
    kbCards.forEach((card, i) => {
      if (!card) return;
      fields.push({ fieldId: `kb_card_${i + 1}_image`, section: "Key Benefits", label: `Card ${i + 1} Image`, ref: card?.image_ref || null });
    });
  }

  if (["tabs_horizontal", "tabs_vertical"].includes(req.fa_view_type)) {
    const faItems = parse(req.fa_items, []);
    if (Array.isArray(faItems)) {
      faItems.forEach((item, i) => {
        if (!item) return;
        fields.push({ fieldId: `fa_item_${i + 1}_image`, section: "Features", label: `Tab ${i + 1} Image`, ref: item?.image_ref || null });
      });
    }
  }

  if (["tabs_horizontal", "tabs_vertical"].includes(req.app_view_type)) {
    const appItems = parse(req.app_items, []);
    if (Array.isArray(appItems)) {
      appItems.forEach((item, i) => {
        if (!item) return;
        fields.push({ fieldId: `app_item_${i + 1}_image`, section: "Applications", label: `Tab ${i + 1} Image`, ref: item?.image_ref || null });
      });
    }
  }

  const csItems = parse(req.cs_items, []);
  if (Array.isArray(csItems)) {
    csItems.forEach((item, i) => {
      if (!item) return;
      fields.push({ fieldId: `cs_item_${i + 1}_logo`, section: "Customer Stories", label: `Item ${i + 1} Logo`, ref: item?.logo_ref || null });
    });
  }

  const rcCards = parse(req.rc_cards, []);
  if (Array.isArray(rcCards)) {
    rcCards.forEach((card, i) => {
      if (!card) return;
      fields.push({ fieldId: `rc_card_${i + 1}_image`, section: "Related Content", label: `Card ${i + 1} Image`, ref: card?.image_ref || null });
    });
  }

  const rpCards = parse(req.rp_cards, []);
  if (Array.isArray(rpCards)) {
    rpCards.forEach((card, i) => {
      if (!card) return;
      fields.push({ fieldId: `rp_card_${i + 1}_image`, section: "Related Products", label: `Card ${i + 1} Image`, ref: card?.image_ref || null });
    });
  }

  return fields;
}

// Only fields where the stakeholder actually provided something.
export function getFlaggedImageFields(req = {}) {
  return getImageFields(req).filter(f => f.ref?.value);
}
