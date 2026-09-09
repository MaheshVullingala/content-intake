"use client";
import { useState } from "react";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { logAudit } from "@/lib/auditLogger";

// Manual v1 of the Jira handoff: admin creates the ticket themselves in
// Jira (referencing this request's id in the ticket description/title),
// then pastes the resulting id/url back here so it's tracked on the
// request. No Jira API integration — see PHASE1-EDITORIAL-REVIEW-PLAN.md,
// Decision C. Editable any time, not a one-shot "create" action, so
// admin can fix a typo or link it later if they created the ticket
// before this field existed.
export default function JiraTicketCard({ req, user, supabase, onRefresh }) {
  const [editing,  setEditing]  = useState(false);
  const [ticketId, setTicketId] = useState(req.jira_ticket_id || "");
  const [ticketUrl, setTicketUrl] = useState(req.jira_ticket_url || "");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const hasTicket = !!req.jira_ticket_id;

  const handleSave = async () => {
    if (!ticketId.trim()) { setError("Ticket ID is required."); return; }
    setSaving(true);
    setError("");
    const payload = {
      jira_ticket_id:  ticketId.trim(),
      jira_ticket_url: ticketUrl.trim() || null,
      jira_created_at: req.jira_created_at || new Date().toISOString(),
      jira_created_by: req.jira_created_by || user.id,
    };
    const { error: err } = await supabase.from("requests").update(payload).eq("id", req.id);
    if (err) { setSaving(false); setError(err.message || "Failed to save."); return; }
    logAudit(supabase, user, AUDIT_ACTIONS.JIRA_TICKET_LINKED, "request", req.id, {
      field_name: "jira_ticket_id",
      old_value:  req.jira_ticket_id || null,
      new_value:  payload.jira_ticket_id,
    });
    setSaving(false);
    setEditing(false);
    onRefresh?.();
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <div><h3 style={{ margin: 0, fontSize: 14 }}>🎫 Jira Ticket</h3></div>
      </div>

      {!editing && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          {hasTicket ? (
            ticketUrl
              ? <a href={ticketUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 500, color: "#3ec5cb" }}>
                  {req.jira_ticket_id} ↗
                </a>
              : <span style={{ fontSize: 13, fontWeight: 500 }}>{req.jira_ticket_id}</span>
          ) : (
            <span className="text-sm text-muted">No ticket linked yet</span>
          )}
          <button className="btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => setEditing(true)}>
            {hasTicket ? "Edit" : "Link Ticket"}
          </button>
        </div>
      )}

      {editing && (
        <div>
          <p className="text-xs text-muted" style={{ marginTop: 0 }}>
            Create the ticket in Jira yourself, referencing this request's id
            (<code style={{ fontSize: 11, fontWeight: 700 }}>{req.request_display_id || req.id}</code>),
            then paste the ticket id/link here for tracking.
          </p>
          <div className="field-wrap">
            <label className="field-label">Ticket ID <span className="req">*</span></label>
            <input className="input" placeholder="e.g. CIP-142" value={ticketId} onChange={e => setTicketId(e.target.value)} />
          </div>
          <div className="field-wrap">
            <label className="field-label">Ticket URL</label>
            <input className="input" placeholder="https://yourorg.atlassian.net/browse/CIP-142" value={ticketUrl} onChange={e => setTicketUrl(e.target.value)} />
          </div>
          {error && <div className="alert alert-error mb-8">{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }}
              onClick={() => { setEditing(false); setTicketId(req.jira_ticket_id || ""); setTicketUrl(req.jira_ticket_url || ""); setError(""); }}
              disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
