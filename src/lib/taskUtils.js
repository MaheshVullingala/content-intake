import { supabase } from "@/lib/supabase";

export const TASK_TEAMS = [
  { role: "editorial_qa", label: "Editorial QA", icon: "✍️",  alwaysRequired: true,  webLocked: false, selfCompletes: true  },
  { role: "brand_team",   label: "Brand Team",   icon: "🎨",  alwaysRequired: false, webLocked: false, selfCompletes: false },
  { role: "seo_team",     label: "SEO Team",     icon: "🔍",  alwaysRequired: true,  webLocked: false, selfCompletes: true  },
  { role: "design_qa",    label: "Design QA",    icon: "🖼️",  alwaysRequired: true,  webLocked: false, selfCompletes: false },
  { role: "web_team",     label: "Web Team",     icon: "🌐",  alwaysRequired: true,  webLocked: true,  selfCompletes: true  },
];

export const TASK_STATUS_META = {
  locked:           { label: "Locked",         color: "#B5B5B5", bg: "#F9F9F9", icon: "🔒" },
  pending:          { label: "Pending",         color: "#646464", bg: "#F3F3F3", icon: "⏳" },
  in_progress:      { label: "In Progress",     color: "#1b5793", bg: "#eff6ff", icon: "⚡" },
  needs_info:       { label: "Needs Info",      color: "#d97706", bg: "#fffbeb", icon: "❓" },
  pending_approval: { label: "Needs Approval",  color: "#9333ea", bg: "#faf5ff", icon: "👁️" },
  completed:        { label: "Completed",       color: "#2a7a4b", bg: "#ecfdf5", icon: "✅" },
};

export const OVERALL_STATUS_META = {
  pending_admin:       { label: "Pending Admin",   color: "#d97706", bg: "#fffbeb" },
  in_progress:         { label: "In Progress",     color: "#1b5793", bg: "#eff6ff" },
  pending_stakeholder: { label: "Needs Approval",  color: "#9333ea", bg: "#faf5ff" },
  pending_web:         { label: "Web Team Active", color: "#2c90b2", bg: "#e8f4fb" },
  published:           { label: "Published",       color: "#2a7a4b", bg: "#ecfdf5" },
};

export const getTaskTeam  = (role) => TASK_TEAMS.find(t => t.role === role);
export const getTaskStatus = (key) => TASK_STATUS_META[key] || TASK_STATUS_META.pending;

// Create task rows and set request to in_progress
export const createTasksForRequest = async (requestId, selectedRoles, adminId) => {
  const tasks = TASK_TEAMS
    .filter(t => selectedRoles.includes(t.role))
    .map(t => ({
      request_id:  requestId,
      team_role:   t.role,
      status:      t.role === "web_team" ? "locked" : "pending",
      is_required: true,
    }));

  const { data, error } = await supabase.from("tasks").insert(tasks).select();
  if (error) throw error;

  const { error: reqErr } = await supabase.from("requests").update({
    overall_status:    "in_progress",
    admin_reviewed_by: adminId,
    admin_reviewed_at: new Date().toISOString(),
  }).eq("id", requestId);
  if (reqErr) throw reqErr;

  return data;
};

export const getTasksForRequest = async (requestId) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
};

export const updateTask = async (taskId, updates) => {
  const payload = { ...updates, updated_at: new Date().toISOString() };
  if (updates.status === "completed") payload.completed_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("tasks").update(payload).eq("id", taskId).select().single();
  if (error) throw error;
  return data;
};

// Recalculate and persist overall_status after any task change
export const syncOverallStatus = async (requestId) => {
  let tasks = await getTasksForRequest(requestId);
  if (!tasks.length) return;

  const webTask = tasks.find(t => t.team_role === "web_team");
  const nonWeb  = tasks.filter(t => t.team_role !== "web_team");
  const allNonWebDone = nonWeb.length > 0 && nonWeb.every(t => t.status === "completed");

  // Unlock web team when all other tasks are done, then re-fetch so
  // newStatus calculation sees the real DB state instead of stale local values
  if (allNonWebDone && webTask?.status === "locked") {
    await supabase.from("tasks").update({
      status:      "pending",
      unlocked_at: new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    }).eq("id", webTask.id);
    tasks = await getTasksForRequest(requestId);
  }

  const freshWeb  = tasks.find(t => t.team_role === "web_team");
  const freshNonWeb = tasks.filter(t => t.team_role !== "web_team");

  let newStatus = "in_progress";
  if (freshWeb?.status === "completed") {
    newStatus = "published";
  } else if (freshWeb && ["in_progress", "pending"].includes(freshWeb.status) && allNonWebDone) {
    newStatus = "pending_web";
  } else if (freshNonWeb.some(t => t.status === "pending_approval")) {
    newStatus = "pending_stakeholder";
  } else {
    newStatus = "in_progress";
  }

  await supabase.from("requests").update({ overall_status: newStatus }).eq("id", requestId);
  return newStatus;
};

export const getTasksWithAssignees = async (requestId) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, assignee:users!tasks_assigned_to_fkey(id, name, role)")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
};
