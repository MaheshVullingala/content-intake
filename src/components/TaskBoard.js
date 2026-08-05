"use client";
import { useState, useEffect } from "react";
import AdminTaskSetup    from "@/components/AdminTaskSetup";
import TaskBoardOverview from "@/components/TaskBoardOverview";
import TaskPanel         from "@/components/TaskPanel";
import PagePreview       from "@/components/PagePreview";
import WebTeamView       from "@/components/WebTeamView";
import EditSectionModal  from "@/components/EditSectionModal";
import ProposeChangeWizard from "@/components/ProposeChangeWizard";
import PendingChangeCard   from "@/components/PendingChangeCard";
import { OVERALL_STATUS_META, getTasksForRequest, updateTask } from "@/lib/taskUtils";

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
  // null = closed, { section: 'overview', data: req } = open
  const [editModal,  setEditModal]  = useState(null);
  // Design Team's per-field mapped images (task_attachments, section_tag
  // prefixed "design_team:") — distinct from the `attachments` prop above,
  // which is the legacy v1 attachments table. Passed to PagePreview so it
  // can show Design Team's uploaded image in place of the placeholder box.
  const [designAttachments, setDesignAttachments] = useState([]);
  // Stakeholder "Suggest a Change" compose flow — see
  // ProposeChangeWizard.js, which owns its own reason/section state and
  // renders NewRequest.js's tabbed section editor. TaskBoard.js only
  // needs to know whether it's open.
  const [composingChange, setComposingChange] = useState(false);
  // Admin-side: the single pending content_change_requests row for this
  // request, if any — reviewed inline via PendingChangeCard.js.
  const [pendingChange, setPendingChange] = useState(null);

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

  const fetchDesignAttachments = async () => {
    const { data, error } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("request_id", req.id)
      .like("section_tag", "design_team:%");
    if (!error) setDesignAttachments(data || []);
  };

  const fetchPendingChange = async () => {
    const { data, error } = await supabase
      .from("content_change_requests")
      .select("*")
      .eq("request_id", req.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error) setPendingChange(data || null);
  };

  useEffect(() => { fetchTasks(); fetchDesignAttachments(); fetchPendingChange(); }, [req.id]);

  const handleRefresh = () => { fetchTasks(); fetchDesignAttachments(); fetchPendingChange(); onRefresh?.(); };

  // After the stakeholder edits content via a PagePreview ✎ button in
  // response to an editorial/seo question, auto-answer whichever
  // needs_info task(s) prompted it — the edit isn't tied to one specific
  // task, so every currently-open editorial/seo question gets resolved.
  const handleStakeholderEditSaved = async () => {
    setEditModal(null);
    const needsInfoTasks = localTasks.filter(t =>
      t.status === "needs_info" && ["editorial_team", "seo_team"].includes(t.team_role));
    await Promise.all(needsInfoTasks.map(t => updateTask(t.id, {
      status:          "in_progress",
      answer:          "Content has been updated",
      answer_at:       new Date().toISOString(),
      answer_given_by: user.id,
    }, supabase)));
    handleRefresh();
  };

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
              <span
                title={req.priority_override_reason
                  ? `Admin override: ${req.priority_override_reason}`
                  : req.stakeholder_priority_reason
                  ? `Stakeholder reason: ${req.stakeholder_priority_reason}`
                  : undefined}
                style={{
                  background: req.priority === "urgent" ? "#fef2f2" : "#fffbeb",
                  color:      req.priority === "urgent" ? "#c0392b" : "#d97706",
                  border: `1px solid ${req.priority === "urgent" ? "#c0392b33" : "#d9770633"}`,
                  borderRadius: 20, padding: "2px 10px",
                  fontSize: 11, fontWeight: 600,
                  cursor: (req.priority_override_reason || req.stakeholder_priority_reason) ? "help" : "default",
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
              <PagePreview
                req={req}
                pageType={req.page_type}
                editorialMode={user.role === "editorial_team"}
                activeEditSection={editModal?.section}
                onEditSection={(section) => setEditModal({ section, data: req })}
                attachments={designAttachments}
              />
            )}
          </div>
          <div style={{ overflowY: "auto",
                        borderLeft: "1px solid var(--color-border)",
                        paddingLeft: "1.5rem" }}>
            <TaskPanel
              tasks={localTasks}
              req={req}
              user={user}
              supabase={supabase}
              attachments={attachments}
              onRefresh={handleRefresh}
            />
          </div>
        </div>
        {editModal && (
          <EditSectionModal
            section={editModal.section}
            data={editModal.data}
            requestId={req.id}
            supabase={supabase}
            user={user}
            onClose={() => setEditModal(null)}
            onSaved={() => { setEditModal(null); handleRefresh(); }}
          />
        )}
      </div>
    );
  }

  // ── View 3: Stakeholder → TaskBoardOverview (+ PagePreview while a task
  //           is pending their approval, so they can see the actual page
  //           — including any Design Team image — before approving; or
  //           while editorial/seo has a needs_info question, so they can
  //           resolve it by editing content directly via PagePreview's
  //           own ✎ buttons instead of just typing a text answer) ──────
  if (isStakeholder) {
    // Composing a mid-flight change proposal — takes over the whole view
    // until submitted or cancelled. ProposeChangeWizard.js owns its own
    // reason/section state and renders the same tabbed section editor
    // NewRequest.js uses to create a request, so a previously-empty/N/A
    // section can be filled in here too (EditSectionModal-per-section
    // couldn't do that — see the "confusing" feedback that prompted this).
    if (composingChange) {
      return (
        <div>
          <Header />
          <ProposeChangeWizard
            req={req}
            user={user}
            supabase={supabase}
            onCancel={() => setComposingChange(false)}
            onSubmitted={() => { setComposingChange(false); handleRefresh(); }}
          />
        </div>
      );
    }

    const hasPendingApproval = localTasks.some(t => t.status === "pending_approval");
    const hasNeedsInfo = localTasks.some(t =>
      t.status === "needs_info" && ["editorial_team", "seo_team"].includes(t.team_role));
    const needsInfoSection = localTasks
      .find(t => t.status === "needs_info" &&
        ["editorial_team", "seo_team"].includes(t.team_role))
      ?.question?.match(/^\[(\w+)\]/)?.[1] || null;

    return (
      <div>
        <Header />
        {isPendingAdmin ? (
          <div className="alert alert-info mt-12">
            ⏳ An administrator is reviewing your request and will set up tasks shortly.
          </div>
        ) : (hasPendingApproval || hasNeedsInfo) ? (
          <div style={TWO_COL}>
            <div style={{ overflowY: "auto" }}>
              <PagePreview
                req={req}
                pageType={req.page_type}
                attachments={designAttachments}
                editorialMode={hasNeedsInfo}
                activeEditSection={editModal?.section}
                onEditSection={(section) => setEditModal({ section, data: req })}
                highlightSection={needsInfoSection}
              />
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
                singleColumn
              />
            </div>
            {editModal && (
              <EditSectionModal
                section={editModal.section}
                data={editModal.data}
                requestId={req.id}
                supabase={supabase}
                user={user}
                onClose={() => setEditModal(null)}
                onSaved={handleStakeholderEditSaved}
              />
            )}
          </div>
        ) : (
          <div>
            {req.overall_status && req.overall_status !== "published" && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button className="btn-ghost" onClick={() => setComposingChange(true)}>
                  ✎ Suggest a Change
                </button>
              </div>
            )}
            <TaskBoardOverview
              tasks={localTasks}
              req={req}
              user={user}
              supabase={supabase}
              onRefresh={handleRefresh}
            />
          </div>
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
            <PagePreview req={req} pageType={req.page_type} attachments={designAttachments} />
          </div>
          <div style={{ overflowY: "auto",
                        borderLeft: "1px solid var(--color-border)",
                        paddingLeft: "1.5rem" }}>
            {pendingChange && (
              <div style={{ marginBottom: 16 }}>
                <PendingChangeCard
                  change={pendingChange}
                  req={req}
                  user={user}
                  supabase={supabase}
                  tasks={localTasks}
                  onResolved={handleRefresh}
                />
              </div>
            )}
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
