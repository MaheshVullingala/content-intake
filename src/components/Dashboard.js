"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PCBLoader } from "@/components/PCBLoader";
import { getStatus, ROLE_META, canAct, STATUS_FLOW } from "@/lib/constants";
import { OVERALL_STATUS_META, TASK_TEAMS, TASK_STATUS_META } from "@/lib/taskUtils";

const OPERATIONAL_ROLES = ["editorial_qa", "design_qa", "web_team", "brand_team", "seo_team", "editorial_team", "design_team"];
const ROLE_STATUS = { editorial_qa: "editorial_qa", design_qa: "design_qa", web_team: "web_team" };

export default function Dashboard({ go, user }) {
  const [requests,     setRequests]     = useState([]);
  const [teamMembers,  setTeamMembers]  = useState([]);
  const [returnCounts, setReturnCounts] = useState({});
  const [loading,      setLoading]      = useState(true);
  const [deleteModal,  setDeleteModal]  = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [tab,          setTab]          = useState("tab1");
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType,   setFilterType]   = useState("all");
  const [showAttention, setShowAttention] = useState(false);

  const m          = ROLE_META[user.role];
  const isOp       = OPERATIONAL_ROLES.includes(user.role);
  const isLead     = isOp && user.can_assign;
  const myStage    = ROLE_STATUS[user.role];

  // ── Tab config ──────────────────────────────────────────────────────────────
  const getTabConfig = () => {
    if (user.role === "stakeholder") return {
      tab1: { label: "📝 My Drafts",        key: "tab1" },
      tab2: { label: "📋 My Requests",       key: "tab2" },
    };
    if (["admin", "super_admin"].includes(user.role)) return {
      tab1: { label: "⚠️ Pending Review",    key: "tab1" },
      tab2: { label: "📋 All Requests",      key: "tab2" },
    };
    if (isLead) return {
      tab1: { label: "⚡ Needs Review",      key: "tab1" },
      tab2: { label: "👥 Assigned to Team",  key: "tab2" },
      tab3: { label: "📋 All Requests",      key: "tab3" },
    };
    // Regular operational member (brand_team/seo_team/editorial_team/design_team
    // now fall through to isLead above or the member path below — no special branch)
    return {
      tab1: { label: "⚡ Assigned to Me",   key: "tab1" },
      tab2: { label: "📋 All Requests",      key: "tab2" },
    };
  };
  const tabConfig = getTabConfig();
  const tabKeys   = Object.keys(tabConfig);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchRequests = async ({ fromSave = false } = {}) => {
    setLoading(true);
    const hardTimeout = setTimeout(() => setLoading(false), 10000);
    try {
      if (fromSave) await new Promise(r => setTimeout(r, 1000));

      let query = supabase
        .from("requests")
        .select("*, users!requests_created_by_fkey(name, role), assignee:users!requests_assigned_to_fkey(name)")
        .order("updated_at", { ascending: false });

      if (user.role === "stakeholder") query = query.eq("created_by", user.id);

      const { data, error } = await query;
      if (error) { console.error("Dashboard fetch:", error); return; }
      let rows = data || [];

      // For operational roles, also fetch their tasks to surface parallel workflow requests
      if (isOp) {
        const { data: taskData } = await supabase
          .from("tasks")
          .select("*, request:requests!tasks_request_id_fkey(*, users!requests_created_by_fkey(name, role), assignee:users!requests_assigned_to_fkey(name))")
          .eq("team_role", user.role)
          .neq("status", "locked")
          .neq("status", "completed");

        if (taskData?.length) {
          const taskByReqId = {};
          taskData.forEach(t => { taskByReqId[t.request_id] = t; });

          // Attach myTask to already-fetched rows
          rows = rows.map(r => ({ ...r, myTask: taskByReqId[r.id] || null }));

          // Include task-based requests not returned by the main query
          taskData.forEach(t => {
            if (t.request && !rows.find(r => r.id === t.request_id)) {
              rows.push({ ...t.request, myTask: t });
            }
          });
        }
      }

      // Fetch task-progress dots for new-workflow requests (single batch query)
      const parallelIds = rows.filter(r => r.overall_status).map(r => r.id);
      if (parallelIds.length > 0) {
        const { data: progressTasks } = await supabase
          .from("tasks")
          .select("request_id, team_role, status")
          .in("request_id", parallelIds);
        const byRequest = {};
        (progressTasks || []).forEach(t => {
          if (!byRequest[t.request_id]) byRequest[t.request_id] = [];
          byRequest[t.request_id].push(t);
        });
        rows = rows.map(r => ({
          ...r,
          taskProgress: r.overall_status ? (byRequest[r.id] || []) : null,
        }));
      }

      // Admin/super_admin: flag rows with a pending content_change_requests
      // row (stakeholder proposed a mid-flight edit, awaiting review) so
      // "Pending Review" surfaces it without opening each request — see
      // the badge in the row render below and PendingChangeCard.js for
      // where it's actually approved/rejected.
      if (["admin", "super_admin"].includes(user.role) && parallelIds.length > 0) {
        const { data: pendingChanges } = await supabase
          .from("content_change_requests")
          .select("request_id")
          .eq("status", "pending")
          .in("request_id", parallelIds);
        const pendingChangeIds = new Set((pendingChanges || []).map(c => c.request_id));
        rows = rows.map(r => ({ ...r, hasPendingChange: pendingChangeIds.has(r.id) }));
      }

      setRequests(rows);

      // Fetch return comments
      if (rows.length > 0) {
        const ids = rows.map(r => r.id);
        const { data: rc } = await supabase
          .from("comments").select("request_id, user_role, created_at")
          .in("request_id", ids).eq("is_return", true)
          .order("created_at", { ascending: false });
        const counts = {};
        (rc || []).forEach(c => {
          if (!counts[c.request_id]) counts[c.request_id] = { count: 0, lastRole: c.user_role };
          counts[c.request_id].count += 1;
        });
        setReturnCounts(counts);
      }

      // Fetch team members (same role) for lead assignment
      if (isLead) {
        const { data: tm } = await supabase.from("users").select("id, name")
          .eq("role", user.role).neq("id", user.id);
        setTeamMembers(tm || []);
      }
    } catch(e) {
      console.error("Dashboard exception:", e);
    } finally {
      clearTimeout(hardTimeout);
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [user.id]);

  // ── Row filtering per tab ───────────────────────────────────────────────────
  const ACTIVE_TASK_STATUSES = ["pending", "in_progress", "needs_info", "pending_approval"];

  const getTabRows = (tabKey) => {
    if (user.role === "stakeholder") {
      if (tabKey === "tab1") return requests.filter(r => r.status === "draft" && !r.overall_status);
      // "My Requests" — everything this stakeholder owns, regardless of
      // overall_status. requests is already scoped to created_by = user.id
      // by the base query, so drafts (overall_status NULL) must not be
      // excluded here or they vanish from this tab until submitted.
      if (tabKey === "tab2") return requests;
    }
    if (["admin", "super_admin"].includes(user.role)) {
      // Pending Review — new submissions awaiting task setup, PLUS any
      // in-flight request with a stakeholder-proposed content change
      // awaiting approve/reject (see hasPendingChange in fetchRequests).
      if (tabKey === "tab1") return requests.filter(r =>
        r.overall_status === "pending_admin" || r.hasPendingChange);
      return requests; // tab2 — all requests (including legacy with overall_status = null)
    }

    if (isLead) {
      if (tabKey === "tab1") return requests.filter(r => {
        if (r.myTask) return ACTIVE_TASK_STATUSES.includes(r.myTask.status) &&
                             (!r.myTask.assigned_to || r.myTask.assigned_to === user.id);
        return r.status === myStage && (!r.assigned_to || r.assigned_to === user.id);
      });
      if (tabKey === "tab2") return requests.filter(r => {
        if (r.myTask) return !!r.myTask.assigned_to;
        return r.status === myStage && !!r.assigned_to;
      });
      return requests; // tab3 — full visibility
    }

    // Regular operational member (editorial_qa, design_qa, web_team without can_assign)
    if (tabKey === "tab1") return requests.filter(r => {
      if (r.myTask) return r.myTask.assigned_to === user.id;
      return myStage && !r.overall_status && r.status === myStage && r.assigned_to === user.id;
    });
    return requests;
  };

  // ── Filters ─────────────────────────────────────────────────────────────────
  const applyFilters = (rows) => rows.filter(r => {
    const q = search.toLowerCase();
    if (q) {
      const matchTitle  = (r.page_title || "").toLowerCase().includes(q);
      const matchUrl    = (r.seo_page_location || "").toLowerCase().includes(q);
      const matchName   = user.role !== "stakeholder" && (r.users?.name || "").toLowerCase().includes(q);
      if (!matchTitle && !matchUrl && !matchName) return false;
    }
    if (filterStatus !== "all") {
      const effectiveStatus = r.overall_status || r.status;
      if (effectiveStatus !== filterStatus) return false;
    }
    if (filterType   !== "all" && r.page_type !== filterType) return false;
    return true;
  });

  const displayRows      = applyFilters(getTabRows(tab));
  const hasActiveFilters = search || filterStatus !== "all" || filterType !== "all";

  // ── Stakeholder "Needs Attention" ──────────────────────────────────────────
  // taskProgress (not a `tasks` field — see fetchRequests above) is an array
  // of { team_role, status } per request, populated only for v2 (overall_status
  // set) rows.
  const attentionRequests = user.role === "stakeholder"
    ? requests.filter(r => r.taskProgress?.some(t =>
        t.status === "pending_approval" || t.status === "needs_info"))
    : [];

  const getAttentionReason = (taskProgress) => {
    const flagged = taskProgress?.find(t =>
      t.status === "pending_approval" || t.status === "needs_info");
    if (!flagged) return null;
    const label = TASK_TEAMS.find(tm => tm.role === flagged.team_role)?.label || flagged.team_role;
    return {
      status: flagged.status,
      text: flagged.status === "pending_approval" ? `${label} needs approval` : `${label} has a question`,
    };
  };
  const pageTypes        = ["Product", "Solutions", "Glossary", "On-demand Webinar"];

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    await supabase.from("comments").delete().eq("request_id", deleteModal.id);
    await supabase.from("status_history").delete().eq("request_id", deleteModal.id);
    await supabase.from("attachments").delete().eq("request_id", deleteModal.id);
    await supabase.from("requests").delete().eq("id", deleteModal.id);
    setDeleteModal(null); setDeleting(false); fetchRequests();
  };

  const handleAssign = async (reqId, assigneeId) => {
    await supabase.from("requests").update({
      assigned_to: assigneeId || null,
      updated_at: new Date().toISOString()
    }).eq("id", reqId);
    fetchRequests();
  };

  return (
    <div className="fade-in" style={{ fontFamily: "'Rubik', sans-serif" }}>

      {/* Delete Modal */}
      {deleteModal && (
        <div onClick={() => !deleting && setDeleteModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: "2rem", maxWidth: 420, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff5f5", border: "1px solid #c0392b33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 16 }}>🗑️</div>
            <h2 style={{ fontSize: 17, fontWeight: 500, marginBottom: 8 }}>Delete Draft?</h2>
            <p style={{ fontSize: 13, color: "#646464", marginBottom: 6, lineHeight: 1.6 }}>You are about to permanently delete:</p>
            <div style={{ background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.7rem 1rem", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{deleteModal.page_title || "Untitled"}</div>
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

      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#3C3C3C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{m.icon}</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Welcome back, {user.name}</h1>
            <p style={{ color: "#B5B5B5", fontSize: 13, margin: 0 }}>{m.label}{isLead ? " · Team Lead" : ""} · {user.department}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {user.role === "stakeholder" && (
            <button onClick={() => go("new")} className="btn-primary" style={{ padding: "0.5rem 1.2rem", fontSize: 13 }}>+ New Request</button>
          )}
          <button onClick={fetchRequests}
            style={{ background: "transparent", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.9rem", fontSize: 12, cursor: "pointer", color: "#646464", fontFamily: "'Rubik',sans-serif" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Main card */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", overflow: "hidden" }}>

        {/* Tab bar + toolbar */}
        <div style={{ padding: "0 1.2rem", borderBottom: "1px solid #dce8f5", background: "linear-gradient(180deg, #e8f2fb 0%, #f4f8fd 100%)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>

            {/* Tabs */}
            <div style={{ display: "flex" }}>
              {tabKeys.map(t => {
                const count    = applyFilters(getTabRows(t)).length;
                const isActive = tab === t;
                const isMyRequestsForStakeholder = t === "tab2" && user.role === "stakeholder";

                const tabButton = (
                  <button key={t} onClick={() => { setTab(t); setSearch(""); setFilterStatus("all"); setFilterType("all"); }}
                    style={{
                      padding: "18px 24px 16px",
                      border: "none", borderBottom: isActive ? "3px solid #1b5793" : "3px solid transparent",
                      background: isActive ? "#fff" : "transparent",
                      cursor: "pointer", fontSize: 13, fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#1b5793" : "#94a3b8",
                      fontFamily: "'Rubik',sans-serif", marginBottom: -3,
                      display: "flex", alignItems: "center", gap: 8,
                      borderRadius: isActive ? "8px 8px 0 0" : 0,
                      transition: "all 0.15s", whiteSpace: "nowrap",
                    }}>
                    {tabConfig[t].label}
                    <span style={{ background: isActive ? "#1b5793" : "#E0E0E0", color: isActive ? "#fff" : "#646464", borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600, minWidth: 22, textAlign: "center" }}>{count}</span>
                  </button>
                );

                if (!isMyRequestsForStakeholder) return tabButton;

                return (
                  <div key={t} style={{ position: "relative" }}>
                    {tabButton}
                    {attentionRequests.length > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); setShowAttention(v => !v); }}
                        title={`${attentionRequests.length} request${attentionRequests.length !== 1 ? "s" : ""} need attention`}
                        style={{
                          position: "absolute", top: 8, right: 4,
                          background: "#c0392b", color: "#fff", border: "2px solid #fff",
                          borderRadius: "50%", width: 18, height: 18,
                          fontSize: 10, fontWeight: 700, lineHeight: 1,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", padding: 0,
                          animation: "attnPulse 1.8s ease-in-out infinite",
                        }}>
                        {attentionRequests.length}
                      </button>
                    )}
                    {showAttention && attentionRequests.length > 0 && (
                      <>
                        <div onClick={() => setShowAttention(false)}
                          style={{ position: "fixed", inset: 0, zIndex: 998 }} />
                        <div onClick={e => e.stopPropagation()}
                          style={{
                            position: "absolute", top: "100%", left: 0, marginTop: 6,
                            background: "#fff", borderRadius: 12, minWidth: 320, maxWidth: 380,
                            boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid #E0E0E0",
                            zIndex: 999, overflow: "hidden",
                          }}>
                          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #F3F3F3",
                                        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#181313" }}>
                              ⚠️ Needs Attention
                            </span>
                            <button onClick={() => setShowAttention(false)}
                              style={{ background: "none", border: "none", cursor: "pointer",
                                       fontSize: 16, color: "#B5B5B5", lineHeight: 1, padding: 0 }}>
                              ✕
                            </button>
                          </div>
                          <div style={{ maxHeight: 320, overflowY: "auto" }}>
                            {attentionRequests.slice(0, 5).map(r => {
                              const reason = getAttentionReason(r.taskProgress);
                              const borderColor = reason?.status === "pending_approval" ? "#9333ea" : "#d97706";
                              return (
                                <div
                                  key={r.id}
                                  onClick={() => { setShowAttention(false); go("detail", r.id); }}
                                  style={{
                                    padding: "10px 16px", borderLeft: `3px solid ${borderColor}`,
                                    cursor: "pointer", borderBottom: "1px solid #F9F9F9",
                                    fontFamily: "'Rubik',sans-serif", transition: "background 0.1s",
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = "#F9F9F9"; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                                >
                                  <div style={{ fontSize: 13, fontWeight: 500, color: "#181313", marginBottom: 2,
                                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {r.page_title || "Untitled"}
                                  </div>
                                  <div style={{ fontSize: 11, color: borderColor, fontWeight: 500 }}>
                                    {reason?.text}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {attentionRequests.length > 5 && (
                            <button
                              onClick={() => { setShowAttention(false); setTab("tab2"); setSearch(""); setFilterStatus("all"); setFilterType("all"); }}
                              style={{
                                width: "100%", padding: "10px", background: "#F9F9F9",
                                border: "none", borderTop: "1px solid #F3F3F3",
                                fontSize: 12, fontWeight: 600, color: "#1b5793", cursor: "pointer",
                                fontFamily: "'Rubik',sans-serif",
                              }}>
                              View All ({attentionRequests.length})
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <style jsx>{`
              @keyframes attnPulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.5); }
                50%      { box-shadow: 0 0 0 5px rgba(192, 57, 43, 0); }
              }
            `}</style>

            {/* Search + filters */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 200, paddingTop: 8, paddingBottom: 8 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#B5B5B5", fontSize: 13 }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={user.role === "stakeholder" ? "Search by title or URL..." : "Search by title, URL or stakeholder..."}
                  style={{ width: "100%", paddingLeft: 36, paddingRight: 10, paddingTop: 10, paddingBottom: 10, border: "1px solid #cddaed", borderRadius: 7, fontSize: 13, fontFamily: "'Rubik',sans-serif", color: "#181313", outline: "none", background: "rgba(255,255,255,0.8)" }} />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ fontSize: 13, padding: "0.5rem 0.8rem", border: "1px solid #cddaed", borderRadius: 7, background: "rgba(255,255,255,0.8)", color: "#181313", fontFamily: "'Rubik',sans-serif", cursor: "pointer", height: 40 }}>
                <option value="all">All Statuses</option>
                {STATUS_FLOW.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                style={{ fontSize: 13, padding: "0.5rem 0.8rem", border: "1px solid #cddaed", borderRadius: 7, background: "rgba(255,255,255,0.8)", color: "#181313", fontFamily: "'Rubik',sans-serif", cursor: "pointer", height: 40 }}>
                <option value="all">All Types</option>
                {pageTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {hasActiveFilters && (
                <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterType("all"); }}
                  style={{ fontSize: 12, padding: "0.4rem 0.8rem", border: "1px solid #E0E0E0", borderRadius: 7, background: "#fff", color: "#646464", cursor: "pointer", fontFamily: "'Rubik',sans-serif", height: 40, whiteSpace: "nowrap" }}>
                  ✕ Clear
                </button>
              )}
              <span style={{ color: "#B5B5B5", fontSize: 12, whiteSpace: "nowrap" }}>{displayRows.length} shown</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <PCBLoader label="LOADING REQUESTS..." />
        ) : displayRows.length === 0 ? (
          <div style={{ padding: "3.5rem", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{hasActiveFilters ? "🔍" : "📋"}</div>
            <p style={{ color: "#B5B5B5", fontSize: 14 }}>
              {hasActiveFilters ? "No requests match your search or filters." :
               tab === "tab1" && user.role === "stakeholder" ? "No drafts yet." :
               tab === "tab1" && !isLead ? "No requests assigned to you yet." :
               tab === "tab1" && isLead ? "No requests need review right now." :
               "No requests yet."}
            </p>
            {hasActiveFilters && <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterType("all"); }} className="btn-ghost" style={{ marginTop: 12 }}>Clear filters</button>}
            {!hasActiveFilters && user.role === "stakeholder" && (
              <button onClick={() => go("new")} className="btn-primary" style={{ marginTop: 14 }}>Create your first request</button>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9F9F9" }}>
                {["Title", "Page Type", "Status", "Assigned To", "Submitted By", "Last Updated", "Actions"].map(h => (
                  <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", fontSize: 10, color: "#B5B5B5", fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: "1px solid #F3F3F3" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((req, i) => {
                const isNewWorkflow = !!req.overall_status;
                const osMeta = isNewWorkflow ? (OVERALL_STATUS_META[req.overall_status] || OVERALL_STATUS_META.in_progress) : null;
                const s          = getStatus(req.status);
                const act        = !isNewWorkflow && canAct(user.role, req.status);
                const isDraft    = req.status === "draft" && !isNewWorkflow;
                const isOwner    = req.created_by === user.id;
                const returnInfo = returnCounts[req.id] || { count: 0, lastRole: null };
                const isReturnedDraft = isDraft && returnInfo.count > 0;
                const isDesignQuery   = isReturnedDraft && returnInfo.lastRole === "design_qa";
                const canDelete       = isDraft && returnInfo.count === 0 && (isOwner || user.role === "admin");
                const isAssignedToMe  = req.assigned_to === user.id;
                const assigneeName    = req.assignee?.name;

                const rowBg = req.hasPendingChange ? "#faf5ff" :
                              isAssignedToMe && isOp ? "#f0fafb" :
                              act ? "#FAFAFA" :
                              isDesignQuery ? "#e8f4fb" :
                              isReturnedDraft ? "#fffbf0" : "#fff";

                return (
                  <tr key={req.id} style={{ borderBottom: i < displayRows.length - 1 ? "1px solid #F9F9F9" : "none", background: rowBg, borderLeft: req.priority === "urgent" ? "3px solid #c0392b" : "none" }}>
                    <td style={{ padding: "0.9rem 1rem", fontSize: 14, color: "#181313" }}>
                      {req.page_title || <span style={{ color: "#B5B5B5", fontStyle: "italic" }}>Untitled</span>}
                      {req.hasPendingChange && (
                        <span
                          title="Stakeholder proposed a content change — open the request to review and approve/reject it"
                          style={{ marginLeft: 8, fontSize: 10, background: "#faf5ff", color: "#9333ea", border: "1px solid #9333ea33", borderRadius: 4, padding: "1px 6px", fontWeight: 600, cursor: "help" }}>
                          📝 CONTENT UPDATED
                        </span>
                      )}
                      {isDraft && !isReturnedDraft && <span style={{ marginLeft: 8, fontSize: 10, background: "#F3F3F3", color: "#B5B5B5", border: "1px solid #E0E0E0", borderRadius: 4, padding: "1px 6px", fontWeight: 500 }}>DRAFT</span>}
                      {isReturnedDraft && (
                        <span style={{ marginLeft: 8, fontSize: 10, background: isDesignQuery ? "#eff6ff" : "#fff3cd", color: isDesignQuery ? "#1b5793" : "#856404", border: `1px solid ${isDesignQuery ? "#3b82f633" : "#ffc10744"}`, borderRadius: 4, padding: "1px 6px", fontWeight: 500 }}>
                          {isDesignQuery ? "DESIGN QUERY" : "RETURNED"}
                        </span>
                      )}
                      {req.priority === "urgent" && (
                        <span
                          title={req.priority_override_reason
                            ? `Admin override: ${req.priority_override_reason}`
                            : req.stakeholder_priority_reason
                            ? `Stakeholder reason: ${req.stakeholder_priority_reason}`
                            : undefined}
                          style={{ marginLeft: 8, fontSize: 10, background: "#fef2f2", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 4, padding: "1px 6px", fontWeight: 600, cursor: (req.priority_override_reason || req.stakeholder_priority_reason) ? "help" : "default" }}>URGENT</span>
                      )}
                      {req.priority === "high" && (
                        <span
                          title={req.priority_override_reason
                            ? `Admin override: ${req.priority_override_reason}`
                            : req.stakeholder_priority_reason
                            ? `Stakeholder reason: ${req.stakeholder_priority_reason}`
                            : undefined}
                          style={{ marginLeft: 8, fontSize: 10, background: "#fffbeb", color: "#d97706", border: "1px solid #d9770633", borderRadius: 4, padding: "1px 6px", fontWeight: 600, cursor: (req.priority_override_reason || req.stakeholder_priority_reason) ? "help" : "default" }}>HIGH</span>
                      )}
                    </td>
                    <td style={{ padding: "0.9rem 1rem" }}>
                      <span style={{ background: "#F3F3F3", color: "#3C3C3C", fontSize: 11, fontWeight: 500, borderRadius: 4, padding: "3px 9px", border: "1px solid #E0E0E0" }}>{req.page_type}</span>
                    </td>
                    <td style={{ padding: "0.9rem 1rem" }}>
                      {isNewWorkflow ? (
                        <span style={{ background: osMeta.bg, color: osMeta.color, border: `1px solid ${osMeta.color}44`, borderRadius: 20, padding: "3px 11px", fontSize: 11, fontWeight: 500 }}>{osMeta.label}</span>
                      ) : (
                        <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}44`, borderRadius: 20, padding: "3px 11px", fontSize: 11, fontWeight: 500 }}>{s.label}</span>
                      )}
                      {isNewWorkflow && req.taskProgress && req.taskProgress.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                          <div style={{ display: "flex", gap: 3 }}>
                            {TASK_TEAMS.map(team => {
                              const t = req.taskProgress.find(x => x.team_role === team.role);
                              const dot = t ? TASK_STATUS_META[t.status] : null;
                              return (
                                <div key={team.role}
                                  title={`${team.label}: ${dot?.label || "Not assigned"}`}
                                  style={{ width: 7, height: 7, borderRadius: "50%", background: dot?.color || "#E0E0E0", border: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }} />
                              );
                            })}
                          </div>
                          <span style={{ fontSize: 10, color: "#B5B5B5" }}>
                            {req.taskProgress.filter(t => t.status === "completed").length} of {TASK_TEAMS.length} tasks complete
                          </span>
                        </div>
                      )}
                    </td>
                    {/* Assigned To column */}
                    <td style={{ padding: "0.9rem 1rem" }}>
                      {isLead && req.status === myStage ? (
                        <select
                          value={req.assigned_to || ""}
                          onChange={e => handleAssign(req.id, e.target.value)}
                          style={{ fontSize: 12, padding: "0.3rem 0.6rem", border: "1px solid #cddaed", borderRadius: 6, background: "#fff", color: "#181313", fontFamily: "'Rubik',sans-serif", cursor: "pointer", maxWidth: 140 }}>
                          <option value="">Unassigned</option>
                          <option value={user.id}>Me</option>
                          {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      ) : assigneeName ? (
                        <span style={{ fontSize: 12, color: isAssignedToMe ? "#1b5793" : "#646464", fontWeight: isAssignedToMe ? 600 : 400 }}>
                          {isAssignedToMe ? "👤 Me" : assigneeName}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#B5B5B5" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.9rem 1rem", fontSize: 13, color: "#646464" }}>{req.users?.name || "—"}</td>
                    <td style={{ padding: "0.9rem 1rem", fontSize: 12, color: "#B5B5B5" }}>
                      {new Date(req.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      {req.due_date && (() => {
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        const due = new Date(req.due_date);
                        const isOverdue = due < today;
                        const isDueSoon = !isOverdue && (due - today) / 86400000 <= 2;
                        if (!isOverdue && !isDueSoon) return null;
                        return (
                          <div style={{ marginTop: 3, fontSize: 11, color: isOverdue ? "#c0392b" : "#d97706", display: "flex", alignItems: "center", gap: 3 }}>
                            🕐 {isOverdue ? "Overdue" : "Due soon"} · {due.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: "0.9rem 1rem" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {isReturnedDraft && isOwner && (
                          <button onClick={() => go("detail", req.id)}
                            style={{ background: isDesignQuery ? "#eff6ff" : "#fff3cd", color: isDesignQuery ? "#1b5793" : "#856404", border: `1px solid ${isDesignQuery ? "#3b82f666" : "#ffc10766"}`, borderRadius: 6, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                            {isDesignQuery ? "💬 Design Query" : "↩ Comments"}
                            <span style={{ background: "#c0392b", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{returnInfo.count}</span>
                          </button>
                        )}
                        {isDraft && !isReturnedDraft && isOwner && (
                          <button onClick={() => go("edit", req.id)}
                            style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 6, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
                            ✎ Edit
                          </button>
                        )}
                        {!isDraft && isNewWorkflow && (
                          <button onClick={() => go("detail", req.id)}
                            style={{
                              background: req.overall_status === "pending_stakeholder" ? "#faf5ff" : "#1b5793",
                              color: req.overall_status === "pending_stakeholder" ? "#7e22ce" : "#fff",
                              border: req.overall_status === "pending_stakeholder" ? "1px solid #9333ea44" : "none",
                              borderRadius: 6, padding: "0.4rem 0.9rem",
                              cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500,
                            }}>
                            {req.overall_status === "pending_stakeholder" ? "👁️ Review & Approve" :
                             req.overall_status === "pending_admin" ? "⏳ Pending Admin" :
                             "View Tasks →"}
                          </button>
                        )}
                        {!isDraft && !isNewWorkflow && (
                          <button onClick={() => go("detail", req.id)}
                            style={{
                              background: act && isAssignedToMe ? "#1b5793" : "#F3F3F3",
                              color: act && isAssignedToMe ? "#fff" : "#646464",
                              border: "none", borderRadius: 6, padding: "0.4rem 0.9rem",
                              cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif", fontWeight: 500,
                              display: "flex", alignItems: "center", gap: 6,
                            }}>
                            {act && isAssignedToMe && req.status === "pending_approval" ? "✅ Sign off" :
                             act && isAssignedToMe ? "Review →" : "View"}
                            {isLead && !isAssignedToMe && req.status === myStage && (comments_count => comments_count > 0 ? (
                              <span style={{ background: "#e8f2fb", color: "#1b5793", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>
                                💬
                              </span>
                            ) : null)(req.comment_count || 0)}
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeleteModal(req)}
                            style={{ background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.4rem 0.7rem", cursor: "pointer", fontSize: 12, fontFamily: "'Rubik',sans-serif" }}
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
