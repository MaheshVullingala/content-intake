"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getTasksWithAssignees, TASK_STATUS_META, OVERALL_STATUS_META, getTaskTeam } from "@/lib/taskUtils";
import AdminTaskSetup from "@/components/AdminTaskSetup";
import TaskPanel from "@/components/TaskPanel";
import PagePreview from "@/components/PagePreview";
import styles from "@/styles/task-board.module.css";

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

  const handleTasksCreated = () => {
    fetchAll();
    parentRefresh?.();
  };

  const handleRefresh = () => {
    fetchAll();
    parentRefresh?.();
  };

  const overallMeta = OVERALL_STATUS_META[req.overall_status] || OVERALL_STATUS_META.in_progress;

  const openTask = (task) => {
    if (task.status === "locked" && user.role !== "admin") return;
    setActiveTask(task);
  };

  // Determine card action label + variant for current user
  const getCardAction = (task) => {
    const isMyTask = user.role === task.team_role;
    const isStakeholder = user.role === "stakeholder";

    if (task.status === "locked") return { label: "🔒 Locked", variant: "disabled" };
    if (task.status === "completed") return { label: "✅ Completed", variant: "disabled" };

    if (isStakeholder && task.status === "pending_approval") {
      return { label: "👁️ Review & Approve", variant: "approve" };
    }
    if (isMyTask && task.status === "pending") return { label: "⚡ Start", variant: "primary" };
    if (isMyTask && task.status === "in_progress") return { label: "📋 View Task", variant: "primary" };
    if (isMyTask && task.status === "pending_approval") return { label: "⏳ Awaiting approval", variant: "secondary" };
    if (isMyTask && task.status === "needs_info") return { label: "❓ Needs info", variant: "secondary" };

    return { label: "👁️ View", variant: "secondary" };
  };

  if (loading) return (
    <div className={styles.wrap}>
      <div className={styles.loading}>Loading tasks…</div>
    </div>
  );

  const isPendingAdmin = req.overall_status === "pending_admin";
  const isAdmin        = user.role === "admin";

  return (
    <div className={styles.wrap}>
      {/* Back + header */}
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

      {/* Content preview strip */}
      <div className={styles.previewStrip}>
        <div className={styles.previewStripInfo}>
          <span>📄</span>
          <span>View full content preview</span>
        </div>
        <button className={styles.previewStripBtn} onClick={() => setShowPreview(v => !v)}>
          {showPreview ? "Hide Preview" : "Show Preview →"}
        </button>
      </div>

      {/* Full page preview (collapsible) */}
      {showPreview && (
        <div className={styles.previewWrapper}>
          <PagePreview req={req} pageType={req.page_type} />
        </div>
      )}

      {/* Admin task setup banner */}
      {isPendingAdmin && isAdmin && tasks.length === 0 && (
        <AdminTaskSetup req={req} user={user} onTasksCreated={handleTasksCreated} />
      )}

      {/* Pending admin — non-admin waiting screen */}
      {isPendingAdmin && !isAdmin && (
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

      {/* Task grid */}
      {tasks.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Parallel Tasks</div>
          <div className={styles.taskGrid}>
            {tasks.map(task => {
              const team    = getTaskTeam(task.team_role);
              const stMeta  = TASK_STATUS_META[task.status] || TASK_STATUS_META.pending;
              const action  = getCardAction(task);
              const isLocked = task.status === "locked";
              const isDone   = task.status === "completed";
              const isApproval = task.status === "pending_approval";
              const isMyTask = user.role === task.team_role;

              return (
                <div
                  key={task.id}
                  className={[
                    styles.taskCard,
                    isLocked  ? styles.locked      : "",
                    isDone    ? styles.completed   : "",
                    isApproval ? styles.needsApproval : "",
                    isMyTask  ? styles.mine        : "",
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
                    {isLocked  && "Unlocks when all other tasks complete"}
                    {task.status === "pending" && !isLocked && "Ready to start"}
                    {task.status === "in_progress" && "Currently in progress"}
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
      )}

      {/* Task panel slide-in */}
      {activeTask && (
        <TaskPanel
          task={activeTask}
          req={req}
          user={user}
          attachments={attachments}
          onClose={() => setActiveTask(null)}
          onRefresh={() => {
            fetchAll();
            setActiveTask(null);
          }}
        />
      )}
    </div>
  );
}
