"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    // Supabase sets the session from the URL hash on page load
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm)    { setError("Passwords do not match."); return; }
    if (password.length < 8)     { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
    setTimeout(() => onDone(), 2000);
  };

  if (!ready) return (
    <div style={{ textAlign: "center", fontFamily: "'Rubik',sans-serif", color: "#646464", fontSize: 14 }}>
      Verifying reset link...
    </div>
  );

  if (success) return (
    <div style={{ textAlign: "center", fontFamily: "'Rubik',sans-serif" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 20, fontWeight: 500, color: "#F3F3F3", marginBottom: 10 }}>Password updated!</h2>
      <p style={{ fontSize: 13, color: "#646464" }}>Redirecting you to the app...</p>
    </div>
  );

  return (
    <form onSubmit={handleReset} style={{ width: "100%" }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, color: "#F3F3F3", marginBottom: 6, fontFamily: "'Rubik',sans-serif" }}>Set new password</h2>
      <p style={{ fontSize: 13, color: "#646464", marginBottom: 24, fontFamily: "'Rubik',sans-serif" }}>Choose a strong password for your account.</p>

      {error && (
        <div style={{ background: "#3a1010", border: "1px solid #c0392b44", borderRadius: 8, padding: "0.7rem 1rem", marginBottom: 16, color: "#f87171", fontSize: 13, fontFamily: "'Rubik',sans-serif" }}>{error}</div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: "#646464", fontWeight: 500, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Rubik',sans-serif" }}>New Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
          placeholder="Min. 8 characters"
          style={{ width: "100%", background: "#2e2a2a", border: "1px solid #3C3C3C", borderRadius: 8, padding: "0.7rem 0.9rem", fontSize: 14, color: "#F3F3F3", outline: "none", fontFamily: "'Rubik',sans-serif", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = "#B5B5B5"}
          onBlur={e  => e.target.style.borderColor = "#3C3C3C"} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 11, color: "#646464", fontWeight: 500, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Rubik',sans-serif" }}>Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}
          placeholder="Repeat password"
          style={{ width: "100%", background: "#2e2a2a", border: "1px solid #3C3C3C", borderRadius: 8, padding: "0.7rem 0.9rem", fontSize: 14, color: "#F3F3F3", outline: "none", fontFamily: "'Rubik',sans-serif", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = "#B5B5B5"}
          onBlur={e  => e.target.style.borderColor = "#3C3C3C"} />
      </div>

      <button type="submit" disabled={loading}
        style={{ width: "100%", background: loading ? "#3C3C3C" : "#F3F3F3", color: "#181313", border: "none", borderRadius: 8, padding: "0.75rem", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
        {loading ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
