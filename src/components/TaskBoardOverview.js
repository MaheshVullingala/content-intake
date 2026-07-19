"use client";
import { useState, useEffect } from "react";
import { TASK_TEAMS, TASK_STATUS_META, updateTask, syncOverallStatus, tryUnlockWebTeam } from "@/lib/taskUtils";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { logAudit } from "@/lib/auditLogger";
import EditSectionModal from "@/components/EditSectionModal";

async function fetchTaskFiles(req, supabase) {
  const { data } = await supabase
    .from("task_attachments")
    .select("*")
    .eq("request_id", req.id)
    .order("created_at", { ascending: false });
  return data || [];
}

// Best-effort guess at which section a question is about, so the edit
// modal can open directly on the right section instead of always making
// the stakeholder pick. Falls back to the picker (section=null) when
// nothing matches.
const SECTION_KEYWORDS = {
  banner:            ["banner", "headline", "cta"],
  overview:          ["overview"],
  key_benefits:      ["benefit"],
  features_apps:     ["feature", "application", "tab"],
  customer_stories:  ["customer stor", "testimonial", "quote", "endorsement"],
  promo_section:     ["promo"],
  related_content:   ["related content"],
  resources:         ["resource"],
  related_products:  ["related product"],
  training_support:  ["training", "support"],
  seo_meta:          ["seo", "meta", "keyword"],
};

const guessSection = (question = "") => {
  const q = question.toLowerCase();
  for (const [key, words] of Object.entries(SECTION_KEYWORDS)) {
    if (words.some(w => q.includes(w))) return key;
  }
  return null;
};

const STATUS_PRIORITY = {
  pending_approval:  0, // needs attention — top
  needs_info:        1, // has question — top
  pending_action:    2, // needs rework
  in_progress:       3, // active
  waiting_for_brand: 4, // waiting
  pending:           5, // not started
  completed:         6, // done
  locked:            7, // locked — bottom
};

