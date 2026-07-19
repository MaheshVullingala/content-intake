"use client";
import { useState, useEffect, useRef } from "react";
import { TASK_TEAMS, TASK_STATUS_META, updateTask, syncOverallStatus, tryUnlockWebTeam } from "@/lib/taskUtils";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { logAudit } from "@/lib/auditLogger";
import { getFlaggedImageFields } from "@/lib/imageFields";
import BrandFilesPanel from "@/components/BrandFilesPanel";
import AssigneeDropdown from "@/components/AssigneeDropdown";

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

// ── SEO Team fields ──────────────────────────────────────────────────────────
// Real requests table columns — NOT seo_title/seo_description/seo_keywords/
// seo_og_*; seo_og_title/seo_og_description are new (see
// sql/06-seo-og-fields.sql — must be applied before Approve & Complete can
// save them).
const SEO_FIELD_CONFIGS = [
  { key: "seo_meta_title",       label: "Meta Title",       type: "text",     min: 50,  max: 70  },
  { key: "seo_meta_description", label: "Meta Description", type: "textarea", min: 120, max: 160 },
  { key: "seo_meta_keywords",    label: "Meta Keywords",    type: "keywords" },
  { key: "seo_og_title",         label: "OG Title",         type: "text",     min: 50,  max: 70  },
  { key: "seo_og_description",   label: "OG Description",   type: "textarea", min: 120, max: 160 },
];

// Keys must match EditSectionModal.js's SECTION_CONFIG exactly.
const QUESTION_SECTIONS = [
  { key: "banner",            label: "Banner" },
  { key: "overview",          label: "Overview" },
  { key: "key_benefits",      label: "Key Benefits" },
  { key: "features_apps",     label: "Features / Applications" },
  { key: "customer_stories",  label: "Customer Stories" },
  { key: "promo_section",     label: "Promo Section" },
  { key: "related_content",   label: "Related Content" },
  { key: "resources",         label: "Resources" },
  { key: "related_products",  label: "Related Products" },
  { key: "training_support",  label: "Training & Support" },
  { key: "seo_meta",          label: "SEO Meta" },
];

const parseKbTitles = (kb_cards) => {
  try {
    const cards = Array.isArray(kb_cards) ? kb_cards : JSON.parse(kb_cards || "[]");
    return cards.map(c => c.title).filter(Boolean).join(", ");
  } catch { return ""; }
};

const parseFaTitles = (fa_items) => {
  try {
    const items = Array.isArray(fa_items) ? fa_items : JSON.parse(fa_items || "[]");
    return items.map(i => i.title).filter(Boolean).join(", ");
  } catch { return ""; }
};

