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
  design_qa:    { label: "Design QA",    color: "#3C3C3C", icon: "🖼️" },
  web_team:     { label: "Web Team",     color: "#06b6d4", icon: "🌐" },
  admin:        { label: "Admin",        color: "#181313", icon: "⚙️"  },
  brand_team:   { label: "Brand Team",   color: '#d97706', bg: '#fffbeb', icon: "🎨" },
  seo_team:     { label: "SEO Team",     color: '#1b5793', bg: '#eff6ff', icon: "🔍" },
  // v2 parallel-workflow roles
  editorial_team: { label: 'Editorial Team', icon: '✍️',  color: '#2a7a4b', bg: '#ecfdf5' },
  design_team:    { label: 'Design Team',    icon: '🖼️', color: '#ea580c', bg: '#fff7ed' },
  super_admin:    { label: 'Super Admin',    icon: '⚡',  color: '#7e22ce', bg: '#faf5ff' },
};

export const ROLE_OPTIONS = [
  { value: "super_admin",    label: "Super Admin"    },
  { value: "admin",          label: "Admin"          },
  { value: "stakeholder",    label: "Stakeholder"    },
  { value: "editorial_team", label: "Editorial Team" },
  { value: "brand_team",     label: "Brand Team"     },
  { value: "seo_team",       label: "SEO Team"       },
  { value: "design_team",    label: "Design Team"    },
  { value: "web_team",       label: "Web Team"       },
];

export const getStatus = (key) =>
  STATUS_FLOW.find(s => s.key === key) || STATUS_FLOW[0];

export const canAct = (role, status) => ({
  editorial_qa: "editorial_qa",
  design_qa:    "design_qa",
  stakeholder:  "pending_approval",
  web_team:     "web_team",
}[role] === status);

export const nextActionLabel = (role, status) => {
  if (role === "stakeholder" && status === "pending_approval") return "✅ Approve & Send to Web Team";
  return ({
    stakeholder:  "Submit for Editorial QA",
    editorial_qa: "Approve → Send to Design QA",
    design_qa:    "Approve → Send for Stakeholder Approval",
    web_team:     "Mark as Published",
  }[role] || "Advance");
};

export const FLOW = [
  "draft",
  "editorial_qa",
  "design_qa",
  "pending_approval",
  "web_team",
  "published",
];

// Where each role's "return" action sends the request
export const returnDestination = (role) => ({
  editorial_qa: "draft",
  design_qa:    "draft",
}[role] || "draft");

export const returnActionLabel = (role) => ({
  editorial_qa: "↩ Return for Revision",
  design_qa:    "💬 Query Stakeholder",
}[role] || "↩ Return");

// Which roles can act at each status
export const ROLE_FOR_STATUS = {
  editorial_qa:     "editorial_qa",
  design_qa:        "design_qa",
  pending_approval: "stakeholder",
  web_team:         "web_team",
};

export const CHAR_LIMITS = {
  page_title:70, sub_title:120, cta1_label:30, cta2_label:30, cta1_link:300, cta2_link:300,
  seo_page_location:300, seo_meta_title:70, seo_meta_description:160, seo_meta_keywords:300,
  overview_label:30, overview_impact:100, overview_description:600,
  kb_label:30, kb_impact:100, kb_description:300,
  fa_label:30, fa_impact:100, fa_description:300,
  cs_label:30, cs_impact:100,
  promo_label:30, promo_title:120, promo_description:300, promo_btn_label:30, promo_btn_link:300,
  rc_label:30, rc_impact:100,
  res_label:30, res_impact:100,
  rp_label:30, rp_impact:100, rp_description:300,
  ts_label:40, ts_impact:80,
};

