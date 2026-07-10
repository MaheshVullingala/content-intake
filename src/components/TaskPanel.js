"use client";
import { useState, useEffect, useRef } from "react";
import { TASK_TEAMS, TASK_STATUS_META, updateTask, syncOverallStatus } from "@/lib/taskUtils";

const SECTION_TAGS  = ["Banner", "Overview", "Other"];
const MAX_BRAND_MB  = 10 * 1024 * 1024;
const MAX_DESIGN_MB = 20 * 1024 * 1024;

function formatBytes(b) {
  if (!b) return "";
  return b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB";
}

function fileIcon(name = "") {
  const ext = name.split(".").pop()?.toLowerCase();
  return ["png","jpg","jpeg","webp","gif"].includes(ext) ? "🖼️"
       : ext === "pdf"                                   ? "📄"
       : "📎";
}

export default function TaskPanel({ req, user, supabase, tasks, onRefresh }) {
  const myTask = tasks.find(t => t.team_role === user.role) ?? null;

  const [saving,      setSaving]      = useState(false);
  const [question,    setQuestion]    = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [sectionTag,  setSectionTag]  = useState("Banner");
  const [myFiles,     setMyFiles]     = useState([]);
  const [error,       setError]       = useState("");
  // Web team request-changes modal
  const [showChanges, setShowChanges] = useState(false);
  const [changeTeam,  setChangeTeam]  = useState("editorial_team");
  const [changeNote,  setChangeNote]  = useState("");

  const fileRef = useRef();

  // Fetch files this role uploaded for this request (filtered by storage path prefix)
  const fetchMyFiles = async () => {
    const prefix = `tasks/${req.id}/${user.role}/`;
    const { data } = await supabase
      .from("attachments")
      .select("*")
      .eq("request_id", req.id)
      .like("storage_path", `${prefix}%`)
      .order("created_at");
    setMyFiles(data || []);
  };

  useEffect(() => {
    if (["brand_team", "design_team"].includes(user.role)) fetchMyFiles();
  }, [req.id, user.role]);

  if (!myTask) {
    return (
      <div className="card">
        <div className="text-sm text-muted"
             style={{ textAlign: "center", padding: "1.5rem 0" }}>
          No task assigned to your team for this request.
        </div>
      </div>
    );
  }

  const teamMeta   = TASK_TEAMS.find(t => t.role === user.role);
  const statusMeta = TASK_STATUS_META[myTask.status] || TASK_STATUS_META.pending;

  const isLocked          = myTask.status === "locked";
  const isCompleted       = myTask.status === "completed";
  const canStart          = myTask.status === "pending";
  const isActive          = ["in_progress","needs_info","waiting_for_brand","pending_action"].includes(myTask.status);
  const isWaitingBrand    = myTask.status === "waiting_for_brand";
  const isPendingApproval = myTask.status === "pending_approval";

  // ── Shared task update helper ─────────────────────────────────────────────
  const doUpdate = async (updates) => {
    setSaving(true); setError("");
    try {
      const { error: err } = await updateTask(myTask.id, updates, supabase);
      if (err) { setError(err.message); return; }
      await syncOverallStatus(req.id, supabase);
      onRefresh?.();
    } catch (e) { setError(e.message || "Update failed."); }
    finally     { setSaving(false); }
  };

  const handleComplete        = () => doUpdate({ status: "completed" });
  const handleSubmitApproval  = () => doUpdate({ status: "pending_approval" });
  const handleWaitForBrand    = () => doUpdate({ status: "waiting_for_brand" });
  const handleResumeFromBrand = () => doUpdate({ status: "in_progress" });

  // Non-blocking: sets needs_info but completion buttons still work at that status
  const handleAskQuestion = async () => {
    const q = question.trim();
    if (!q) return;
    setSaving(true); setError("");
    try {
      const { error: err } = await updateTask(myTask.id, {
        status:            "needs_info",
        question:          q,
        question_at:       new Date().toISOString(),
        question_asked_by: user.id,
      }, supabase);
      if (err) { setError(err.message); return; }
      setQuestion("");
      onRefresh?.();
    } catch (e) { setError(e.message || "Failed to send question."); }
    finally     { setSaving(false); }
  };

  // ── File upload (bucket: "attachments" — same as v1 ImageField) ────────────
  const isBrand  = user.role === "brand_team";
  const maxBytes = isBrand ? MAX_BRAND_MB : MAX_DESIGN_MB;
  const accept   = isBrand ? ".jpg,.jpeg,.png" : ".jpg,.jpeg,.png,.webp";

  const uploadFile = async (file) => {
    if (!file) return;
    if (file.size > maxBytes) {
      setError(`File too large — max ${isBrand ? "10" : "20"} MB.`);
      return;
    }
    setUploading(true); setError("");
    try {
      const ext  = file.name.split(".").pop();
      const path = `tasks/${req.id}/${user.role}/${sectionTag.toLowerCase()}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("attachments").upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from("attachments").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("attachments").insert({
        request_id:   req.id,
        user_id:      user.id,
        user_name:    user.name,
        file_name:    file.name,
        file_type:    file.type,
        file_size:    file.size,
        storage_path: path,
        public_url:   publicUrl,
      });
      if (dbErr) throw dbErr;
      await fetchMyFiles();
    } catch (e) { setError(e.message || "Upload failed."); }
    finally     { setUploading(false); }
  };

  // ── Web team: request changes from another team ─────────────────────────────
  const handleRequestChanges = async () => {
    const note = changeNote.trim();
    if (!note || !changeTeam) return;
    setSaving(true); setError("");
    try {
      const targetTask = tasks.find(t => t.team_role === changeTeam);
      if (!targetTask) { setError("That team has no task for this request."); return; }
      // TODO: current RLS allows web_team to update only own task rows.
      // Move this to an API route if the policy blocks cross-team writes.
      const { error: err } = await supabase
        .from("tasks")
        .update({
          status:              "pending_action",
          pending_action_note: note,
          pending_action_at:   new Date().toISOString(),
          pending_action_by:   user.id,
        })
        .eq("id", targetTask.id);
      if (err) { setError(err.message); return; }
      // Also pause web_team's own task while waiting for resolution
      const targetLabel = TASK_TEAMS.find(t => t.role === changeTeam)?.label ?? changeTeam;
      await supabase
        .from("tasks")
        .update({
          status:              "pending_action",
          pending_action_note: `Waiting for ${targetLabel} to resolve changes`,
        })
        .eq("request_id", req.id)
        .eq("team_role",  "web_team");
      setShowChanges(false);
      setChangeNote("");
      onRefresh?.();
    } catch (e) { setError(e.message || "Failed to request changes."); }
    finally     { setSaving(false); }
  };

  // ── Web team: mark published ────────────────────────────────────────────────
  const handlePublish = async () => {
    setSaving(true); setError("");
    try {
      const { error: taskErr } = await updateTask(myTask.id, { status: "completed" }, supabase);
      if (taskErr) { setError(taskErr.message); return; }
      const { error: reqErr } = await supabase
        .from("requests")
        .update({ overall_status: "published", published_at: new Date().toISOString() })
        .eq("id", req.id);
      if (reqErr) { setError(reqErr.message); return; }
      onRefresh?.();
    } catch (e) { setError(e.message || "Failed to publish."); }
    finally     { setSaving(false); }
  };

  // ── Shared file list renderer (brand + design) ─────────────────────────────
  const FileList = () => myFiles.length === 0 ? null : (
    <div style={{ marginBottom: 14 }}>
      <div className="text-xs text-uppercase text-muted" style={{ marginBottom: 6 }}>
        Uploaded Files
      </div>
      <div className="flex-col gap-4">
        {myFiles.map(f => (
          <div key={f.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--color-ghost)", borderRadius: "var(--radius)",
            padding: "6px 10px",
          }}>
            <span>{fileIcon(f.file_name)}</span>
            <span style={{ flex: 1, fontSize: "var(--text-xs)", overflow: "hidden",
                           textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {f.file_name}
            </span>
            <span className="text-xs text-muted">{formatBytes(f.file_size)}</span>
            <a href={f.public_url} target="_blank" rel="noopener noreferrer"
               style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)",
                        textDecoration: "none" }}>
              View
            </a>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Upload zone ─────────────────────────────────────────────────────────────
  const UploadZone = () => (
    <>
      <div className="field-wrap">
        <label className="field-label">Section</label>
        <select className="select" value={sectionTag}
                onChange={e => setSectionTag(e.target.value)}>
          {SECTION_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div
        style={{
          border: "2px dashed var(--color-border)", borderRadius: "var(--radius-lg)",
          padding: "1.5rem", textAlign: "center", cursor: "pointer",
          background: "var(--color-ghost)", marginBottom: 12,
          transition: "border-color 0.15s",
        }}
        onClick={() => fileRef.current?.click()}
      >
        <div style={{ fontSize: 22, marginBottom: 4 }}>{uploading ? "⏳" : "📤"}</div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--color-dim)" }}>
          {uploading ? "Uploading…"
            : isBrand ? "Click to upload JPEG / PNG"
            : "Click to upload JPEG / PNG / WebP"}
        </div>
        <div className="field-hint">Max {isBrand ? "10" : "20"} MB per file</div>
        <input
          ref={fileRef} type="file" accept={accept}
          style={{ display: "none" }}
          onChange={e => { uploadFile(e.target.files[0]); e.target.value = ""; }}
        />
      </div>
    </>
  );

  return (
    <div className="flex-col gap-12">

      {/* ── Status card ──────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{teamMeta?.icon ?? "📋"}</span>
            <div>
              <h3 style={{ margin: 0 }}>{teamMeta?.label ?? user.role}</h3>
              <p>Your task for this request</p>
            </div>
          </div>
          <span style={{
            background: statusMeta.bg, color: statusMeta.color,
            border: `1px solid ${statusMeta.color}33`,
            borderRadius: 20, padding: "3px 10px",
            fontSize: 12, fontWeight: 500,
          }}>
            {statusMeta.icon} {statusMeta.label}
          </span>
        </div>

        {/* Assignee */}
        {myTask.assignee?.name && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-silver)",
                        marginBottom: user.can_assign ? 0 : 6 }}>
            Assigned to <strong>{myTask.assignee.name}</strong>
          </div>
        )}

        {/* Reassign dropdown (leads only) */}
        {user.can_assign && !isCompleted && !isLocked && (
          <AssigneeDropdown task={myTask} supabase={supabase} onRefresh={onRefresh} />
        )}

        {isLocked && (
          <div className="alert alert-info mt-8">
            🔒 Locked until all parallel teams complete their work.
          </div>
        )}

        {/* Start Task — direct update, no syncOverallStatus needed at this transition */}
        {canStart && (
          <button
            className="btn-primary btn-full mt-8"
            onClick={async () => {
              await supabase.from("tasks")
                .update({ status: "in_progress", updated_at: new Date().toISOString() })
                .eq("id", myTask.id);
              onRefresh?.();
            }}
          >
            ▶ Start Task
          </button>
        )}

        {error && <div className="alert alert-error mt-8">{error}</div>}
      </div>

      {/* ── Q&A thread ───────────────────────────────────────────────── */}
      {myTask.question && (
        <div className="card">
          <div style={{
            background: "#fffbeb", border: "1px solid #d97706aa",
            borderRadius: "var(--radius)", padding: "10px 12px",
            marginBottom: myTask.answer ? 10 : 0,
          }}>
            <div className="text-xs text-uppercase"
                 style={{ color: "#92400e", marginBottom: 3 }}>
              Your Question
            </div>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 500,
                          color: "var(--color-night)" }}>
              {myTask.question}
            </div>
            {myTask.question_at && (
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                Asked {new Date(myTask.question_at).toLocaleDateString("en-GB",
                  { day: "numeric", month: "short" })}
              </div>
            )}
          </div>
          {myTask.answer ? (
            <div style={{
              background: "var(--color-success-bg)",
              border: "1px solid var(--color-success-border)",
              borderRadius: "var(--radius)", padding: "10px 12px",
            }}>
              <div className="text-xs text-uppercase"
                   style={{ color: "var(--color-success)", marginBottom: 3 }}>
                Stakeholder Answer
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--color-night)" }}>
                {myTask.answer}
              </div>
            </div>
          ) : (
            <div className="alert alert-info mt-8"
                 style={{ fontSize: "var(--text-xs)" }}>
              ⏳ Waiting for stakeholder to answer…
            </div>
          )}
        </div>
      )}

      {/* ── Ask stakeholder a question (non-blocking) ────────────────── */}
      {(isActive || canStart) && !isLocked && !isCompleted && !isPendingApproval && (
        <div className="card">
          <h3 style={{ margin: "0 0 6px", fontSize: "var(--text-base)", fontWeight: 600 }}>
            ❓ Ask Stakeholder
          </h3>
          <p className="field-hint" style={{ marginBottom: 10 }}>
            Non-blocking — your task stays active while you wait for an answer.
          </p>
          <textarea
            className="textarea"
            rows={2}
            placeholder="What do you need clarification on?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
          <button
            className="btn-ghost mt-8"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={handleAskQuestion}
            disabled={saving || !question.trim()}
          >
            {saving ? "Sending…" : "Send Question"}
          </button>
        </div>
      )}

      {/* ── EDITORIAL TEAM ───────────────────────────────────────────── */}
      {user.role === "editorial_team" && (isActive || myTask.status === "needs_info") && (
        <div className="card">
          <p className="field-hint" style={{ marginBottom: 12 }}>
            Review and edit content in the left panel. Mark complete when all sections are approved.
          </p>
          <button
            className="btn-primary btn-full"
            onClick={handleComplete}
            disabled={saving}
          >
            {saving ? "Saving…" : "✅ Mark Content Approved"}
          </button>
        </div>
      )}

      {/* ── SEO TEAM ─────────────────────────────────────────────────── */}
      {user.role === "seo_team" && (isActive || myTask.status === "needs_info") && (
        <div className="card">
          <p className="field-hint" style={{ marginBottom: 12 }}>
            Review meta title, description and keywords in the left panel.
          </p>
          <button
            className="btn-primary btn-full"
            onClick={handleComplete}
            disabled={saving}
          >
            {saving ? "Saving…" : "✅ Mark SEO Approved"}
          </button>
        </div>
      )}

      {/* ── BRAND TEAM ───────────────────────────────────────────────── */}
      {user.role === "brand_team" && (
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: "var(--text-base)", fontWeight: 600 }}>
            🎨 Brand Assets
          </h3>
          <FileList />
          {(isActive || isPendingApproval) && (
            <>
              {!isPendingApproval && <UploadZone />}
              <button
                className="btn-primary btn-full"
                onClick={handleSubmitApproval}
                disabled={saving || myFiles.length === 0 || isPendingApproval}
              >
                {saving              ? "Submitting…"
                 : isPendingApproval ? "✓ Awaiting Stakeholder Approval"
                 :                    "👁️ Submit for Stakeholder Approval"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── DESIGN TEAM ──────────────────────────────────────────────── */}
      {user.role === "design_team" && (
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: "var(--text-base)", fontWeight: 600 }}>
            🖼️ Design Assets
          </h3>
          {/* Brand wait toggle */}
          {isActive && (
            <div style={{ marginBottom: 12 }}>
              {isWaitingBrand ? (
                <button className="btn-ghost btn-full"
                        onClick={handleResumeFromBrand} disabled={saving}>
                  ▶ Resume — Brand Assets Received
                </button>
              ) : (
                <button className="btn-ghost btn-full"
                        onClick={handleWaitForBrand} disabled={saving}>
                  🎨 Pause — Waiting for Brand Assets
                </button>
              )}
            </div>
          )}
          <FileList />
          {(isActive || isPendingApproval) && !isWaitingBrand && (
            <>
              {!isPendingApproval && <UploadZone />}
              <button
                className="btn-primary btn-full"
                onClick={handleSubmitApproval}
                disabled={saving || myFiles.length === 0 || isPendingApproval}
              >
                {saving              ? "Submitting…"
                 : isPendingApproval ? "✓ Awaiting Stakeholder Approval"
                 :                    "👁️ Submit for Stakeholder Approval"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── WEB TEAM ─────────────────────────────────────────────────── */}
      {user.role === "web_team" && isActive && (
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: "var(--text-base)", fontWeight: 600 }}>
            🌐 Web Implementation
          </h3>
          <CompletenessIndicator req={req} />
          <div className="divider" />
          {/* Request changes */}
          <button
            className="btn-ghost btn-full"
            style={{ marginBottom: showChanges ? 12 : 8 }}
            onClick={() => setShowChanges(v => !v)}
            disabled={saving}
          >
            ↩ Request Changes from a Team
          </button>
          {showChanges && (
            <div style={{
              background: "var(--color-ghost)", borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)", padding: "1rem", marginBottom: 12,
            }}>
              <div className="field-wrap">
                <label className="field-label">Team</label>
                <select className="select" value={changeTeam}
                        onChange={e => setChangeTeam(e.target.value)}>
                  {TASK_TEAMS.filter(t => t.role !== "web_team").map(t => (
                    <option key={t.role} value={t.role}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>
              <div className="field-wrap">
                <label className="field-label">Note</label>
                <textarea
                  className="textarea" rows={2}
                  placeholder="Describe what needs to be changed…"
                  value={changeNote}
                  onChange={e => setChangeNote(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={handleRequestChanges}
                  disabled={saving || !changeNote.trim()}
                >
                  {saving ? "Sending…" : "Send Request"}
                </button>
                <button
                  className="btn-ghost"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => { setShowChanges(false); setChangeNote(""); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* Publish */}
          <button className="btn-primary btn-full" onClick={handlePublish} disabled={saving}>
            {saving ? "Publishing…" : "🌐 Mark as Published"}
          </button>
        </div>
      )}

    </div>
  );
}

// ── Assignee reassign dropdown ─────────────────────────────────────────────────
function AssigneeDropdown({ task, supabase, onRefresh }) {
  const [members,  setMembers]  = useState([]);
  const [selected, setSelected] = useState(task.assigned_to || "");
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    supabase.from("users").select("id, name")
      .eq("role", task.team_role)
      .then(({ data }) => setMembers(data || []));
  }, [task.team_role]);

  if (!members.length) return null;

  const handleChange = async (e) => {
    const uid = e.target.value;
    setSelected(uid);
    setSaving(true);
    await supabase.from("tasks")
      .update({ assigned_to: uid || null })
      .eq("id", task.id);
    setSaving(false);
    onRefresh?.();
  };

  return (
    <div className="field-wrap" style={{ marginTop: 10 }}>
      <label className="field-label">Assigned to</label>
      <select className="select" value={selected}
              onChange={handleChange} disabled={saving}>
        <option value="">— Unassigned —</option>
        {members.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    </div>
  );
}

// ── Content completeness soft check (web team only) ────────────────────────────
function CompletenessIndicator({ req }) {
  const checks = [
    { label: "Page title",       pass: !!req.page_title?.trim() },
    { label: "Banner headline",  pass: !!req.banner_headline?.trim() },
    { label: "Overview text",    pass: !!(req.overview_impact?.trim() || req.overview_description?.trim()) },
    { label: "SEO meta title",   pass: !!req.seo_title?.trim() },
    { label: "SEO meta desc",    pass: !!req.seo_description?.trim() },
  ];
  const passed = checks.filter(c => c.pass).length;
  const pct    = Math.round((passed / checks.length) * 100);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 6 }}>
        <span className="text-xs text-uppercase text-muted">Content Completeness</span>
        <span className="text-xs" style={{
          fontWeight: 600,
          color: pct === 100 ? "var(--color-success)" : "var(--color-dim)",
        }}>
          {passed}/{checks.length}
        </span>
      </div>
      <div style={{ height: 6, background: "var(--color-smoke)",
                    borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: pct === 100 ? "var(--color-success)" : "var(--color-primary)",
          borderRadius: 6, transition: "width 0.3s",
        }} />
      </div>
      <div className="flex-col gap-4">
        {checks.map(c => (
          <div key={c.label} style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: "var(--text-xs)",
            color: c.pass ? "var(--color-success)" : "var(--color-silver)",
          }}>
            <span>{c.pass ? "✓" : "○"}</span>
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
