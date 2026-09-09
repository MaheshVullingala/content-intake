"use client";
import { useState } from "react";
import { FaClipboardList, FaPlay } from "react-icons/fa";
import { createTasksForRequest } from "@/lib/taskUtils";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { logAudit } from "@/lib/auditLogger";

// Phase 1 replacement for AdminTaskSetup's "select teams, set a deadline,
// create parallel tasks" screen. That screen assumes the older multi-team
// parallel workflow (editorial + SEO + design + web, all forced required)
// — which doesn't match the current scoped-down flow: stakeholder submits,
// admin reviews, editorial reviews, Jira handles the rest. Nothing to
// select here — one click creates just the editorial_team task (verified
// safe: syncOverallStatus/check_web_team_unlock both no-op cleanly when
// no web_team task row exists at all) and moves the request past
// pending_admin. AdminTaskSetup.js itself is untouched and still exists
// for a later phase that needs the full parallel-team flow again — this
// component just isn't routed to it anymore. See
// PHASE1-EDITORIAL-REVIEW-PLAN.md.
export default function AdminReviewGate({ req, user, supabase, onStarted }) {
  const [starting, setStarting] = useState(false);
  const [error,    setError]    = useState("");

  const handleStart = async () => {
    setStarting(true);
    setError("");
    const { error: err } = await createTasksForRequest(req.id, ["editorial_team"], user.id, supabase);
    if (err) { setStarting(false); setError(err.message || "Failed to start review."); return; }
    logAudit(supabase, user, AUDIT_ACTIONS.TASK_CREATED, "request", req.id, {
      field_name: "editorial_team task", new_value: "created",
    });
    setStarting(false);
    onStarted?.();
  };

  return (
    <div className="card">
      <div className="card-header">
        <div><h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}><FaClipboardList size={14} /> Review this request</h3></div>
      </div>
      <p className="text-sm text-muted" style={{ marginTop: 0 }}>
        Take a look at the content in the preview. When you're ready, this
        hands it to the editorial team for review — you'll be able to link
        a Jira ticket to it right after.
      </p>
      {error && <div className="alert alert-error mb-8">{error}</div>}
      <button className="btn-primary btn-full" onClick={handleStart} disabled={starting} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {starting ? "Starting…" : <><FaPlay size={10} /> Begin Editorial Review</>}
      </button>
    </div>
  );
}
