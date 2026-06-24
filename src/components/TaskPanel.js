"use client";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { updateTask, syncOverallStatus, TASK_STATUS_META, getTaskTeam } from "@/lib/taskUtils";
import WebTeamView from "@/components/WebTeamView";
import styles from "@/styles/task-panel.module.css";

function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatBytes(b) {
  if (!b) return "";
  if (b < 1024)    return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

function fileIcon(name = "") {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["png","jpg","jpeg","gif","webp","svg"].includes(ext)) return "🖼️";
  if (["pdf"].includes(ext)) return "📄";
  if (["psd","ai"].includes(ext)) return "🎨";
  if (["zip","rar","7z"].includes(ext)) return "📦";
  return "📎";
}

export default function TaskPanel({ task, req, user, attachments = [], onClose, onRefresh }) {
  const [saving,    setSaving]    = useState(false);
  const [question,  setQuestion]  = useState("");
  const [answer,    setAnswer]    = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const [error,     setError]     = useState("");
  const fileRef = useRef();

  const teamMeta  = getTaskTeam(task.team_role);
  const statusMeta = TASK_STATUS_META[task.status] || TASK_STATUS_META.pending;

  const isMyTask        = user.role === task.team_role;
  const isStakeholder   = user.role === "stakeholder";
  const isAdmin         = user.role === "admin";
  const isWebTeam       = task.team_role === "web_team";
  const selfCompletes   = teamMeta?.selfCompletes ?? false;
  const needsApproval   = ["brand_team", "design_qa"].includes(task.team_role);

  // ── Task actions ───────────────────────────────────────────────────
  const doUpdate = async (updates) => {
    setSaving(true);
    setError("");
    try {
      await updateTask(task.id, updates);
      await syncOverallStatus(req.id);
      onRefresh?.();
    } catch(e) {
      setError(e.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const markInProgress = () => doUpdate({ status: "in_progress" });
  const markComplete   = () => doUpdate({ status: "completed" });
  const markPublished  = () => doUpdate({ status: "completed" });

  const submitForApproval = () => doUpdate({ status: "pending_approval" });

  const askQuestion = async () => {
    if (!question.trim()) return;
    await doUpdate({ status: "needs_info", question: question.trim(), question_at: new Date().toISOString() });
    setQuestion("");
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    // Restore previous status when answering
    const prevStatus = task.status === "needs_info" ? "in_progress" : task.status;
    await doUpdate({ status: prevStatus, answer: answer.trim(), answer_at: new Date().toISOString() });
    setAnswer("");
  };

  // Stakeholder approvals
  const approveTask = async () => {
    const field = task.team_role === "brand_team" ? "stakeholder_approved_brand" : "stakeholder_approved_design";
    await supabase.from("requests").update({ [field]: true }).eq("id", req.id);
    await doUpdate({ status: "completed" });
  };

  const requestRevision = async () => {
    if (!question.trim()) return;
    await doUpdate({ status: "in_progress", answer: null, question: question.trim(), question_at: new Date().toISOString() });
    setQuestion("");
  };

  // ── File upload ────────────────────────────────────────────────────
  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const ext  = file.name.split(".").pop();
      const path = `tasks/${req.id}/${task.team_role}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, file);
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("attachments").getPublicUrl(path);
      await supabase.from("attachments").insert({
        request_id:       req.id,
        user_id:          user.id,
        file_name:        file.name,
        file_url:         publicUrl,
        file_size:        file.size,
        uploaded_by_role: user.role,
      });
      onRefresh?.();
    } catch(e) {
      setError(e.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  // Task attachments for this team only
  const myAttachments = attachments.filter(a => a.uploaded_by_role === task.team_role);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderLeft}>
            <span className={styles.panelIcon}>{teamMeta?.icon || "📋"}</span>
            <div>
              <div className={styles.panelTitle}>{teamMeta?.label || task.team_role}</div>
              <div className={styles.panelSubtitle}>{req.page_title}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Status bar */}
        <div className={styles.statusBar}>
          <span className={styles.statusLabel}>Status</span>
          <span
            className={styles.statusChip}
            style={{ background: statusMeta.bg, color: statusMeta.color }}
          >
            {statusMeta.icon} {statusMeta.label}
          </span>
          {task.completed_at && (
            <span className={styles.statusLabel}>Completed {formatDate(task.completed_at)}</span>
          )}
        </div>

        {/* Body */}
        <div className={styles.panelBody}>

          {/* Web Team: special view */}
          {isWebTeam && (
            <WebTeamView req={req} attachments={attachments} task={task} />
          )}

          {/* Q&A block */}
          {task.question && (
            <div className={styles.qaBlock}>
              <div className={styles.qaQuestion}>❓ Question from {teamMeta?.label}</div>
              <div className={styles.qaQuestionText}>{task.question}</div>
              {task.answer && (
                <div className={styles.qaAnswerBlock}>
                  <div className={styles.qaAnswerLabel}>✅ Answer</div>
                  <div className={styles.qaAnswerText}>{task.answer}</div>
                </div>
              )}
            </div>
          )}

          {/* Stakeholder answer to needs_info */}
          {isStakeholder && task.status === "needs_info" && !task.answer && (
            <>
              <div className={styles.divider} />
              <div>
                <div className={styles.sectionTitle}>Answer the question</div>
                <textarea
                  className={styles.textarea}
                  placeholder="Type your answer here…"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                />
              </div>
              <div className={styles.actionBar}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={submitAnswer}
                  disabled={saving || !answer.trim()}
                >
                  {saving ? "Sending…" : "Send Answer"}
                </button>
              </div>
            </>
          )}

          {/* Stakeholder approval (brand / design) */}
          {isStakeholder && task.status === "pending_approval" && needsApproval && (
            <>
              <div className={styles.divider} />
              <div className={styles.approvalBlock}>
                <div className={styles.approvalTitle}>
                  {teamMeta?.icon} {teamMeta?.label} needs your approval
                </div>
                <div className={styles.approvalText}>
                  Review the uploaded files below, then approve or request a revision.
                </div>
                <div className={styles.approvalBtns}>
                  <button
                    className={`${styles.btn} ${styles.btnSuccess}`}
                    onClick={approveTask}
                    disabled={saving}
                  >
                    ✅ Approve
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnWarning}`}
                    onClick={() => {}}
                    disabled={saving}
                  >
                    ↩ Request Revision
                  </button>
                </div>
                {/* Revision note field */}
                <textarea
                  className={styles.textarea}
                  placeholder="Describe what needs changing (required for revision)…"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                />
                <button
                  className={`${styles.btn} ${styles.btnWarning}`}
                  onClick={requestRevision}
                  disabled={saving || !question.trim()}
                >
                  ↩ Send Revision Request
                </button>
              </div>
            </>
          )}

          {/* My team uploads */}
          {!isWebTeam && (isMyTask || isAdmin) && (
            <>
              <div className={styles.divider} />
              <div>
                <div className={styles.sectionTitle}>📁 Files ({myAttachments.length})</div>

                {myAttachments.length > 0 && (
                  <div className={styles.attachmentList}>
                    {myAttachments.map(a => (
                      <div key={a.id} className={styles.attachmentRow}>
                        <span className={styles.attachmentIcon}>{fileIcon(a.file_name)}</span>
                        <span className={styles.attachmentName}>{a.file_name}</span>
                        <span className={styles.attachmentSize}>{formatBytes(a.file_size)}</span>
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer" className={styles.attachmentLink}>
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`${styles.dropZone} ${dragOver ? styles.over : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <div className={styles.dropZoneIcon}>{uploading ? "⏳" : "📤"}</div>
                  <div className={styles.dropZoneText}>
                    {uploading ? "Uploading…" : "Drop file here or click to upload"}
                  </div>
                  <div className={styles.dropZoneHint}>PNG, JPG, PDF, PSD — max 50 MB</div>
                  <input
                    ref={fileRef}
                    type="file"
                    style={{ display: "none" }}
                    onChange={e => uploadFile(e.target.files[0])}
                  />
                </div>
              </div>
            </>
          )}

          {/* Ask question (non-web teams) */}
          {!isWebTeam && isMyTask && task.status === "in_progress" && (
            <>
              <div className={styles.divider} />
              <div>
                <div className={styles.sectionTitle}>❓ Ask stakeholder a question</div>
                <textarea
                  className={styles.textarea}
                  placeholder="What do you need clarification on? (non-blocking — work can continue)"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                />
              </div>
              <button
                className={`${styles.btn} ${styles.btnWarning}`}
                onClick={askQuestion}
                disabled={saving || !question.trim()}
              >
                ❓ Send Question
              </button>
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}

          {/* Action buttons */}
          <div className={styles.divider} />
          <div className={styles.actionBar}>

            {/* Start button for any team member on pending task */}
            {isMyTask && task.status === "pending" && !isWebTeam && (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={markInProgress}
                disabled={saving}
              >
                ⚡ Start Task
              </button>
            )}

            {/* Web team start */}
            {isWebTeam && (isMyTask || isAdmin) && ["pending"].includes(task.status) && (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={markInProgress}
                disabled={saving}
              >
                ⚡ Start Implementation
              </button>
            )}

            {/* Self-completing teams: mark done */}
            {isMyTask && selfCompletes && task.status === "in_progress" && !isWebTeam && (
              <button
                className={`${styles.btn} ${styles.btnSuccess}`}
                onClick={markComplete}
                disabled={saving}
              >
                ✅ Mark Complete
              </button>
            )}

            {/* Non-self-completing teams: submit for approval */}
            {isMyTask && !selfCompletes && task.status === "in_progress" && (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={submitForApproval}
                disabled={saving}
              >
                👁️ Submit for Stakeholder Approval
              </button>
            )}

            {/* Web team: mark published */}
            {isWebTeam && (isMyTask || isAdmin) && task.status === "in_progress" && (
              <button
                className={`${styles.btn} ${styles.btnSuccess}`}
                onClick={markPublished}
                disabled={saving}
              >
                🌐 Mark as Published
              </button>
            )}

            {/* Admin can force-complete any task */}
            {isAdmin && task.status !== "completed" && task.status !== "locked" && (
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={markComplete}
                disabled={saving}
              >
                ⚙️ Admin: Force Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