export default function TaskBoardOverview({ req, user, tasks, supabase, onRefresh, singleColumn = false }) {
  const isStakeholder = user.role === "stakeholder";

  const [fileMap,     setFileMap]     = useState({});
  const [answers,     setAnswers]     = useState({});
  const [rejectNotes, setRejectNotes] = useState({});
  const [saving,      setSaving]      = useState(null); // taskId currently saving
  const [error,       setError]       = useState("");
  const [expandedCard, setExpandedCard] = useState(null); // taskId currently expanded
  const [editModal,    setEditModal]    = useState(null); // { task, section } or null

  // Load files only for tasks currently pending stakeholder approval
  useEffect(() => {
    const pendingIds = tasks
      .filter(t => t.status === "pending_approval")
      .map(t => t.id);
    if (!pendingIds.length) return;
    fetchTaskFiles(req, supabase).then(allFiles => {
      const map = {};
      pendingIds.forEach(id => { map[id] = allFiles.filter(f => f.task_id === id); });
      setFileMap(map);
    });
  }, [tasks, req.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render cards in canonical TASK_TEAMS order; skip teams with no task assigned
  const orderedTasks = TASK_TEAMS
    .map(team => tasks.find(t => t.team_role === team.role))
    .filter(Boolean);

  // Cards needing attention (approval/question) float to the top
  const sortedTasks = [...orderedTasks].sort((a, b) =>
    (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9));

  const completed = orderedTasks.filter(t => t.status === "completed").length;
  const total     = orderedTasks.length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleAnswer = async (task) => {
    const answer = (answers[task.id] || "").trim();
    if (!answer) return;
    setSaving(task.id); setError("");
    try {
      const { error: err } = await updateTask(task.id, {
        status:          "in_progress",
        answer,
        answer_at:       new Date().toISOString(),
        answer_given_by: user.id,
      }, supabase);
      if (err) { setError(err.message); return; }
      setAnswers(p => ({ ...p, [task.id]: "" }));
      onRefresh?.();
    } catch (e) { setError(e.message || "Error."); }
    finally     { setSaving(null); }
  };

  const handleApprove = async (task, approveField) => {
    setSaving(task.id); setError("");
    try {
      const { error: taskErr } = await updateTask(task.id, { status: "completed" }, supabase);
      if (taskErr) { setError(taskErr.message); return; }
      const { error: reqErr } = await supabase
        .from("requests")
        .update({ [approveField]: true })
        .eq("id", req.id);
      if (reqErr) { setError(reqErr.message); return; }

      // Fire-and-forget — stakeholder approving may unlock web_team;
      // never block the UI on this secondary sync. onRefresh must fire
      // AFTER these DB writes land, not before, or the refetch reads
      // stale overall_status/task rows.
      Promise.all([
        syncOverallStatus(req.id, supabase),
        tryUnlockWebTeam(req.id, supabase),
      ]).then(() => onRefresh?.()).catch(() => onRefresh?.());

      logAudit(supabase, user, AUDIT_ACTIONS.APPROVAL_GIVEN, "task", task.id, {
        field_name: task.team_role,
      });

      // Notify design_team that brand assets are ready (they depend on them)
      if (approveField === "stakeholder_approved_brand") {
        try {
          const { data: designUsers } = await supabase
            .from("users").select("id").eq("role", "design_team");
          if (designUsers?.length) {
            // Fire and forget — never let a notification failure (e.g. RLS 403)
            // block or delay the approval flow.
            supabase.from("notifications").insert(
              designUsers.map(u => ({
                user_id:    u.id,
                type:       "approval_granted",
                title:      "Brand assets approved",
                message:    `Stakeholder approved Brand assets for "${req.page_title}". Brand files are now ready for your use.`,
                request_id: req.id,
                action_url: `/requests/${req.id}`,
              }))
            ).then(() => {}).catch(() => {});
          }
        } catch { /* notification failure must not block approval */ }
      }
    } catch (e) { console.error("Approve error:", e); setError(e.message || "Error."); }
    finally     { setSaving(null); }
  };

  // Reject: set task back to in_progress, save note in a separate update
  const handleReject = async (task) => {
    const note = (rejectNotes[task.id] || "").trim();
    if (!note) return;
    setSaving(task.id); setError("");
    try {
      const { error: err } = await updateTask(task.id, { status: "in_progress" }, supabase);
      if (err) { setError(err.message); return; }
      await supabase
        .from("tasks")
        .update({ pending_action_note: note || null })
        .eq("id", task.id);
      await syncOverallStatus(req.id, supabase);
      setRejectNotes(p => ({ ...p, [task.id]: "" }));
      onRefresh?.();
    } catch (e) { setError(e.message || "Error."); }
    finally     { setSaving(null); }
  };

  // Card click routing: editorial/seo questions open the content editor
  // directly for the stakeholder (who edits, then an answer is sent
  // automatically); admin clicking the same card just expands it to show
  // the question, same as any other status. Locked cards do nothing.
  const handleCardClick = (task) => {
    if (task.status === "needs_info" && ["editorial_team", "seo_team"].includes(task.team_role) && isStakeholder) {
      setEditModal({ task, section: guessSection(task.question) });
    } else if (task.status === "locked") {
      return;
    } else {
      setExpandedCard(prev => prev === task.id ? null : task.id);
    }
  };

  // After the stakeholder edits content in response to an editorial/seo
  // question, auto-answer the question and put the task back in progress
  // — mirrors handleAnswer's own status transition, just with a fixed
  // answer text instead of stakeholder-typed one.
  const handleEditSaved = async () => {
    const task = editModal?.task;
    setEditModal(null);
    if (!task) return;
    try {
      await updateTask(task.id, {
        status:          "in_progress",
        answer:          "Content has been updated",
        answer_at:       new Date().toISOString(),
        answer_given_by: user.id,
      }, supabase);
      onRefresh?.();
    } catch (e) { setError(e.message || "Failed to send answer."); }
  };

  return (
    <div>
      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div className="mb-16">
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 6 }}>
          <span className="text-xs text-uppercase text-muted">Task Progress</span>
          <span className="text-sm" style={{ fontWeight: 600, color: "var(--color-night)" }}>
            {completed} of {total} complete
          </span>
        </div>
        <div style={{ height: 8, background: "var(--color-smoke)",
                      borderRadius: 8, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: pct === 100 ? "var(--color-success)" : "var(--color-primary)",
            borderRadius: 8, transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {error && <div className="alert alert-error mb-12">{error}</div>}

      {/* ── Task cards grid ────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: singleColumn ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "1rem",
      }}>
        {sortedTasks.map(task => {
          const teamMeta      = TASK_TEAMS.find(t => t.role === task.team_role);
          const statusMeta    = TASK_STATUS_META[task.status] || TASK_STATUS_META.pending;
          const isLocked      = task.status === "locked";
          const isDone        = task.status === "completed";
          const needsInfo     = task.status === "needs_info";
          const needsApproval = task.status === "pending_approval";

          const approveField =
            task.team_role === "brand_team"  ? "stakeholder_approved_brand"  :
            task.team_role === "design_team" ? "stakeholder_approved_design" : null;

          const alreadyApproved = approveField ? !!req[approveField] : false;
          const showApproval    = isStakeholder && needsApproval && !!approveField && !alreadyApproved;
          const showAnswer      = isStakeholder && needsInfo;
          const files           = fileMap[task.id] || [];
          const isSaving        = saving === task.id;

          // Editorial/seo questions open the content editor instead of
          // expanding inline; locked cards aren't clickable at all.
          const opensEditModal = needsInfo && ["editorial_team", "seo_team"].includes(task.team_role) && isStakeholder;
          const isExpanded     = expandedCard === task.id;

          return (
            <div
              key={task.id}
              className="card"
              style={{
                opacity: isLocked ? 0.55 : 1,
                borderLeft: isDone
                  ? "3px solid var(--color-success)"
                  : (needsApproval || needsInfo)
                  ? `3px solid ${statusMeta.color}`
                  : "3px solid transparent",
                transition: "opacity 0.2s",
              }}
            >
              {/* Card header: icon + team name + status badge + expand/edit indicator.
                  Click target is just this header, not the whole card, so clicking
                  into the answer textarea / approve-reject buttons below never
                  bubbles up and toggles the card shut mid-interaction. */}
              <div
                onClick={!isLocked ? () => handleCardClick(task) : undefined}
                style={{
                  display: "flex", alignItems: "flex-start",
                  gap: 10, marginBottom: 10,
                  cursor: isLocked ? "default" : "pointer",
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1.2, flexShrink: 0 }}>
                  {isDone ? "✅" : isLocked ? "🔒" : (teamMeta?.icon ?? "📋")}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "var(--text-base)", fontWeight: 600, lineHeight: 1.3,
                    color: isLocked ? "var(--color-silver)" : "var(--color-night)",
                  }}>
                    {teamMeta?.label ?? task.team_role}
                  </div>
                  <span style={{
                    display: "inline-block", marginTop: 4,
                    background: statusMeta.bg, color: statusMeta.color,
                    border: `1px solid ${statusMeta.color}33`,
                    borderRadius: 20, padding: "2px 8px",
                    fontSize: 11, fontWeight: 500,
                  }}>
                    {statusMeta.icon} {statusMeta.label}
                  </span>
                </div>
                {!isLocked && (
                  <span
                    title={opensEditModal ? "Click to edit content" : (isExpanded ? "Collapse" : "Expand")}
                    style={{ fontSize: 13, color: "var(--color-silver)", flexShrink: 0, marginTop: 2 }}
                  >
                    {opensEditModal ? "✎" : (isExpanded ? "▾" : "▸")}
                  </span>
                )}
              </div>

              {/* Assignee + last updated */}
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-silver)",
                            marginBottom: 10 }}>
                {task.assignee?.name
                  ? <>Assigned to <strong>{task.assignee.name}</strong></>
                  : <em>Unassigned</em>}
                {task.updated_at && (
                  <> · {new Date(task.updated_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short",
                        })}</>
                )}
              </div>

              {/* ── Needs Info from editorial/seo: compact teaser, click
                     header to edit content (auto-answers on save) ────── */}
              {needsInfo && opensEditModal && (
                <div style={{
                  background: "#fffbeb", border: "1px solid #d97706aa",
                  borderRadius: "var(--radius)", padding: "8px 10px", marginBottom: 10,
                }}>
                  <div className="text-xs text-uppercase"
                       style={{ color: "#92400e", marginBottom: 3 }}>
                    Question
                  </div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 500,
                                color: "var(--color-night)" }}>
                    {task.question || "—"}
                  </div>
                  <div className="field-hint" style={{ marginTop: 6 }}>
                    ✎ Click to edit content — answer is sent automatically on save
                  </div>
                </div>
              )}

              {/* ── Needs Info from other teams: question box + answer input,
                     shown once expanded ──────────────────────────────── */}
              {needsInfo && !opensEditModal && isExpanded && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{
                    background: "#fffbeb", border: "1px solid #d97706aa",
                    borderRadius: "var(--radius)", padding: "8px 10px",
                    marginBottom: showAnswer ? 8 : 0,
                  }}>
                    <div className="text-xs text-uppercase"
                         style={{ color: "#92400e", marginBottom: 3 }}>
                      Question
                    </div>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 500,
                                  color: "var(--color-night)" }}>
                      {task.question || "—"}
                    </div>
                  </div>
                  {showAnswer && (
                    <>
                      <textarea
                        className="textarea"
                        rows={2}
                        placeholder="Type your answer…"
                        value={answers[task.id] || ""}
                        onChange={e => setAnswers(p => ({ ...p, [task.id]: e.target.value }))}
                      />
                      <button
                        className="btn-primary mt-8"
                        style={{ width: "100%", justifyContent: "center" }}
                        onClick={() => handleAnswer(task)}
                        disabled={isSaving || !(answers[task.id] || "").trim()}
                      >
                        {isSaving ? "Sending…" : "Send Answer"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ── Pending Approval: files + approve / reject, shown once
                     expanded ─────────────────────────────────────────── */}
              {showApproval && isExpanded && (
                <div>
                  {files.length > 0 ? (
                    <div style={{ marginBottom: 10 }}>
                      <div className="text-xs text-uppercase text-muted"
                           style={{ marginBottom: 6 }}>
                        Files for Review
                      </div>
                      <div className="flex-col gap-4">
                        {files.map(f => (
                          <a
                            key={f.id}
                            href={f.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              fontSize: "var(--text-xs)", color: "var(--color-primary)",
                              background: "var(--color-ghost)",
                              borderRadius: "var(--radius)",
                              padding: "5px 8px", textDecoration: "none",
                            }}
                          >
                            📎 {f.file_name || "File"}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-info mb-8"
                         style={{ fontSize: "var(--text-xs)" }}>
                      No files uploaded yet — you can still approve or reject.
                    </div>
                  )}

                  <div className="field-wrap" style={{ marginBottom: 8 }}>
                    <textarea
                      className="textarea"
                      rows={2}
                      placeholder="Rejection reason (required to reject)…"
                      value={rejectNotes[task.id] || ""}
                      onChange={e =>
                        setRejectNotes(p => ({ ...p, [task.id]: e.target.value }))
                      }
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-primary"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => handleApprove(task, approveField)}
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving…" : "✅ Approve"}
                    </button>
                    <button
                      className="btn-danger"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => handleReject(task)}
                      disabled={isSaving || !(rejectNotes[task.id] || "").trim()}
                    >
                      {isSaving ? "Saving…" : "↩ Reject"}
                    </button>
                  </div>
                </div>
              )}

              {/* Already-approved indicator */}
              {needsApproval && alreadyApproved && isExpanded && (
                <div className="alert alert-success"
                     style={{ fontSize: "var(--text-xs)", padding: "4px 8px" }}>
                  ✅ Approved by stakeholder
                </div>
              )}

              {/* ── Other statuses: brief info once expanded ──────────── */}
              {isExpanded && isDone && (
                <div className="text-xs text-muted">
                  {task.completed_at
                    ? <>Completed {new Date(task.completed_at).toLocaleDateString("en-GB",
                        { day: "numeric", month: "short", year: "numeric" })}</>
                    : "Completed"}
                </div>
              )}

              {isExpanded && task.status === "in_progress" && (
                <div className="text-xs text-muted">
                  ⚡ Actively being worked on
                  {task.assignee?.name && <> by <strong>{task.assignee.name}</strong></>}
                </div>
              )}

              {isExpanded && (task.status === "pending" || task.status === "waiting_for_brand") && (
                <div className="text-xs text-muted">
                  {task.status === "waiting_for_brand"
                    ? "Waiting for Brand Team to deliver assets before this can start."
                    : `Not started yet — waiting on ${teamMeta?.label ?? task.team_role}.`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editModal && (
        <EditSectionModal
          section={editModal.section}
          data={req}
          requestId={req.id}
          supabase={supabase}
          user={user}
          onClose={() => setEditModal(null)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
}
