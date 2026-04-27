"use client";
import { ROLE_META } from "@/lib/constants";

export default function Navbar({ go, view, user, logout }) {
  const m = ROLE_META[user?.role] || {};
  const btn = (label, v, accent) => (
    <button onClick={() => go(v)} style={{
      background: accent ? "#F3F3F3" : view === v ? "#2e2a2a" : "transparent",
      color: accent ? "#181313" : view === v ? "#F3F3F3" : "#B5B5B5",
      border: "none", borderRadius: 7, padding: "0.38rem 0.9rem",
      fontSize: 13, fontFamily: "'Rubik',sans-serif",
      fontWeight: view === v || accent ? 500 : 400, cursor: "pointer", transition: "all 0.15s",
    }}>{label}</button>
  );

  return (
    <nav style={{ background: "#181313", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2.5rem", position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid #2e2a2a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, background: "#F3F3F3", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#181313", fontFamily: "'Rubik',sans-serif" }}>CI</div>
        <span style={{ color: "#F3F3F3", fontWeight: 500, fontSize: 16, fontFamily: "'Rubik',sans-serif" }}>Content Intake</span>
        <span style={{ background: "#2e2a2a", color: "#646464", fontSize: 10, borderRadius: 4, padding: "2px 7px", marginLeft: 4, fontFamily: "'Rubik',sans-serif" }}>BETA</span>
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {btn("Dashboard", "dashboard")}
        {user?.role === "stakeholder" && btn("+ New Request", "new", true)}
        {user?.role === "admin"        && btn("Admin Panel", "admin")}
        <div style={{ marginLeft: 12, display: "flex", alignItems: "center", gap: 8, background: "#2e2a2a", borderRadius: 30, padding: "0.28rem 0.9rem 0.28rem 0.4rem", border: "1px solid #3C3C3C" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#3C3C3C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{m.icon}</div>
          <div>
            <div style={{ color: "#F3F3F3", fontSize: 12, fontWeight: 500, lineHeight: 1, fontFamily: "'Rubik',sans-serif" }}>{user?.name}</div>
            <div style={{ color: "#B5B5B5", fontSize: 10, marginTop: 2, fontFamily: "'Rubik',sans-serif" }}>{m.label}</div>
          </div>
        </div>
        <button onClick={logout} style={{ background: "transparent", color: "#646464", border: "1px solid #2e2a2a", borderRadius: 6, padding: "0.3rem 0.8rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", marginLeft: 4 }}>Sign out</button>
      </div>
    </nav>
  );
}
