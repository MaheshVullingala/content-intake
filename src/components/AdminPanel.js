"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getStatus, ROLE_META, STATUS_FLOW } from "@/lib/constants";

// ── Character Limits configuration panel ────────────────────────────────────
const CHAR_LIMIT_FIELDS = [
  { section: "SEO Meta Data",       key: "seo_page_location",     label: "Page Location (URL)",       default: 300 },
  { section: "SEO Meta Data",       key: "seo_meta_title",        label: "Meta Title",                default: 70  },
  { section: "SEO Meta Data",       key: "seo_meta_description",  label: "Meta Description",          default: 160 },
  { section: "SEO Meta Data",       key: "seo_meta_keywords",     label: "Meta Keywords",             default: 300 },
  { section: "Banner",              key: "page_title",            label: "Page Title",                default: 70  },
  { section: "Banner",              key: "sub_title",             label: "Subtitle",                  default: 120 },
  { section: "Banner",              key: "cta1_label",            label: "CTA 1 Label",               default: 30  },
  { section: "Banner",              key: "cta2_label",            label: "CTA 2 Label",               default: 30  },
  { section: "Overview",            key: "overview_impact",       label: "Impact Statement",          default: 100 },
  { section: "Overview",            key: "overview_description",  label: "Description",               default: 600 },
  { section: "Key Benefits",        key: "kb_impact",             label: "Impact Statement",          default: 100 },
  { section: "Key Benefits",        key: "kb_description",        label: "Description",               default: 300 },
  { section: "Key Benefits",        key: "kb_card_title",         label: "Card Title (per card)",     default: 50  },
  { section: "Key Benefits",        key: "kb_card_description",   label: "Card Description (per)",    default: 150 },
  { section: "Features / Apps",     key: "fa_impact",             label: "Impact Statement",          default: 100 },
  { section: "Features / Apps",     key: "fa_description",        label: "Description",               default: 300 },
  { section: "Features / Apps",     key: "fa_item_title",         label: "Tab/Item Title",            default: 50  },
  { section: "Features / Apps",     key: "fa_item_description",   label: "Tab/Item Description",      default: 200 },
  { section: "Features / Apps",     key: "fa_item_cta_label",     label: "Tab CTA Label",             default: 25  },
  { section: "Customer Stories",    key: "cs_impact",             label: "Impact Statement",          default: 100 },
  { section: "Customer Stories",    key: "cs_quote",              label: "Quote (per card)",          default: 300 },
  { section: "Customer Stories",    key: "cs_customer",           label: "Customer Details",          default: 100 },
  { section: "Promo Section",       key: "promo_label",           label: "Label",                     default: 25  },
  { section: "Promo Section",       key: "promo_title",           label: "Title",                     default: 100 },
  { section: "Promo Section",       key: "promo_description",     label: "Description",               default: 300 },
  { section: "Promo Section",       key: "promo_btn_label",       label: "Button Label",              default: 25  },
  { section: "Related Content",     key: "rc_impact",             label: "Impact Statement",          default: 100 },
  { section: "Related Content",     key: "rc_card_label",         label: "Card Label (per)",          default: 25  },
  { section: "Related Content",     key: "rc_card_title",         label: "Card Title (per)",          default: 80  },
  { section: "Related Content",     key: "rc_card_description",   label: "Card Description",          default: 200 },
  { section: "Related Products",    key: "rp_impact",             label: "Impact Statement",          default: 100 },
  { section: "Related Products",    key: "rp_description",        label: "Description",               default: 300 },
  { section: "Related Products",    key: "rp_card_title",         label: "Card Title (per)",          default: 80  },
  { section: "Related Products",    key: "rp_card_description",   label: "Card Description (per)",    default: 200 },
  { section: "Related Products",    key: "rp_card_cta_label",     label: "Card CTA Label",            default: 25  },
  { section: "Training & Support",  key: "ts_impact",             label: "Impact Statement",          default: 100 },
  { section: "Training & Support",  key: "ts_card_title",         label: "Card Title (all cards)",    default: 80  },
  { section: "Training & Support",  key: "ts_card_description",   label: "Card Description (all)",    default: 200 },
  { section: "Training & Support",  key: "ts_card_cta_label",     label: "Card CTA Label (all)",      default: 25  },
];

