"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getStatus, ROLE_META, canAct, STATUS_FLOW } from "@/lib/constants";

export default function Dashboard({ go, user }) {
  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const m = ROLE_META[user.role];

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from("requests")
      .select("*, users!requests_created_by_fkey(name, role)")
      .order("updated_at", { ascending: false });
    if (user.role === "stakeholder") query = query.eq("created_by", user.id);
    const { data, error } = await query;
    if (error) console.error("Dashboard fetch error:", error);
    setRequests(data || []);
    setLoading(false);
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

  const stats = STATUS_FLOW.map(s => ({ ...s, count: requests.filter(r => r.status === s.key).length }));
  const actionable = requests.filter(r => canAct(user.role, r.status));

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
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #F3F3F3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>All Requests</h2>
          <span style={{ color: "#B5B5B5", fontSize: 13 }}>{requests.length} total</span>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#B5B5B5" }}>Loading requests...</div>
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
              {requests.map((req, i) => {
                const s   = getStatus(req.status);
                const act = canAct(user.role, req.status);
                const isDraft = req.status === "draft";
                const isOwner = req.created_by === user.id;
                return (
                  <tr key={req.id} style={{ borderBottom: i < requests.length - 1 ? "1px solid #F9F9F9" : "none", background: act ? "#FAFAFA" : "#fff" }}>
                    <td style={{ padding: "0.9rem 1.2rem", fontSize: 14, color: "#181313", fontWeight: 400 }}>
                      {req.page_title || <span style={{ color: "#B5B5B5", fontStyle: "italic" }}>Untitled</span>}
                      {isDraft && <span style={{ marginLeft: 8, fontSize: 10, background: "#F3F3F3", color: "#B5B5B5", border: "1px solid #E0E0E0", borderRadius: 4, padding: "1px 6px", fontWeight: 500 }}>DRAFT</span>}
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
                        {/* Edit button — only for drafts owned by current user */}
                        {isDraft && isOwner && (
                          <button onClick={() => go("edit", req.id)}
                            style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 6, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                            ✎ Edit
                          </button>
                        )}
                        {/* View/Review button */}
                        {!isDraft && (
                          <button onClick={() => go("detail", req.id)}
                            style={{ background: act ? "#181313" : "#F3F3F3", color: act ? "#fff" : "#646464", border: "none", borderRadius: 6, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                            {act ? "Review →" : "View"}
                          </button>
                        )}
                        {/* Delete button — only for drafts */}
                        {isDraft && (isOwner || user.role === "admin") && (
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
