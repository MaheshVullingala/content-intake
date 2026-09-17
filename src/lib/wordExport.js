// .docx builder for the "download anytime" export (WordExportButton.js) --
// generated fresh from whatever the request's live data is at click time,
// not a cached/staged snapshot, so it's always current.
//
// Rewritten (2026-09) from a hand-rolled raw-OOXML/JSZip builder to the
// `docx` npm library, specifically to support the "Spec Sheet" layout
// picked after reviewing mockups: a compact Type/Status/Location/Tags
// meta table under the title, teal-ruled section headings matching the
// app's brand accent, and repeatable items (benefit cards, feature
// items, etc.) rendered as a bordered card grid instead of plain
// bullet lines. Hand-writing that much table/border/rule OOXML by hand
// was the whole reason the old export looked flat -- `docx` makes it
// tractable. See CONTEXT.md for the full design discussion.
//
// NOTE: written without the ability to render/verify a sample output in
// the session that authored this (sandboxed shell was unavailable --
// see CONTEXT.md). Double-check a real export renders correctly in Word
// before relying on this, especially the PageNumber footer fields.
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, Footer, PageNumber, TabStopType,
} from "docx";
import { htmlToPlainText } from "@/lib/richText";
import { getStatus } from "@/lib/constants";

// ── Brand palette (matches src/app/globals.css / src/styles/components.css) ──
const TEAL          = "14B8A6"; // brand accent -- section-heading rule
const TEXT_PRIMARY  = "181313";
const TEXT_SECONDARY = "3C3C3C";
const TEXT_MUTED    = "646464";
const BORDER_GRAY   = "E0E0E0";

// US Letter, 1" margins -- docx defaults to A4, so this must be explicit.
const PAGE_WIDTH  = 12240;
const PAGE_HEIGHT = 15840;
const MARGIN      = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 9360 DXA usable width

const parseJSONB = (val, fb = []) => {
  if (!val) return fb;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return fb; } }
  return val;
};

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = () => ({ top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER });
const cardBorders = () => ({
  top:    { style: BorderStyle.SINGLE, size: 3, color: BORDER_GRAY },
  bottom: { style: BorderStyle.SINGLE, size: 3, color: BORDER_GRAY },
  left:   { style: BorderStyle.SINGLE, size: 3, color: BORDER_GRAY },
  right:  { style: BorderStyle.SINGLE, size: 3, color: BORDER_GRAY },
});

// Prose paragraph -- no label, just flowing text (Overview impact/
// description, promo copy, etc.). `lead` bolds+upsizes it slightly for
// the first/most-important line in a section (mirrors the mockup's
// bold impact statement above the regular description paragraph).
const prose = (text, { lead = false } = {}) => !text ? null : new Paragraph({
  spacing: { after: 160 },
  children: [new TextRun({ text, bold: lead, size: lead ? 23 : 21, color: TEXT_PRIMARY })],
});

// Label: value line, for metadata-style fields (CTAs, SEO fields, per-
// item "Others" fields) rather than prose content.
const fieldPara = (label, val) => !val ? null : new Paragraph({
  spacing: { after: 100 },
  children: [
    new TextRun({ text: `${label}:  `, bold: true, size: 19, color: TEXT_MUTED }),
    new TextRun({ text: String(val), size: 21, color: TEXT_PRIMARY }),
  ],
});

// Section heading with the teal bottom-rule from the Spec Sheet mockup.
const sectionHeading = (text) => new Paragraph({
  spacing: { before: 320, after: 160 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL, space: 4 } },
  children: [new TextRun({ text, bold: true, size: 25, color: TEXT_PRIMARY })],
});

const metaCell = (text, isLabel) => new TableCell({
  width: { size: isLabel ? 1300 : 3380, type: WidthType.DXA },
  margins: { top: 60, bottom: 60, left: 0, right: 100 },
  borders: noBorders(),
  children: [new Paragraph({
    children: [new TextRun({ text: text || "—", size: isLabel ? 18 : 20, color: isLabel ? TEXT_MUTED : TEXT_PRIMARY, bold: !isLabel })],
  })],
});

