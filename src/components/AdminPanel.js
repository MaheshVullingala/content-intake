"use client";
import { useApp } from "@/lib/store";
import { getStatus, ROLE_META, STATUS_FLOW } from "@/lib/constants";

export default function AdminPanel() {
  const { requests, allUsers } = useApp();
  const stats = STATUS_FLOW.map(s => ({ ...s, count: requests.filter(r => r.status === s.key).length }));

  return (
    <div className="fade-in" style={{ fontFamily: "'Rubik', sans-serif" }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "#181313", marginBottom: 4 }}>Admin Panel</h1>
        <p style={{ color: "#B5B5B5", fontSize: 14 }}>Monitor all requests and team activity</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.key} style={{ background: "#fff", border: "1px solid #E0E0E0", borderRadius: 12, padding: "1rem 1.3rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 500, color: s.count > 0 ? "#181313" : "#B5B5B5" }}>{s.count}</div>
              <div style={{ fontSize: 11, color: "#B5B5B5", marginTop: 2 }}>{s.label}</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#F3F3F3", border: "1px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.count > 0 ? "#181313" : "#E0E0E0" }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #F3F3F3" }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>All Requests</h2>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9F9F9" }}>
                {["ID","Title","Type","Status","Created","Updated"].map(h => (
                  <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontSize: 10, color: "#B5B5B5", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #F3F3F3" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r, i) => {
                const s = getStatus(r.status);
                return (
                  <tr key={r.id} style={{ borderBottom: i < requests.length - 1 ? "1px solid #F9F9F9" : "none" }}>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: 11, color: "#B5B5B5" }}>{r.id}</td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: 13, color: "#181313" }}>{r.banner?.pageTitle || "—"}</td>
                    <td style={{ padding: "0.75rem 1rem" }}><span style={{ background: "#F3F3F3", color: "#3C3C3C", fontSize: 11, borderRadius: 4, padding: "2px 8px", border: "1px solid #E0E0E0", fontWeight: 500 }}>{r.pageType}</span></td>
                    <td style={{ padding: "0.75rem 1rem" }}><span style={{ background: s.bg, color: s.color, fontSize: 10, borderRadius: 20, padding: "3px 9px", fontWeight: 500 }}>{s.label}</span></td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: 11, color: "#B5B5B5" }}>{r.createdAt}</td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: 11, color: "#B5B5B5" }}>{r.updatedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "1rem 1.2rem", borderBottom: "1px solid #F3F3F3" }}>
              <h2 style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Team Members</h2>
            </div>
            <div style={{ padding: "0.5rem" }}>
              {allUsers.map(u => {
                const m = ROLE_META[u.role];
                return (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.65rem 0.8rem", borderRadius: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F3F3F3", border: "1px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{m.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#181313" }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: "#B5B5B5" }}>{m.label}</div>
                    </div>
                    <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#2a7a4b" }} title="Active" />
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 12, padding: "1rem 1.1rem" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#181313", marginBottom: 6 }}>⚙ Role Management</div>
            <div style={{ fontSize: 12, color: "#646464", lineHeight: 1.6 }}>Full role assignment and audit logs will be available in the production version with SSO integration.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
