"use client";
import { useState } from "react";
import { ROLE_OPTIONS } from "@/lib/constants";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar({ go, view, user, supabase, logout, onLogout, onNavigate, impersonatedRole, onSwitchRole }) {
  const [loggingOut,   setLoggingOut]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await (onLogout || logout)(); } finally { setLoggingOut(false); }
  };

  const nav = (dest) => onNavigate ? onNavigate(dest) : go(dest);

  if (!user) return null;

  const isAdmin        = ["admin", "super_admin"].includes(user.role);
  const isSuperAdmin   = user.role === "super_admin";
  const activeRole     = impersonatedRole || "super_admin";
  const activeLabel    = ROLE_OPTIONS.find(r => r.value === activeRole)?.label ?? "Super Admin";

  return (
    <nav style={{
      background: "#000000",
      borderBottom: "1px solid #1e4f8a",
      padding: "0 2.5rem",
      height: 56,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Left — Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 32, height: 32,
          background: "#3ec5cb",
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#0f2744",
          fontFamily: "'Rubik', sans-serif",
          cursor: "pointer",
          flexShrink: 0,
        }} onClick={() => nav("dashboard")}>
          CI
        </div>
        <span style={{ fontSize: 15, fontWeight: 500, color: "#f1f5f9", fontFamily: "'Rubik', sans-serif" }}>
          Content Intake
        </span>
        <span style={{
          fontSize: 10, background: "rgba(62,197,203,0.15)",
          color: "#3ec5cb", border: "1px solid rgba(62,197,203,0.3)",
          borderRadius: 4, padding: "1px 6px", fontFamily: "'Rubik', sans-serif", fontWeight: 500,
        }}>BETA</span>
      </div>

      {/* Right — Nav links + user */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <button onClick={() => nav("dashboard")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "'Rubik', sans-serif", color: view === "dashboard" ? "#f1f5f9" : "#94a3b8", fontWeight: view === "dashboard" ? 500 : 400, transition: "color 0.15s" }}>
          Dashboard
        </button>

        {user.role === "stakeholder" && (
          <button onClick={() => nav("new")}
            style={{ background: "#3ec5cb", border: "none", borderRadius: 7, padding: "0.45rem 1rem", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik', sans-serif", color: "#0f2744", display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            + New Request
          </button>
        )}

        {isAdmin && (
          <button onClick={() => go("admin")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "'Rubik', sans-serif", color: view === "admin" ? "#f1f5f9" : "#94a3b8", fontWeight: view === "admin" ? 500 : 400 }}>
            Admin
          </button>
        )}

        {/* Notification bell */}
        <NotificationBell user={user} supabase={supabase} go={go} />

        {/* Role switcher — super_admin only */}
        {isSuperAdmin && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              style={{
                background: currentImpersonated ? "rgba(62,197,203,0.12)" : "none",
                border: `1px solid ${currentImpersonated ? "#3ec5cb55" : "#1e4f8a"}`,
                borderRadius: 7,
                padding: "0.3rem 0.75rem",
                fontSize: 12,
                color: currentImpersonated ? "#3ec5cb" : "#94a3b8",
                cursor: "pointer",
                fontFamily: "'Rubik', sans-serif",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s",
              }}
            >
              ⚡ View as: <strong style={{ color: currentImpersonated ? "#3ec5cb" : "#f1f5f9" }}>{activeLabel}</strong>
              <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
            </button>

            {dropdownOpen && (
              <>
                <div
                  onClick={() => setDropdownOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 200 }}
                />
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  background: "#0a1628",
                  border: "1px solid #1e4f8a",
                  borderRadius: 10,
                  padding: "6px 0",
                  minWidth: 190,
                  zIndex: 201,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
                }}>
                  {ROLE_OPTIONS.map(r => {
                    const isActive = activeRole === r.value;
                    return (
                      <button
                        key={r.value}
                        onClick={() => {
                          setDropdownOpen(false);
                          onSwitchRole?.(r.value === "super_admin" ? null : r.value);
                        }}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          background: isActive ? "rgba(62,197,203,0.1)" : "none",
                          border: "none",
                          padding: "8px 16px",
                          fontSize: 13,
                          fontFamily: "'Rubik', sans-serif",
                          color: isActive ? "#3ec5cb" : "#94a3b8",
                          cursor: "pointer",
                          transition: "background 0.1s, color 0.1s",
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                            e.currentTarget.style.color = "#f1f5f9";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            e.currentTarget.style.background = "none";
                            e.currentTarget.style.color = "#94a3b8";
                          }
                        }}
                      >
                        {isActive ? "✓ " : "  "}{r.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* User info */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, borderLeft: "1px solid #1e4f8a", paddingLeft: 20 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#0f2744", border: "1px solid #1e4f8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#94a3b8", fontFamily: "'Rubik', sans-serif", fontWeight: 500 }}>
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9", fontFamily: "'Rubik', sans-serif" }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Rubik', sans-serif" }}>{user.role?.replace(/_/g, " ")}</div>
          </div>
          <button onClick={handleLogout} disabled={loggingOut}
            style={{ background: "none", border: "1px solid #1e4f8a", borderRadius: 6, padding: "0.3rem 0.75rem", fontSize: 12, color: loggingOut ? "#475569" : "#94a3b8", cursor: loggingOut ? "not-allowed" : "pointer", fontFamily: "'Rubik', sans-serif", transition: "all 0.15s", marginLeft: 4, opacity: loggingOut ? 0.6 : 1 }}
            onMouseEnter={e => { if (!loggingOut) { e.currentTarget.style.borderColor = "#94a3b8"; e.currentTarget.style.color = "#f1f5f9"; } }}
            onMouseLeave={e => { if (!loggingOut) { e.currentTarget.style.borderColor = "#1e4f8a"; e.currentTarget.style.color = "#94a3b8"; } }}>
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </div>
    </nav>
  );
}