// The Type/Status/Location/Tags block directly under the title --
// borderless 2x4 grid so it reads as aligned key-value pairs, not a
// visible table (matches the mockup exactly).
const metaTable = (rows) => new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [1300, 3380, 1300, 3380],
  rows: rows.map(([l1, v1, l2, v2]) => new TableRow({
    children: [metaCell(l1, true), metaCell(v1, false), metaCell(l2, true), metaCell(v2, false)],
  })),
});

// Repeatable items (benefit cards, feature items, related content
// cards, etc.) as a 2-column bordered card grid -- replaces the old
// "•  title — description" bullet lines. Odd counts get a trailing
// empty cell so every row stays a full 2-cell rectangle (required by
// OOXML table structure).
function cardGrid(items, titleFn, bodyFn) {
  if (!items || !items.length) return null;
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    const pair = [items[i], items[i + 1]];
    rows.push(new TableRow({
      children: pair.map(it => new TableCell({
        width: { size: CONTENT_WIDTH / 2, type: WidthType.DXA },
        margins: { top: 120, bottom: 120, left: 140, right: 140 },
        borders: cardBorders(),
        children: it ? [
          new Paragraph({
            spacing: { after: bodyFn(it) ? 60 : 0 },
            children: [new TextRun({ text: titleFn(it) || "", bold: true, size: 21, color: TEXT_PRIMARY })],
          }),
          ...(bodyFn(it) ? [new Paragraph({ children: [new TextRun({ text: bodyFn(it), size: 19, color: TEXT_SECONDARY })] })] : []),
        ] : [new Paragraph({ children: [] })],
      })),
    }));
  }
  return new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: [CONTENT_WIDTH / 2, CONTENT_WIDTH / 2], rows });
}

// A blank-ish spacer paragraph -- used after the meta table/card grids
// (which don't carry their own trailing spacing the way Paragraph's
// `spacing.after` does) so the next element doesn't crowd them.
const spacer = () => new Paragraph({ spacing: { after: 80 }, children: [] });

