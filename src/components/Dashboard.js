"use client";
import { useApp } from "@/lib/store";
import { getStatus, ROLE_META, canAct, STATUS_FLOW } from "@/lib/constants";

export default function Dashboard({ go }) {
  const { currentUser, requests } = useApp();

  const visible = requests.filter(r =>
    currentUser.role === "admin" || currentUser.role !== "stakeholder" || r.createdBy === currentUser.id
  );

  const stats = STATUS_FLOW.map(s => ({ ...s, count: requests.filter(r => r.status === s.key).length }));
  const actionable = visible.filter(r => canAct(currentUser.role, r.status));
  const m = ROLE_META[currentUser.role];

  return (
    <div className="fade-in" style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#3C3C3C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{m.icon}</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: "#181313", margin: 0 }}>Welcome back, {currentUser.name}</h1>
            <p style={{ color: "#646464", fontSize: 13, margin: 0 }}>{m.label}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.key} style={{ background: "#fff", border: "1px solid #E0E0E0", borderRadius: 10, padding: "1rem 0.8rem", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: s.count > 0 ? "#181313" : "#B5B5B5" }}>{s.count}</div>
            <div style={{ fontSize: 10, color: "#B5B5B5", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4, lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action banner */}
      {actionable.length > 0 && (
        <div style={{ background: "#181313", borderRadius: 10, padding: "0.85rem 1.3rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontSize: 13, color: "#F3F3F3", fontWeight: 500 }}>
            {actionable.length} request{actionable.length > 1 ? "s" : ""} awaiting your review
          </span>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #F3F3F3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: "#181313", margin: 0 }}>All Requests</h2>
          <span style={{ color: "#B5B5B5", fontSize: 13 }}>{visible.length} total</span>
        </div>

        {visible.length === 0 ? (
          <div style={{ padding: "3.5rem", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <p style={{ color: "#B5B5B5", fontSize: 14 }}>No requests yet.</p>
            {currentUser.role === "stakeholder" && (
              <button onClick={() => go("new")} style={{ marginTop: 14, background: "#181313", color: "#fff", border: "none", borderRadius: 8, padding: "0.55rem 1.3rem", cursor: "pointer", fontSize: 13, fontFamily: "'Rubik', sans-serif", fontWeight: 500 }}>
                Create your first request
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9F9F9" }}>
                {["Request ID", "Page Type", "Title", "Status", "Last Updated", ""].map(h => (
                  <th key={h} style={{ padding: "0.7rem 1.2rem", textAlign: "left", fontSize: 11, color: "#B5B5B5", fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: "1px solid #F3F3F3" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((req, i) => {
                const s = getStatus(req.status);
                const act = canAct(currentUser.role, req.status);
                return (
                  <tr key={req.id} style={{ borderBottom: i < visible.length - 1 ? "1px solid #F9F9F9" : "none", background: act ? "#FAFAFA" : "#fff", transition: "background 0.1s" }}>
                    <td style={{ padding: "0.9rem 1.2rem", fontFamily: "monospace", fontSize: 11, color: "#B5B5B5" }}>{req.id}</td>
                    <td style={{ padding: "0.9rem 1.2rem" }}>
                      <span style={{ background: "#F3F3F3", color: "#3C3C3C", fontSize: 11, fontWeight: 500, borderRadius: 4, padding: "3px 9px", border: "1px solid #E0E0E0" }}>{req.pageType}</span>
                    </td>
                    <td style={{ padding: "0.9rem 1.2rem", fontSize: 14, color: "#181313", fontWeight: 400 }}>
                      {req.banner?.pageTitle || <span style={{ color: "#B5B5B5", fontStyle: "italic" }}>Untitled</span>}
                    </td>
                    <td style={{ padding: "0.9rem 1.2rem" }}>
                      <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}44`, borderRadius: 20, padding: "3px 11px", fontSize: 11, fontWeight: 500 }}>{s.label}</span>
                    </td>
                    <td style={{ padding: "0.9rem 1.2rem", fontSize: 12, color: "#B5B5B5" }}>{req.updatedAt}</td>
                    <td style={{ padding: "0.9rem 1.2rem" }}>
                      <button onClick={() => go("detail", req.id)} style={{
                        background: act ? "#181313" : "#F3F3F3",
                        color: act ? "#fff" : "#646464",
                        border: "none", borderRadius: 6,
                        padding: "0.4rem 0.9rem",
                        cursor: "pointer", fontSize: 12, fontFamily: "'Rubik', sans-serif", fontWeight: 500,
                      }}>
                        {act ? "Review →" : "View"}
                      </button>
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
