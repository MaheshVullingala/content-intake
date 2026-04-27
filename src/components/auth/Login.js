"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const TEST_ACCOUNTS = [
  { role: "Stakeholder",  email: "stakeholder@test.com", icon: "👤" },
  { role: "Editorial QA", email: "editorial@test.com",   icon: "✍️"  },
  { role: "Design QA",    email: "design@test.com",      icon: "🎨" },
  { role: "Web Team",     email: "webteam@test.com",     icon: "🌐" },
  { role: "Admin",        email: "admin@test.com",       icon: "⚙️"  },
];
const TEST_PASSWORD = "Test@1234";

export default function Login({ onSwitch }) {
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [loadingRole, setLoadingRole] = useState(null);
  const [error,       setError]       = useState("");
  const [showTest,    setShowTest]    = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const quickLogin = async (testEmail) => {
    setLoadingRole(testEmail);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email:    testEmail,
      password: TEST_PASSWORD,
    });
    if (error) setError("Test account not set up yet. Run the SQL first.");
    setLoadingRole(null);
  };

  const inputStyle = {
    width: "100%", background: "#2e2a2a", border: "1px solid #3C3C3C",
    borderRadius: 8, padding: "0.7rem 0.9rem", fontSize: 14, color: "#F3F3F3",
    outline: "none", fontFamily: "'Rubik',sans-serif", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  return (
    <form onSubmit={handleLogin} style={{ width: "100%" }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, color: "#F3F3F3", marginBottom: 6, fontFamily: "'Rubik',sans-serif" }}>Sign in</h2>
      <p style={{ fontSize: 13, color: "#646464", marginBottom: 24, fontFamily: "'Rubik',sans-serif" }}>Enter your work email and password</p>

      {error && (
        <div style={{ background: "#3a1010", border: "1px solid #c0392b44", borderRadius: 8, padding: "0.7rem 1rem", marginBottom: 16, color: "#f87171", fontSize: 13, fontFamily: "'Rubik',sans-serif" }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: "#646464", fontWeight: 500, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Rubik',sans-serif" }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          placeholder="you@company.com" maxLength={254} style={inputStyle}
          onFocus={e => e.target.style.borderColor = "#B5B5B5"}
          onBlur={e  => e.target.style.borderColor = "#3C3C3C"} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: "#646464", fontWeight: 500, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Rubik',sans-serif" }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
          placeholder="••••••••" minLength={8} style={inputStyle}
          onFocus={e => e.target.style.borderColor = "#B5B5B5"}
          onBlur={e  => e.target.style.borderColor = "#3C3C3C"} />
      </div>

      <div style={{ textAlign: "right", marginBottom: 20 }}>
        <button type="button" onClick={() => onSwitch("forgot")}
          style={{ background: "none", border: "none", color: "#B5B5B5", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
          Forgot password?
        </button>
      </div>

      <button type="submit" disabled={loading}
        style={{ width: "100%", background: loading ? "#3C3C3C" : "#F3F3F3", color: "#181313", border: "none", borderRadius: 8, padding: "0.75rem", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", transition: "opacity 0.15s" }}>
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#646464", fontFamily: "'Rubik',sans-serif" }}>
        Don't have an account?{" "}
        <button type="button" onClick={() => onSwitch("register")}
          style={{ background: "none", border: "none", color: "#B5B5B5", fontSize: 13, cursor: "pointer", fontFamily: "'Rubik',sans-serif", textDecoration: "underline" }}>
          Register
        </button>
      </p>

      {/* Test credentials section */}
      <div style={{ marginTop: 24, borderTop: "1px solid #2e2a2a", paddingTop: 20 }}>
        <button type="button" onClick={() => setShowTest(!showTest)}
          style={{ width: "100%", background: "transparent", border: "1px dashed #3C3C3C", borderRadius: 8, padding: "0.6rem", fontSize: 12, color: "#646464", cursor: "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          🧪 {showTest ? "Hide" : "Show"} test accounts
        </button>

        {showTest && (
          <div style={{ marginTop: 14 }}>
            <div style={{ background: "#2e2a2a", border: "1px solid #3C3C3C", borderRadius: 8, padding: "0.65rem 0.9rem", marginBottom: 12, fontSize: 12, color: "#646464", fontFamily: "'Rubik',sans-serif" }}>
              Password for all test accounts: <strong style={{ color: "#B5B5B5", fontFamily: "monospace" }}>{TEST_PASSWORD}</strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TEST_ACCOUNTS.map(acc => (
                <button key={acc.email} type="button" onClick={() => quickLogin(acc.email)}
                  disabled={!!loadingRole}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: loadingRole === acc.email ? "#2e2a2a" : "#252020", border: "1px solid #3C3C3C", borderRadius: 8, padding: "0.6rem 0.9rem", cursor: loadingRole ? "not-allowed" : "pointer", transition: "border-color 0.15s", fontFamily: "'Rubik',sans-serif" }}
                  onMouseEnter={e => { if (!loadingRole) e.currentTarget.style.borderColor = "#646464"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#3C3C3C"; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{acc.icon}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#F3F3F3" }}>{acc.role}</div>
                      <div style={{ fontSize: 11, color: "#646464", fontFamily: "monospace" }}>{acc.email}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: "#646464" }}>
                    {loadingRole === acc.email ? "Signing in..." : "Quick login →"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
