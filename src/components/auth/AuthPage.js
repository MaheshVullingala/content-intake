"use client";
import { useState } from "react";
import Login          from "./Login";
import Register       from "./Register";
import ForgotPassword from "./ForgotPassword";
import ResetPassword  from "./ResetPassword";

export default function AuthPage({ mode = "login", onPasswordReset }) {
  const [screen, setScreen] = useState(mode);

  return (
    <div className="auth-shell">

      {/* ── LEFT: background image + branding ── */}
      <div className="auth-left">
        <div className="auth-left-content">
          <h1 className="auth-left-title">Content Intake<br />Portal</h1>
          <p className="auth-left-tagline">
            Transform content requests into publish-ready experiences.
          </p>
        </div>
      </div>

      {/* ── RIGHT: cubes decoration + form ── */}
      <div className="auth-right">
        <div className="auth-right-cubes" />
        <div className="auth-form-wrap">
          {screen === "login"    && <Login          onSwitch={setScreen} />}
          {screen === "register" && <Register        onSwitch={setScreen} />}
          {screen === "forgot"   && <ForgotPassword  onSwitch={setScreen} />}
          {screen === "reset"    && <ResetPassword   onDone={onPasswordReset} />}
        </div>
      </div>

    </div>
  );
}
