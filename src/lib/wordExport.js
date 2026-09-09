// Minimal .docx (Office Open XML) builder using JSZip, which is already
// a dependency (see WebTeamView.js's attachment-zip feature) — avoids
// adding a new npm package just for this. A .docx is really just a zip
// of a few XML parts; we only need the handful that make Word treat it
// as valid, not the full spec.
//
// Used by WordExportButton.js for the "download anytime" export admin
// asked for (see PHASE1-EDITORIAL-REVIEW-PLAN.md) — generated fresh from
// whatever the request's live data is at click time, not a cached/staged
// snapshot, so it's always current.
import JSZip from "jszip";

const escapeXml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const parseJSONB = (val, fb = []) => {
  if (!val) return fb;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return fb; } }
  return val;
};

const paragraph = (text, { bold = false, size = 22, spaceAfter = 120 } = {}) => `
  <w:p>
    <w:pPr><w:spacing w:after="${spaceAfter}"/></w:pPr>
    <w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>
  </w:p>`;

const heading = (text) => `
  <w:p>
    <w:pPr><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>
  </w:p>`;

const title = (text) => `
  <w:p>
    <w:pPr><w:spacing w:after="200"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="40"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>
  </w:p>`;

// field: label to show, val: raw value (string, skipped if empty)
const field = (label, val) => (val ? paragraph(`${label}: ${val}`) : "");

const bulletList = (items, labelFn) =>
  items.map(it => paragraph(`•  ${labelFn(it)}`, { spaceAfter: 60 })).join("");

export function buildRequestDocx(req) {
  const parts = [];

  parts.push(title(req.page_title || "Untitled Page"));
  parts.push(field("Page Type", req.page_type));
  parts.push(field("Sub Title", req.sub_title));
  if (req.cta1_label) parts.push(field("CTA 1", `${req.cta1_label} → ${req.cta1_link || ""}`));
  if (req.cta2_label) parts.push(field("CTA 2", `${req.cta2_label} → ${req.cta2_link || ""}`));

  if (req.overview_impact || req.overview_description) {
    parts.push(heading("Overview"));
    parts.push(field("Impact Statement", req.overview_impact));
    parts.push(field("Description", req.overview_description));
  }

  if (req.kb_impact || req.kb_description || parseJSONB(req.kb_cards).length) {
    parts.push(heading(req.kb_label || "Key Benefits"));
    parts.push(field("Impact", req.kb_impact));
    parts.push(field("Description", req.kb_description));
    const cards = parseJSONB(req.kb_cards);
    if (cards.length) parts.push(bulletList(cards, c => [c.title, c.description].filter(Boolean).join(" — ")));
  }

  if (req.fa_impact || req.fa_description || parseJSONB(req.fa_items).length) {
    parts.push(heading(req.fa_label || "Features"));
    parts.push(field("Impact", req.fa_impact));
    parts.push(field("Description", req.fa_description));
    const items = parseJSONB(req.fa_items);
    if (items.length) parts.push(bulletList(items, i => [i.title, i.description].filter(Boolean).join(" — ")));
  }

  if (req.app_impact || req.app_description || parseJSONB(req.app_items).length) {
    parts.push(heading(req.app_label || "Applications"));
    parts.push(field("Impact", req.app_impact));
    parts.push(field("Description", req.app_description));
    const items = parseJSONB(req.app_items);
    if (items.length) parts.push(bulletList(items, i => [i.title, i.description].filter(Boolean).join(" — ")));
  }

  const csItems = parseJSONB(req.cs_items);
  if (req.cs_impact || csItems.length) {
    parts.push(heading(req.cs_label || "Customer Stories"));
    parts.push(field("Impact", req.cs_impact));
    if (csItems.length) parts.push(bulletList(csItems, c => [c.title, c.quote || c.description].filter(Boolean).join(" — ")));
  }

  if (req.promo_title || req.promo_description) {
    parts.push(heading(req.promo_label || "Promo Section"));
    parts.push(field("Title", req.promo_title));
    parts.push(field("Description", req.promo_description));
    if (req.promo_btn_label) parts.push(field("Button", `${req.promo_btn_label} → ${req.promo_btn_link || ""}`));
  }

  const rcCards = parseJSONB(req.rc_cards);
  if (rcCards.length) {
    parts.push(heading(req.rc_label || "Related Content"));
    parts.push(bulletList(rcCards, c => [c.title, c.link].filter(Boolean).join(" — ")));
  }

  const rpCards = parseJSONB(req.rp_cards);
  if (req.rp_description || rpCards.length) {
    parts.push(heading(req.rp_label || "Related Products"));
    parts.push(field("Description", req.rp_description));
    if (rpCards.length) parts.push(bulletList(rpCards, c => c.title || ""));
  }

  if (req.ts_card1_title || req.ts_card2_title || req.ts_card3_title) {
    parts.push(heading(req.ts_label || "Training and Support"));
    [1, 2, 3].forEach(n => {
      const t = req[`ts_card${n}_title`];
      if (t) parts.push(field(`Card ${n}`, [t, req[`ts_card${n}_description`]].filter(Boolean).join(" — ")));
    });
  }

  if (req.seo_meta_title || req.seo_meta_description || req.seo_page_location) {
    parts.push(heading("SEO Meta Data"));
    parts.push(field("Page Location", req.seo_page_location));
    parts.push(field("Meta Title", req.seo_meta_title));
    parts.push(field("Meta Description", req.seo_meta_description));
    parts.push(field("Meta Keywords", req.seo_meta_keywords));
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${parts.join("\n")}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.folder("_rels").file(".rels", rootRelsXml);
  const wordFolder = zip.folder("word");
  wordFolder.file("document.xml", documentXml);
  wordFolder.folder("_rels").file("document.xml.rels", docRelsXml);

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export function downloadRequestDocx(req) {
  return buildRequestDocx(req).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (req.page_title || "content-request").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.href = url;
    a.download = `${safeName || "content-request"}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}
