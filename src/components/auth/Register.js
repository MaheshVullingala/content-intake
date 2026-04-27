"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const DEPARTMENTS = ["Product Team", "Content Team", "Design Team", "Web Team", "Marketing", "Engineering", "Operations", "Other"];

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
    const { error } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: { name: form.name.trim(), department: form.department },
      },
    });

    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
  };

  if (success) return (
    <div style={{ textAlign: "center", fontFamily: "'Rubik',sans-serif" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
      <h2 style={{ fontSize: 20, fontWeight: 500, color: "#F3F3F3", marginBottom: 10 }}>Check your email</h2>
      <p style={{ fontSize: 13, color: "#646464", lineHeight: 1.7, marginBottom: 24 }}>
        We sent a verification link to <strong style={{ color: "#B5B5B5" }}>{form.email}</strong>.<br />
        Click the link to verify your account.<br />
        An admin will then assign your role.
      </p>
      <button onClick={() => onSwitch("login")} style={{ background: "#F3F3F3", color: "#181313", border: "none", borderRadius: 8, padding: "0.65rem 1.5rem", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
        Back to Sign in
      </button>
    </div>
  );

  const inputStyle = {
    width: "100%", background: "#2e2a2a", border: "1px solid #3C3C3C",
    borderRadius: 8, padding: "0.7rem 0.9rem", fontSize: 14, color: "#F3F3F3",
    outline: "none", fontFamily: "'Rubik',sans-serif", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    fontSize: 11, color: "#646464", fontWeight: 500, display: "block",
    marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em",
    fontFamily: "'Rubik',sans-serif",
  };

  return (
    <form onSubmit={handleRegister} style={{ width: "100%" }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, color: "#F3F3F3", marginBottom: 6, fontFamily: "'Rubik',sans-serif" }}>Create account</h2>
      <p style={{ fontSize: 13, color: "#646464", marginBottom: 24, fontFamily: "'Rubik',sans-serif" }}>Register with your work email</p>

      {error && (
        <div style={{ background: "#3a1010", border: "1px solid #c0392b44", borderRadius: 8, padding: "0.7rem 1rem", marginBottom: 16, color: "#f87171", fontSize: 13, fontFamily: "'Rubik',sans-serif" }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Full Name</label>
        <input type="text" value={form.name} onChange={e => upd("name", e.target.value)} required
          placeholder="e.g. Alex Johnson" maxLength={100} style={inputStyle}
          onFocus={e => e.target.style.borderColor = "#B5B5B5"}
          onBlur={e  => e.target.style.borderColor = "#3C3C3C"} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Work Email</label>
        <input type="email" value={form.email} onChange={e => upd("email", e.target.value)} required
          placeholder="you@company.com" maxLength={254} style={inputStyle}
          onFocus={e => e.target.style.borderColor = "#B5B5B5"}
          onBlur={e  => e.target.style.borderColor = "#3C3C3C"} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Department</label>
        <select value={form.department} onChange={e => upd("department", e.target.value)} required
          style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="">Select your department...</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" value={form.password} onChange={e => upd("password", e.target.value)} required
            placeholder="Min. 8 characters" minLength={8} style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#B5B5B5"}
            onBlur={e  => e.target.style.borderColor = "#3C3C3C"} />
        </div>
        <div>
          <label style={labelStyle}>Confirm Password</label>
          <input type="password" value={form.confirm} onChange={e => upd("confirm", e.target.value)} required
            placeholder="Repeat password" minLength={8} style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#B5B5B5"}
            onBlur={e  => e.target.style.borderColor = "#3C3C3C"} />
        </div>
      </div>

      <div style={{ background: "#2e2a2a", border: "1px solid #3C3C3C", borderRadius: 8, padding: "0.7rem 0.9rem", marginBottom: 20, fontSize: 12, color: "#646464", fontFamily: "'Rubik',sans-serif", lineHeight: 1.6 }}>
        ℹ️ After registration, an admin will assign your role before you can access the portal.
      </div>

      <button type="submit" disabled={loading}
        style={{ width: "100%", background: loading ? "#3C3C3C" : "#F3F3F3", color: "#181313", border: "none", borderRadius: 8, padding: "0.75rem", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#646464", fontFamily: "'Rubik',sans-serif" }}>
        Already have an account?{" "}
        <button type="button" onClick={() => onSwitch("login")}
          style={{ background: "none", border: "none", color: "#B5B5B5", fontSize: 13, cursor: "pointer", fontFamily: "'Rubik',sans-serif", textDecoration: "underline" }}>
          Sign in
        </button>
      </p>
    </form>
  );
}
