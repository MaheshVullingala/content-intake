"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getStatus, ROLE_META, STATUS_FLOW, AUDIT_ACTIONS } from "@/lib/constants";
import { OKTA_ENABLED } from "@/lib/authConfig";

// Mirrors Register.js's own local DEPARTMENTS list — kept in sync
// manually since there's no shared constants entry for it today.
const INVITE_DEPARTMENTS = ["Product Team", "Content Team", "Design Team", "Web Team", "Marketing", "Engineering", "Operations", "Other"];
const INVITE_ROLES = ["stakeholder","editorial_qa","brand_team","seo_team","design_qa","web_team","admin"];

const csvEscape = (val) => {
  const s = String(val ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ── Character Limits configuration panel ────────────────────────────────────
// Mirrors constants.js's CHAR_LIMITS exactly (the actual defaults every
// form falls back to) plus EditSectionModal.js's 4 generic card-item
// limits, so every field configurable here corresponds to a real
// enforcement point. Previously this list included ~13 invented
// per-section-per-card-type keys (kb_card_title, cs_quote, rc_card_title,
// etc.) that no code anywhere read — none of the sections' card-editing
// UI enforces per-section-granular limits, they all share one generic
// title/description/quote/customer set (the "Card Items" group below).
// Saving here writes to char_limit_overrides, read by useCharLimits()
// (src/lib/charLimits.js) in NewRequest.js / EditSectionModal.js /
// ProposeChangeWizard.js.
const CHAR_LIMIT_FIELDS = [
  { section: "SEO Meta Data",       key: "seo_page_location",     label: "Page Location (URL)",  default: 300 },
  { section: "SEO Meta Data",       key: "seo_meta_title",        label: "Meta Title",           default: 70  },
  { section: "SEO Meta Data",       key: "seo_meta_description",  label: "Meta Description",     default: 160 },
  { section: "SEO Meta Data",       key: "seo_meta_keywords",     label: "Meta Keywords",        default: 300 },
  { section: "Banner",              key: "page_title",            label: "Page Title",           default: 70  },
  { section: "Banner",              key: "sub_title",             label: "Subtitle",             default: 120 },
  { section: "Banner",              key: "cta1_label",            label: "CTA 1 Label",          default: 30  },
  { section: "Banner",              key: "cta1_link",             label: "CTA 1 Link",           default: 300 },
  { section: "Banner",              key: "cta2_label",            label: "CTA 2 Label",          default: 30  },
  { section: "Banner",              key: "cta2_link",             label: "CTA 2 Link",           default: 300 },
  { section: "Overview",            key: "overview_label",        label: "Label",                default: 30  },
  { section: "Overview",            key: "overview_impact",       label: "Impact Statement",     default: 100 },
  { section: "Overview",            key: "overview_description",  label: "Description",          default: 600 },
  { section: "Overview",            key: "overview_media_alt",    label: "Media Alt Text",       default: 150 },
  { section: "Key Benefits",        key: "kb_label",              label: "Label",                default: 30  },
  { section: "Key Benefits",        key: "kb_impact",             label: "Impact Statement",     default: 100 },
  { section: "Key Benefits",        key: "kb_description",        label: "Description",          default: 300 },
  { section: "Features / Apps",     key: "fa_label",              label: "Label",                default: 30  },
  { section: "Features / Apps",     key: "fa_impact",             label: "Impact Statement",     default: 100 },
  { section: "Features / Apps",     key: "fa_description",        label: "Description",          default: 300 },
  { section: "Customer Stories",    key: "cs_label",              label: "Label",                default: 30  },
  { section: "Customer Stories",    key: "cs_impact",             label: "Impact Statement",     default: 100 },
  { section: "Promo Section",       key: "promo_label",           label: "Label",                default: 30  },
  { section: "Promo Section",       key: "promo_title",           label: "Title",                default: 120 },
  { section: "Promo Section",       key: "promo_description",     label: "Description",          default: 300 },
  { section: "Promo Section",       key: "promo_btn_label",       label: "Button Label",         default: 30  },
  { section: "Promo Section",       key: "promo_btn_link",        label: "Button Link",          default: 300 },
  { section: "Related Content",     key: "rc_label",              label: "Label",                default: 30  },
  { section: "Related Content",     key: "rc_impact",             label: "Impact Statement",     default: 100 },
  { section: "Resources",           key: "res_label",             label: "Label",                default: 30  },
  { section: "Resources",           key: "res_impact",            label: "Impact Statement",     default: 100 },
  { section: "Related Products",    key: "rp_label",              label: "Label",                default: 30  },
  { section: "Related Products",    key: "rp_impact",             label: "Impact Statement",     default: 100 },
  { section: "Related Products",    key: "rp_description",        label: "Description",          default: 300 },
  { section: "Training & Support",  key: "ts_label",              label: "Label",                default: 40  },
  { section: "Training & Support",  key: "ts_impact",             label: "Impact Statement",     default: 80  },
  { section: "Card Items (shared across all card-based sections)", key: "title",       label: "Card Title",       default: 60  },
  { section: "Card Items (shared across all card-based sections)", key: "description", label: "Card Description", default: 200 },
  { section: "Card Items (shared across all card-based sections)", key: "quote",       label: "Quote (Customer Stories)", default: 300 },
  { section: "Card Items (shared across all card-based sections)", key: "customer",    label: "Customer Details (Customer Stories)", default: 60 },
];

function CharLimitsPanel({ user }) {
  const [limits,  setLimits]  = useState({});
  const [saving,  setSaving]  = useState(null);
  const [msg,     setMsg]     = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("char_limit_overrides").select("key, value")
      .then(({ data, error }) => {
        if (error) { setLoading(false); return; }
        const stored = {};
        (data || []).forEach(r => { stored[r.key] = Number(r.value); });
        setLimits(stored);
        setLoading(false);
      });
  }, []);

  const getLimit = (key) => limits[key] ?? CHAR_LIMIT_FIELDS.find(f => f.key === key)?.default ?? 100;

  const saveLimit = async (key, value) => {
    const num = parseInt(value);
    if (!num || num < 1) return;
    setSaving(key);
    const { error } = await supabase.from("char_limit_overrides").upsert(
      { key, value: num, updated_by: user?.email },
      { onConflict: "key" }
    );
    if (error) { setMsg(`Failed to save ${key}: ${error.message}`); setSaving(null); return; }
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

const ROLES = ["stakeholder","editorial_qa","brand_team","seo_team","design_qa","web_team","admin"];

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
  const [emailEnabled,      setEmailEnabled]      = useState(false);
  const [savingEmailToggle, setSavingEmailToggle] = useState(false);
  const [passwordLoginEnabled,      setPasswordLoginEnabled]      = useState(true);
  const [savingPasswordToggle,      setSavingPasswordToggle]      = useState(false);
  const [testDataEnabled,           setTestDataEnabled]           = useState(true);
  const [savingTestDataToggle,      setSavingTestDataToggle]      = useState(false);

  // ── Invite User modal ──────────────────────────────────────────────────
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", department: "", role: "stakeholder", can_assign: false });
  const [inviting,   setInviting]   = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Loaded independently of timeoutMins (which page.js already fetches
  // elsewhere) — this is the only place that needs to know the flag, so
  // no reason to thread it through as a prop.
  useEffect(() => {
    supabase.from("settings").select("email_notifications_enabled, password_login_enabled, test_data_enabled").eq("id", "global").maybeSingle()
      .then(({ data }) => {
        setEmailEnabled(!!data?.email_notifications_enabled);
        setPasswordLoginEnabled(data?.password_login_enabled !== false);
        setTestDataEnabled(data?.test_data_enabled !== false);
      });
  }, []);

  // ── Audit log tab ──────────────────────────────────────────────────────
  const [auditLog,       setAuditLog]       = useState([]);
  const [auditLoading,   setAuditLoading]   = useState(false);
  const [auditDateFrom,  setAuditDateFrom]  = useState("");
  const [auditDateTo,    setAuditDateTo]    = useState("");
  const [auditAction,    setAuditAction]    = useState("");
  const [auditEmail,     setAuditEmail]     = useState("");

  const fetchAuditLog = async () => {
    setAuditLoading(true);
    let query = supabase
      .from("audit_log")
      .select("*, users(name)")
      .order("timestamp", { ascending: false })
      .limit(200);
    if (auditDateFrom) query = query.gte("timestamp", `${auditDateFrom}T00:00:00`);
    if (auditDateTo)   query = query.lte("timestamp", `${auditDateTo}T23:59:59`);
    if (auditAction)   query = query.eq("action", auditAction);
    if (auditEmail.trim()) query = query.ilike("user_email", `%${auditEmail.trim()}%`);
    const { data } = await query;
    setAuditLog(data || []);
    setAuditLoading(false);
  };

  useEffect(() => {
    if (tab === "audit_log") fetchAuditLog();
  }, [tab, auditDateFrom, auditDateTo, auditAction, auditEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportAuditCSV = () => {
    const headers = ["Timestamp","User","Role","Action","Entity","Old Value","New Value","IP Address"];
    const rows = auditLog.map(a => [
      new Date(a.timestamp).toISOString(),
      a.users?.name || a.user_email || "—",
      a.user_role || "—",
      a.action || "—",
      a.entity_type ? `${a.entity_type}${a.entity_id ? " #" + a.entity_id : ""}` : "—",
      a.old_value || "",
      a.new_value || "",
      a.ip_address || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit_log_export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

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

  // Creates the pre-provisioned public.users row via the invite_user() RPC
  // (SECURITY DEFINER — public.users has no INSERT policy for a plain
  // client insert), then best-effort sends the notification email through
  // a server route (nodemailer can't run in the browser). The row lands
  // even if the email fails to send — email is a courtesy, not the
  // source of truth; the admin can always share access manually.
  const handleInvite = async () => {
    setInviting(true);
    setInviteError("");
    const { data, error } = await supabase.rpc("invite_user", {
      p_email:      inviteForm.email,
      p_name:       inviteForm.name,
      p_department: inviteForm.department,
      p_role:       inviteForm.role,
      p_can_assign: inviteForm.can_assign,
    });
    if (error) {
      setInviteError(error.message || "Failed to invite user.");
      setInviting(false);
      return;
    }

    setUsers(prev => [data, ...prev]);
    setShowInviteModal(false);
    setInviteForm({ email: "", name: "", department: "", role: "stakeholder", can_assign: false });
    setInviting(false);
    setMsg(`✅ Invited ${data.email} — sending notification email...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/invite-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ email: data.email, name: data.name, roleLabel: ROLE_META[data.role]?.label || data.role }),
      });
      const result = await res.json();
      if (result.sent) setMsg(`✅ Invited ${data.email} — notification email sent.`);
      else if (result.skipped) setMsg(`✅ Invited ${data.email} — role assigned, but email wasn't sent (${result.reason})`);
      else setMsg(`✅ Invited ${data.email} — role assigned, but the notification email failed to send.`);
    } catch (e) {
      setMsg(`✅ Invited ${data.email} — role assigned, but the notification email failed to send.`);
    }
    setTimeout(() => setMsg(""), 6000);
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
        {["requests","users","activity","audit_log","settings","char_limits"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab-btn${tab === t ? " active" : ""}`} style={{ textTransform: "capitalize" }}>{t === "char_limits" ? "Char Limits" : t === "audit_log" ? "Audit Log" : t}</button>
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
                  <button
                    onClick={() => { setInviteError(""); setShowInviteModal(true); }}
                    style={{ background: "#1b5793", color: "#fff", border: "none", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                    + Invite User
                  </button>
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
                        <td style={{ padding: "0.75rem 1rem", fontSize: 12, color: "#646464", fontFamily: "monospace" }}>
                          {u.email}
                          {!u.auth_id && (
                            <span title="Invited — hasn't logged in yet" style={{ marginLeft: 8, fontSize: 10, color: "#1b5793", background: "#e8f4fb", border: "1px solid rgba(27,87,147,0.2)", borderRadius: 4, padding: "1px 6px", fontFamily: "'Rubik',sans-serif" }}>
                              Invited
                            </span>
                          )}
                        </td>
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

          {/* Audit Log tab */}
          {tab === "audit_log" && (
            <div>
              <div style={{ background: "#eff6ff", border: "1px solid rgba(27,87,147,0.15)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: 16, fontSize: 12, color: "#1b5793", lineHeight: 1.6 }}>
                🔒 Audit log is read-only. Records cannot be modified or deleted.
              </div>

              {/* Filters */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <div>
                  <label style={{ fontSize: 11, color: "#646464", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>From</label>
                  <input type="date" value={auditDateFrom} onChange={e => setAuditDateFrom(e.target.value)}
                    style={{ background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.45rem 0.7rem", fontSize: 13, fontFamily: "'Rubik',sans-serif", color: "#181313" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#646464", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>To</label>
                  <input type="date" value={auditDateTo} onChange={e => setAuditDateTo(e.target.value)}
                    style={{ background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.45rem 0.7rem", fontSize: 13, fontFamily: "'Rubik',sans-serif", color: "#181313" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#646464", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Action Type</label>
                  <select value={auditAction} onChange={e => setAuditAction(e.target.value)}
                    style={{ background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.45rem 0.7rem", fontSize: 13, fontFamily: "'Rubik',sans-serif", color: "#181313", cursor: "pointer", minWidth: 180 }}>
                    <option value="">All Actions</option>
                    {Object.values(AUDIT_ACTIONS).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 11, color: "#646464", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>User Email</label>
                  <input type="text" placeholder="Search by user email…" value={auditEmail} onChange={e => setAuditEmail(e.target.value)}
                    style={{ width: "100%", background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.45rem 0.7rem", fontSize: 13, fontFamily: "'Rubik',sans-serif", color: "#181313", boxSizing: "border-box" }} />
                </div>
                <button
                  onClick={exportAuditCSV}
                  disabled={auditLog.length === 0}
                  style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 6, padding: "0.5rem 1rem", fontSize: 12, fontWeight: 500, cursor: auditLog.length === 0 ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", opacity: auditLog.length === 0 ? 0.5 : 1 }}>
                  ⤓ Export to CSV
                </button>
              </div>

              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", overflow: "hidden" }}>
                <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #F3F3F3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Audit Log</h2>
                  <span style={{ fontSize: 12, color: "#B5B5B5" }}>{auditLog.length} shown (last 200)</span>
                </div>
                {auditLoading ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "#B5B5B5" }}>Loading...</div>
                ) : auditLog.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "#B5B5B5", fontSize: 13 }}>No audit log entries match these filters.</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#F9F9F9" }}>
                          {["Timestamp","User","Role","Action","Entity","Old Value","New Value","IP Address"].map(h => (
                            <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: 10, color: "#B5B5B5", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #F3F3F3", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {auditLog.map((a, i) => (
                          <tr key={a.id} style={{ borderBottom: i < auditLog.length - 1 ? "1px solid #F9F9F9" : "none" }}>
                            <td style={{ padding: "0.75rem 1rem", fontSize: 11, color: "#B5B5B5", whiteSpace: "nowrap" }}>{new Date(a.timestamp).toLocaleString()}</td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: 13, color: "#181313", fontWeight: 500, whiteSpace: "nowrap" }}>{a.users?.name || a.user_email || "—"}</td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: 12, color: "#646464", whiteSpace: "nowrap" }}>{a.user_role || "—"}</td>
                            <td style={{ padding: "0.75rem 1rem" }}><span style={{ background: "#F3F3F3", color: "#3C3C3C", fontSize: 11, borderRadius: 4, padding: "2px 8px", border: "1px solid #E0E0E0", fontWeight: 500, whiteSpace: "nowrap" }}>{a.action}</span></td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: 12, color: "#646464", whiteSpace: "nowrap" }}>{a.entity_type ? `${a.entity_type}${a.entity_id ? " #" + String(a.entity_id).slice(0, 8) : ""}` : "—"}</td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: 12, color: "#646464", fontFamily: "monospace", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.old_value || ""}>{a.old_value || "—"}</td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: 12, color: "#646464", fontFamily: "monospace", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.new_value || ""}>{a.new_value || "—"}</td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: 11, color: "#B5B5B5", fontFamily: "monospace", whiteSpace: "nowrap" }}>{a.ip_address || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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

          {tab === "settings" && (
            <div className="card" style={{ maxWidth: 480, marginTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Email Notifications</h3>
              <p style={{ fontSize: 13, color: "#B5B5B5", marginBottom: 20, lineHeight: 1.6 }}>
                In addition to in-app notifications, email a copy out via SMTP.
                Requires SMTP_HOST/SMTP_FROM (and credentials, if your relay
                needs them) to be configured in the environment — this toggle
                has no effect until that's done. See CLAUDE.md for the full
                env var list.
              </p>

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 20 }}>
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={e => setEmailEnabled(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span style={{ fontSize: 13, color: "#181313" }}>
                  Send email notifications
                </span>
              </label>

              <button
                disabled={savingEmailToggle}
                onClick={async () => {
                  setSavingEmailToggle(true);
                  const { error } = await supabase.from("settings").upsert(
                    { id: "global", email_notifications_enabled: emailEnabled, updated_by: user.email },
                    { onConflict: "id" }
                  );
                  setMsg(error ? "Failed to save email setting." : `Email notifications ${emailEnabled ? "enabled" : "disabled"}.`);
                  setTimeout(() => setMsg(""), 3000);
                  setSavingEmailToggle(false);
                }}
                style={{ background: "#1b5793", color: "#fff", border: "none", borderRadius: 8, padding: "0.7rem 1.6rem", fontSize: 14, fontWeight: 500, cursor: savingEmailToggle ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", opacity: savingEmailToggle ? 0.7 : 1 }}>
                {savingEmailToggle ? "Saving..." : "Save Setting"}
              </button>
            </div>
          )}

          {tab === "settings" && (
            <div className="card" style={{ maxWidth: 480, marginTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Login Settings</h3>
              <p style={{ fontSize: 13, color: "#B5B5B5", marginBottom: 20, lineHeight: 1.6 }}>
                Turn off email/password login once Okta SSO is verified working,
                so it's the only way in. {!OKTA_ENABLED && "Disabled here until Okta is configured (NEXT_PUBLIC_OKTA_ENABLED) — otherwise this could lock everyone out with no way back in."}
              </p>

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: OKTA_ENABLED ? "pointer" : "not-allowed", marginBottom: 20, opacity: OKTA_ENABLED ? 1 : 0.5 }}>
                <input
                  type="checkbox"
                  checked={passwordLoginEnabled}
                  disabled={!OKTA_ENABLED}
                  onChange={e => setPasswordLoginEnabled(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: OKTA_ENABLED ? "pointer" : "not-allowed" }}
                />
                <span style={{ fontSize: 13, color: "#181313" }}>
                  Allow email/password login
                </span>
              </label>

              <button
                disabled={savingPasswordToggle || !OKTA_ENABLED}
                onClick={async () => {
                  setSavingPasswordToggle(true);
                  const { error } = await supabase.from("settings").upsert(
                    { id: "global", password_login_enabled: passwordLoginEnabled, updated_by: user.email },
                    { onConflict: "id" }
                  );
                  setMsg(error ? "Failed to save login setting." : `Password login ${passwordLoginEnabled ? "enabled" : "disabled"}.`);
                  setTimeout(() => setMsg(""), 3000);
                  setSavingPasswordToggle(false);
                }}
                style={{ background: "#1b5793", color: "#fff", border: "none", borderRadius: 8, padding: "0.7rem 1.6rem", fontSize: 14, fontWeight: 500, cursor: (savingPasswordToggle || !OKTA_ENABLED) ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", opacity: (savingPasswordToggle || !OKTA_ENABLED) ? 0.5 : 1 }}>
                {savingPasswordToggle ? "Saving..." : "Save Setting"}
              </button>
            </div>
          )}

          {tab === "settings" && (
            <div className="card" style={{ maxWidth: 480, marginTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Fill Test Data Button</h3>
              <p style={{ fontSize: 13, color: "#B5B5B5", marginBottom: 20, lineHeight: 1.6 }}>
                The 🎲 Fill Test Data button (New Request → step 2) is normally stripped out of production builds automatically.
                Turn this on to temporarily keep it available in production too — e.g. for QA on a live-configured deployment.
                Remember to turn it back off once that testing is done. Note this doesn't weaken the pre-flight check —
                Submit is still blocked if placeholder text is present, regardless of this setting.
              </p>

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 20 }}>
                <input
                  type="checkbox"
                  checked={testDataEnabled}
                  onChange={e => setTestDataEnabled(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span style={{ fontSize: 13, color: "#181313" }}>
                  Allow Fill Test Data button in production
                </span>
              </label>

              <button
                disabled={savingTestDataToggle}
                onClick={async () => {
                  setSavingTestDataToggle(true);
                  const { error } = await supabase.from("settings").upsert(
                    { id: "global", test_data_enabled: testDataEnabled, updated_by: user.email },
                    { onConflict: "id" }
                  );
                  setMsg(error ? "Failed to save test data setting." : `Fill Test Data button ${testDataEnabled ? "enabled" : "disabled"} in production.`);
                  setTimeout(() => setMsg(""), 3000);
                  setSavingTestDataToggle(false);
                }}
                style={{ background: "#1b5793", color: "#fff", border: "none", borderRadius: 8, padding: "0.7rem 1.6rem", fontSize: 14, fontWeight: 500, cursor: savingTestDataToggle ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", opacity: savingTestDataToggle ? 0.7 : 1 }}>
                {savingTestDataToggle ? "Saving..." : "Save Setting"}
              </button>
            </div>
          )}

        </>
      )}

      {showInviteModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}
          onClick={() => !inviting && setShowInviteModal(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 420, padding: "1.5rem", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", fontFamily: "'Rubik',sans-serif" }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Invite User</h3>
            <p style={{ fontSize: 12, color: "#B5B5B5", marginBottom: 18, lineHeight: 1.6 }}>
              Pre-assigns a role for this email. {process.env.NEXT_PUBLIC_OKTA_ENABLED === "true"
                ? "They'll sign in with Okta and the role applies automatically."
                : "They'll register with this same email and the role applies automatically — no separate approval step."}
            </p>

            {inviteError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a544", borderRadius: 8, padding: "0.6rem 0.9rem", marginBottom: 14, color: "#c0392b", fontSize: 12 }}>
                {inviteError}
              </div>
            )}

            <label style={{ fontSize: 11, color: "#646464", display: "block", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
            <input
              type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
              placeholder="name@cadence.com" maxLength={254}
              style={{ width: "100%", background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.6rem 0.8rem", fontSize: 13, marginBottom: 14, fontFamily: "'Rubik',sans-serif", outline: "none", boxSizing: "border-box" }}
            />

            <label style={{ fontSize: 11, color: "#646464", display: "block", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Name</label>
            <input
              type="text" value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Alex Johnson" maxLength={100}
              style={{ width: "100%", background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.6rem 0.8rem", fontSize: 13, marginBottom: 14, fontFamily: "'Rubik',sans-serif", outline: "none", boxSizing: "border-box" }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "#646464", display: "block", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Department</label>
                <select value={inviteForm.department} onChange={e => setInviteForm(p => ({ ...p, department: e.target.value }))}
                  style={{ width: "100%", background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.6rem 0.6rem", fontSize: 13, fontFamily: "'Rubik',sans-serif", outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
                  <option value="">Select...</option>
                  {INVITE_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#646464", display: "block", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</label>
                <select value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
                  style={{ width: "100%", background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.6rem 0.6rem", fontSize: 13, fontFamily: "'Rubik',sans-serif", outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
                  {INVITE_ROLES.map(r => <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>)}
                </select>
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 20 }}>
              <input type="checkbox" checked={inviteForm.can_assign} onChange={e => setInviteForm(p => ({ ...p, can_assign: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer" }} />
              <span style={{ fontSize: 13, color: "#181313" }}>Can assign tasks</span>
            </label>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowInviteModal(false)}
                disabled={inviting}
                style={{ background: "#F3F3F3", color: "#3C3C3C", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.6rem 1.2rem", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteForm.email.trim() || !inviteForm.role}
                style={{ background: "#1b5793", color: "#fff", border: "none", borderRadius: 8, padding: "0.6rem 1.4rem", fontSize: 13, fontWeight: 500, cursor: (inviting || !inviteForm.email.trim()) ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", opacity: (inviting || !inviteForm.email.trim()) ? 0.6 : 1 }}>
                {inviting ? "Inviting..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
