"use client";
import { useState } from "react";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { logAudit } from "@/lib/auditLogger";

function formatValue(v) {
  if (v === null || v === undefined || v === "") return "(empty)";
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? "" : "s"}`;
  if (typeof v === "object") return "(updated)";
  const s = String(v);
  return s.length > 120 ? s.slice(0, 120) + "…" : s;
}

// Admin-side review card for a pending stakeholder content change —
// rendered inline on the request's own detail view (TaskBoard.js View 4),
// per the "review where the request already lives" decision. See
// ProposeChangePanel.js for how the change gets created.
export default function PendingChangeCard({ change, req, user, supabase, tasks, onResolved }) {
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [rejecting,  setRejecting]  = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const fields = Array.isArray(change.changed_fields) ? change.changed_fields : [];

  const handleApprove = async () => {
    setSaving(true);
    setError("");

    const payload = Object.fromEntries(fields.map(f => [f.key, f.new_value]));

    const { error: reqErr } = await supabase.from("requests").update(payload).eq("id", req.id);
    if (reqErr) { setSaving(false); setError(reqErr.message || "Failed to apply changes."); return; }

    const { error: changeErr } = await supabase
      .from("content_change_requests")
      .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", change.id);
    if (changeErr) { setSaving(false); setError(changeErr.message || "Failed to update change status."); return; }

    const noteText = `Stakeholder updated content: ${change.reason}`;
    await supabase
      .from("tasks")
      .update({
        content_update_note: noteText,
        content_update_at:   new Date().toISOString(),
        content_update_read: false,
      })
      .eq("request_id", req.id);

    try {
      const notifications = (tasks || [])
        .filter(t => t.assigned_to)
        .map(t => ({
          user_id:    t.assigned_to,
          type:       "content_updated",
          title:      "Content was updated",
          message:    noteText,
          request_id: req.id,
          task_id:    t.id,
          action_url: `/requests/${req.id}`,
        }));
      if (notifications.length) await supabase.from("notifications").insert(notifications);
    } catch { /* notification failure must not block approval */ }

    logAudit(supabase, user, AUDIT_ACTIONS.CONTENT_CHANGE_APPROVED, "request", req.id, {
      field_name: fields.map(f => f.label).join(", "),
    });

    setSaving(false);
    onResolved?.();
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    setSaving(true);
    setError("");

    const { error: err } = await supabase
      .from("content_change_requests")
      .update({
        status:            "rejected",
        reviewed_by:        user.id,
        reviewed_at:         new Date().toISOString(),
        rejection_reason:    rejectNote.trim(),
      })
      .eq("id", change.id);
    if (err) { setSaving(false); setError(err.message || "Failed to reject."); return; }

    try {
      if (change.submitted_by) {
        await supabase.from("notifications").insert({
          user_id:    change.submitted_by,
          type:       "content_change_rejected",
          title:      "Content change not approved",
          message:    rejectNote.trim(),
          request_id: req.id,
          action_url: `/requests/${req.id}`,
        });
      }
    } catch { /* notification failure must not block rejection */ }

    logAudit(supabase, user, AUDIT_ACTIONS.CONTENT_CHANGE_REJECTED, "request", req.id, {
      field_name: rejectNote.trim(),
    });

    setSaving(false);
    onResolved?.();
  };

  return (
    <div className="card" style={{ borderColor: "#9333ea", background: "#faf5ff" }}>
      <div className="card-header">
        <h3 style={{ margin: 0 }}>👁️ Pending Content Change</h3>
      </div>
      <p className="text-sm" style={{ marginTop: 0 }}>
        <strong>Reason:</strong> {change.reason}
      </p>

      <div className="flex-col gap-8" style={{ marginBottom: 12 }}>
        {fields.map((f, i) => (
          <div key={i} style={{
            border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)",
            padding: "0.6rem 0.9rem", background: "#fff",
          }}>
            <div className="text-xs text-uppercase text-muted" style={{ marginBottom: 4, fontWeight: 600 }}>
              {f.label}
            </div>
            <div className="text-sm" style={{ color: "var(--color-silver)" }}>
              {formatValue(f.old_value)} → <strong style={{ color: "var(--color-night)" }}>{formatValue(f.new_value)}</strong>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error mb-8">{error}</div>}

      {!rejecting ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleApprove} disabled={saving}>
            {saving ? "Applying…" : "✅ Approve & Apply"}
          </button>
          <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setRejecting(true)} disabled={saving}>
            Reject
          </button>
        </div>
      ) : (
        <div className="flex-col gap-8">
          <textarea
            className="textarea"
            rows={2}
            placeholder="Reason for rejecting (required)"
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            disabled={saving}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setRejecting(false)} disabled={saving}>
              Back
            </button>
            <button
              className="btn-danger"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={handleReject}
              disabled={saving || !rejectNote.trim()}
            >
              {saving ? "Rejecting…" : "Confirm Reject"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
