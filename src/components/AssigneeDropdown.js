"use client";
import { useState, useEffect } from "react";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { logAudit } from "@/lib/auditLogger";

export default function AssigneeDropdown({ task, req, user, supabase, onRefresh }) {
  const [members,        setMembers]        = useState([]);
  const [saving,         setSaving]         = useState(false);
  // uid pending confirmation via the reason box, or null when idle
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reason,         setReason]         = useState("");

  // v1 users table uses `name`, not `full_name`. No is_active column
  // exists on users — do not filter on it.
  useEffect(() => {
    supabase.from("users").select("id, name, can_assign")
      .eq("role", task.team_role)
      .then(({ data }) => setMembers(data || []));
  }, [task.team_role]);

  if (!members.length) return null;

  const notify = (userId, title, message) => {
    supabase.from("notifications").insert({
      user_id:    userId,
      type:       "task_assigned",
      title,
      message,
      request_id: task.request_id,
      action_url: `/requests/${task.request_id}`,
    }).then(() => {}).catch(() => {});
  };

  const applyAssignment = async (uid, reasonText = null) => {
    setSaving(true);
    const oldAssigneeId  = task.assigned_to;
    const isReassignment = !!oldAssigneeId && oldAssigneeId !== uid;
    const { error } = await supabase.from("tasks")
      .update({ assigned_to: uid || null })
      .eq("id", task.id);
    if (!error) {
      const newMember = members.find(m => m.id === uid);
      const oldMember = members.find(m => m.id === oldAssigneeId);

      if (uid) {
        notify(uid, "Task Assigned",
          isReassignment ? "Task assigned to you"
                         : `Task assigned to you for "${req.page_title}"`);
      }
      if (isReassignment) {
        notify(oldAssigneeId, "Task Reassigned",
          `Task reassigned to ${newMember?.name || "Unassigned"}`);
      }

      logAudit(supabase, user, AUDIT_ACTIONS.TASK_ASSIGNED, "task", task.id, {
        field_name: "assigned_to",
        old_value:  oldMember?.name || (oldAssigneeId ? "Unknown" : "Unassigned"),
        new_value:  reasonText
          ? `${newMember?.name || "Unassigned"} — reason: ${reasonText}`
          : (newMember?.name || "Unassigned"),
      });

      onRefresh?.();
    }
    setSaving(false);
    setReassignTarget(null);
    setReason("");
  };

  const handleChange = (e) => {
    const uid = e.target.value;
    if (uid === (task.assigned_to || "")) return;
    if (task.assigned_to) {
      // Already assigned to someone — require a reason before changing it
      setReassignTarget(uid);
    } else {
      // First assignment — no reason needed
      applyAssignment(uid);
    }
  };

  const confirmReassign = () => {
    if (!reason.trim()) return;
    applyAssignment(reassignTarget, reason.trim());
  };

  return (
    <div className="field-wrap" style={{ marginTop: 10 }}>
      <label className="field-label">Assigned to</label>
      <select
        className="select"
        value={task.assigned_to || ""}
        onChange={handleChange}
        disabled={saving || reassignTarget !== null}
      >
        <option value="">— Unassigned —</option>
        {members.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>

      {reassignTarget !== null && (
        <div style={{
          marginTop: 8, padding: "0.75rem",
          border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)",
          background: "var(--color-ghost)",
        }}>
          <label className="field-label">Reason for reassigning</label>
          <textarea
            className="textarea" rows={2}
            placeholder="Why are you reassigning this task?"
            value={reason}
            onChange={e => setReason(e.target.value)}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              className="btn-primary" style={{ flex: 1, justifyContent: "center" }}
              onClick={confirmReassign} disabled={!reason.trim() || saving}
            >
              {saving ? "Saving…" : "Confirm Reassign"}
            </button>
            <button
              className="btn-ghost" style={{ flex: 1, justifyContent: "center" }}
              onClick={() => { setReassignTarget(null); setReason(""); }} disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
