"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getTasksWithAssignees, TASK_STATUS_META, OVERALL_STATUS_META, getTaskTeam } from "@/lib/taskUtils";
import AdminTaskSetup from "@/components/AdminTaskSetup";
import TaskPanel from "@/components/TaskPanel";
import PagePreview from "@/components/PagePreview";
import styles from "@/styles/task-board.module.css";

const TEAM_ROLES = ["editorial_qa", "brand_team", "seo_team", "design_qa", "web_team"];

function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function TaskBoard({ req, user, go, onRefresh: parentRefresh }) {
  const [tasks,       setTasks]       = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTask,  setActiveTask]  = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [taskData, { data: atts }] = await Promise.all([
        getTasksWithAssignees(req.id),
        supabase.from("attachments").select("*").eq("request_id", req.id).order("created_at"),
      ]);
      setTasks(taskData);
      setAttachments(atts || []);
    } catch(e) {
      console.error("TaskBoard fetch:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [req.id]);

  const handleTasksCreated = () => { fetchAll(); parentRefresh?.(); };
  const handleRefresh      = () => { fetchAll(); parentRefresh?.(); };

  const overallMeta  = OVERALL_STATUS_META[req.overall_status] || OVERALL_STATUS_META.in_progress;
  const isPendingAdmin = req.overall_status === "pending_admin";
  const isAdmin        = user.role === "admin";
  const isTeamMember   = TEAM_ROLES.includes(user.role);
  const isStakeholder  = user.role === "stakeholder";

  const myTask = isTeamMember ? tasks.find(t => t.team_role === user.role) : null;

  // ── Shared header used in all views ───────────────────────────────
  const header = (
    <div className={styles.header}>
      <button className={styles.backBtn} onClick={() => go("dashboard")}>
        ← Dashboard
      </button>
      <div className={styles.headerInfo}>
        <div className={styles.title}>{req.page_title || "Untitled Request"}</div>
        <div className={styles.meta}>
          <span>{req.page_type}</span>
          <span className={styles.metaDot}>·</span>
          <span>by {req.users?.name || "Unknown"}</span>
          {req.created_at && (
            <>
              <span className={styles.metaDot}>·</span>
              <span>{formatDate(req.created_at)}</span>
            </>
          )}
          <span className={styles.metaDot}>·</span>
          <span
            className={styles.overallBadge}
            style={{ background: overallMeta.bg, color: overallMeta.color, borderColor: overallMeta.color + "33" }}
          >
            {overallMeta.label}
          </span>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className={styles.wrap}>
      <div className={styles.loading}>Loading tasks…</div>
    </div>
  );

  // ── VIEW 1: Team member — two-column (preview + task panel) ───────
  if (isTeamMember) {
    // Still waiting for admin to create tasks
    if (isPendingAdmin) {
      return (
        <div className={styles.wrap}>
          {header}
          <div className={styles.pendingAdminBanner}>
            <span className={styles.pendingAdminIcon}>⏳</span>
            <div className={styles.pendingAdminText}>
              <div className={styles.pendingAdminTitle}>Waiting for admin to set up tasks</div>
              <div className={styles.pendingAdminSub}>
                An administrator needs to review and create tasks for this request before work can begin.
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Tasks created but this team wasn't included
    if (!myTask && tasks.length > 0) {
      return (
        <div className={styles.wrap}>
          {header}
          <div className={styles.notAssignedBanner}>
            <span style={{ fontSize: 22 }}>ℹ️</span>
            <div>Your team was not assigned a task for this request.</div>
          </div>
        </div>
      );
    }

    // Two-column: page preview on left, task panel on right
    if (myTask) {
      return (
        <div className={styles.wrap}>
          {header}
          <div className={styles.twoColLayout}>
            <div className={styles.previewCol}>
              <PagePreview req={req} pageType={req.page_type} />
            </div>
            <div className={styles.taskCol}>
              <TaskPanel
                task={myTask}
                req={req}
                user={user}
                attachments={attachments}
                inline={true}
                onClose={() => go("dashboard")}
                onRefresh={handleRefresh}
              />
            </div>
          </div>
        </div>
      );
    }
  }

  // ── VIEW 2: Admin ─────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className={styles.wrap}>
        {header}

        {/* Preview toggle */}
        <div className={styles.previewStrip}>
          <div className={styles.previewStripInfo}>
            <span>📄</span>
            <span>View full content preview</span>
          </div>
          <button className={styles.previewStripBtn} onClick={() => setShowPreview(v => !v)}>
            {showPreview ? "Hide Preview" : "Show Preview →"}
          </button>
        </div>
        {showPreview && (
          <div className={styles.previewWrapper}>
            <PagePreview req={req} pageType={req.page_type} />
          </div>
        )}

        {isPendingAdmin && tasks.length === 0 && (
          <AdminTaskSetup req={req} user={user} onTasksCreated={handleTasksCreated} />
        )}

        {tasks.length > 0 && <TaskGrid tasks={tasks} user={user} onOpen={setActiveTask} />}

        {activeTask && (
          <TaskPanel
            task={activeTask}
            req={req}
            user={user}
            attachments={attachments}
            onClose={() => setActiveTask(null)}
            onRefresh={() => { fetchAll(); setActiveTask(null); }}
          />
        )}
      </div>
    );
  }

  // ── VIEW 3: Stakeholder — overview grid ───────────────────────────
  return (
    <div className={styles.wrap}>
      {header}

      <div className={styles.previewStrip}>
        <div className={styles.previewStripInfo}>
          <span>📄</span>
          <span>View full content preview</span>
        </div>
        <button className={styles.previewStripBtn} onClick={() => setShowPreview(v => !v)}>
          {showPreview ? "Hide Preview" : "Show Preview →"}
        </button>
      </div>
      {showPreview && (
        <div className={styles.previewWrapper}>
          <PagePreview req={req} pageType={req.page_type} />
        </div>
      )}

      {isPendingAdmin && (
        <div className={styles.pendingAdminBanner}>
          <span className={styles.pendingAdminIcon}>⏳</span>
          <div className={styles.pendingAdminText}>
            <div className={styles.pendingAdminTitle}>Waiting for admin to set up tasks</div>
            <div className={styles.pendingAdminSub}>
              An administrator needs to review and create tasks for this request before work can begin.
            </div>
          </div>
        </div>
      )}

      {tasks.length > 0 && <TaskGrid tasks={tasks} user={user} onOpen={setActiveTask} />}

      {activeTask && (
        <TaskPanel
          task={activeTask}
          req={req}
          user={user}
          attachments={attachments}
          onClose={() => setActiveTask(null)}
          onRefresh={() => { fetchAll(); setActiveTask(null); }}
        />
      )}
    </div>
  );
}

// ── Shared task cards grid (admin + stakeholder) ───────────────────
function TaskGrid({ tasks, user, onOpen }) {
  const getCardAction = (task) => {
    const isMyTask    = user.role === task.team_role;
    const isStakeholder = user.role === "stakeholder";

    if (task.status === "locked")    return { label: "🔒 Locked",          variant: "disabled" };
    if (task.status === "completed") return { label: "✅ Completed",        variant: "disabled" };

    if (isStakeholder && task.status === "pending_approval") {
      return { label: "👁️ Review & Approve", variant: "approve" };
    }
    if (isMyTask && task.status === "pending")          return { label: "⚡ Start",             variant: "primary" };
    if (isMyTask && task.status === "in_progress")      return { label: "📋 View Task",         variant: "primary" };
    if (isMyTask && task.status === "pending_approval") return { label: "⏳ Awaiting approval", variant: "secondary" };
    if (isMyTask && task.status === "needs_info")       return { label: "❓ Needs info",        variant: "secondary" };

    return { label: "👁️ View", variant: "secondary" };
  };

  const openTask = (task) => {
    if (task.status === "locked" && user.role !== "admin") return;
    onOpen(task);
  };

  return (
    <>
      <div className={styles.sectionLabel}>Parallel Tasks</div>
      <div className={styles.taskGrid}>
        {tasks.map(task => {
          const team      = getTaskTeam(task.team_role);
          const stMeta    = TASK_STATUS_META[task.status] || TASK_STATUS_META.pending;
          const action    = getCardAction(task);
          const isLocked  = task.status === "locked";
          const isDone    = task.status === "completed";
          const isApproval = task.status === "pending_approval";
          const isMyTask  = user.role === task.team_role;

          return (
            <div
              key={task.id}
              className={[
                styles.taskCard,
                isLocked   ? styles.locked       : "",
                isDone     ? styles.completed    : "",
                isApproval ? styles.needsApproval : "",
                isMyTask   ? styles.mine         : "",
              ].join(" ")}
            >
              {isMyTask && <span className={styles.myBadge}>My Task</span>}

              <div className={styles.taskCardTop}>
                <span className={styles.taskIcon}>{team?.icon || "📋"}</span>
                <span
                  className={styles.statusChip}
                  style={{ background: stMeta.bg, color: stMeta.color }}
                >
                  {stMeta.icon} {stMeta.label}
                </span>
              </div>

              <div className={styles.taskLabel}>{team?.label || task.team_role}</div>

              {task.status === "needs_info" && (
                <div className={styles.qaIndicator}>❓ Has a question</div>
              )}

              <div className={styles.taskHint}>
                {isLocked   && "Unlocks when all other tasks complete"}
                {task.status === "pending"          && !isLocked && "Ready to start"}
                {task.status === "in_progress"      && "Currently in progress"}
                {task.status === "pending_approval" && "Waiting for stakeholder review"}
                {task.status === "needs_info"       && "Waiting for answer from stakeholder"}
                {isDone     && `Completed ${task.completed_at ? formatDate(task.completed_at) : ""}`}
              </div>

              <button
                className={`${styles.taskAction} ${styles[action.variant]}`}
                onClick={e => { e.stopPropagation(); openTask(task); }}
                disabled={action.variant === "disabled"}
              >
                {action.label}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
