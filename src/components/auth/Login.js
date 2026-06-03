"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login({ onSwitch }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Race the sign-in against a 15s timeout
      const signIn = supabase.auth.signInWithPassword({ email, password });
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 15000)
      );
      const { error } = await Promise.race([signIn, timeout]);
      if (error) setError(error.message);
    } catch(e) {
      if (e.message === "timeout") {
        setError("Sign in timed out — please check your connection and try again.");
      } else {
        setError("Sign in failed — please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: "0.7rem 0.9rem",
    fontSize: 14,
    color: "#f1f5f9",
    outline: "none",
    fontFamily: "'Rubik', sans-serif",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  return (
    <form onSubmit={handleLogin} style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: "#5eead4", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "'Rubik', sans-serif" }}>Welcome back</p>
      <h2 style={{ fontSize: 22, fontWeight: 500, color: "#f1f5f9", marginBottom: 24, fontFamily: "'Rubik', sans-serif" }}>Sign in to your account</h2>

      {error && (
        <div style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, padding: "0.7rem 1rem", marginBottom: 16, color: "#fca5a5", fontSize: 13, fontFamily: "'Rubik', sans-serif" }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, display: "block", marginBottom: 6, fontFamily: "'Rubik', sans-serif" }}>Work email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          placeholder="you@company.com" maxLength={254} style={inputStyle}
          onFocus={e => { e.target.style.borderColor = "#14b8a6"; e.target.style.boxShadow = "0 0 0 3px rgba(20,184,166,0.15)"; e.target.style.background = "rgba(255,255,255,0.12)"; }}
          onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.boxShadow = "none"; e.target.style.background = "rgba(255,255,255,0.08)"; }} />
      </div>

      <div style={{ marginBottom: 6 }}>
        <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, display: "block", marginBottom: 6, fontFamily: "'Rubik', sans-serif" }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
          placeholder="••••••••" minLength={8} style={inputStyle}
          onFocus={e => { e.target.style.borderColor = "#14b8a6"; e.target.style.boxShadow = "0 0 0 3px rgba(20,184,166,0.15)"; e.target.style.background = "rgba(255,255,255,0.12)"; }}
          onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.boxShadow = "none"; e.target.style.background = "rgba(255,255,255,0.08)"; }} />
      </div>

      <div style={{ textAlign: "right", marginBottom: 22 }}>
        <button type="button" onClick={() => onSwitch("forgot")}
          style={{ background: "none", border: "none", color: "#14b8a6", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik', sans-serif" }}>
          Forgot password?
        </button>
      </div>

      <button type="submit" disabled={loading}
        style={{ width: "100%", background: loading ? "#0d9488" : "#14b8a6", color: "#0f172a", border: "none", borderRadius: 8, padding: "0.75rem", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Rubik', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.15s" }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.9"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
        {loading ? "Signing in..." : <><span>Sign in</span><span style={{ fontSize: 16 }}>→</span></>}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
        <span style={{ fontSize: 12, color: "#475569", fontFamily: "'Rubik', sans-serif" }}>Don't have an account?</span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
      </div>

      <button type="button" onClick={() => onSwitch("register")}
        style={{ width: "100%", background: "rgba(255,255,255,0.06)", color: "#f1f5f9", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "0.7rem", fontSize: 14, cursor: "pointer", fontFamily: "'Rubik', sans-serif", transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(20,184,166,0.4)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}>
        Create an account
      </button>
    </form>
  );
}
