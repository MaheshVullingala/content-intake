"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPassword({ onSwitch }) {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  };

  if (sent) return (
    <div style={{ textAlign: "center", fontFamily: "'Rubik',sans-serif" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
      <h2 style={{ fontSize: 20, fontWeight: 500, color: "#F3F3F3", marginBottom: 10 }}>Check your email</h2>
      <p style={{ fontSize: 13, color: "#646464", lineHeight: 1.7, marginBottom: 24 }}>
        We sent a password reset link to <strong style={{ color: "#B5B5B5" }}>{email}</strong>.<br />
        Click the link in the email to set a new password.
      </p>
      <button onClick={() => onSwitch("login")} style={{ background: "#F3F3F3", color: "#181313", border: "none", borderRadius: 8, padding: "0.65rem 1.5rem", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
        Back to Sign in
      </button>
    </div>
  );

  return (
    <form onSubmit={handleReset} style={{ width: "100%" }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, color: "#F3F3F3", marginBottom: 6, fontFamily: "'Rubik',sans-serif" }}>Reset password</h2>
      <p style={{ fontSize: 13, color: "#646464", marginBottom: 24, fontFamily: "'Rubik',sans-serif" }}>
        Enter your email and we'll send you a reset link.
      </p>

      {error && (
        <div style={{ background: "#3a1010", border: "1px solid #c0392b44", borderRadius: 8, padding: "0.7rem 1rem", marginBottom: 16, color: "#f87171", fontSize: 13, fontFamily: "'Rubik',sans-serif" }}>{error}</div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: "#646464", fontWeight: 500, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Rubik',sans-serif" }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          placeholder="you@company.com" maxLength={254}
          style={{ width: "100%", background: "#2e2a2a", border: "1px solid #3C3C3C", borderRadius: 8, padding: "0.7rem 0.9rem", fontSize: 14, color: "#F3F3F3", outline: "none", fontFamily: "'Rubik',sans-serif", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = "#B5B5B5"}
          onBlur={e  => e.target.style.borderColor = "#3C3C3C"} />
      </div>

      <button type="submit" disabled={loading}
        style={{ width: "100%", background: loading ? "#3C3C3C" : "#F3F3F3", color: "#181313", border: "none", borderRadius: 8, padding: "0.75rem", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
        {loading ? "Sending..." : "Send reset link"}
      </button>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#646464", fontFamily: "'Rubik',sans-serif" }}>
        <button type="button" onClick={() => onSwitch("login")}
          style={{ background: "none", border: "none", color: "#B5B5B5", fontSize: 13, cursor: "pointer", fontFamily: "'Rubik',sans-serif", textDecoration: "underline" }}>
          ← Back to Sign in
        </button>
      </p>
    </form>
  );
}
