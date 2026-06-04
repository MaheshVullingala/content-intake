"use client";
import { useState } from "react";
import Login          from "./Login";
import Register       from "./Register";
import ForgotPassword from "./ForgotPassword";
import ResetPassword  from "./ResetPassword";

export default function AuthPage({ mode = "login", onPasswordReset }) {
  const [screen, setScreen] = useState(mode);

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      fontFamily: "'Rubik', sans-serif",
    }}>

      {/* ── LEFT: background image + branding ── */}
      <div style={{
        position: "relative",
        overflow: "hidden",
        backgroundImage: "url('/login-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "3rem",
      }}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <h1 style={{
            fontSize: 44,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.1,
            textTransform: "uppercase",
            margin: "0 0 16px",
            letterSpacing: "0.5px",
          }}>
            Content Intake<br />Portal
          </h1>
          <p style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 320,
          }}>
            Transform content requests into publish-ready experiences.
          </p>
        </div>
      </div>

      {/* ── RIGHT: cubes decoration + form ── */}
      <div style={{
        position: "relative",
        overflow: "hidden",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "left",
        padding: "3rem",
      }}>
        {/* Cubes background */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('/cubess.png')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right top",
          mixBlendMode: "multiply",
          zIndex: 0,
          pointerEvents: "none",
        }} />

        {/* Form */}
        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 360 }}>
          {screen === "login"    && <Login          onSwitch={setScreen} />}
          {screen === "register" && <Register        onSwitch={setScreen} />}
          {screen === "forgot"   && <ForgotPassword  onSwitch={setScreen} />}
          {screen === "reset"    && <ResetPassword   onDone={onPasswordReset} />}
        </div>
      </div>
    </div>
  );
}
