"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const DEPARTMENTS = ["Product Team", "Content Team", "Design Team", "Web Team", "Marketing", "Engineering", "Operations", "Other"];

// Registration is restricted to company email addresses. This is a
// client-side gate for UX only — the authoritative check lives in
// Postgres (see sql/12-enforce-cadence-email-domain.sql), which blocks
// the signup even if this check is bypassed.
const ALLOWED_EMAIL_DOMAIN = "cadence.com";

export default function Register({ onSwitch }) {
  const [form,    setForm]    = useState({ name: "", email: "", password: "", confirm: "", department: "", intent: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isStakeholderIntent = form.intent === "stakeholder";

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 8)       { setError("Password must be at least 8 characters."); return; }
    if (!form.name.trim())              { setError("Please enter your full name."); return; }
    if (!form.department)               { setError("Please select your department."); return; }
    if (!form.intent)                   { setError("Please tell us why you're signing up."); return; }
    if (!form.email.trim().toLowerCase().endsWith("@" + ALLOWED_EMAIL_DOMAIN)) {
      setError(`Registration is limited to @${ALLOWED_EMAIL_DOMAIN} email addresses.`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await Promise.race([
        supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              name:       form.name.trim(),
              department: form.department,
              // Read server-side by the handle_new_user() trigger, which
              // only special-cases this exact literal — anything else (or
              // a tampered client request) falls through to 'pending' as
              // before. Stakeholder is the only role safe to self-grant:
              // RLS scopes it to the requester's own requests only. Team
              // roles (editorial/brand/seo/design/web) and admin still
              // always require a human to assign, on purpose.
              role_request: isStakeholderIntent ? "stakeholder" : undefined,
            },
          },
        }),
        new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 15000))
      ]);
      if (error) { setError(error.message); return; }
      setSuccess(true);
    } catch(e) {
      setError(e.message === "timeout" ? "Registration timed out — please try again." : "Registration failed — please try again.");
    } finally { setLoading(false); }
  };

  if (success) return (
    <div style={{ textAlign: "center", fontFamily: "'Rubik',sans-serif" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
      <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0f2744", marginBottom: 10 }}>Check your email</h2>
      <p style={{ fontSize: 13, color: "#646464", lineHeight: 1.7, marginBottom: 24 }}>
        We sent a verification link to <strong style={{ color: "#1b5793" }}>{form.email}</strong>.<br />
        Click the link to verify your account.<br />
        {isStakeholderIntent
          ? "You'll have stakeholder access right away — no approval needed."
          : "An admin will then assign your role."}
      </p>
      <button onClick={() => onSwitch("login")}
        style={{ background: "#1b5793", color: "#fff", border: "none", borderRadius: 8, padding: "0.65rem 1.5rem", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
        Back to Sign in
      </button>
    </div>
  );

  const inputStyle = {
    width: "100%", background: "#fff", border: "1.5px solid #e2e8f0",
    borderRadius: 8, padding: "0.7rem 0.9rem", fontSize: 13, color: "#0f2744",
    outline: "none", fontFamily: "'Rubik',sans-serif", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const labelStyle = {
    fontSize: 11, color: "#94a3b8", fontWeight: 600, display: "block",
    marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em",
    fontFamily: "'Rubik',sans-serif",
  };

  const onFocus = e => e.target.style.borderColor = "#3ec5cb";
  const onBlur  = e => e.target.style.borderColor = "#e2e8f0";

  return (
    <form onSubmit={handleRegister} style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#1b5793", marginBottom: 6, fontFamily: "'Rubik',sans-serif" }}>Create Account</p>
      <h2 style={{ fontSize: 22, fontWeight: 400, color: "#0f2744", marginBottom: 6, fontFamily: "'Rubik',sans-serif" }}>Register with your work email</h2>
      <div style={{ width: 36, height: 3, background: "#3ec5cb", borderRadius: 2, marginBottom: 22 }} />

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a544", borderRadius: 8, padding: "0.7rem 1rem", marginBottom: 16, color: "#c0392b", fontSize: 13, fontFamily: "'Rubik',sans-serif" }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Full Name</label>
        <input type="text" value={form.name} onChange={e => upd("name", e.target.value)} required
          placeholder="e.g. Alex Johnson" maxLength={100} style={inputStyle}
          onFocus={onFocus} onBlur={onBlur} autoComplete="name" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Work Email</label>
        <input type="email" value={form.email} onChange={e => upd("email", e.target.value)} required
          placeholder="you@cadence.com" maxLength={254} style={inputStyle}
          onFocus={onFocus} onBlur={onBlur} autoComplete="email" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>I'm signing up to...</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { key: "stakeholder", label: "📝 Request content", hint: "Get access right away" },
            { key: "team",        label: "🛠️ Join a content team", hint: "Needs admin approval" },
          ].map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => upd("intent", opt.key)}
              style={{
                flex: 1, textAlign: "left", cursor: "pointer",
                border: `1.5px solid ${form.intent === opt.key ? "#1b5793" : "#e2e8f0"}`,
                background: form.intent === opt.key ? "#e8f4fb" : "#fff",
                borderRadius: 8, padding: "0.6rem 0.7rem",
                fontFamily: "'Rubik',sans-serif",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: "#0f2744" }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{opt.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Department</label>
        <select value={form.department} onChange={e => upd("department", e.target.value)} required
          style={{ ...inputStyle, cursor: "pointer" }}
          onFocus={onFocus} onBlur={onBlur}>
          <option value="">Select your department...</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" value={form.password} onChange={e => upd("password", e.target.value)} required
            placeholder="Min. 8 characters" minLength={8} style={inputStyle}
            onFocus={onFocus} onBlur={onBlur} autoComplete="new-password" />
        </div>
        <div>
          <label style={labelStyle}>Confirm Password</label>
          <input type="password" value={form.confirm} onChange={e => upd("confirm", e.target.value)} required
            placeholder="Repeat password" minLength={8} style={inputStyle}
            onFocus={onFocus} onBlur={onBlur} autoComplete="new-password" />
        </div>
      </div>

      <div style={{ background: "#e8f4fb", border: "1px solid #1b579322", borderRadius: 8, padding: "0.7rem 0.9rem", marginBottom: 20, fontSize: 12, color: "#1b5793", fontFamily: "'Rubik',sans-serif", lineHeight: 1.6 }}>
        {isStakeholderIntent
          ? "ℹ️ Stakeholder access is granted automatically — no admin approval needed. You can start submitting requests as soon as you verify your email."
          : "ℹ️ After registration, an admin will assign your role before you can access the portal."}
      </div>

      <button type="submit" disabled={loading}
        style={{ width: "100%", background: loading ? "#94a3b8" : "#1b5793", color: "#fff", border: "none", borderRadius: 8, padding: "0.75rem", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", letterSpacing: "0.03em", transition: "background 0.2s" }}>
        {loading ? "Creating account..." : "Create Account »»"}
      </button>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#94a3b8", fontFamily: "'Rubik',sans-serif" }}>
        Already have an account?{" "}
        <button type="button" onClick={() => onSwitch("login")}
          style={{ background: "none", border: "none", color: "#3ec5cb", fontSize: 13, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
          Sign in
        </button>
      </p>
    </form>
  );
}
