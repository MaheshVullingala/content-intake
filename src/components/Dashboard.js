"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PCBLoader } from "@/components/PCBLoader";
import { getStatus, ROLE_META, canAct, STATUS_FLOW } from "@/lib/constants";

export default function Dashboard({ go, user }) {
  const [requests,      setRequests]      = useState([]);
  const [returnCounts,  setReturnCounts]  = useState({}); // requestId → { count, lastRole }
  const [loading,       setLoading]       = useState(true);
  const [deleteModal,   setDeleteModal]   = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [view,          setView]          = useState("mine");   // "mine" | "all"
  const [filterStatus,  setFilterStatus]  = useState("all");   // status key or "all"
  const [filterRole,    setFilterRole]    = useState("all");   // role key or "all"
  const m = ROLE_META[user.role];

  const fetchRequests = async ({ fromSave = false } = {}) => {
    setLoading(true);
    try {
      // If coming from a save, wait for Supabase to fully commit
      if (fromSave) await new Promise(r => setTimeout(r, 500));

      let query = supabase
        .from("requests")
        .select("*, users!requests_created_by_fkey(name, role)")
        .order("updated_at", { ascending: false });
      // Stakeholders only see their own requests; other roles see all in "mine" view filtered client-side
      if (user.role === "stakeholder") query = query.eq("created_by", user.id);
      const { data, error } = await query;
      if (error) { console.error("Dashboard fetch error:", error); return; }
      const rows = data || [];

      setRequests(rows);

      // Fetch return/query info — include user_role to distinguish Editorial vs Design QA
      if (rows.length > 0) {
        const ids = rows.map(r => r.id);
        const { data: returnComments } = await supabase
          .from("comments")
          .select("request_id, user_role, created_at")
          .in("request_id", ids)
          .eq("is_return", true)
          .order("created_at", { ascending: false });
        const counts = {};
        (returnComments || []).forEach(c => {
          if (!counts[c.request_id]) counts[c.request_id] = { count: 0, lastRole: c.user_role };
          counts[c.request_id].count += 1;
        });
        setReturnCounts(counts);
      }
    } catch (e) {
      console.error("Dashboard fetch exception:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [user.id]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    await supabase.from("comments").delete().eq("request_id", deleteModal.id);
    await supabase.from("status_history").delete().eq("request_id", deleteModal.id);
    await supabase.from("attachments").delete().eq("request_id", deleteModal.id);
    await supabase.from("requests").delete().eq("id", deleteModal.id);
    setDeleteModal(null);
    setDeleting(false);
    fetchRequests();
  };

  // "My Tasks" = requests where this role can act + for stakeholders also include their drafts
  const myTasks = requests.filter(r => {
    if (canAct(user.role, r.status)) return true;
    // Stakeholders always see their own drafts (including returned ones) in My Tasks
    if (user.role === "stakeholder" && r.status === "draft" && r.created_by === user.id) return true;
    return false;
  });
  const actionable = myTasks;

  // "All Requests" filtered list
  const allFiltered = requests.filter(r => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  const displayRows = view === "mine" ? myTasks : allFiltered;
  const stats = STATUS_FLOW.map(s => ({ ...s, count: requests.filter(r => r.status === s.key).length }));

  return (
    <div className="fade-in" style={{ fontFamily: "'Rubik', sans-serif" }}>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div onClick={() => !deleting && setDeleteModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: "2rem", maxWidth: 420, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff5f5", border: "1px solid #c0392b33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 16 }}>🗑️</div>
            <h2 style={{ fontSize: 17, fontWeight: 500, marginBottom: 8 }}>Delete Draft?</h2>
            <p style={{ fontSize: 13, color: "#646464", marginBottom: 6, lineHeight: 1.6 }}>
              You are about to permanently delete:
            </p>
            <div style={{ background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.7rem 1rem", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#181313" }}>{deleteModal.page_title || "Untitled"}</div>
              <div style={{ fontSize: 12, color: "#B5B5B5", marginTop: 3 }}>{deleteModal.page_type} · Draft</div>
            </div>
            <p style={{ fontSize: 12, color: "#c0392b", marginBottom: 20 }}>⚠️ This action cannot be undone.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={handleDelete} disabled={deleting}
                style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 8, padding: "0.7rem", fontSize: 14, fontWeight: 500, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", opacity: deleting ? 0.6 : 1 }}>
                {deleting ? "Deleting..." : "🗑️ Yes, Delete Draft"}
              </button>
              <button onClick={() => setDeleteModal(null)} disabled={deleting}
                style={{ background: "#F3F3F3", color: "#646464", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.7rem", fontSize: 14, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome */}
      <div style={{ marginBottom: 26, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#3C3C3C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{m.icon}</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Welcome back, {user.name}</h1>
            <p style={{ color: "#B5B5B5", fontSize: 13, margin: 0 }}>{m.label} · {user.department}</p>
          </div>
        </div>
        <button onClick={fetchRequests} style={{ background: "transparent", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.9rem", fontSize: 12, cursor: "pointer", color: "#646464", fontFamily: "'Rubik',sans-serif" }}>↻ Refresh</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 26 }}>
        {stats.map(s => (
          <div key={s.key} style={{ background: "#fff", border: "1px solid #E0E0E0", borderRadius: 10, padding: "0.9rem 0.8rem", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: s.count > 0 ? "#181313" : "#B5B5B5" }}>{s.count}</div>
            <div style={{ fontSize: 9, color: "#B5B5B5", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4, lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action needed */}
      {actionable.length > 0 && (
        <div style={{ background: "#181313", borderRadius: 10, padding: "0.85rem 1.3rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontSize: 13, color: "#F3F3F3", fontWeight: 500 }}>{actionable.length} request{actionable.length > 1 ? "s" : ""} awaiting your review</span>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", overflow: "hidden" }}>
        <div style={{ padding: "0.75rem 1.2rem", borderBottom: "1px solid #F3F3F3" }}>
          {/* View toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: view === "all" ? 12 : 0 }}>
            <div style={{ display: "flex", background: "#F3F3F3", borderRadius: 8, padding: 3, gap: 2 }}>
              {[["mine", `⚡ My Tasks${myTasks.length > 0 ? ` (${myTasks.length})` : ""}`], ["all", "📋 All Requests"]].map(([v, label]) => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: "0.4rem 1rem", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "'Rubik',sans-serif", transition: "all 0.15s",
                    background: view === v ? "#fff" : "transparent",
                    color:      view === v ? "#181313" : "#646464",
                    boxShadow:  view === v ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  }}>
                  {label}
                </button>
              ))}
            </div>
            <span style={{ color: "#B5B5B5", fontSize: 12 }}>{displayRows.length} shown</span>
          </div>

          {/* Filters — only in All view */}
          {view === "all" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ fontSize: 12, padding: "0.4rem 0.7rem", border: "1px solid #E0E0E0", borderRadius: 7, background: "#fff", color: "#181313", fontFamily: "'Rubik',sans-serif", cursor: "pointer" }}>
                <option value="all">All Statuses</option>
                {STATUS_FLOW.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <button onClick={() => { setFilterStatus("all"); setFilterRole("all"); }}
                style={{ fontSize: 12, padding: "0.4rem 0.8rem", border: "1px solid #E0E0E0", borderRadius: 7, background: "#fff", color: "#646464", cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                ✕ Clear Filters
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <PCBLoader label="LOADING REQUESTS..." />
        ) : requests.length === 0 ? (
          <div style={{ padding: "3.5rem", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <p style={{ color: "#B5B5B5", fontSize: 14 }}>No requests yet.</p>
            {user.role === "stakeholder" && (
              <button onClick={() => go("new")} className="btn-primary" style={{ marginTop: 14 }}>Create your first request</button>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9F9F9" }}>
                {["Title", "Page Type", "Status", "Submitted By", "Last Updated", "Actions"].map(h => (
                  <th key={h} style={{ padding: "0.7rem 1.2rem", textAlign: "left", fontSize: 10, color: "#B5B5B5", fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: "1px solid #F3F3F3" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((req, i) => {
                const s          = getStatus(req.status);
                const act        = canAct(user.role, req.status);
                const isDraft    = req.status === "draft";
                const isOwner    = req.created_by === user.id;
                const returnInfo   = returnCounts[req.id] || { count: 0, lastRole: null };
                const returnCount  = returnInfo.count;
                const returnedBy   = returnInfo.lastRole; // "editorial_qa" | "design_qa" | null
                const isReturnedDraft      = isDraft && returnCount > 0;
                const isDesignQuery        = isReturnedDraft && returnedBy === "design_qa";
                const isEditorialReturn    = isReturnedDraft && returnedBy === "editorial_qa";
                const canDelete  = isDraft && returnCount === 0 && (isOwner || user.role === "admin");

                const returnBadgeLabel = isDesignQuery ? "DESIGN QUERY" : isEditorialReturn ? "RETURNED" : "RETURNED";
                const returnBadgeBg    = isDesignQuery ? "#eff6ff" : "#fff3cd";
                const returnBadgeColor = isDesignQuery ? "#1d4ed8" : "#856404";
                const returnBadgeBorder= isDesignQuery ? "#3b82f633" : "#ffc10744";
                const commentBtnBg     = isDesignQuery ? "#eff6ff" : "#fff3cd";
                const commentBtnColor  = isDesignQuery ? "#1d4ed8" : "#856404";
                const commentBtnBorder = isDesignQuery ? "#3b82f666" : "#ffc10766";
                const commentBtnIcon   = isDesignQuery ? "💬" : "↩";

                return (
                  <tr key={req.id} style={{ borderBottom: i < displayRows.length - 1 ? "1px solid #F9F9F9" : "none", background: act ? "#FAFAFA" : isDesignQuery ? "#f0f7ff" : isReturnedDraft ? "#fffbf0" : "#fff" }}>
                    <td style={{ padding: "0.9rem 1.2rem", fontSize: 14, color: "#181313", fontWeight: 400 }}>
                      {req.page_title || <span style={{ color: "#B5B5B5", fontStyle: "italic" }}>Untitled</span>}
                      {isDraft && !isReturnedDraft && <span style={{ marginLeft: 8, fontSize: 10, background: "#F3F3F3", color: "#B5B5B5", border: "1px solid #E0E0E0", borderRadius: 4, padding: "1px 6px", fontWeight: 500 }}>DRAFT</span>}
                      {isReturnedDraft && <span style={{ marginLeft: 8, fontSize: 10, background: returnBadgeBg, color: returnBadgeColor, border: `1px solid ${returnBadgeBorder}`, borderRadius: 4, padding: "1px 6px", fontWeight: 500 }}>{returnBadgeLabel}</span>}
                    </td>
                    <td style={{ padding: "0.9rem 1.2rem" }}>
                      <span style={{ background: "#F3F3F3", color: "#3C3C3C", fontSize: 11, fontWeight: 500, borderRadius: 4, padding: "3px 9px", border: "1px solid #E0E0E0" }}>{req.page_type}</span>
                    </td>
                    <td style={{ padding: "0.9rem 1.2rem" }}>
                      <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}44`, borderRadius: 20, padding: "3px 11px", fontSize: 11, fontWeight: 500 }}>{s.label}</span>
                    </td>
                    <td style={{ padding: "0.9rem 1.2rem", fontSize: 13, color: "#646464" }}>{req.users?.name || "—"}</td>
                    <td style={{ padding: "0.9rem 1.2rem", fontSize: 12, color: "#B5B5B5" }}>
                      {new Date(req.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "0.9rem 1.2rem" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

                        {/* Returned/Queried draft — stakeholder sees only Comments button */}
                        {isReturnedDraft && isOwner && (
                          <button onClick={() => go("detail", req.id)}
                            style={{ background: commentBtnBg, color: commentBtnColor, border: `1px solid ${commentBtnBorder}`, borderRadius: 6, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                            {commentBtnIcon} {isDesignQuery ? "Design Query" : "Comments"}
                            <span style={{ background: "#c0392b", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{returnCount}</span>
                          </button>
                        )}

                        {/* Fresh draft — stakeholder sees Edit */}
                        {isDraft && !isReturnedDraft && isOwner && (
                          <button onClick={() => go("edit", req.id)}
                            style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 6, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                            ✎ Edit
                          </button>
                        )}

                        {/* Non-draft — View/Review */}
                        {!isDraft && (
                          <button onClick={() => go("detail", req.id)}
                            style={{ background: act ? "#181313" : "#F3F3F3", color: act ? "#fff" : "#646464", border: "none", borderRadius: 6, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                            {act ? "Review →" : user.role === "stakeholder" && req.status === "pending_approval" ? "✅ Sign off" : "View"}
                          </button>
                        )}

                        {/* Delete — only fresh drafts, never returned ones */}
                        {canDelete && (
                          <button onClick={() => setDeleteModal(req)}
                            style={{ background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.4rem 0.7rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500, transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#fff5f5"; }}>
                            🗑️ Delete
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

