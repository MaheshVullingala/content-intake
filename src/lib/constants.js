export const PAGE_TYPES = ["Product", "Solutions", "Glossary", "On-demand Webinar"];

export const STATUS_FLOW = [
  { key: "draft",             label: "Draft",            color: "#B5B5B5", bg: "#F9F9F9" },
  { key: "editorial_qa",     label: "Editorial QA",     color: "#646464", bg: "#F3F3F3" },
  { key: "design_qa",        label: "Design QA",        color: "#3C3C3C", bg: "#EFEFEF" },
  { key: "pending_approval", label: "Pending Approval", color: "#181313", bg: "#EAEAEA" },
  { key: "web_team",         label: "Web Team",         color: "#3C3C3C", bg: "#F0F0F0" },
  { key: "published",        label: "Published",        color: "#2a7a4b", bg: "#ecfdf5" },
];

export const ROLE_META = {
  stakeholder:  { label: "Stakeholder",  color: "#181313", icon: "👤" },
  editorial_qa: { label: "Editorial QA", color: "#3C3C3C", icon: "✍️"  },
  design_qa:    { label: "Design QA",    color: "#646464", icon: "🎨" },
  web_team:     { label: "Web Team",     color: "#3C3C3C", icon: "🌐" },
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
