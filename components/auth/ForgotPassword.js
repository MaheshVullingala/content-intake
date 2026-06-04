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
    <div className="auth-success-state">
      <div className="auth-success-icon">📧</div>
      <h2 className="auth-success-heading">Check your email</h2>
      <p className="auth-success-text">
        We sent a password reset link to <strong>{email}</strong>.<br />
        Click the link in the email to set a new password.
      </p>
      <button className="auth-back-btn" onClick={() => onSwitch("login")}>Back to Sign in</button>
    </div>
  );

  return (
    <form className="auth-dark-form" onSubmit={handleReset}>
      <h2 className="auth-dark-heading">Reset password</h2>
      <p className="auth-dark-sub">Enter your email and we'll send you a reset link.</p>

      {error && <div className="auth-dark-error">{error}</div>}

      <div className="auth-dark-field">
        <label className="auth-dark-label">Email</label>
        <input className="auth-dark-input" type="email" value={email}
          onChange={e => setEmail(e.target.value)} required
          placeholder="you@company.com" maxLength={254} />
      </div>

      <button type="submit" className="auth-dark-btn" disabled={loading}>
        {loading ? "Sending..." : "Send reset link"}
      </button>

      <p className="auth-dark-footer">
        <button type="button" className="auth-dark-link" onClick={() => onSwitch("login")}>
          ← Back to Sign in
        </button>
      </p>
    </form>
  );
}
