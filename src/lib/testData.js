// ─────────────────────────────────────────────────────────────────────────
// Test data generator — fills the entire New Request form with placeholder
// Lorem Ipsum content in one click, for QA/testing so you don't have to
// hand-type every field every time. Pure client-side state generation, no
// network calls, nothing is written to the database until the user
// explicitly clicks Save Draft / Submit.
//
// Used by NewRequest.js's "🎲 Fill Test Data" button (step 2 only, once a
// page type is selected). Respects getSectionsForPageType() — only the
// sections that actually apply to the selected page type get filled.
// ─────────────────────────────────────────────────────────────────────────

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum",
];

const rnd  = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
const cap  = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const words = (count) => Array.from({ length: count }, () => pick(WORDS)).join(" ");

const sentence = (minW = 6, maxW = 12) => cap(words(minW + rnd(maxW - minW + 1))) + ".";

const paragraph = (minS = 2, maxS = 4) =>
  Array.from({ length: minS + rnd(maxS - minS + 1) }, () => sentence()).join(" ");

const title = (minW = 2, maxW = 5) => cap(words(minW + rnd(maxW - minW + 1)));

const truncate = (str, max) => (max && str && str.length > max ? str.slice(0, max - 1).trim() : str);

const slug = () => words(2 + rnd(2)).replace(/\s+/g, "-");
const testUrl = () => `/${slug()}`;
const testId = (prefix) => `${prefix}-${Date.now()}-${rnd(99999)}`;

// limits = the CHAR_LIMITS object (with any admin overrides already applied)
const gen = (limits, key, fallbackMax, fn) => truncate(fn(), limits?.[key] ?? fallbackMax);

