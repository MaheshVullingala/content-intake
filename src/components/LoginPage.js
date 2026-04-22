"use client";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/constants";

const USERS = [
  { id: "stakeholder",  name: "Alex Johnson",  dept: "Product Team",  desc: "Submit and track content requests" },
  { id: "editorial_qa",name: "Priya Sharma",   dept: "Content Team",  desc: "Review and refine page copy" },
  { id: "design_qa",   name: "Marcus Lee",     dept: "Design Team",   desc: "Add images and visual assets" },
  { id: "web_team",    name: "Jordan Chen",    dept: "Web Team",      desc: "Publish approved pages" },
  { id: "admin",       name: "Admin User",     dept: "Operations",    desc: "Monitor all requests and users" },
];

export default function LoginPage() {
  const { login } = useApp();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#181313",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      fontFamily: "'Rubik', sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <div style={{
          width: 56, height: 56,
          background: "#F3F3F3",
          borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 700, color: "#181313",
          margin: "0 auto 18px",
          letterSpacing: "-0.02em",
        }}>CI</div>
        <h1 style={{ color: "#F3F3F3", fontWeight: 500, fontSize: 26, marginBottom: 8, letterSpacing: "0.01em" }}>
          Content Intake Portal
        </h1>
        <p style={{ color: "#646464", fontSize: 14, fontWeight: 400 }}>
          Select your role to continue
        </p>
      </div>

      {/* Role cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, width: "100%", maxWidth: 760 }}>
        {USERS.map(u => {
          const m = ROLE_META[u.id];
          return (
            <button key={u.id} onClick={() => login(u.id)}
              style={{
                background: "#2e2a2a",
                border: "1px solid #3C3C3C",
                borderRadius: 14,
                padding: "1.4rem 1.2rem",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.18s",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#3C3C3C";
                e.currentTarget.style.borderColor = "#B5B5B5";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#2e2a2a";
                e.currentTarget.style.borderColor = "#3C3C3C";
                e.currentTarget.style.transform = "translateY(0)";
              }}>
              {/* Icon circle */}
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "#181313",
                border: "1px solid #646464",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>{m.icon}</div>

              <div>
                <div style={{ color: "#F3F3F3", fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{u.name}</div>
                <div style={{ color: "#B5B5B5", fontSize: 11, fontWeight: 400, marginBottom: 6 }}>{m.label}</div>
                <div style={{ color: "#646464", fontSize: 11, lineHeight: 1.5 }}>{u.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ color: "#3C3C3C", fontSize: 11, marginTop: 36 }}>
        MVP Demo — SSO integration planned for production
      </p>
    </div>
  );
}
