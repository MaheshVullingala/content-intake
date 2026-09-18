import {
  FaUser, FaPenNib, FaImage, FaGlobe, FaCog, FaPalette, FaSearch, FaBolt,
  FaClipboardList, FaStar, FaTools, FaPuzzlePiece, FaQuoteRight, FaBullhorn,
  FaFileAlt, FaBook, FaBoxOpen, FaGraduationCap, FaEllipsisH, FaEye,
} from "react-icons/fa";

export const PAGE_TYPES = ["Product", "Solutions", "Glossary", "On-demand Webinar"];

export const STATUS_FLOW = [
  { key: "draft",             label: "Draft",            color: "#B5B5B5", bg: "#F9F9F9" },
  { key: "editorial_qa",     label: "Editorial QA",     color: "#646464", bg: "#F3F3F3" },
  { key: "design_qa",        label: "Design QA",        color: "#3C3C3C", bg: "#EFEFEF" },
  { key: "pending_approval", label: "Pending Approval", color: "#181313", bg: "#EAEAEA" },
  { key: "web_team",         label: "Web Team",         color: "#06b6d4", bg: "#ecfeff" },
  { key: "published",        label: "Published",        color: "#2a7a4b", bg: "#ecfdf5" },
];

// `icon` is a react-icons component reference (not a rendered element) --
// was an emoji string, which read as unofficial/inconsistent across OSes
// and clashed with the teal/monochrome palette. Consumers render it as
// <meta.icon /> (member-expression JSX tags work fine as components).
//
// Consolidated to 4 roles (2026-09-11, see sql/29-role-consolidation.sql):
// stakeholder / editorial_team / admin / general. brand_team, seo_team,
// design_team, web_team, design_qa, editorial_qa and super_admin are
// retired -- real accounts holding them were migrated by that SQL file
// (editorial_qa -> editorial_team, super_admin -> admin, everything else
// -> general), so no live user row can hold those values anymore. Left
// out of this map entirely rather than kept dormant, since ROLE_META is
// keyed by exactly the role strings the DB can now contain.
export const ROLE_META = {
  stakeholder:    { label: "Stakeholder", color: "#181313", icon: FaUser },
  editorial_team: { label: "Editorial",   color: "#2a7a4b", bg: "#ecfdf5", icon: FaPenNib },
  admin:          { label: "Admin",       color: "#181313", icon: FaCog },
  // Read-only role: views every request + page preview, can still post
  // section-scoped comments, cannot edit content or change status.
  general:        { label: "General",     color: "#646464", bg: "#F3F3F3", icon: FaEye },
};

// Drives Navbar.js's "View as" impersonation dropdown (admin only, now
// that super_admin has been folded into admin).
export const ROLE_OPTIONS = [
  { value: "admin",          label: "Admin"          },
  { value: "stakeholder",    label: "Stakeholder"    },
  { value: "editorial_team", label: "Editorial"      },
  { value: "general",        label: "General"        },
];

export const getStatus = (key) =>
  STATUS_FLOW.find(s => s.key === key) || STATUS_FLOW[0];

export const canAct = (role, status) => ({
  editorial_qa: "editorial_qa",
  design_qa:    "design_qa",
  stakeholder:  "pending_approval",
  web_team:     "web_team",
}[role] === status);

// Unused (no call sites) -- legacy v1 linear-flow helper, superseded by the
// v2 parallel-task workflow. Left in place rather than deleted, matching
// this codebase's "dormant, not deleted" convention.
export const nextActionLabel = (role, status) => {
  if (role === "stakeholder" && status === "pending_approval") return "Approve & Send to Web Team";
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

// Also unused -- see nextActionLabel above.
export const returnActionLabel = (role) => ({
  editorial_qa: "Return for Revision",
  design_qa:    "Query Stakeholder",
}[role] || "Return");

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
  overview_label:30, overview_impact:100, overview_description:600, overview_media_alt:150,
  kb_label:30, kb_impact:100, kb_description:300,
  fa_label:30, fa_impact:100, fa_description:300,
  app_label:30, app_impact:100, app_description:300,
  cs_label:30, cs_impact:100,
  promo_label:30, promo_title:120, promo_description:300, promo_btn_label:30, promo_btn_link:300,
  rc_label:30, rc_impact:100,
  res_label:30, res_impact:100,
  rp_label:30, rp_impact:100, rp_description:300,
  ts_label:40, ts_impact:80,
};

