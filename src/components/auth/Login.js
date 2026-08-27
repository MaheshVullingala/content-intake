"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { OKTA_ENABLED, OKTA_SSO_DOMAIN } from "@/lib/authConfig";

export default function Login({ onSwitch }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError,   setSsoError]   = useState("");

  // Admin-controlled kill switch for password login (AdminPanel → Settings),
  // read via a narrow RPC since there's no session yet on this screen.
  // Guardrail: if Okta isn't configured at all, ignore the DB flag entirely
  // and keep password login visible — otherwise a stale/mistaken toggle
  // could lock everyone out with no way back in. Starts `true` so the form
  // doesn't flash empty while the RPC is in flight.
  const [passwordLoginEnabled, setPasswordLoginEnabled] = useState(true);

  useEffect(() => {
    if (!OKTA_ENABLED) return; // guardrail — never bother checking, always allow
    let cancelled = false;
    supabase.rpc("get_password_login_enabled").then(({ data, error }) => {
      if (!cancelled && !error && data === false) setPasswordLoginEnabled(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleOktaLogin = async () => {
    setSsoLoading(true);
    setSsoError("");
    try {
      const { data, error } = await supabase.auth.signInWithSSO({ domain: OKTA_SSO_DOMAIN });
      if (error) { setSsoError(error.message); setSsoLoading(false); return; }
      if (data?.url) { window.location.href = data.url; return; }
      setSsoError("Okta sign-in isn't configured yet — contact an admin.");
      setSsoLoading(false);
    } catch (e) {
      setSsoError("Couldn't reach the Okta sign-in page — please try again.");
      setSsoLoading(false);
    }
  };

  const clearStaleTokens = () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("sb-") || key.startsWith("supabase") || key === "cip-auth") {
          localStorage.removeItem(key);
        }
      });
    } catch(e) {}
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    // Clear any stale tokens before attempting login — prevents session accumulation
    clearStaleTokens();
    try {
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        // 30s — comfortably above the 25s fetch-level abort in supabase.js,
        // so a cold-started project gets a real chance to answer before
        // this backstop fires. Was 12s, which fired before a slow first
        // request could ever complete.
        new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 30000))
      ]);
      if (error) {
        // If login itself times out or fails, clear again and show message
        clearStaleTokens();
        setError(error.message === "timeout"
          ? "Request timed out — please check your connection and try again."
          : error.message);
      }
    } catch(e) {
      clearStaleTokens();
      setError(e.message === "timeout"
        ? "Request timed out — please try again."
        : "Login failed — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const showPassword = !OKTA_ENABLED || passwordLoginEnabled;

  return (
    <div className="login-form">

      <p className="login-eyebrow">Welcome</p>
      <h2 className="login-heading">Sign in to your account</h2>

      {OKTA_ENABLED && (
        <>
          {ssoError && <div className="login-error">{ssoError}</div>}
          <button type="button" className="login-submit" onClick={handleOktaLogin} disabled={ssoLoading} style={{ marginBottom: showPassword ? 18 : 0 }}>
            {ssoLoading ? "Redirecting..." : "Sign in with Okta »»"}
          </button>
          {showPassword && (
            <div className="login-divider">
              <span className="login-divider-text">or sign in with email</span>
            </div>
          )}
        </>
      )}

      {showPassword && (
        <form onSubmit={handleLogin}>
          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              className="login-input"
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="you@company.com" maxLength={254} autoComplete="off"
            />
          </div>

          <div className="login-field-last">
            <label className="login-label">Password</label>
            <input
              className="login-input"
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••" minLength={8} autoComplete="off"
            />
          </div>

          <div className="login-forgot-row">
            <button type="button" className="login-forgot-btn" onClick={() => onSwitch("forgot")}>
              Forgot Password ?
            </button>
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? "Signing in..." : "Login »»"}
          </button>

          <div className="login-divider">
            <span className="login-divider-text">Don't have an account?</span>
          </div>

          <button type="button" className="login-register-btn" onClick={() => onSwitch("register")}>
            Create an account
          </button>
        </form>
      )}

    </div>
  );
}
