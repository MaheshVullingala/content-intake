"use client";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/constants";

export default function Navbar({ go, view }) {
  const { currentUser, logout } = useApp();
  const m = ROLE_META[currentUser?.role] || {};

  const navBtn = (label, v, accent) => (
    <button onClick={() => go(v)} style={{
      background: accent ? "#181313" : view === v ? "#2e2a2a" : "transparent",
      color: accent ? "#fff" : view === v ? "#fff" : "#B5B5B5",
      border: "none",
      borderRadius: 6,
      padding: "0.4rem 1rem",
      fontSize: 13,
      fontFamily: "'Rubik', sans-serif",
      fontWeight: view === v || accent ? 500 : 400,
      cursor: "pointer",
      letterSpacing: "0.01em",
      transition: "all 0.15s",
    }}>{label}</button>
  );

  return (
    <nav style={{
      background: "#181313",
      height: 62,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 2rem",
      position: "sticky",
      top: 0,
      zIndex: 100,
      borderBottom: "1px solid #2e2a2a",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32,
          background: "#F3F3F3",
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 700, color: "#181313",
          fontFamily: "'Rubik', sans-serif",
        }}>CI</div>
        <span style={{ color: "#F3F3F3", fontWeight: 500, fontSize: 16, fontFamily: "'Rubik', sans-serif", letterSpacing: "0.01em" }}>
          Content Intake
        </span>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {navBtn("Dashboard", "dashboard")}
        {currentUser?.role === "stakeholder" && navBtn("+ New Request", "new", true)}
        {currentUser?.role === "admin"        && navBtn("Admin Panel", "admin")}

        {/* User chip */}
        <div style={{
          marginLeft: 12,
          display: "flex", alignItems: "center", gap: 8,
          background: "#2e2a2a",
          borderRadius: 30,
          padding: "0.28rem 0.9rem 0.28rem 0.4rem",
          border: "1px solid #3C3C3C",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#3C3C3C",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>{m.icon}</div>
          <div>
            <div style={{ color: "#F3F3F3", fontSize: 12, fontWeight: 500, lineHeight: 1, fontFamily: "'Rubik', sans-serif" }}>{currentUser?.name}</div>
            <div style={{ color: "#B5B5B5", fontSize: 10, marginTop: 2, fontFamily: "'Rubik', sans-serif" }}>{m.label}</div>
          </div>
        </div>

        <button onClick={logout} style={{
          background: "transparent", color: "#646464",
          border: "1px solid #2e2a2a", borderRadius: 6,
          padding: "0.3rem 0.8rem", fontSize: 12,
          cursor: "pointer", fontFamily: "'Rubik', sans-serif",
          marginLeft: 6,
        }}>Sign out</button>
      </div>
    </nav>
  );
}