// Section definitions per page type
export const SECTIONS = {
  seo_meta: {
    label: "SEO Meta Data",
    icon: "🔍",
    description: "Page location, meta title, meta description and keywords for search engines",
    pageTypes: {
      "Product":           { required: false },
      "Solutions":         { required: false },
      "Glossary":          { required: false },
      "On-demand Webinar": { required: false },
    },
  },
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
      "Product":           { required: false },
      "Solutions":         { required: false },
      "Glossary":          { required: null },
      "On-demand Webinar": { required: null },
    },
  },
  features_apps: {
    label: "Features / Applications",
    icon: "🔧",
    description: "List, tabs or table view of features or applications",
    pageTypes: {
      "Product":           { required: false },
      "Solutions":         { required: false },
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
  related_products: {
    label: "Related Products",
    icon: "📦",
    description: "Grid of related product cards with title, description and CTA",
    pageTypes: {
      "Product":           { required: false },
      "Solutions":         { required: false },
      "Glossary":          { required: null },
      "On-demand Webinar": { required: null },
    },
  },
  training_support: {
    label: "Training & Support",
    icon: "🎓",
    description: "Pre-filled training, online support and technical forums cards",
    pageTypes: {
      "Product":           { required: false },
      "Solutions":         { required: false },
      "Glossary":          { required: false },
      "On-demand Webinar": { required: false },
    },
  },
};

// ─── v2 Parallel Workflow Constants ──────────────────────────────────────────
// Everything below is additive. Nothing above this line was changed.

export const TASK_STATUS_META = {
  locked:            { label: 'Locked',           color: '#B5B5B5', bg: '#F9F9F9', icon: '🔒' },
  pending:           { label: 'Pending',           color: '#646464', bg: '#F3F3F3', icon: '⏳' },
  in_progress:       { label: 'In Progress',       color: '#1b5793', bg: '#eff6ff', icon: '⚡' },
  waiting_for_brand: { label: 'Waiting for Brand', color: '#d97706', bg: '#fffbeb', icon: '🎨' },
  needs_info:        { label: 'Needs Info',        color: '#d97706', bg: '#fffbeb', icon: '❓' },
  pending_approval:  { label: 'Needs Approval',    color: '#9333ea', bg: '#faf5ff', icon: '👁️' },
  pending_action:    { label: 'Pending Action',    color: '#dc2626', bg: '#fef2f2', icon: '🔴' },
  completed:         { label: 'Completed',         color: '#2a7a4b', bg: '#ecfdf5', icon: '✅' },
};

export const OVERALL_STATUS_META = {
  pending_admin:       { label: 'Pending Admin Review', color: '#d97706', bg: '#fffbeb' },
  in_progress:         { label: 'In Progress',          color: '#1b5793', bg: '#eff6ff' },
  pending_stakeholder: { label: 'Needs Approval',       color: '#9333ea', bg: '#faf5ff' },
  pending_web:         { label: 'Web Team Active',      color: '#2c90b2', bg: '#e8f4fb' },
  published:           { label: 'Published',            color: '#2a7a4b', bg: '#ecfdf5' },
};

// Ordered list of all task teams
export const TASK_TEAMS = [
  'editorial_team', 'brand_team', 'seo_team', 'design_team', 'web_team',
];

// Teams that run in parallel (all must complete before web_team unlocks)
export const PARALLEL_TEAMS = [
  'editorial_team', 'brand_team', 'seo_team', 'design_team',
];

// Which teams must complete before a given team can start
export const TASK_DEPENDENCY_MAP = {
  editorial_team: [],
  brand_team:     [],
  seo_team:       [],
  design_team:    [],
  web_team:       ['editorial_team', 'brand_team', 'seo_team', 'design_team'],
};

export const PRIORITY_META = {
  low:    { label: 'Low',    color: '#64748b', bg: '#f8fafc' },
  normal: { label: 'Normal', color: '#1b5793', bg: '#eff6ff' },
  high:   { label: 'High',   color: '#d97706', bg: '#fffbeb' },
  urgent: { label: 'Urgent', color: '#c0392b', bg: '#fef2f2' },
};

export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED:     'task_assigned',
  TASK_COMPLETED:    'task_completed',
  APPROVAL_NEEDED:   'approval_needed',
  APPROVAL_GRANTED:  'approval_granted',
  APPROVAL_REJECTED: 'approval_rejected',
  QUESTION_ASKED:    'question_asked',
  ANSWER_RECEIVED:   'answer_received',
  PRIORITY_CHANGED:  'priority_changed',
  CHANGES_REQUESTED: 'changes_requested',
  WEB_TEAM_UNLOCKED: 'web_team_unlocked',
  PUBLISHED:         'published',
};

export const AUDIT_ACTIONS = {
  TASK_CREATED:           'task.created',
  TASK_STATUS_CHANGED:    'task.status_changed',
  TASK_ASSIGNED:          'task.assigned',
  TASK_COMPLETED:         'task.completed',
  REQUEST_SUBMITTED:      'request.submitted',
  REQUEST_STATUS_CHANGED: 'request.status_changed',
  APPROVAL_GIVEN:         'approval.given',
  APPROVAL_REJECTED:      'approval.rejected',
  ATTACHMENT_UPLOADED:    'attachment.uploaded',
  USER_ROLE_SWITCHED:     'user.role_switched',
};

// ─────────────────────────────────────────────────────────────────────────────

export const getSectionsForPageType = (pageType) => {
  const all = Object.entries(SECTIONS)
    .filter(([, s]) => s.pageTypes[pageType] != null)
    .map(([key, s]) => ({
      key,
      ...s,
      required: s.pageTypes[pageType]?.required ?? false,
    }));
  // Move SEO Meta Data to last tab
  const seoIdx = all.findIndex(s => s.key === "seo_meta");
  if (seoIdx > -1) all.push(all.splice(seoIdx, 1)[0]);
  return all;
};