export function buildRequestDocx(req) {
  const children = [];
  const push = (x) => { if (x) children.push(x); };

  // ── Title + meta block ──────────────────────────────────────────────
  children.push(new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: req.page_title || "Untitled Page", bold: true, size: 44, color: TEXT_PRIMARY })],
  }));

  const bannerTags = parseJSONB(req.banner_tags);
  const tagsText = bannerTags.length
    ? bannerTags.map(t => t.category ? `${t.category} / ${t.name}` : t.name).join(", ")
    : "";
  const statusLabel = getStatus(req.status)?.label || req.status || "";

  children.push(metaTable([
    ["Page Type", req.page_type || "", "Status", statusLabel],
    ["Location", req.seo_page_location || "", "Tags", tagsText],
  ]));
  push(spacer());

  push(prose(req.sub_title));
  push(fieldPara("CTA 1", req.cta1_label ? `${req.cta1_label} → ${req.cta1_link || ""}` : null));
  push(fieldPara("CTA 2", req.cta2_label ? `${req.cta2_label} → ${req.cta2_link || ""}` : null));

  // ── Overview ─────────────────────────────────────────────────────────
  if (req.overview_impact || req.overview_description) {
    push(sectionHeading("Overview"));
    push(prose(req.overview_impact, { lead: true }));
    push(prose(req.overview_description));
  }

  // ── Key Benefits ─────────────────────────────────────────────────────
  const kbCards = parseJSONB(req.kb_cards);
  if (req.kb_impact || req.kb_description || kbCards.length) {
    push(sectionHeading(req.kb_label || "Key Benefits"));
    push(prose(req.kb_impact, { lead: true }));
    push(prose(req.kb_description));
    push(cardGrid(kbCards, c => c.title, c => c.description));
    if (kbCards.length) push(spacer());
  }

  // ── Features ─────────────────────────────────────────────────────────
  const faItems = parseJSONB(req.fa_items);
  if (req.fa_impact || req.fa_description || faItems.length) {
    push(sectionHeading(req.fa_label || "Features"));
    push(prose(req.fa_impact, { lead: true }));
    push(prose(req.fa_description));
    push(cardGrid(faItems, i => i.title, i => i.description));
    if (faItems.length) push(spacer());
  }

  // ── Applications ─────────────────────────────────────────────────────
  const appItems = parseJSONB(req.app_items);
  if (req.app_impact || req.app_description || appItems.length) {
    push(sectionHeading(req.app_label || "Applications"));
    push(prose(req.app_impact, { lead: true }));
    push(prose(req.app_description));
    push(cardGrid(appItems, i => i.title, i => i.description));
    if (appItems.length) push(spacer());
  }

  // ── Customer Stories ─────────────────────────────────────────────────
  const csItems = parseJSONB(req.cs_items);
  if (req.cs_impact || csItems.length) {
    push(sectionHeading(req.cs_label || "Customer Stories"));
    push(prose(req.cs_impact, { lead: true }));
    push(cardGrid(csItems, c => c.title, c => c.quote || c.description));
    if (csItems.length) push(spacer());
  }

  // ── Promo Section ────────────────────────────────────────────────────
  if (req.promo_title || req.promo_description) {
    push(sectionHeading(req.promo_label || "Promo Section"));
    push(prose(req.promo_title, { lead: true }));
    push(prose(req.promo_description));
    push(fieldPara("Button", req.promo_btn_label ? `${req.promo_btn_label} → ${req.promo_btn_link || ""}` : null));
  }

  // ── Related Content ──────────────────────────────────────────────────
  const rcCards = parseJSONB(req.rc_cards);
  if (rcCards.length) {
    push(sectionHeading(req.rc_label || "Related Content"));
    push(cardGrid(rcCards, c => c.title, c => c.link));
    push(spacer());
  }

  // ── Related Products ─────────────────────────────────────────────────
  const rpCards = parseJSONB(req.rp_cards);
  if (req.rp_description || rpCards.length) {
    push(sectionHeading(req.rp_label || "Related Products"));
    push(prose(req.rp_description));
    push(cardGrid(rpCards, c => c.title, () => null));
    if (rpCards.length) push(spacer());
  }

  // ── Training & Support ───────────────────────────────────────────────
  const tsCards = [1, 2, 3]
    .map(n => ({ title: req[`ts_card${n}_title`], description: req[`ts_card${n}_description`] }))
    .filter(c => c.title);
  if (tsCards.length) {
    push(sectionHeading(req.ts_label || "Training and Support"));
    push(cardGrid(tsCards, c => c.title, c => c.description));
    push(spacer());
  }

  // ── Others (custom sections) ─────────────────────────────────────────
  const othItems = parseJSONB(req.oth_items);
  if (othItems.length) {
    push(sectionHeading("Others"));
    othItems.forEach((item, i) => {
      push(fieldPara(`Custom Section ${i + 1} — Label`, item.label));
      push(fieldPara("Impact Statement", item.impact_statement));
      // description is rich-text HTML -- flatten to plain lines, then
      // render lines htmlToPlainText prefixed with "- " as real Word
      // bullets (Paragraph's `bullet` shorthand) rather than a literal
      // "•" character.
      const descLines = htmlToPlainText(item.description).split("\n").filter(Boolean);
      if (descLines.length) {
        push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "Description:", bold: true, size: 19, color: TEXT_MUTED })] }));
        descLines.forEach(line => {
          const isBullet = line.startsWith("- ");
          const text = isBullet ? line.slice(2) : line;
          push(new Paragraph({
            spacing: { after: 40 },
            ...(isBullet ? { bullet: { level: 0 } } : {}),
            children: [new TextRun({ text, size: 20, color: TEXT_PRIMARY })],
          }));
        });
      }
      push(fieldPara("Explanation", item.explanation));
    });
  }

  // ── SEO Meta Data ────────────────────────────────────────────────────
  if (req.seo_meta_title || req.seo_meta_description) {
    push(sectionHeading("SEO Meta Data"));
    push(fieldPara("Meta Title", req.seo_meta_title));
    push(fieldPara("Meta Description", req.seo_meta_description));
    push(fieldPara("Meta Keywords", req.seo_meta_keywords));
  }

  // ── Footer: generated date + page number ────────────────────────────
  const footer = new Footer({
    children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY, space: 4 } },
      children: [
        new TextRun({ text: `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`, size: 16, color: TEXT_MUTED }),
        new TextRun({ text: "\tPage ", size: 16, color: TEXT_MUTED }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: TEXT_MUTED }),
        new TextRun({ text: " of ", size: 16, color: TEXT_MUTED }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: TEXT_MUTED }),
      ],
    })],
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      footers: { default: footer },
      children,
    }],
  });

  return Packer.toBlob(doc);
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
