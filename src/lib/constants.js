export const PAGE_TYPES = ["Product", "Solutions", "Glossary", "On-demand Webinar"];

export const STATUS_FLOW = [
  { key: "draft",             label: "Draft",            color: "#B5B5B5", bg: "#F9F9F9" },
  { key: "editorial_qa",     label: "Editorial QA",     color: "#646464", bg: "#F3F3F3" },
  { key: "design_qa",        label: "Design QA",        color: "#3C3C3C", bg: "#EFEFEF" },
  { key: "pending_approval", label: "Pending Approval", color: "#181313", bg: "#EAEAEA" },
  { key: "web_team",         label: "Web Team",         color: "#06b6d4", bg: "#ecfeff" },
  { key: "published",        label: "Published",        color: "#2a7a4b", bg: "#ecfdf5" },
];

export const ROLE_META = {
  stakeholder:  { label: "Stakeholder",  color: "#181313", icon: "👤" },
  editorial_qa: { label: "Editorial QA", color: "#646464", icon: "✍️"  },
  design_qa:    { label: "Design QA",    color: "#3C3C3C", icon: "🎨" },
  web_team:     { label: "Web Team",     color: "#06b6d4", icon: "🌐" },
  admin:        { label: "Admin",        color: "#181313", icon: "⚙️"  },
};

export const getStatus = (key) =>
  STATUS_FLOW.find(s => s.key === key) || STATUS_FLOW[0];

export const canAct = (role, status) => ({
  editorial_qa: "editorial_qa",
  design_qa:    "design_qa",
  stakeholder:  "pending_approval",
  web_team:     "web_team",
}[role] === status);

export const nextActionLabel = (role) => ({
  stakeholder:  "Submit for Editorial QA",
  editorial_qa: "Approve → Send to Design QA",
  design_qa:    "Approve → Send for User Review",
  web_team:     "Mark as Published",
}[role] || "Advance");

export const FLOW = [
  "draft",
  "editorial_qa",
  "design_qa",
  "pending_approval",
  "web_team",
  "published",
];

// Which roles can act at each status
export const ROLE_FOR_STATUS = {
  editorial_qa:     "editorial_qa",
  design_qa:        "design_qa",
  pending_approval: "stakeholder",
  web_team:         "web_team",
};

// Section definitions per page type
export const SECTIONS = {
  banner: {
    label: "Banner",
    icon: "🖼️",
    description: "Page hero banner with title, subtitle and CTAs",
    pageTypes: {
      "Product":           { required: true },
      "Solutions":         { required: true },
      "Glossary":          { required: true },
      "On-demand Webinar": { required: true },
    },
  },
  overview: {
    label: "Overview",
    icon: "📋",
    description: "Impact statement, description and supporting media",
    pageTypes: {
      "Product":           { required: true },
      "Solutions":         { required: true },
      "Glossary":          { required: false },
      "On-demand Webinar": { required: null },
    },
  },
  key_benefits: {
    label: "Key Benefits",
    icon: "⭐",
    description: "Label, impact statement and benefit cards with icons",
    pageTypes: {
      "Product":           { required: true },
      "Solutions":         { required: true },
      "Glossary":          { required: null },
      "On-demand Webinar": { required: null },
    },
  },
  features_apps: {
    label: "Features / Applications",
    icon: "🔧",
    description: "List, tabs or table view of features or applications",
    pageTypes: {
      "Product":           { required: true },
      "Solutions":         { required: true },
      "Glossary":          { required: null },
      "On-demand Webinar": { required: null },
    },
  },
  customer_stories: {
    label: "Customer Stories",
    icon: "💬",
    description: "Testimonial carousel with customer quotes",
    pageTypes: {
      "Product":           { required: false },
      "Solutions":         { required: false },
      "Glossary":          { required: null },
      "On-demand Webinar": { required: null },
    },
  },
  promo_section: {
    label: "Promo Section",
    icon: "📣",
    description: "Full-width banner with background image and CTA",
    pageTypes: {
      "Product":           { required: false },
      "Solutions":         { required: false },
      "Glossary":          { required: null },
      "On-demand Webinar": { required: null },
    },
  },
  related_content: {
    label: "Related Content",
    icon: "📄",
    description: "Up to 3 content cards with image, label and description",
    pageTypes: {
      "Product":           { required: false },
      "Solutions":         { required: false },
      "Glossary":          { required: null },
      "On-demand Webinar": { required: null },
    },
  },
  resources: {
    label: "Resources",
    icon: "📚",
    description: "Video carousel, mixed media, resource cards, news and blogs",
    pageTypes: {
      "Product":           { required: false },
      "Solutions":         { required: false },
      "Glossary":          { required: null },
      "On-demand Webinar": { required: null },
    },
  },
};

export const getSectionsForPageType = (pageType) => {
  return Object.entries(SECTIONS)
    .filter(([, s]) => s.pageTypes[pageType] != null)
    .map(([key, s]) => ({
      key,
      ...s,
      required: s.pageTypes[pageType]?.required ?? false,
    }));
};
