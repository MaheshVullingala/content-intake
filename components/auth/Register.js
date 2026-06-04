"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const DEPARTMENTS = ["Product Team","Content Team","Design Team","Web Team","Marketing","Engineering","Operations","Other"];

export default function Register({ onSwitch }) {
  const [form,    setForm]    = useState({ name: "", email: "", password: "", confirm: "", department: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 8)       { setError("Password must be at least 8 characters."); return; }
    if (!form.name.trim())              { setError("Please enter your full name."); return; }
    if (!form.department)               { setError("Please select your department."); return; }

    setLoading(true);
    try {
      const signUp = supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { name: form.name.trim(), department: form.department } },
      });
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000));
      const { error } = await Promise.race([signUp, timeout]);
      if (error) { setError(error.message); return; }
      setSuccess(true);
    } catch(e) {
      setError(e.message === "timeout"
        ? "Registration timed out — please check your connection and try again."
        : "Registration failed — please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="auth-success-state">
      <div className="auth-success-icon">📧</div>
      <h2 className="auth-success-heading">Check your email</h2>
      <p className="auth-success-text">
        We sent a verification link to <strong>{form.email}</strong>.<br />
        Click the link to verify your account.<br />
        An admin will then assign your role.
      </p>
      <button className="auth-back-btn" onClick={() => onSwitch("login")}>Back to Sign in</button>
    </div>
  );

  return (
    <form className="auth-dark-form" onSubmit={handleRegister}>
      <h2 className="auth-dark-heading">Create account</h2>
      <p className="auth-dark-sub">Register with your work email</p>

      {error && <div className="auth-dark-error">{error}</div>}

      <div className="auth-dark-field">
        <label className="auth-dark-label">Full Name</label>
        <input className="auth-dark-input" type="text" value={form.name}
          onChange={e => upd("name", e.target.value)} required
          placeholder="e.g. Alex Johnson" maxLength={100} />
      </div>

      <div className="auth-dark-field">
        <label className="auth-dark-label">Work Email</label>
        <input className="auth-dark-input" type="email" value={form.email}
          onChange={e => upd("email", e.target.value)} required
          placeholder="you@company.com" maxLength={254} />
      </div>

      <div className="auth-dark-field">
        <label className="auth-dark-label">Department</label>
        <select className="auth-dark-input" value={form.department}
          onChange={e => upd("department", e.target.value)} required>
          <option value="">Select your department...</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="auth-dark-grid-2">
        <div>
          <label className="auth-dark-label">Password</label>
          <input className="auth-dark-input" type="password" value={form.password}
            onChange={e => upd("password", e.target.value)} required
            placeholder="Min. 8 characters" minLength={8} />
        </div>
        <div>
          <label className="auth-dark-label">Confirm Password</label>
          <input className="auth-dark-input" type="password" value={form.confirm}
            onChange={e => upd("confirm", e.target.value)} required
            placeholder="Repeat password" minLength={8} />
        </div>
      </div>

      <div className="auth-dark-info">
        ℹ️ After registration, an admin will assign your role before you can access the portal.
      </div>

      <button type="submit" className="auth-dark-btn" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="auth-dark-footer">
        Already have an account?{" "}
        <button type="button" className="auth-dark-link" onClick={() => onSwitch("login")}>Sign in</button>
      </p>
    </form>
  );
}
