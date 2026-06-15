"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PCBLoader } from "@/components/PCBLoader";
import { getStatus, ROLE_META, canAct, STATUS_FLOW } from "@/lib/constants";

export default function Dashboard({ go, user }) {
  const [requests,     setRequests]     = useState([]);
  const [returnCounts, setReturnCounts] = useState({});
  const [loading,      setLoading]      = useState(true);
  const [deleteModal,  setDeleteModal]  = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [tab,          setTab]          = useState("tab1");  // "tab1" | "tab2"
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType,   setFilterType]   = useState("all");
  const m = ROLE_META[user.role];

  // ── Tab config per role ────────────────────────────────────────────────────
  const tabConfig = {
    stakeholder: {
      tab1: { label: "📝 My Drafts",       icon: "📝" },
      tab2: { label: "📋 My Requests",      icon: "📋" },
    },
    editorial_qa: {
      tab1: { label: "⚡ Needs Review",     icon: "⚡" },
      tab2: { label: "📋 All Requests",     icon: "📋" },
    },
    design_qa: {
      tab1: { label: "⚡ Needs Review",     icon: "⚡" },
      tab2: { label: "📋 All Requests",     icon: "📋" },
    },
    web_team: {
      tab1: { label: "⚡ Ready to Publish", icon: "⚡" },
      tab2: { label: "📋 All Requests",     icon: "📋" },
    },
    admin: {
      tab1: { label: "📋 All Requests",     icon: "📋" },
      tab2: { label: "📋 All Requests",     icon: "📋" },
    },
  };
  const tabs = tabConfig[user.role] || tabConfig.admin;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchRequests = async ({ fromSave = false } = {}) => {
    setLoading(true);
    const hardTimeout = setTimeout(() => setLoading(false), 10000);
    try {
      if (fromSave) await new Promise(r => setTimeout(r, 1000));
      let query = supabase
        .from("requests")
        .select("*, users!requests_created_by_fkey(name, role)")
        .order("updated_at", { ascending: false });
      if (user.role === "stakeholder") query = query.eq("created_by", user.id);
      const { data, error } = await query;
      if (error) { console.error("Dashboard fetch error:", error); return; }
      const rows = data || [];
      setRequests(rows);

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
      clearTimeout(hardTimeout);
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

  // ── Tab 1 data — role-aware ────────────────────────────────────────────────
  const tab1Rows = requests.filter(r => {
    if (user.role === "stakeholder") {
      // Drafts + returned drafts only
      return r.status === "draft";
    }
    if (user.role === "admin") return true;
    // Other roles: requests they can act on
    return canAct(user.role, r.status);
  });

  // ── Tab 2 data — all requests excluding drafts/returned for stakeholder ────
  const tab2Rows = requests.filter(r => {
    if (user.role === "stakeholder") return r.status !== "draft";
    return true; // all roles see everything in tab2
  });

  // ── Apply search + filters ─────────────────────────────────────────────────
  const applyFilters = (rows) => {
    return rows.filter(r => {
      const q = search.toLowerCase();
      if (q) {
        const matchTitle = (r.page_title || "").toLowerCase().includes(q);
        const matchUrl   = (r.seo_page_location || "").toLowerCase().includes(q);
        const matchName  = user.role !== "stakeholder" && (r.users?.name || "").toLowerCase().includes(q);
        if (!matchTitle && !matchUrl && !matchName) return false;
      }
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterType   !== "all" && r.page_type !== filterType) return false;
      return true;
    });
  };

  const displayRows = applyFilters(tab === "tab1" ? tab1Rows : tab2Rows);

  // ── Status options for current tab ────────────────────────────────────────
  const statusOptions = tab === "tab1" && user.role === "stakeholder"
    ? [{ key: "all", label: "All" }, { key: "draft", label: "Draft" }]
    : STATUS_FLOW;

  const pageTypes = ["Product", "Solutions", "Glossary", "On-demand Webinar"];

  const hasActiveFilters = search || filterStatus !== "all" || filterType !== "all";

  const clearFilters = () => { setSearch(""); setFilterStatus("all"); setFilterType("all"); };

  return (
    <div className="fade-in" style={{ fontFamily: "'Rubik', sans-serif" }}>

      {/* ── Delete Modal ── */}
      {deleteModal && (
        <div onClick={() => !deleting && setDeleteModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: "2rem", maxWidth: 420, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff5f5", border: "1px solid #c0392b33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 16 }}>🗑️</div>
            <h2 style={{ fontSize: 17, fontWeight: 500, marginBottom: 8 }}>Delete Draft?</h2>
            <p style={{ fontSize: 13, color: "#646464", marginBottom: 6, lineHeight: 1.6 }}>You are about to permanently delete:</p>
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

      {/* ── Header ── */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#3C3C3C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{m.icon}</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Welcome back, {user.name}</h1>
            <p style={{ color: "#B5B5B5", fontSize: 13, margin: 0 }}>{m.label} · {user.department}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {user.role === "stakeholder" && (
            <button onClick={() => go("new")} className="btn-primary" style={{ padding: "0.5rem 1.2rem", fontSize: 13 }}>
              + New Request
            </button>
          )}
          <button onClick={fetchRequests}
            style={{ background: "transparent", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.9rem", fontSize: 12, cursor: "pointer", color: "#646464", fontFamily: "'Rubik',sans-serif" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Main card ── */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", overflow: "hidden" }}>

        {/* ── Tab bar + search + filters ── */}
        <div style={{ padding: "0 1.2rem", borderBottom: "1px solid #dce8f5", background: "linear-gradient(180deg, #e8f2fb 0%, #f4f8fd 100%)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "2px solid transparent", gap: 0 }}>
              {(user.role === "admin" ? ["tab1"] : ["tab1", "tab2"]).map(t => {
                const isActive = tab === t;
                const count = applyFilters(t === "tab1" ? tab1Rows : tab2Rows).length;
                return (
                  <button key={t} onClick={() => { setTab(t); setFilterStatus("all"); setFilterType("all"); setSearch(""); }}
                    style={{
                      padding: "18px 28px 16px",
                      border: "none",
                      borderBottom: isActive ? "3px solid #1b5793" : "3px solid transparent",
                      background: isActive
                        ? "#ffffff"
                        : "transparent",
                      cursor: "pointer",
                      fontSize: 14, fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#1b5793" : "#94a3b8",
                      fontFamily: "'Rubik',sans-serif", marginBottom: -3,
                      display: "flex", alignItems: "center", gap: 8,
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                      borderRadius: isActive ? "8px 8px 0 0" : 0,
                    }}>
                    {tabs[t].label}
                    <span style={{
                      background: isActive ? "#1b5793" : "#E0E0E0",
                      color: isActive ? "#fff" : "#646464",
                      borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600,
                      minWidth: 22, textAlign: "center"
                    }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 200, paddingTop: 8, paddingBottom: 8, background: "transparent" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#B5B5B5", fontSize: 13 }}>🔍</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={user.role === "stakeholder" ? "Search by title or URL..." : "Search by title, URL or stakeholder..."}
                  style={{ width: "100%", paddingLeft: 36, paddingRight: 10, paddingTop: 10, paddingBottom: 10, border: "1px solid #cddaed", borderRadius: 7, fontSize: 13, fontFamily: "'Rubik',sans-serif", color: "#181313", outline: "none", background: "rgba(255,255,255,0.8)" }}
                />
              </div>

              {/* Status filter */}
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ fontSize: 13, padding: "0.5rem 0.8rem", border: "1px solid #cddaed", borderRadius: 7, background: "rgba(255,255,255,0.8)", color: "#181313", fontFamily: "'Rubik',sans-serif", cursor: "pointer", height: 40 }}>
                <option value="all">All Statuses</option>
                {(tab === "tab1" && user.role === "stakeholder"
                  ? [{ key: "draft", label: "Draft" }]
                  : STATUS_FLOW
                ).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>

              {/* Page type filter */}
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                style={{ fontSize: 13, padding: "0.5rem 0.8rem", border: "1px solid #cddaed", borderRadius: 7, background: "rgba(255,255,255,0.8)", color: "#181313", fontFamily: "'Rubik',sans-serif", cursor: "pointer", height: 40 }}>
                <option value="all">All Types</option>
                {pageTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* Clear */}
              {hasActiveFilters && (
                <button onClick={clearFilters}
                  style={{ fontSize: 12, padding: "0.4rem 0.8rem", border: "1px solid #E0E0E0", borderRadius: 7, background: "#fff", color: "#646464", cursor: "pointer", fontFamily: "'Rubik',sans-serif", height: 34, whiteSpace: "nowrap" }}>
                  ✕ Clear
                </button>
              )}

              <span style={{ color: "#B5B5B5", fontSize: 12, whiteSpace: "nowrap" }}>{displayRows.length} shown</span>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <PCBLoader label="LOADING REQUESTS..." />
        ) : displayRows.length === 0 ? (
          <div style={{ padding: "3.5rem", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{hasActiveFilters ? "🔍" : "📋"}</div>
            <p style={{ color: "#B5B5B5", fontSize: 14 }}>
              {hasActiveFilters ? "No requests match your search or filters." : tab === "tab1" && user.role === "stakeholder" ? "No drafts yet." : "No requests yet."}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-ghost" style={{ marginTop: 12 }}>Clear filters</button>
            )}
            {!hasActiveFilters && user.role === "stakeholder" && (
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
                const s           = getStatus(req.status);
                const act         = canAct(user.role, req.status);
                const isDraft     = req.status === "draft";
                const isOwner     = req.created_by === user.id;
                const returnInfo  = returnCounts[req.id] || { count: 0, lastRole: null };
                const returnCount = returnInfo.count;
                const returnedBy  = returnInfo.lastRole;
                const isReturnedDraft   = isDraft && returnCount > 0;
                const isDesignQuery     = isReturnedDraft && returnedBy === "design_qa";
                const canDelete         = isDraft && returnCount === 0 && (isOwner || user.role === "admin");

                const rowBg = act ? "#FAFAFA" : isDesignQuery ? "#e8f4fb" : isReturnedDraft ? "#fffbf0" : "#fff";

                return (
                  <tr key={req.id} style={{ borderBottom: i < displayRows.length - 1 ? "1px solid #F9F9F9" : "none", background: rowBg }}>
                    <td style={{ padding: "0.9rem 1.2rem", fontSize: 14, color: "#181313" }}>
                      {req.page_title || <span style={{ color: "#B5B5B5", fontStyle: "italic" }}>Untitled</span>}
                      {isDraft && !isReturnedDraft && <span style={{ marginLeft: 8, fontSize: 10, background: "#F3F3F3", color: "#B5B5B5", border: "1px solid #E0E0E0", borderRadius: 4, padding: "1px 6px", fontWeight: 500 }}>DRAFT</span>}
                      {isReturnedDraft && (
                        <span style={{ marginLeft: 8, fontSize: 10, background: isDesignQuery ? "#eff6ff" : "#fff3cd", color: isDesignQuery ? "#1b5793" : "#856404", border: `1px solid ${isDesignQuery ? "#3b82f633" : "#ffc10744"}`, borderRadius: 4, padding: "1px 6px", fontWeight: 500 }}>
                          {isDesignQuery ? "DESIGN QUERY" : "RETURNED"}
                        </span>
                      )}
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
                        {isReturnedDraft && isOwner && (
                          <button onClick={() => go("detail", req.id)}
                            style={{ background: isDesignQuery ? "#eff6ff" : "#fff3cd", color: isDesignQuery ? "#1b5793" : "#856404", border: `1px solid ${isDesignQuery ? "#3b82f666" : "#ffc10766"}`, borderRadius: 6, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                            {isDesignQuery ? "💬 Design Query" : "↩ Comments"}
                            <span style={{ background: "#c0392b", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{returnCount}</span>
                          </button>
                        )}
                        {isDraft && !isReturnedDraft && isOwner && (
                          <button onClick={() => go("edit", req.id)}
                            style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 6, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                            ✎ Edit
                          </button>
                        )}
                        {!isDraft && (
                          <button onClick={() => go("detail", req.id)}
                            style={{ background: act ? "#181313" : "#F3F3F3", color: act ? "#fff" : "#646464", border: "none", borderRadius: 6, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                            {act ? "Review →" : user.role === "stakeholder" && req.status === "pending_approval" ? "✅ Sign off" : "View"}
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeleteModal(req)}
                            style={{ background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.4rem 0.7rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}
                            onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                            onMouseLeave={e => e.currentTarget.style.background = "#fff5f5"}>
                            🗑️
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