export function generateTestData(pageType, sectionKeys = [], limits = {}) {
  const has = (key) => sectionKeys.includes(key);
  const out = {};

  // SEO + Banner apply to every page type
  out.seoData = {
    seo_page_location:    testUrl(),
    seo_meta_title:        gen(limits, "seo_meta_title", 70, () => title(3, 6)),
    seo_meta_description:  gen(limits, "seo_meta_description", 160, () => sentence(10, 18)),
    seo_meta_keywords:     Array.from({ length: 5 }, () => pick(WORDS)).join(", "),
  };

  out.banner = {
    page_title:       gen(limits, "page_title", 70, () => title(3, 6)),
    sub_title:        gen(limits, "sub_title", 120, () => sentence(6, 12)),
    cta1_label:       gen(limits, "cta1_label", 30, () => "Learn More"),
    cta1_link:        gen(limits, "cta1_link", 300, testUrl),
    cta2_label:       gen(limits, "cta2_label", 30, () => "Contact Us"),
    cta2_link:        gen(limits, "cta2_link", 300, testUrl),
    banner_image_ref: null,
  };

  if (has("overview")) {
    out.overview = {
      overview_label:       "OVERVIEW",
      overview_impact:      gen(limits, "overview_impact", 100, () => sentence(6, 10)),
      overview_description: gen(limits, "overview_description", 600, () => paragraph(3, 5)),
      overview_media_url:   "",
      overview_media_type:  "image",
      overview_media_ref:   null,
    };
  }

  if (has("key_benefits")) {
    out.kbData = {
      kb_label:       "KEY BENEFITS",
      kb_impact:      gen(limits, "kb_impact", 100, () => sentence(6, 10)),
      kb_description: gen(limits, "kb_description", 300, () => paragraph(2, 3)),
      kb_cards: Array.from({ length: 3 }, () => ({
        id: testId("card"),
        icon_description: truncate(title(2, 4), 60),
        title:             truncate(title(2, 4), 50),
        description:       truncate(sentence(8, 14), 150),
        image_ref:         null,
      })),
    };
  }

  if (has("features_apps")) {
    out.faData = {
      fa_label:       "FEATURES",
      fa_impact:      gen(limits, "fa_impact", 100, () => sentence(6, 10)),
      fa_description: gen(limits, "fa_description", 300, () => paragraph(2, 3)),
      fa_view_type:   "list",
      fa_items: Array.from({ length: 4 }, () => ({
        id:   testId("li"),
        text: truncate(sentence(4, 9), 200),
      })),
      fa_columns: [],
      fa_rows:    [],
    };
  }

  if (has("applications")) {
    out.appData = {
      app_label:       "APPLICATIONS",
      app_impact:      gen(limits, "app_impact", 100, () => sentence(6, 10)),
      app_description: gen(limits, "app_description", 300, () => paragraph(2, 3)),
      app_view_type:   "tabs_horizontal",
      app_items: Array.from({ length: 3 }, () => ({
        id:          testId("app-tab"),
        title:       truncate(title(2, 4), 50),
        description: truncate(sentence(8, 14), 200),
        image_ref:   null,
        image_alt:   "",
        cta_label:   "",
        cta_link:    "",
      })),
    };
  }

  if (has("customer_stories")) {
    out.csData = {
      cs_label:  "CUSTOMER STORIES",
      cs_impact: gen(limits, "cs_impact", 100, () => sentence(6, 10)),
      cs_items: Array.from({ length: 3 }, () => ({
        id:       testId("cs"),
        quote:    truncate(sentence(10, 18), 220),
        customer: truncate(`${title(1, 2)}, ${title(1, 2)} at ${title(1, 2)}`, 80),
        logo_ref: null,
      })),
    };
  }

  if (has("promo_section")) {
    out.promoData = {
      promo_bg_image:  "",
      promo_bg_note:   "",
      promo_label:     gen(limits, "promo_label", 30, () => title(1, 2)),
      promo_title:     gen(limits, "promo_title", 120, () => sentence(6, 10)),
      promo_description: gen(limits, "promo_description", 300, () => paragraph(1, 2)),
      promo_btn_label: gen(limits, "promo_btn_label", 30, () => "Get Started"),
      promo_btn_link:  gen(limits, "promo_btn_link", 300, testUrl),
    };
  }

  if (has("related_content")) {
    const labels = ["Blog", "Webinar", "White Paper", "Case Study", "Video"];
    out.rcData = {
      rc_label:  "RELATED CONTENT",
      rc_impact: gen(limits, "rc_impact", 100, () => sentence(6, 10)),
      rc_cards: Array.from({ length: 3 }, () => ({
        id:          testId("rc"),
        image_ref:   null,
        label:       pick(labels),
        title:       truncate(title(3, 6), 60),
        description: truncate(sentence(8, 14), 150),
        link:        testUrl(),
      })),
    };
  }

  if (has("resources")) {
    const tags = ["White Paper", "Brochure", "Video", "eBook", "Data Sheet", "Case Study"];
    const linkList = (n) => ({
      links: Array.from({ length: n }, () => ({ id: testId("lnk"), url: testUrl(), tag: pick(tags) })),
    });
    out.resData = {
      res_label:  "RESOURCES",
      res_impact: gen(limits, "res_impact", 100, () => sentence(6, 10)),
      res_selected: ["video_carousel", "resources", "news_blogs"],
      res_video_carousel: {
        title: "Watch Our Latest Videos",
        tags: [],
        items: Array.from({ length: 2 }, () => ({
          id: testId("vid"), title: truncate(title(3, 6), 60), url: testUrl(), thumbnail_ref: null,
        })),
      },
      res_mixed_carousel: {},
      res_resources: {
        r1_title: truncate(title(4, 7), 90), r1_link: testUrl(), r1_image_ref: null, r1_tag: pick(tags),
        r2_title: truncate(title(3, 6), 70), r2_link: testUrl(), r2_tag: pick(tags),
        r3_title: truncate(title(3, 6), 70), r3_link: testUrl(), r3_tag: pick(tags),
        r4_title: truncate(title(3, 6), 70), r4_link: testUrl(), r4_tag: pick(tags),
      },
      res_news:  linkList(2),
      res_blogs: linkList(2),
    };
  }

  if (has("related_products")) {
    out.rpData = {
      rp_label:       "RELATED PRODUCTS",
      rp_impact:      gen(limits, "rp_impact", 100, () => sentence(6, 10)),
      rp_description: gen(limits, "rp_description", 300, () => paragraph(1, 2)),
      rp_cards: Array.from({ length: 3 }, () => ({
        id:          testId("rp"),
        title:       truncate(title(2, 4), 60),
        description: truncate(sentence(8, 14), 150),
        cta_label:   "Learn More",
        cta_link:    testUrl(),
        image_ref:   null,
      })),
    };
  }

  if (has("training_support")) {
    out.tsData = {
      ts_label:  "TRAINING AND SUPPORT",
      ts_impact: gen(limits, "ts_impact", 80, () => sentence(4, 8)),
      ...Object.fromEntries([1, 2, 3].flatMap(n => [
        [`ts_card${n}_icon`,        truncate(title(3, 5), 60)],
        [`ts_card${n}_title`,       truncate(title(2, 4), 40)],
        [`ts_card${n}_description`, truncate(sentence(8, 14), 150)],
        [`ts_card${n}_cta_label`,   "Learn More"],
        [`ts_card${n}_cta_link`,    testUrl()],
      ])),
    };
  }

  return out;
}
