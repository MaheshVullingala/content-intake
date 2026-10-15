"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaCheckCircle } from "react-icons/fa";

// Change password for the signed-in user (opened from the Navbar).
//
// Flow: verify the CURRENT password by signing in again with it (so someone
// at an unlocked laptop can't change it), then supabase.auth.updateUser().
// The re-sign-in fires a redundant SIGNED_IN event, which app/page.js already
// treats as a no-op for an existing user. Other devices stay signed in.
//
// Accounts that don't use a password here (e.g. Okta SSO) get an
// explanation instead of the form.
//
// Convention: no <form> tags (see CLAUDE.md / project conventions) -- the
// Enter key is handled explicitly.

export const MIN_PASSWORD_LENGTH = 8;

// Returns an error string, or "" if the new password is acceptable.
export function validateNewPassword(current, next, confirm) {
  if (!current)                         return "Enter your current password.";
  if (next.length < MIN_PASSWORD_LENGTH) return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (!/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) return "New password must contain at least one letter and one number.";
  if (next === current)                 return "New password must be different from your current password.";
  if (next !== confirm)                 return "New passwords do not match.";
  return "";
}

const label = { fontSize: 12, color: "#646464", fontWeight: 500, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" };
const input = { width: "100%", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.65rem 0.85rem", fontSize: 14, color: "#181313", outline: "none", fontFamily: "'Rubik',sans-serif", boxSizing: "border-box" };

export default function ChangePasswordModal({ user, supabase, onClose }) {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);
  const [usesPassword, setUsesPassword] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      const providers = (data?.user?.identities || []).map(i => i.provider);
      // Only flag when we positively know there's no email/password identity.
      if (providers.length > 0 && !providers.includes("email")) setUsesPassword(false);
    }).catch(() => {});
    return () => { alive = false; };
  }, [supabase]);

  const handleSave = async () => {
    if (saving) return;
    setError("");
    const problem = validateNewPassword(current, next, confirm);
    if (problem) { setError(problem); return; }

    setSaving(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
      if (signInErr) { setError("Your current password is incorrect."); return; }

      const { error: updateErr } = await supabase.auth.updateUser({ password: next });
      if (updateErr) { setError(updateErr.message || "Could not update your password."); return; }

      setSuccess(true);
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(onClose, 1800);
    } catch (e) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e) => { if (e.key === "Enter") handleSave(); };

  const modal = (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 14, padding: "1.5rem", width: "100%", maxWidth: 400, fontFamily: "'Rubik',sans-serif", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 500, color: "#181313" }}>Change password</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "#646464", display: "flex" }}><FaTimes size={14} /></button>
        </div>

        {!usesPassword ? (
          <p style={{ fontSize: 13, color: "#646464", lineHeight: 1.6, margin: "0 0 16px" }}>
            Your account signs in through single sign-on, so there is no password to change here. Change it with your organization&apos;s identity provider.
          </p>
        ) : success ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: 34, color: "#2a7a4b", display: "flex", justifyContent: "center", marginBottom: 10 }}><FaCheckCircle /></div>
            <div style={{ fontSize: 14, color: "#181313", fontWeight: 500 }}>Password updated</div>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #c0392b33", borderRadius: 8, padding: "0.6rem 0.85rem", marginBottom: 14, color: "#c0392b", fontSize: 13 }}>{error}</div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Current password</label>
              <input type="password" value={current} onChange={e => setCurrent(e.target.value)} onKeyDown={onKeyDown}
                autoComplete="current-password" autoFocus style={input} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>New password</label>
              <input type="password" value={next} onChange={e => setNext(e.target.value)} onKeyDown={onKeyDown}
                autoComplete="new-password" placeholder="At least 8 characters, a letter and a number" style={input} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={label}>Confirm new password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={onKeyDown}
                autoComplete="new-password" style={input} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onClose} disabled={saving}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleSave} disabled={saving}>
                {saving ? "Updating…" : "Update password"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
