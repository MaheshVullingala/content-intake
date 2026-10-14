// Shared field metadata for the content checks (preflightCheck.js and
// contentChecks.js): which step-2 section tab a payload key belongs to, and
// a human-readable label for it. Split out so both modules can import it
// without a circular dependency.

// Maps a top-level payload key to the step-2 section tab it belongs to, so
// an issue can link straight back to the right place. Prefix-matched so
// new fields in an existing section don't need this list updated.
const SECTION_PREFIXES = [
  ["seo_", "seo_meta"],
  ["kb_", "key_benefits"],
  ["fa_", "features_apps"],
  ["app_", "applications"],
  ["cs_", "customer_stories"],
  ["promo_", "promo_section"],
  ["rc_", "related_content"],
  ["res_", "resources"],
  ["rp_", "related_products"],
  ["ts_", "training_support"],
  ["overview_", "overview"],
  ["oth_", "others"],
];

export const sectionForField = (key) => {
  if (key === "seo_page_location") return "banner"; // Page Location lives at the top of Banner now
  const hit = SECTION_PREFIXES.find(([prefix]) => key.startsWith(prefix));
  if (hit) return hit[1];
  if (["page_title", "sub_title", "cta1_label", "cta1_link", "cta2_label", "cta2_link", "banner_image_ref"].includes(key)) return "banner";
  return null;
};

export const FIELD_LABELS = {
  page_title: "Page Title", sub_title: "Sub Title",
  cta1_label: "CTA 1 Label", cta2_label: "CTA 2 Label",
  overview_impact: "Overview Impact Statement", overview_description: "Overview Description",
  overview_media_alt: "Overview Media Alt Text",
  kb_impact: "Key Benefits Impact Statement", kb_description: "Key Benefits Description",
  fa_impact: "Features Impact Statement", fa_description: "Features Description",
  app_impact: "Applications Impact Statement", app_description: "Applications Description",
  cs_impact: "Customer Stories Impact Statement",
  promo_title: "Promo Title", promo_description: "Promo Description",
  rc_impact: "Related Content Impact Statement",
  rp_impact: "Related Products Impact Statement", rp_description: "Related Products Description",
  seo_meta_title: "SEO Meta Title", seo_meta_description: "SEO Meta Description",
  seo_meta_keywords: "SEO Meta Keywords", seo_page_location: "Page Location",
  cta1_link: "CTA 1 Link", cta2_link: "CTA 2 Link",
  overview_label: "Overview Label", kb_label: "Key Benefits Label", fa_label: "Features Label",
  app_label: "Applications Label", cs_label: "Customer Stories Label", promo_label: "Promo Label",
  promo_btn_label: "Promo Button Label", promo_btn_link: "Promo Button Link",
  rc_label: "Related Content Label", res_label: "Resources Label", res_impact: "Resources Impact Statement",
  rp_label: "Related Products Label", ts_label: "Training & Support Label", ts_impact: "Training & Support Impact Statement",
  kb_cards: "Key Benefits Cards", fa_items: "Features Items", fa_columns: "Features Table Columns", fa_rows: "Features Table Rows",
  app_items: "Applications Items",
  cs_items: "Customer Stories", rc_cards: "Related Content Cards", rp_cards: "Related Products Cards",
  res_mixed_carousel: "Resources Mixed Media Carousel",
  res_resources: "Resources Cards", res_news: "Resources News Links", res_blogs: "Resources Blog Links",
  oth_items: "Others",
};

export const fieldLabel = (key) => FIELD_LABELS[key] || key;