export default function TaskPanel({ req, user, supabase, tasks, onRefresh }) {
  const myTask = tasks.find(t => t.team_role === user.role) ?? null;

  const [saving,      setSaving]      = useState(false);
  const [question,    setQuestion]    = useState("");
  const [questionSection, setQuestionSection] = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [myFiles,     setMyFiles]     = useState([]);
  const [error,       setError]       = useState("");
  // Web team request-changes modal
  const [showChanges, setShowChanges] = useState(false);
  const [changeTeam,  setChangeTeam]  = useState("editorial_team");
  const [changeNote,  setChangeNote]  = useState("");
  // Design team: which flagged field a mapped-image upload targets
  const [mappingField, setMappingField] = useState(null);
  // SEO team — pre-filled from existing DB values on mount
  const [seoFields, setSeoFields] = useState(() => ({
    seo_meta_title:       req.seo_meta_title       || "",
    seo_meta_description: req.seo_meta_description || "",
    seo_meta_keywords:    req.seo_meta_keywords    || "",
    seo_og_title:         req.seo_og_title         || "",
    seo_og_description:   req.seo_og_description   || "",
  }));
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState("");
  // Web team — shown once, right after this session's own publish action.
  // Lives outside the isActive-gated web_team card, since publishing
  // flips the task to "completed" and that whole card unmounts on the
  // next render once onRefresh() lands.
  const [publishSuccess, setPublishSuccess] = useState(false);

  const fileRef       = useRef();
  const mappedFileRef = useRef();

  // Fetch files this team uploaded for this request's task
  const fetchMyFiles = async () => {
    if (!myTask) return;
    const { data } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", myTask.id)
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
      if (err) { setError(err.message); return false; }
      await syncOverallStatus(req.id, supabase);
      onRefresh?.();
      return true;
    } catch (e) { setError(e.message || "Update failed."); return false; }
    finally     { setSaving(false); }
  };

  const handleComplete = async () => {
    const ok = await doUpdate({ status: "completed" });
    if (ok) {
      logAudit(supabase, user, AUDIT_ACTIONS.TASK_COMPLETED, "task", myTask.id);
      // Fire-and-forget — a parallel task completing may unlock web_team;
      // never block the UI on this secondary sync.
      Promise.all([
        syncOverallStatus(req.id, supabase),
        tryUnlockWebTeam(req.id, supabase),
      ]).then(() => onRefresh?.()).catch(() => {});
    }
  };

  // ── SEO team: AI generation + save-and-complete ─────────────────────────────
  const handleGenerateSEO = async () => {
    setGenerating(true); setGenError("");
    try {
      const prompt = `You are an SEO specialist for Cadence Design Systems, a leading EDA software company.

Generate SEO metadata for this page:
- Page Type: ${req.page_type || ""}
- Page Title: ${req.page_title || ""}
- Page Location: ${req.seo_page_location || ""}
- Overview: ${req.overview_impact || ""}. ${req.overview_description || ""}
- Key Benefits: ${parseKbTitles(req.kb_cards)}
- Features: ${parseFaTitles(req.fa_items)}

Rules:
- Meta title: 50-70 chars, include "| Cadence" at end
- Meta description: 120-160 chars, include soft CTA like "Learn how..." or "Discover..."
- Keywords: 8-10 relevant terms, comma separated
- OG title: same as meta title or slight variation
- OG description: same as meta description
- Return ONLY valid JSON, no markdown, no explanation

Return this exact format:
{
  "seo_meta_title": "...",
  "seo_meta_description": "...",
  "seo_meta_keywords": "...",
  "seo_og_title": "...",
  "seo_og_description": "..."
}`;

      const res = await fetch("/api/ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const clean  = (data.text || "").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setSeoFields(prev => ({ ...prev, ...parsed }));
    } catch (e) {
      setGenError("Failed to generate SEO content. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveSEO = async () => {
    setError("");
    const { error: reqErr } = await supabase.from("requests").update({
      seo_meta_title:       seoFields.seo_meta_title,
      seo_meta_description: seoFields.seo_meta_description,
      seo_meta_keywords:    seoFields.seo_meta_keywords,
      seo_og_title:         seoFields.seo_og_title,
      seo_og_description:   seoFields.seo_og_description,
    }).eq("id", req.id);
    if (reqErr) { setError(reqErr.message); return; }
    await handleComplete();
  };

  const handleSubmitApproval = async () => {
    const ok = await doUpdate({ status: "pending_approval" });
    if (!ok) return;
    const isDesign = user.role === "design_team";
    // Fire and forget — never let a notification failure block submission.
    supabase.from("notifications").insert({
      user_id:    req.created_by,
      type:       "approval_needed",
      title:      isDesign ? "Design Team images ready for review" : "Brand Team files ready for review",
      message:    isDesign
        ? `Design Team has uploaded resized images for "${req.page_title}" and is requesting your approval.`
        : `Brand Team has uploaded files for "${req.page_title}" and is requesting your approval.`,
      request_id: req.id,
      action_url: `/requests/${req.id}`,
    }).then(() => {}).catch(() => {});
  };
  const handleWaitForBrand    = () => doUpdate({ status: "waiting_for_brand" });
  const handleResumeFromBrand = () => doUpdate({ status: "in_progress" });

  // Non-blocking: sets needs_info but completion buttons still work at that status
  const handleAskQuestion = async () => {
    const q = question.trim();
    if (!q) return;
    const fullQuestion = questionSection ? `[${questionSection}] ${q}` : q;
    setSaving(true); setError("");
    try {
      const { error: err } = await updateTask(myTask.id, {
        status:            "needs_info",
        question:          fullQuestion,
        question_at:       new Date().toISOString(),
        question_asked_by: user.id,
      }, supabase);
      if (err) { setError(err.message); return; }
      setQuestion("");
      setQuestionSection("");
      onRefresh?.();
    } catch (e) { setError(e.message || "Failed to send question."); }
    finally     { setSaving(false); }
  };

  // ── File upload (bucket: "attachments" — same as v1 ImageField) ────────────
  // Brand team only now — design team uploads via the per-field "Images to
  // Map" mapping below instead of a generic bucket.
  const uploadFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_BRAND_MB) {
      setError("File too large — max 10 MB.");
      return;
    }
    setUploading(true); setError("");
    try {
      const ext  = file.name.split(".").pop();
      const path = `tasks/${req.id}/${user.role}/brand/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("attachments").upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from("attachments").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("task_attachments").insert({
        task_id:      myTask.id,
        request_id:   req.id,
        uploaded_by:  user.id,
        file_name:    file.name,
        file_type:    file.type,
        file_size:    file.size,
        storage_path: path,
        public_url:   publicUrl,
        section_tag:  null,
      });
      if (dbErr) throw dbErr;
      await fetchMyFiles();
    } catch (e) { console.error("Upload error full:", e); setError(e.message || "Upload failed."); }
    finally     { setUploading(false); }
  };

  // ── Design team: per-field image mapping ("Images to Map") ─────────────────
  const flaggedFields = user.role === "design_team" ? getFlaggedImageFields(req) : [];
  const getMappedFile = (fieldId) =>
    myFiles.find(f => f.section_tag === `design_team:${fieldId}`);

  const uploadMappedImage = async (field, file) => {
    if (!file) return;
    if (file.size > MAX_DESIGN_MB) { setError("File too large — max 20 MB."); return; }
    setUploading(true); setError("");
    try {
      // Only one image per field — remove the previous mapping first
      const existing = getMappedFile(field.fieldId);
      if (existing) {
        await supabase.storage.from("attachments").remove([existing.storage_path]);
        await supabase.from("task_attachments").delete().eq("id", existing.id);
      }
      const ext  = file.name.split(".").pop();
      const path = `tasks/${req.id}/design_team/mapped/${field.fieldId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("attachments").upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from("attachments").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("task_attachments").insert({
        task_id:      myTask.id,
        request_id:   req.id,
        uploaded_by:  user.id,
        file_name:    file.name,
        file_type:    file.type,
        file_size:    file.size,
        storage_path: path,
        public_url:   publicUrl,
        section_tag:  `design_team:${field.fieldId}`,
      });
      if (dbErr) throw dbErr;
      await fetchMyFiles();
      onRefresh?.(); // so PagePreview's designAttachments (fetched by TaskBoard) picks this up
    } catch (e) { console.error("Mapped upload error:", e); setError(e.message || "Upload failed."); }
    finally     { setUploading(false); setMappingField(null); }
  };

  const deleteMappedImage = async (mappedFile) => {
    if (!window.confirm("Remove this mapped image? This cannot be undone.")) return;
    setError("");
    try {
      const { error: storageErr } = await supabase.storage
        .from("attachments").remove([mappedFile.storage_path]);
      if (storageErr) throw storageErr;
      const { error: delErr } = await supabase
        .from("task_attachments").delete().eq("id", mappedFile.id);
      if (delErr) throw delErr;
      await fetchMyFiles();
      onRefresh?.();
    } catch (e) { setError(e.message || "Failed to remove image."); }
  };

  // Brand/design team: delete one of their own uploaded files
  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Delete "${file.file_name}"? This cannot be undone.`)) return;
    setError("");
    try {
      const { error: storageErr } = await supabase.storage
        .from("attachments").remove([file.storage_path]);
      if (storageErr) throw storageErr;
      const { error: delErr } = await supabase
        .from("task_attachments").delete().eq("id", file.id);
      if (delErr) throw delErr;
      await fetchMyFiles();
    } catch (e) { setError(e.message || "Failed to delete file."); }
  };

  // ── Web team: request changes from another team ─────────────────────────────
  const handleRequestChanges = async () => {
    const note = changeNote.trim();
    if (!note || !changeTeam) return;
    setSaving(true); setError("");
    try {
      const targetTask = tasks.find(t => t.team_role === changeTeam);
      if (!targetTask) { setError("That team has no task for this request."); return; }
      // Cross-team update — requires the tasks_update_web_team_request_changes
      // RLS policy (sql/07-tasks-web-team-request-changes.sql); the base
      // tasks_update policy only allows a team to update its own task rows.
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
      // Notify the target team — fire and forget, never let a notification
      // failure (e.g. RLS 403) block or delay the request-changes flow.
      try {
        const { data: targetUsers } = await supabase
          .from("users").select("id").eq("role", changeTeam);
        if (targetUsers?.length) {
          supabase.from("notifications").insert(
            targetUsers.map(u => ({
              user_id:    u.id,
              type:       "changes_requested",
              title:      "Web Team requested changes",
              message:    `Web Team needs changes for "${req.page_title}": "${note}"`,
              request_id: req.id,
              action_url: `/requests/${req.id}`,
            }))
          ).then(() => {}).catch(() => {});
        }
      } catch { /* notification failure must not block the request-changes flow */ }
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

      // Notify stakeholder + admins — fire and forget, never let a
      // notification failure block the publish flow.
      try {
        const notifications = [];
        if (req.created_by) {
          notifications.push({
            user_id:    req.created_by,
            type:       "published",
            title:      "Your page has been published!",
            message:    `"${req.page_title}" has been published to AEM by the Web Team.`,
            request_id: req.id,
            action_url: `/requests/${req.id}`,
          });
        }
        const { data: admins } = await supabase.from("users").select("id").in("role", ["admin", "super_admin"]);
        (admins || []).forEach(a => notifications.push({
          user_id:    a.id,
          type:       "published",
          title:      "Page published",
          message:    `"${req.page_title}" has been published.`,
          request_id: req.id,
          action_url: `/requests/${req.id}`,
        }));
        if (notifications.length) {
          supabase.from("notifications").insert(notifications).then(() => {}).catch(() => {});
        }
      } catch { /* notification failure must not block publish */ }

      setPublishSuccess(true);
      onRefresh?.();
    } catch (e) { setError(e.message || "Failed to publish."); }
    finally     { setSaving(false); }
  };

  // ── Shared file list renderer (brand + design) ─────────────────────────────
  const canDelete = myTask.status !== "pending_approval";
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
            {f.uploaded_by === user.id && canDelete && (
              <button
                onClick={() => handleDeleteFile(f)}
                title="Delete file"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#c0392b", fontSize: 13, padding: "0 2px", flexShrink: 0,
                }}
              >
                🗑️
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Upload zone: Brand Team (no section mapping) ────────────────────────────
  const BrandUploadZone = () => (
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
        {uploading ? "Uploading…" : "Click to upload JPEG / PNG"}
      </div>
      <div className="field-hint">Max 10 MB per file</div>
      <input
        ref={fileRef} type="file" accept=".jpg,.jpeg,.png"
        style={{ display: "none" }}
        onChange={e => { uploadFile(e.target.files[0]); e.target.value = ""; }}
      />
    </div>
  );

  return (
    <div className="flex-col gap-12">

      {publishSuccess && (
        <div className="alert alert-success">
          🎉 Page published successfully! The stakeholder has been notified.
        </div>
      )}

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
                        marginBottom: (user.can_assign || user.role === "super_admin") ? 0 : 6 }}>
            Assigned to <strong>{myTask.assignee.name}</strong>
          </div>
        )}

        {/* Reassign dropdown (leads + super_admin) */}
        {(user.can_assign || user.role === "super_admin") && !isCompleted && !isLocked && (
          <AssigneeDropdown task={myTask} req={req} user={user} supabase={supabase} onRefresh={onRefresh} />
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
              logAudit(supabase, user, AUDIT_ACTIONS.TASK_STATUS_CHANGED, "task", myTask.id, {
                old_value: "pending", new_value: "in_progress",
              });
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
          {["editorial_team", "seo_team"].includes(user.role) && (
            <select
              className="select"
              style={{ marginBottom: 8 }}
              value={questionSection}
              onChange={e => setQuestionSection(e.target.value)}
            >
              <option value="">Which section is this about? (optional)</option>
              {QUESTION_SECTIONS.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          )}
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
          <h3 style={{ margin: "0 0 6px", fontSize: "var(--text-base)", fontWeight: 600 }}>
            ✏️ Content Editing
          </h3>
          <p className="field-hint" style={{ marginBottom: 12 }}>
            Click "✎ Edit" on any section in the preview to update its content.
          </p>
          <button className="btn-primary btn-full" onClick={handleComplete} disabled={saving}>
            {saving ? "Saving…" : "✅ Mark Content Approved"}
          </button>
        </div>
      )}

      {/* ── SEO TEAM ─────────────────────────────────────────────────── */}
      {user.role === "seo_team" && (isActive || myTask.status === "needs_info") && (
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: "var(--text-base)", fontWeight: 600 }}>
            🔍 SEO Metadata
          </h3>

          <button
            className="btn-ghost btn-full mb-12"
            onClick={handleGenerateSEO}
            disabled={generating}
          >
            {generating ? "Generating…" : "✨ Generate SEO with AI"}
          </button>

          {genError && <div className="alert alert-error mb-12">{genError}</div>}

          <div className="flex-col gap-12">
            {SEO_FIELD_CONFIGS.map(f => {
              const val = seoFields[f.key] || "";
              if (f.type === "keywords") {
                const kwCount = val.split(",").map(s => s.trim()).filter(Boolean).length;
                return (
                  <div className="field-wrap" key={f.key} style={{ marginBottom: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                                  alignItems: "center", marginBottom: 4 }}>
                      <label className="field-label" style={{ margin: 0 }}>{f.label}</label>
                      <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace",
                                     color: "var(--color-silver)" }}>
                        {kwCount} term{kwCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <textarea
                      className="textarea" rows={2}
                      placeholder="keyword one, keyword two, ..."
                      value={val}
                      onChange={e => setSeoFields(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                );
              }
              const len     = val.length;
              const inRange = len >= f.min && len <= f.max;
              return (
                <div className="field-wrap" key={f.key} style={{ marginBottom: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                                alignItems: "center", marginBottom: 4 }}>
                    <label className="field-label" style={{ margin: 0 }}>{f.label}</label>
                    <span style={{
                      fontSize: 11, fontWeight: 600, fontFamily: "monospace",
                      color: inRange ? "var(--color-success)" : "#d97706",
                    }}>
                      {len}/{f.max}
                    </span>
                  </div>
                  {f.type === "textarea"
                    ? <textarea
                        className="textarea" rows={2}
                        value={val}
                        onChange={e => setSeoFields(p => ({ ...p, [f.key]: e.target.value }))}
                      />
                    : <input
                        className="input"
                        value={val}
                        onChange={e => setSeoFields(p => ({ ...p, [f.key]: e.target.value }))}
                      />
                  }
                </div>
              );
            })}
          </div>

          <button
            className="btn-primary btn-full mt-12"
            onClick={handleApproveSEO}
            disabled={saving}
          >
            {saving ? "Saving…" : "✅ Approve & Complete"}
          </button>
        </div>
      )}

      {/* ── BRAND TEAM ───────────────────────────────────────────────── */}
      {user.role === "brand_team" && (
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: "var(--text-base)", fontWeight: 600 }}>
            🎨 Brand Assets
          </h3>
          {myTask.status === "in_progress" && myTask.pending_action_note && (
            <div className="alert alert-error mb-12">
              <strong>Rejection reason:</strong> {myTask.pending_action_note}
            </div>
          )}
          <FileList />
          {(isActive || isPendingApproval) && (
            <>
              {!isPendingApproval && <BrandUploadZone />}
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
          {myTask.status === "in_progress" && myTask.pending_action_note && (
            <div className="alert alert-error mb-12">
              <strong>Rejection reason:</strong> {myTask.pending_action_note}
            </div>
          )}
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
          <BrandFilesPanel requestId={req.id} supabase={supabase} />
        </div>
      )}

      {/* ── DESIGN TEAM: Images to Map ──────────────────────────────────
          Only upload path for design_team now — one row per stakeholder-
          flagged image field. Upload target for each row is section_tag =
          `design_team:{fieldId}`. Always rendered (not gated on having
          flagged fields) so Submit for Approval always has somewhere to
          live, even on a request with nothing flagged. ────────────────── */}
      {user.role === "design_team" && (
        <div className="card">
          <h3 style={{ margin: "0 0 4px", fontSize: "var(--text-base)", fontWeight: 600 }}>
            🗺️ Images to Map
          </h3>
          <p className="field-hint" style={{ marginBottom: 12 }}>
            Upload your resized image for each field the stakeholder flagged.
          </p>
          {flaggedFields.length === 0 && (
            <div className="alert alert-info mb-8" style={{ fontSize: "var(--text-xs)" }}>
              No images flagged by stakeholder yet.
            </div>
          )}
          <div className="flex-col gap-8">
            {flaggedFields.map(field => {
              const mapped = getMappedFile(field.fieldId);
              return (
                <div key={field.fieldId} style={{
                  border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)",
                  padding: "0.75rem 0.9rem",
                }}>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: 4 }}>
                    {field.section} — {field.label}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-silver)", marginBottom: 8 }}>
                    {field.ref.type === "description" && <>📝 {field.ref.value}</>}
                    {field.ref.type === "link" && (
                      <>🔗 <a href={field.ref.url} target="_blank" rel="noopener noreferrer"
                              style={{ color: "var(--color-primary)" }}>{field.ref.value}</a></>
                    )}
                    {field.ref.type === "attachment" && (
                      <>📎 Reference image uploaded{field.ref.url && (
                        <> — <a href={field.ref.url} target="_blank" rel="noopener noreferrer"
                                style={{ color: "var(--color-primary)" }}>View ↗</a></>
                      )}</>
                    )}
                  </div>
                  {mapped ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <img src={mapped.public_url} alt=""
                        style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6,
                                 border: "1px solid var(--color-border)", flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: "var(--text-xs)", color: "var(--color-success)" }}>
                        ✓ Mapped
                      </span>
                      <button
                        onClick={() => deleteMappedImage(mapped)}
                        title="Remove mapped image"
                        style={{ background: "none", border: "none", cursor: "pointer",
                                 color: "#c0392b", fontSize: 13, flexShrink: 0 }}
                      >
                        🗑️
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-ghost"
                      style={{ width: "100%", justifyContent: "center", fontSize: "var(--text-xs)" }}
                      onClick={() => { setMappingField(field.fieldId); mappedFileRef.current?.click(); }}
                      disabled={uploading}
                    >
                      {uploading && mappingField === field.fieldId ? "Uploading…" : "📤 Upload Image"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <input
            ref={mappedFileRef} type="file" accept=".jpg,.jpeg,.png,.webp"
            style={{ display: "none" }}
            onChange={e => {
              const file  = e.target.files[0];
              const field = flaggedFields.find(f => f.fieldId === mappingField);
              if (field) uploadMappedImage(field, file);
              e.target.value = "";
            }}
          />
          {(isActive || isPendingApproval) && !isWaitingBrand && (
            <button
              className="btn-primary btn-full mt-12"
              onClick={handleSubmitApproval}
              disabled={saving || myFiles.length === 0 || isPendingApproval}
            >
              {saving              ? "Submitting…"
               : isPendingApproval ? "✓ Awaiting Stakeholder Approval"
               :                    "👁️ Submit for Stakeholder Approval"}
            </button>
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
