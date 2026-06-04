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
      const timeout = setTimeout(() => {
        setLoading(false);
        setError("Request timed out — please check your connection and try again.");
      }, 12000);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      clearTimeout(timeout);
      if (error) setError(error.message);
    } catch(e) {
      setError("Login failed — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleLogin}>

      <p className="login-eyebrow">Welcome</p>
      <h2 className="login-heading">Sign in to your account</h2>

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

    </form>
  );
}