function CharLimitsPanel({ user }) {
  const [limits,  setLimits]  = useState({});
  const [saving,  setSaving]  = useState(null);
  const [msg,     setMsg]     = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("settings").select("key, value").like("key", "char_limit_%")
      .then(({ data }) => {
        const stored = {};
        (data || []).forEach(r => { stored[r.key.replace("char_limit_", "")] = Number(r.value); });
        setLimits(stored);
        setLoading(false);
      });
  }, []);

  const getLimit = (key) => limits[key] ?? CHAR_LIMIT_FIELDS.find(f => f.key === key)?.default ?? 100;

  const saveLimit = async (key, value) => {
    const num = parseInt(value);
    if (!num || num < 1) return;
    setSaving(key);
    await supabase.from("settings").upsert({ key: `char_limit_${key}`, value: String(num) }, { onConflict: "key" });
    setLimits(p => ({ ...p, [key]: num }));
    setSaving(null);
    setMsg(`✓ ${key} limit saved`);
    setTimeout(() => setMsg(""), 2000);
  };

  const sections = [...new Set(CHAR_LIMIT_FIELDS.map(f => f.section))];

  if (loading) return <div style={{ padding: "2rem", color: "#B5B5B5" }}>Loading limits...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Character Limits</h3>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Configure maximum character counts for each field. Changes apply immediately to all new requests.</p>
        </div>
        {msg && <span style={{ fontSize: 12, color: "#0e7a3d", background: "#e8f9f0", padding: "4px 12px", borderRadius: 6 }}>{msg}</span>}
      </div>
      {sections.map(section => (
        <div key={section} className="card" style={{ marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#1b5793", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F3F3F3" }}>{section}</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {CHAR_LIMIT_FIELDS.filter(f => f.section === section).map(field => (
              <div key={field.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ fontSize: 12, color: "#646464", flex: 1 }}>{field.label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="number" min="1" max="2000"
                    value={getLimit(field.key)}
                    onChange={e => setLimits(p => ({ ...p, [field.key]: Number(e.target.value) }))}
                    onBlur={e => saveLimit(field.key, e.target.value)}
                    style={{ width: 70, padding: "0.35rem 0.5rem", border: "1px solid #E0E0E0", borderRadius: 6, fontSize: 13, fontFamily: "'Rubik',sans-serif", textAlign: "center", color: "#181313", background: "#F9F9F9" }}
                  />
                  {saving === field.key && <span style={{ fontSize: 10, color: "#94a3b8" }}>Saving...</span>}
                  {limits[field.key] !== undefined && saving !== field.key && <span style={{ fontSize: 10, color: "#3ec5cb" }}>✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const ROLES = ["stakeholder","editorial_qa","design_qa","web_team","admin"];

export default function AdminPanel({ user, timeoutMins = 5, onTimeoutChange }) {
  const [requests,  setRequests]  = useState([]);
  const [users,     setUsers]     = useState([]);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("requests");
  const [updating,  setUpdating]  = useState(null);
  const [msg,       setMsg]       = useState("");
  const [savingTimeout, setSavingTimeout] = useState(false);
  const [localTimeout,  setLocalTimeout]  = useState(timeoutMins);

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
    console.log("Assigning role:", role, "to user id:", userId);
    const { data, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", userId)
      .select(); // ← returns the updated row so we can verify
    console.log("Update result:", data, error);
    if (error) {
      setMsg(`Failed to update role: ${error.message}`);
      console.error("Role update error:", error);
    } else if (!data || data.length === 0) {
      setMsg("Warning: No rows updated — the user ID may not match. Check RLS policies.");
      console.warn("No rows updated for userId:", userId);
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      setMsg(`✅ Role updated to "${role}" — ${data[0]?.email || userId}`);
      setTimeout(() => setMsg(""), 4000);
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
        {["requests","users","activity","settings","char_limits"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab-btn${tab === t ? " active" : ""}`} style={{ textTransform: "capitalize" }}>{t === "char_limits" ? "Char Limits" : t}</button>
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

          {/* Settings tab */}
          {tab === "char_limits" && (
            <CharLimitsPanel user={user} />
          )}
          {tab === "settings" && (
            <div className="card" style={{ maxWidth: 480 }}>
              <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Session Settings</h3>
              <p style={{ fontSize: 13, color: "#B5B5B5", marginBottom: 24, lineHeight: 1.6 }}>
                Configure how long users can be inactive before being automatically logged out.
                A warning will appear 60 seconds before logout.
              </p>

              <label style={{ fontSize: 12, color: "#646464", display: "block", marginBottom: 8, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Auto-logout timeout
              </label>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 24 }}>
                <select
                  value={localTimeout}
                  onChange={e => setLocalTimeout(Number(e.target.value))}
                  style={{ background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.6rem 1rem", fontSize: 14, color: "#181313", fontFamily: "'Rubik',sans-serif", outline: "none", cursor: "pointer", minWidth: 160 }}>
                  {[1, 2, 5, 10, 15, 20, 30, 60].map(m => (
                    <option key={m} value={m}>{m} {m === 1 ? "minute" : "minutes"}</option>
                  ))}
                </select>
                <span style={{ fontSize: 13, color: "#B5B5B5" }}>of inactivity</span>
              </div>

              <div style={{ background: "#e8f4fb", border: "1px solid rgba(27,87,147,0.15)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: 24, fontSize: 12, color: "#1b5793", lineHeight: 1.6 }}>
                Info: Users will see a warning 60 seconds before logout. Any active draft will be auto-saved before the session ends.
              </div>

              <button
                disabled={savingTimeout}
                onClick={async () => {
                  setSavingTimeout(true);
                  const { error } = await supabase.from("settings").upsert(
                    { id: "global", timeout_mins: localTimeout, updated_by: user.email },
                    { onConflict: "id" }
                  );
                  if (!error) {
                    onTimeoutChange(localTimeout);
                    setMsg("Timeout updated to " + localTimeout + " minute" + (localTimeout > 1 ? "s" : ""));
                    setTimeout(() => setMsg(""), 3000);
                  } else {
                    setMsg("Failed to save timeout setting.");
                  }
                  setSavingTimeout(false);
                }}
                style={{ background: "#1b5793", color: "#fff", border: "none", borderRadius: 8, padding: "0.7rem 1.6rem", fontSize: 14, fontWeight: 500, cursor: savingTimeout ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", opacity: savingTimeout ? 0.7 : 1 }}>
                {savingTimeout ? "Saving..." : "Save Setting"}
              </button>
            </div>
          )}

        </>
      )}
    </div>
  );
}
