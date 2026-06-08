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
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm)  { setError("Passwords do not match."); return; }
    if (password.length < 8)   { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
    setTimeout(() => onDone(), 2000);
  };

  if (!ready) return (
    <div className="auth-dark-sub" style={{ textAlign: "center" }}>Verifying reset link...</div>
  );

  if (success) return (
    <div className="auth-success-state">
      <div className="auth-success-icon">✅</div>
      <h2 className="auth-success-heading">Password updated!</h2>
      <p className="auth-success-text">Redirecting you to the app...</p>
    </div>
  );

  return (
    <form className="auth-dark-form" onSubmit={handleReset}>
      <h2 className="auth-dark-heading">Set new password</h2>
      <p className="auth-dark-sub">Choose a strong password for your account.</p>

      {error && <div className="auth-dark-error">{error}</div>}

      <div className="auth-dark-field">
        <label className="auth-dark-label">New Password</label>
        <input className="auth-dark-input" type="password" value={password}
          onChange={e => setPassword(e.target.value)} required
          placeholder="Min. 8 characters" minLength={8} />
      </div>

      <div className="auth-dark-field" style={{ marginBottom: 24 }}>
        <label className="auth-dark-label">Confirm Password</label>
        <input className="auth-dark-input" type="password" value={confirm}
          onChange={e => setConfirm(e.target.value)} required
          placeholder="Repeat password" minLength={8} />
      </div>

      <button type="submit" className="auth-dark-btn" disabled={loading}>
        {loading ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
