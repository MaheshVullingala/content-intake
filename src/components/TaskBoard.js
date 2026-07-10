"use client";
import { useState, useEffect } from "react";
import AdminTaskSetup    from "@/components/AdminTaskSetup";
import TaskBoardOverview from "@/components/TaskBoardOverview";
import TaskPanel         from "@/components/TaskPanel";
import PagePreview       from "@/components/PagePreview";
import WebTeamView       from "@/components/WebTeamView";
import { OVERALL_STATUS_META, getTasksForRequest } from "@/lib/taskUtils";

const TEAM_ROLES = new Set([
  "editorial_team", "brand_team", "seo_team", "design_team", "web_team",
]);

// Spec-exact two-column layout
const TWO_COL = {
  display: "grid",
  gridTemplateColumns: "60% 40%",
  gap: "1.5rem",
  height: "calc(100vh - 120px)",
  overflow: "hidden",
};

export default function TaskBoard({
  req, user, supabase,
  tasks = [], attachments = [],
  onRefresh, go,
}) {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [loading,    setLoading]    = useState(false);

  const isAdmin       = ["admin", "super_admin"].includes(user.role);
  const isTeamMember  = TEAM_ROLES.has(user.role);
  const isStakeholder = user.role === "stakeholder";
  const isPendingAdmin = req.overall_status === "pending_admin";

  const overallMeta = OVERALL_STATUS_META[req.overall_status]
    ?? OVERALL_STATUS_META.in_progress;

  const myTask = isTeamMember
    ? localTasks.find(t => t.team_role === user.role) ?? null
    : null;

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await getTasksForRequest(req.id, supabase);
    if (!error) setLocalTasks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [req.id]);

  const handleRefresh = () => { fetchTasks(); onRefresh?.(); };

  // ── Shared page header ──────────────────────────────────────────────
  function Header() {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12,
                    marginBottom: "1.25rem" }}>
        <button
          className="btn-ghost"
          onClick={() => go("dashboard")}
          style={{ flexShrink: 0, marginTop: 2 }}
        >
          ← Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: "var(--color-night)",
                        marginBottom: 5, lineHeight: 1.3 }}>
            {req.page_title || "Untitled Request"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="badge badge-light">{req.page_type}</span>
            <span style={{ color: "var(--color-silver)", fontSize: 12 }}>
              by {req.users?.name || "Unknown"}
            </span>
            {req.created_at && (
              <span style={{ color: "var(--color-silver)", fontSize: 12 }}>
                · {new Date(req.created_at).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
              </span>
            )}
            <span style={{
              background: overallMeta.bg,
              color: overallMeta.color,
              border: `1px solid ${overallMeta.color}33`,
              borderRadius: 20, padding: "2px 10px",
              fontSize: 11, fontWeight: 500,
            }}>
              {overallMeta.label}
            </span>
            {req.priority && req.priority !== "normal" && (
              <span style={{
                background: req.priority === "urgent" ? "#fef2f2" : "#fffbeb",
                color:      req.priority === "urgent" ? "#c0392b" : "#d97706",
                border: `1px solid ${req.priority === "urgent" ? "#c0392b33" : "#d9770633"}`,
                borderRadius: 20, padding: "2px 10px",
                fontSize: 11, fontWeight: 600,
              }}>
                {req.priority.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading && localTasks.length === 0) {
    return (
      <div>
        <Header />
        <div className="alert alert-info mt-12">Loading tasks…</div>
      </div>
    );
  }

  // ── View 1: Admin + pending_admin → AdminTaskSetup ──────────────────
  if (isAdmin && isPendingAdmin) {
    return (
      <div>
        <Header />
        <AdminTaskSetup
          req={req}
          user={user}
          supabase={supabase}
          onTasksCreated={handleRefresh}
        />
      </div>
    );
  }

  // ── View 2: Team member → PagePreview (left) + TaskPanel (right) ────
  if (isTeamMember) {
    if (isPendingAdmin) {
      return (
        <div>
          <Header />
          <div className="alert alert-info mt-12">
            ⏳ An administrator needs to set up tasks before work can begin.
          </div>
        </div>
      );
    }
    if (!myTask) {
      return (
        <div>
          <Header />
          <div className="alert alert-info mt-12">
            ℹ️ Your team was not assigned a task for this request.
          </div>
        </div>
      );
    }
    return (
      <div>
        <Header />
        <div style={TWO_COL}>
          <div style={{ overflowY: "auto" }}>
            {user.role === "web_team" ? (
              <WebTeamView
                req={req}
                user={user}
                supabase={supabase}
                attachments={attachments}
                onRefresh={handleRefresh}
              />
            ) : (
              <PagePreview req={req} pageType={req.page_type} />
            )}
          </div>
          <div style={{ overflowY: "auto",
                        borderLeft: "1px solid var(--color-border)",
                        paddingLeft: "1.5rem" }}>
            <TaskPanel
              task={myTask}
              req={req}
              user={user}
              supabase={supabase}
              attachments={attachments}
              onRefresh={handleRefresh}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── View 3: Stakeholder → TaskBoardOverview ─────────────────────────
  if (isStakeholder) {
    return (
      <div>
        <Header />
        {isPendingAdmin ? (
          <div className="alert alert-info mt-12">
            ⏳ An administrator is reviewing your request and will set up tasks shortly.
          </div>
        ) : (
          <TaskBoardOverview
            tasks={localTasks}
            req={req}
            user={user}
            supabase={supabase}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    );
  }

  // ── View 4: Admin (non-pending) → PagePreview (left) + TaskBoardOverview (right)
  if (isAdmin) {
    return (
      <div>
        <Header />
        <div style={TWO_COL}>
          <div style={{ overflowY: "auto" }}>
            <PagePreview req={req} pageType={req.page_type} />
          </div>
          <div style={{ overflowY: "auto",
                        borderLeft: "1px solid var(--color-border)",
                        paddingLeft: "1.5rem" }}>
            <TaskBoardOverview
              tasks={localTasks}
              req={req}
              user={user}
              supabase={supabase}
              onRefresh={handleRefresh}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Fallback ─────────────────────────────────────────────────────────
  return (
    <div>
      <Header />
      <div className="alert alert-info mt-12">
        You don't have access to this view.
      </div>
    </div>
  );
}
