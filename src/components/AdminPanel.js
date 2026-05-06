"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getStatus, ROLE_META, STATUS_FLOW } from "@/lib/constants";

const ROLES = ["stakeholder","editorial_qa","design_qa","web_team","admin"];

export default function AdminPanel({ user }) {
  const [requests,  setRequests]  = useState([]);
  const [users,     setUsers]     = useState([]);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("requests");
  const [updating,  setUpdating]  = useState(null);
  const [msg,       setMsg]       = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: r }, { data: u }, { data: h }] = await Promise.all([
        supabase.from("requests").select("*, users!requests_created_by_fkey(name,role), assigned:users!requests_assigned_to_fkey(name,role)").order("updated_at", { ascending: false }),
        supabase.from("users").select("*").order("created_at", { ascending: false }),
        supabase.from("status_history").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      setRequests(r || []);
      setUsers(u || []);
      setHistory(h || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const assignRole = async (userId, role) => {
    setUpdating(`role-${userId}`);
    setMsg("");
    const { error } = await supabase.from("users").update({ role }).eq("id", userId);
    if (error) setMsg("Failed to update role.");
    else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      setMsg("Role updated successfully.");
      setTimeout(() => setMsg(""), 3000);
    }
    setUpdating(null);
  };

  const toggleCanAssign = async (userId, currentValue) => {
    setUpdating(`assign-${userId}`);
    setMsg("");
    const { error } = await supabase.from("users").update({ can_assign: !currentValue }).eq("id", userId);
    if (error) setMsg("Failed to update assign permission.");
    else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, can_assign: !currentValue } : u));
      setMsg(`Assignment permission ${!currentValue ? "granted" : "revoked"} successfully.`);
      setTimeout(() => setMsg(""), 3000);
    }
    setUpdating(null);
  };

  const stats = STATUS_FLOW.map(s => ({ ...s, count: requests.filter(r => r.status === s.key).length }));
  const pendingUsers = users.filter(u => u.role === "pending");

  return (
    <div className="fade-in" style={{ fontFamily: "'Rubik', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Admin Panel</h1>
        <p style={{ color: "#B5B5B5", fontSize: 14 }}>Monitor requests, manage users, assign roles and permissions</p>
      </div>

      {/* Pending users alert */}
      {pendingUsers.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1px solid #f59e0b44", borderRadius: 10, padding: "0.85rem 1.3rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontSize: 13, color: "#92400e", fontWeight: 500 }}>
            {pendingUsers.length} user{pendingUsers.length > 1 ? "s" : ""} waiting for role assignment
          </span>
          <button onClick={() => setTab("users")} style={{ marginLeft: "auto", background: "#181313", color: "#fff", border: "none", borderRadius: 6, padding: "0.35rem 0.9rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
            Assign Roles →
          </button>
        </div>
      )}

      {msg && (
        <div style={{ background: "#ecfdf5", border: "1px solid #2a7a4b44", borderRadius: 8, padding: "0.7rem 1rem", marginBottom: 16, color: "#2a7a4b", fontSize: 13 }}>{msg}</div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 26 }}>
        {stats.map(s => (
          <div key={s.key} style={{ background: "#fff", border: "1px solid #E0E0E0", borderRadius: 12, padding: "1rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 500, color: s.count > 0 ? "#181313" : "#B5B5B5" }}>{s.count}</div>
              <div style={{ fontSize: 12, color: "#B5B5B5", marginTop: 2 }}>{s.label}</div>
            </div>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#F3F3F3", border: "1px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.count > 0 ? "#181313" : "#E0E0E0" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        {["requests","users","activity"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab-btn${tab === t ? " active" : ""}`} style={{ textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#B5B5B5" }}>Loading...</div>
      ) : (
        <>
          {/* Requests tab */}
          {tab === "requests" && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F9F9F9" }}>
                    {["Title","Type","Status","Submitted By","Assigned To","Updated"].map(h => (
                      <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: 10, color: "#B5B5B5", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #F3F3F3" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r, i) => {
                    const s = getStatus(r.status);
                    return (
                      <tr key={r.id} style={{ borderBottom: i < requests.length - 1 ? "1px solid #F9F9F9" : "none" }}>
                        <td style={{ padding: "0.75rem 1rem", fontSize: 13, color: "#181313", fontWeight: 500 }}>{r.page_title || "—"}</td>
                        <td style={{ padding: "0.75rem 1rem" }}><span style={{ background: "#F3F3F3", color: "#3C3C3C", fontSize: 11, borderRadius: 4, padding: "2px 8px", border: "1px solid #E0E0E0", fontWeight: 500 }}>{r.page_type}</span></td>
                        <td style={{ padding: "0.75rem 1rem" }}><span style={{ background: s.bg, color: s.color, fontSize: 10, borderRadius: 20, padding: "3px 9px", fontWeight: 500, border: `1px solid ${s.color}33` }}>{s.label}</span></td>
                        <td style={{ padding: "0.75rem 1rem", fontSize: 13, color: "#646464" }}>{r.users?.name || "—"}</td>
                        <td style={{ padding: "0.75rem 1rem", fontSize: 13, color: "#646464" }}>
                          {r.assigned?.name
                            ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2a7a4b", display: "inline-block" }} />
                                {r.assigned.name}
                              </span>
                            : <span style={{ color: "#B5B5B5" }}>Unassigned</span>
                          }
                        </td>
                        <td style={{ padding: "0.75rem 1rem", fontSize: 11, color: "#B5B5B5" }}>{new Date(r.updated_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Users tab */}
          {tab === "users" && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #F3F3F3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Team Members</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#646464" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: "#181313" }} />
                    Can assign tasks
                  </div>
                  <span style={{ fontSize: 12, color: "#B5B5B5" }}>{users.length} users</span>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F9F9F9" }}>
                    {["User","Email","Department","Role","Can Assign","Joined","Action"].map(h => (
                      <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: 10, color: "#B5B5B5", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #F3F3F3" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => {
                    const m = ROLE_META[u.role] || { label: "Pending", color: "#f59e0b", icon: "⏳" };
                    const isPending = u.role === "pending";
                    const isMe = u.id === user.id;
                    return (
                      <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid #F9F9F9" : "none", background: isPending ? "#fffdf5" : "#fff" }}>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#F3F3F3", border: "1px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{m.icon}</div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: "#181313" }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", fontSize: 12, color: "#646464", fontFamily: "monospace" }}>{u.email}</td>
                        <td style={{ padding: "0.75rem 1rem", fontSize: 13, color: "#646464" }}>{u.department || "—"}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{ background: isPending ? "#fffbeb" : "#F3F3F3", color: isPending ? "#d97706" : "#3C3C3C", fontSize: 11, borderRadius: 4, padding: "2px 8px", border: `1px solid ${isPending ? "#f59e0b44" : "#E0E0E0"}`, fontWeight: 500 }}>
                            {isPending ? "⏳ Pending" : m.label}
                          </span>
                        </td>

                        {/* Can Assign Toggle */}
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {!isMe && !isPending ? (
                            <button
                              onClick={() => toggleCanAssign(u.id, u.can_assign)}
                              disabled={updating === `assign-${u.id}`}
                              style={{
                                width: 44, height: 24, borderRadius: 12,
                                background: u.can_assign ? "#181313" : "#E0E0E0",
                                border: "none", cursor: "pointer",
                                position: "relative", transition: "background 0.2s",
                                opacity: updating === `assign-${u.id}` ? 0.5 : 1,
                              }}>
                              <div style={{
                                width: 18, height: 18, borderRadius: "50%",
                                background: "#fff",
                                position: "absolute",
                                top: 3,
                                left: u.can_assign ? 23 : 3,
                                transition: "left 0.2s",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                              }} />
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "#B5B5B5" }}>—</span>
                          )}
                        </td>

                        <td style={{ padding: "0.75rem 1rem", fontSize: 11, color: "#B5B5B5" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {!isMe ? (
                            <select value={u.role} onChange={e => assignRole(u.id, e.target.value)}
                              disabled={updating === `role-${u.id}`}
                              style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.35rem 0.7rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", color: "#181313", outline: "none" }}>
                              {isPending && <option value="pending">Assign role...</option>}
                              {ROLES.map(r => <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>)}
                            </select>
                          ) : (
                            <span style={{ fontSize: 12, color: "#B5B5B5" }}>You</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Activity tab */}
          {tab === "activity" && (
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Status change history</h3>
              {history.length === 0
                ? <div style={{ color: "#B5B5B5", fontSize: 13, textAlign: "center", padding: "1rem" }}>No activity yet.</div>
                : history.map((h, i) => {
                  const from = h.from_status ? getStatus(h.from_status) : null;
                  const to   = getStatus(h.to_status);
                  return (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.75rem 0", borderBottom: i < history.length - 1 ? "1px solid #F9F9F9" : "none" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: to.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, color: "#181313", fontWeight: 500 }}>{h.user_name}</span>
                        <span style={{ fontSize: 13, color: "#646464" }}> moved a request </span>
                        {from && <span style={{ fontSize: 11, background: from.bg, color: from.color, borderRadius: 10, padding: "1px 7px" }}>{from.label}</span>}
                        {from && <span style={{ fontSize: 13, color: "#B5B5B5", margin: "0 4px" }}>→</span>}
                        <span style={{ fontSize: 11, background: to.bg, color: to.color, borderRadius: 10, padding: "1px 7px" }}>{to.label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#B5B5B5", whiteSpace: "nowrap" }}>{new Date(h.created_at).toLocaleString()}</div>
                    </div>
                  );
                })
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}
