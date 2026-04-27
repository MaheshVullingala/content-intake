"use client";
import { useState } from "react";
import { ROLE_META } from "@/lib/constants";

const DEMO_USERS = [
  { email: "stakeholder@company.com",  name: "Alex Johnson",  role: "stakeholder",  dept: "Product Team",  desc: "Submit and track content requests" },
  { email: "editorial@company.com",    name: "Priya Sharma",  role: "editorial_qa", dept: "Content Team",  desc: "Review and refine page copy" },
  { email: "design@company.com",       name: "Marcus Lee",    role: "design_qa",    dept: "Design Team",   desc: "Add images and visual assets" },
  { email: "webteam@company.com",      name: "Jordan Chen",   role: "web_team",     dept: "Web Team",      desc: "Publish approved pages" },
  { email: "admin@company.com",        name: "Admin User",    role: "admin",        dept: "Operations",    desc: "Monitor all requests and users" },
];

export default function LoginPage({ login }) {
  const [loading, setLoading] = useState(null);
  const [error, setError]     = useState("");

  const handleLogin = async (email, name) => {
    setLoading(email);
    setError("");
    try {
      await login(email);
    } catch (e) {
      setError("Could not connect. Check your internet connection.");
    }
    setLoading(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#181313", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Rubik',sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ width: 54, height: 54, background: "#F3F3F3", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#181313", margin: "0 auto 16px", letterSpacing: "-0.02em" }}>CI</div>
        <h1 style={{ color: "#F3F3F3", fontWeight: 500, fontSize: 24, marginBottom: 6 }}>Content Intake Portal</h1>
        <p style={{ color: "#646464", fontSize: 13 }}>Select your role to sign in</p>
      </div>

      {error && (
        <div style={{ background: "#3a1010", border: "1px solid #c0392b44", borderRadius: 8, padding: "0.7rem 1rem", marginBottom: 20, color: "#f87171", fontSize: 13, maxWidth: 600, width: "100%", textAlign: "center" }}>{error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, width: "100%", maxWidth: 740 }}>
        {DEMO_USERS.map(u => {
          const m = ROLE_META[u.role];
          const isLoading = loading === u.email;
          return (
            <button key={u.email} onClick={() => handleLogin(u.email, u.name)} disabled={!!loading}
              style={{ background: isLoading ? "#3C3C3C" : "#2e2a2a", border: `1px solid ${isLoading ? "#B5B5B5" : "#3C3C3C"}`, borderRadius: 14, padding: "1.3rem 1rem", cursor: loading ? "not-allowed" : "pointer", textAlign: "left", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 10, opacity: loading && !isLoading ? 0.5 : 1 }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "#3C3C3C"; e.currentTarget.style.borderColor = "#B5B5B5"; e.currentTarget.style.transform = "translateY(-2px)"; }}}
              onMouseLeave={e => { e.currentTarget.style.background = "#2e2a2a"; e.currentTarget.style.borderColor = "#3C3C3C"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#181313", border: "1px solid #646464", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                {isLoading ? "⏳" : m.icon}
              </div>
              <div>
                <div style={{ color: "#F3F3F3", fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{u.name}</div>
                <div style={{ color: "#B5B5B5", fontSize: 11, marginBottom: 4 }}>{m.label}</div>
                <div style={{ color: "#646464", fontSize: 11, lineHeight: 1.5 }}>{u.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ color: "#3C3C3C", fontSize: 11, marginTop: 32 }}>Connected to Supabase · SSO integration planned for production</p>
    </div>
  );
}
