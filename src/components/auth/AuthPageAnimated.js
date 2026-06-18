"use client";
import { useState } from "react";
import LoginAnimated  from "./LoginAnimated";
import Register        from "./Register";
import ForgotPassword  from "./ForgotPassword";
import ResetPassword   from "./ResetPassword";

export default function AuthPageAnimated({ mode = "login", onPasswordReset }) {
  const [screen, setScreen] = useState(mode);

  // LoginAnimated is full viewport — render directly
  if (screen === "login") return <LoginAnimated onSwitch={setScreen} />;

  // Register / Forgot / Reset use the existing centered card layout
  return (
    <div style={{ minHeight:"100vh", background:"#0a1628", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Rubik',sans-serif" }}>
      <div style={{ background:"rgba(255,255,255,0.98)", borderRadius:18, padding:"40px 36px", width:380, boxShadow:"0 28px 70px rgba(0,0,0,0.45)" }}>
        {screen === "register" && <Register        onSwitch={setScreen} />}
        {screen === "forgot"   && <ForgotPassword  onSwitch={setScreen} />}
        {screen === "reset"    && <ResetPassword   onDone={() => { onPasswordReset?.(); setScreen("login"); }} />}
      </div>
    </div>
  );
}
