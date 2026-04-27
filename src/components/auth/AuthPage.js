"use client";
import { useState } from "react";
import Login          from "./Login";
import Register       from "./Register";
import ForgotPassword from "./ForgotPassword";
import ResetPassword  from "./ResetPassword";

export default function AuthPage({ mode = "login", onPasswordReset }) {
  const [screen, setScreen] = useState(mode);

  return (
    <div style={{ minHeight: "100vh", background: "#181313", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Rubik',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, background: "#F3F3F3", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#181313", margin: "0 auto 14px", letterSpacing: "-0.02em" }}>CI</div>
          <h1 style={{ color: "#F3F3F3", fontWeight: 500, fontSize: 22, marginBottom: 4 }}>Content Intake Portal</h1>
          <p style={{ color: "#3C3C3C", fontSize: 12 }}>Internal content workflow management</p>
        </div>

        {/* Auth card */}
        <div style={{ background: "#1e1a1a", border: "1px solid #2e2a2a", borderRadius: 16, padding: "2rem" }}>
          {screen === "login"   && <Login          onSwitch={setScreen} />}
          {screen === "register"&& <Register        onSwitch={setScreen} />}
          {screen === "forgot"  && <ForgotPassword  onSwitch={setScreen} />}
          {screen === "reset"   && <ResetPassword   onDone={onPasswordReset} />}
        </div>

        <p style={{ textAlign: "center", color: "#2e2a2a", fontSize: 11, marginTop: 24 }}>
          Content Intake Portal · Internal use only
        </p>
      </div>
    </div>
  );
}
