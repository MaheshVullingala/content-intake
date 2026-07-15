"use client";
import { useState } from "react";
import { TASK_TEAMS } from "@/lib/taskUtils";
import { PRIORITY_META, AUDIT_ACTIONS } from "@/lib/constants";
import { createTasksForRequest } from "@/lib/taskUtils";
import { logAudit } from "@/lib/auditLogger";

const TEAM_HINTS = {
  editorial_team: "Reviews all text content for accuracy and tone",
  brand_team:     "Designs brand assets — PNGs, PSDs, imagery",
  seo_team:       "Reviews meta title, description and keywords",
  design_team:    "Resizes and optimises images for AEM",
  web_team:       "Implements content in AEM",
};

export default function AdminTaskSetup({ req, user, supabase, onTasksCreated }) {
  const origPriority = req.priority || "normal";

  const [selected, setSelected] = useState(() => {
    const base = new Set(
      TASK_TEAMS.filter(t => t.alwaysRequired).map(t => t.role)
    );
    if (req.needs_brand) base.add("brand_team");
    return base;
  });
  const [dueDate,        setDueDate]        = useState(req.due_date || "");
  const [priority,       setPriority]       = useState(origPriority);
  const [priorityReason, setPriorityReason] = useState("");
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");

  const priorityChanged = priority !== origPriority;

  const toggle = (role) => {
    const team = TASK_TEAMS.find(t => t.role === role);
    if (team?.alwaysRequired) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });
  };

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      // Fix 1 — persist priority, due date and admin review stamp before tasks exist
      const { error: reqErr } = await supabase
        .from("requests")
        .update({
          priority:                 priority,
          priority_override_reason: priorityChanged ? priorityReason.trim() || null : null,
          due_date:                 dueDate || null,
          admin_reviewed_by:        user.id,
          admin_reviewed_at:        new Date().toISOString(),
        })
        .eq("id", req.id);
      if (reqErr) { setError(reqErr.message); setSaving(false); return; }

      // Fix 2 — guarantee web_team is always in the creation list
      const teamsToCreate = [...new Set([...selected, "web_team"])];

      const { error: taskErr } = await createTasksForRequest(
        req.id, teamsToCreate, user.id, supabase
      );
      if (taskErr) { setError(taskErr.message); setSaving(false); return; }

      logAudit(supabase, user, AUDIT_ACTIONS.TASK_CREATED, "request", req.id, {
        new_value: teamsToCreate.join(","),
      });

      // Fix 3 — explicit overall_status flip (createTasksForRequest does this too,
      // but belt-and-suspenders in case the request update in fix 1 raced ahead)
      await supabase
        .from("requests")
        .update({ overall_status: "in_progress" })
        .eq("id", req.id);

      onTasksCreated?.();
    } catch (e) {
      setError(e.message || "Something went wrong.");
      setSaving(false);
    }
  };

  const teamCount = selected.size;

  return (
    <div className="card">

      {/* Header */}
      <div className="card-header">
        <div>
          <h3>⚙️ Admin Task Setup</h3>
          <p>Select teams, set a deadline, then create parallel tasks.</p>
        </div>
        <span className="badge badge-light">{req.page_type}</span>
      </div>

      {/* Request identity */}
      <div className="alert alert-info mb-12">
        <strong>{req.page_title || "Untitled request"}</strong>
        {req.users?.name && (
          <span style={{ marginLeft: 8, opacity: 0.75 }}>
            · submitted by {req.users.name}
          </span>
        )}
      </div>

      {/* Stakeholder brand signal */}
      {req.needs_brand && (
        <div className="alert alert-warning mb-12">
          🎨 Stakeholder indicated this request <strong>needs Brand Team</strong> involvement.
          Brand Team has been pre-selected below.
        </div>
      )}

      {/* ── Team selection ──────────────────────────────────────── */}
      <div className="field-wrap">
        <label className="field-label">
          Teams to include <span className="req">*</span>
        </label>
        <div className="flex-col gap-8">
          {TASK_TEAMS.map(team => {
            const isChecked  = selected.has(team.role);
            const isDisabled = !!team.alwaysRequired;
            return (
              <label
                key={team.role}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "0.65rem 0.9rem",
                  borderRadius: "var(--radius-lg)",
                  border: `1px solid ${isChecked ? team.color + "44" : "var(--color-border)"}`,
                  background: isChecked ? team.bg : "var(--color-ghost)",
                  cursor: isDisabled ? "default" : "pointer",
                  userSelect: "none",
                  transition: "all 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(team.role)}
                  disabled={isDisabled}
                  style={{
                    width: 15, height: 15,
                    accentColor: team.color,
                    cursor: isDisabled ? "default" : "pointer",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 17, lineHeight: 1 }}>{team.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--text-base)", fontWeight: 500,
                                color: "var(--color-night)" }}>
                    {team.label}
                  </div>
                  <div className="field-hint" style={{ marginTop: 1 }}>
                    {team.webLocked
                      ? "Unlocks automatically once all parallel teams complete"
                      : TEAM_HINTS[team.role]}
                  </div>
                </div>
                {team.alwaysRequired && !team.webLocked && (
                  <span className="badge badge-light"
                    style={{ fontSize: 10, whiteSpace: "nowrap" }}>
                    Required
                  </span>
                )}
                {!team.alwaysRequired && (
                  <span className="badge badge-light"
                    style={{ fontSize: 10, whiteSpace: "nowrap",
                             opacity: isChecked ? 1 : 0.5 }}>
                    Optional
                  </span>
                )}
                {team.webLocked && (
                  <span className="badge badge-light"
                    style={{ fontSize: 10, whiteSpace: "nowrap" }}>
                    🔒 Auto
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div className="divider" />

      {/* ── Due date ────────────────────────────────────────────── */}
      <div className="field-wrap">
        <label className="field-label">Due Date</label>
        <input
          type="date"
          className="input"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />
        <p className="field-hint">
          Optional — shown as a deadline indicator on the dashboard and task board.
        </p>
      </div>

      {/* ── Priority override ────────────────────────────────────── */}
      <div className="field-wrap">
        <label className="field-label">Priority</label>
        <select
          className="select"
          value={priority}
          onChange={e => setPriority(e.target.value)}
        >
          {Object.entries(PRIORITY_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
        {origPriority !== "normal" && !priorityChanged && (
          <p className="field-hint">
            Stakeholder requested:{" "}
            <strong>{PRIORITY_META[origPriority]?.label || origPriority}</strong>
          </p>
        )}
      </div>

      {/* Reason textarea — only when admin changes from stakeholder's value */}
      {priorityChanged && (
        <div className="field-wrap">
          <label className="field-label">Reason for priority change</label>
          <textarea
            className="textarea"
            value={priorityReason}
            onChange={e => setPriorityReason(e.target.value)}
            placeholder={`Explain why priority is changing from ${PRIORITY_META[origPriority]?.label ?? origPriority} → ${PRIORITY_META[priority]?.label ?? priority}…`}
            rows={3}
          />
        </div>
      )}

      {/* Error */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Submit */}
      <button
        className="btn-primary btn-full"
        onClick={handleCreate}
        disabled={saving || teamCount === 0}
      >
        {saving
          ? "Creating tasks…"
          : `⚡ Create Tasks for ${teamCount} Team${teamCount !== 1 ? "s" : ""}`}
      </button>

    </div>
  );
}