// Section definitions per page type. `icon` is a react-icons component
// reference (see ROLE_META above for the same pattern) -- was emoji.
export const SECTIONS = {
  seo_meta: {
    label: "SEO Meta Data",
    icon: FaSearch,
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
    icon: FaImage,
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
    icon: FaClipboardList,
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
    icon: FaStar,
    description: "Label, impact statement and benefit cards with icons",
    pageTypes: {
      "Product":           { required: false },
      "Solutions":         { required: false },
      "Glossary":          { required: null },
      "On-demand Webinar": { required: null },
    },
  },
  features_apps: {
    label: "Features",
    icon: FaTools,
    description: "List or table view of product features",
    pageTypes: {
      "Product":           { required: false },
      "Solutions":         { required: false },
      "Glossary":          { required: null },
      "On-demand Webinar": { required: null },
    },
  },
  applications: {
    label: "Applications",
    icon: FaPuzzlePiece,
    description: "Horizontal or vertical tabs covering how the product applies to different use cases",
    pageTypes: {
      "Product":           { required: false },
      "Solutions":         { required: false },
      "Glossary":          { required: null },
      "On-demand Webinar": { required: null },
    },
  },
  customer_stories: {
    label: "Customer Stories",
    icon: FaQuoteRight,
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
    icon: FaBullhorn,
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
    icon: FaFileAlt,
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
    icon: FaBook,
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
    icon: FaBoxOpen,
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
    icon: FaGraduationCap,
    description: "Pre-filled training, online support and technical forums cards",
    pageTypes: {
      "Product":           { required: false },
      "Solutions":         { required: false },
      "Glossary":          { required: false },
      "On-demand Webinar": { required: false },
    },
  },
  others: {
    label: "Others",
    icon: FaEllipsisH,
    description: "Custom section requests that don't fit an existing section — label, impact statement, rich-text description and layout explanation",
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

// Unused/orphaned duplicate -- every real consumer (Dashboard.js,
// TaskPanel.js, TaskBoardOverview.js) imports TASK_STATUS_META from
// taskUtils.js instead. Left in place (dormant, not deleted) but emoji
// stripped for consistency with the rest of the sweep.
export const TASK_STATUS_META = {
  locked:            { label: 'Locked',           color: '#B5B5B5', bg: '#F9F9F9' },
  pending:           { label: 'Pending',           color: '#646464', bg: '#F3F3F3' },
  in_progress:       { label: 'In Progress',       color: '#1b5793', bg: '#eff6ff' },
  waiting_for_brand: { label: 'Waiting for Brand', color: '#d97706', bg: '#fffbeb' },
  needs_info:        { label: 'Needs Info',        color: '#d97706', bg: '#fffbeb' },
  pending_approval:  { label: 'Needs Approval',    color: '#9333ea', bg: '#faf5ff' },
  pending_action:    { label: 'Pending Action',    color: '#dc2626', bg: '#fef2f2' },
  completed:         { label: 'Completed',         color: '#2a7a4b', bg: '#ecfdf5' },
};

export const OVERALL_STATUS_META = {
  pending_admin:       { label: 'Pending Admin Review', color: '#d97706', bg: '#fffbeb' },
  in_progress:         { label: 'In Progress',          color: '#1b5793', bg: '#eff6ff' },
  pending_stakeholder: { label: 'Needs Approval',       color: '#9333ea', bg: '#faf5ff' },
  pending_web:         { label: 'Web Team Active',      color: '#2c90b2', bg: '#e8f4fb' },
  published:           { label: 'Published',            color: '#2a7a4b', bg: '#ecfdf5' },
};

// Ordered list of all task teams -- trimmed to editorial_team only
// (2026-09-11 role consolidation; see sql/29-role-consolidation.sql).
// brand_team/seo_team/design_team/web_team are retired: AdminTaskSetup.js
// no longer creates task rows for them, so nothing new will ever hold
// those team_role values. Historical task rows on old requests keep
// their original team_role (tasks.team_role's DB constraint was
// deliberately left untouched -- see that SQL file's header comment) --
// this array only controls what happens going forward.
export const TASK_TEAMS = [
  'editorial_team',
];

// Teams that run in parallel (all must complete before web_team
// unlocks) -- moot now that web_team is retired, but kept as a
// single-entry array rather than removed outright since taskUtils.js's
// sync logic is written generically against this list.
export const PARALLEL_TEAMS = [
  'editorial_team',
];

// Which teams must complete before a given team can start
export const TASK_DEPENDENCY_MAP = {
  editorial_team: [],
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
  CONTENT_CHANGE_SUBMITTED: 'content_change_submitted',
  CONTENT_CHANGE_REJECTED:  'content_change_rejected',
  CONTENT_UPDATED:          'content_updated',
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
  CONTENT_EDITED:         'content.edited',
  CONTENT_CHANGE_SUBMITTED:  'content_change.submitted',
  CONTENT_CHANGE_APPROVED:   'content_change.approved',
  CONTENT_CHANGE_REJECTED:   'content_change.rejected',
  CONTENT_CHANGE_FAST_LANED: 'content_change.fast_laned',
  JIRA_TICKET_LINKED:     'jira_ticket.linked',
  JIRA_TICKET_CREATED:    'jira_ticket.created', // auto-created at stakeholder submit — see /api/jira/create-ticket
  REVIEW_STARTED:         'review.started',
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
