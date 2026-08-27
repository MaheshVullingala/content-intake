"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import "@/styles/auth.css";

const clearStaleTokens = () => {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("sb-") || key.startsWith("supabase") || key === "cip-auth")
        localStorage.removeItem(key);
    });
  } catch(e) {}
};

export default function LoginAnimated({ onSwitch }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
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
      if (error) { clearStaleTokens(); setError(error.message); }
    } catch(e) {
      clearStaleTokens();
      setError(e.message === "timeout" ? "Request timed out — please try again." : "Login failed — please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ width:"100%", height:"100vh", display:"flex", fontFamily:"'Rubik',sans-serif", overflow:"hidden" }}>

      {/* ══ LEFT 60% — animated flowchart ══ */}
      <div style={{ flex:"0 0 50%", position:"relative", background:"#0b1a2e", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>

        <svg
          style={{ width:"88%", height:"88%", opacity:0.28 }}
          viewBox="0 0 420 580"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker id="ma" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3z" fill="#3ec5cb"/>
            </marker>
            <marker id="my" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3z" fill="#ffc107"/>
            </marker>
          </defs>

          {/* ── STAGE NODES ──
              Correct flow:
              Row 1:  Draft (left)           Submit→   Editorial QA (right)
              Row 2:  Pending Approval (left) ←Design QA  Design QA (right)
              Row 3:  Web Team (left)         →Published  Published (right)
              Draft return node below
          */}

          {/* Row 1 */}
          <rect x="20" y="20" width="130" height="50" rx="8" fill="#0a2a50" stroke="#3ec5cb" strokeWidth="0.8" strokeDasharray="4 2"/>
          <text x="85" y="41" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="Arial">Stakeholder</text>
          <text x="85" y="57" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="Arial">Creates draft</text>

          <rect x="260" y="20" width="140" height="50" rx="8" fill="#1b5793"/>
          <text x="330" y="41" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="Arial">Editorial QA</text>
          <text x="330" y="57" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="Arial">Reviews content</text>

          {/* Row 2 */}
          <rect x="20" y="160" width="130" height="55" rx="8" fill="#0f4c8a"/>
          <text x="85" y="179" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="Arial">Pending</text>
          <text x="85" y="193" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="Arial">Approval</text>
          <text x="85" y="207" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontFamily="Arial">Stakeholder OK</text>

          <rect x="260" y="160" width="140" height="55" rx="8" fill="#0a2a50" stroke="#3ec5cb" strokeWidth="0.8"/>
          <text x="330" y="182" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="Arial">Design QA</text>
          <text x="330" y="198" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="Arial">Maps images</text>
          <text x="330" y="210" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="Arial">Uploads final assets</text>

          {/* Row 3 */}
          <rect x="20" y="310" width="130" height="50" rx="8" fill="#0f4c8a"/>
          <text x="85" y="331" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="Arial">Web Team</text>
          <text x="85" y="347" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="Arial">Implements in AEM</text>

          <rect x="260" y="310" width="140" height="50" rx="8" fill="#0e5e3a"/>
          <text x="330" y="331" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="Arial">Published</text>
          <text x="330" y="347" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="Arial">Live on cadence.com</text>

          {/* Draft return node */}
          <rect x="135" y="420" width="150" height="46" rx="8" fill="#0a1e38" stroke="#ffc107" strokeWidth="0.8" strokeDasharray="4 3"/>
          <text x="210" y="439" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="Arial">Draft</text>
          <text x="210" y="455" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="9" fontFamily="Arial">Returned for revision</text>

          {/* AI Assist bar */}
          <rect x="20" y="490" width="380" height="60" rx="8" fill="rgba(62,197,203,0.08)" stroke="#3ec5cb" strokeWidth="0.8" strokeDasharray="4 3"/>
          <text x="210" y="513" textAnchor="middle" fill="#3ec5cb" fontSize="11" fontWeight="700" fontFamily="Arial">✦  AI Assist — Available at every stage</text>
          <text x="210" y="530" textAnchor="middle" fill="rgba(62,197,203,0.7)" fontSize="8.5" fontFamily="Arial">Cadence brand voice · Section generation · Product brief → full page</text>
          <text x="210" y="544" textAnchor="middle" fill="rgba(62,197,203,0.5)" fontSize="8" fontFamily="Arial"></text>

          {/* AI dotted lines */}
          <line x1="85"  y1="490" x2="85"  y2="362" stroke="#3ec5cb" strokeWidth="0.6" strokeDasharray="2 5" opacity="0.3"/>
          <line x1="330" y1="490" x2="330" y2="362" stroke="#3ec5cb" strokeWidth="0.6" strokeDasharray="2 5" opacity="0.3"/>

          {/* ── FORWARD CONNECTORS (teal) ── */}
          {/* 1. Stakeholder → Editorial QA */}
          <path id="p1" d="M150,45 L258,45" stroke="#3ec5cb" strokeWidth="1.5" fill="none" markerEnd="url(#ma)"/>
          {/* 2. Editorial QA ↓ Design QA */}
          <path id="p2" d="M330,70 L330,158" stroke="#3ec5cb" strokeWidth="1.5" fill="none" markerEnd="url(#ma)"/>
          {/* 3. Design QA → Pending Approval */}
          <path id="p3" d="M258,187 L152,187" stroke="#3ec5cb" strokeWidth="1.5" fill="none" markerEnd="url(#ma)"/>
          {/* 4. Pending Approval ↓ Web Team */}
          <path id="p4" d="M85,215 L85,308" stroke="#3ec5cb" strokeWidth="1.5" fill="none" markerEnd="url(#ma)"/>
          {/* 5. Web Team → Published */}
          <path id="p5" d="M150,335 L258,335" stroke="#3ec5cb" strokeWidth="1.5" fill="none" markerEnd="url(#ma)"/>

          {/* ── RETURN CONNECTORS (amber) ── */}
          {/* Editorial QA → Draft (content issue) */}
          <path id="r1" d="M400,45 L410,45 L410,443 L287,443" stroke="#ffc107" strokeWidth="0.9" fill="none" markerEnd="url(#my)" strokeDasharray="4 3"/>
          {/* Design QA → Draft (image query to stakeholder) */}
          <path id="r2" d="M400,187 L415,187 L415,460 L287,460" stroke="#ffc107" strokeWidth="0.9" fill="none" markerEnd="url(#my)" strokeDasharray="4 3" opacity="0.8"/>
          {/* Draft → Stakeholder */}
          <path id="r3" d="M135,440 L5,440 L5,45 L18,45" stroke="#ffc107" strokeWidth="0.9" fill="none" markerEnd="url(#my)" strokeDasharray="4 3"/>

          {/* Return labels */}
          <text x="340" y="39" fill="rgba(255,193,7,0.75)" fontSize="8" fontFamily="Arial">↩ content</text>
          <text x="340" y="182" fill="rgba(255,193,7,0.7)"  fontSize="8" fontFamily="Arial">↩ image query</text>
          <text x="8"   y="405" fill="rgba(255,193,7,0.7)"  fontSize="8" fontFamily="Arial">↩ stakeholder</text>

          {/* ── ANIMATED DOTS ── */}
          <circle r="4" fill="#3ec5cb" opacity="0.95">
            <animateMotion dur="2s" repeatCount="indefinite" begin="0s"><mpath href="#p1"/></animateMotion>
          </circle>
          <circle r="4" fill="#3ec5cb" opacity="0.9">
            <animateMotion dur="2s" repeatCount="indefinite" begin="0.8s"><mpath href="#p2"/></animateMotion>
          </circle>
          <circle r="4" fill="#3ec5cb" opacity="0.95">
            <animateMotion dur="2s" repeatCount="indefinite" begin="1.6s"><mpath href="#p3"/></animateMotion>
          </circle>
          <circle r="4" fill="#3ec5cb" opacity="0.9">
            <animateMotion dur="2s" repeatCount="indefinite" begin="2.4s"><mpath href="#p4"/></animateMotion>
          </circle>
          <circle r="4" fill="#3ec5cb" opacity="0.95">
            <animateMotion dur="2s" repeatCount="indefinite" begin="3.2s"><mpath href="#p5"/></animateMotion>
          </circle>
          <circle r="3.5" fill="#ffc107" opacity="0.8">
            <animateMotion dur="4.5s" repeatCount="indefinite" begin="4s"><mpath href="#r1"/></animateMotion>
          </circle>
          <circle r="3.5" fill="#ffc107" opacity="0.75">
            <animateMotion dur="4.5s" repeatCount="indefinite" begin="6s"><mpath href="#r2"/></animateMotion>
          </circle>
          <circle r="3.5" fill="#ffc107" opacity="0.7">
            <animateMotion dur="5s" repeatCount="indefinite" begin="7s"><mpath href="#r3"/></animateMotion>
          </circle>
        </svg>

        {/* Dark tint */}
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.52)", pointerEvents:"none" }}/>

        {/* Branding — frosted glass card bottom-left */}
        <div style={{
          position:"absolute",  zIndex:5,
          background:"rgb(255 255 255 / 0%)",
          backdropFilter:"blur(1px)",
          WebkitBackdropFilter:"blur(12px)",
          border:"1px solid rgb(255 255 255 / 20%)",
          borderRadius:12,
          padding:"18px 22px",
          minWidth:1200,
          textAlign:"center",
        }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"#3ec5cb", marginBottom:5 }}>Cadence Design Systems</div>
          <div style={{ fontSize:24, fontWeight:700, color:"#fff", lineHeight:1.2, marginBottom:6 }}>Content Intake Portal</div>
          <div style={{ width:28, height:3, background:"#3ec5cb", borderRadius:2, marginBottom:8 }}/>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", lineHeight:1.7 }}>From brief to published - one structured workflow.</div>
        </div>
      </div>

      {/* ══ RIGHT 40% — original login style with cubes ══ */}
      <div className="auth-right" style={{ flex:"0 0 50%" }}>
        <div className="auth-right-cubes" />
        <div className="auth-form-wrap">
          <form className="login-form" onSubmit={handleLogin}>
            <p className="login-eyebrow">Welcome</p>
            <h2 className="login-heading">Sign in to your account</h2>

            {error && <div className="login-error">{error}</div>}

            <div className="login-field">
              <label className="login-label">Email</label>
              <input className="login-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                required placeholder="you@cadence.com" maxLength={254} autoComplete="email" />
            </div>

            <div className="login-field-last">
              <label className="login-label">Password</label>
              <input className="login-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" minLength={8} autoComplete="current-password" />
            </div>

            <div className="login-forgot-row">
              <button type="button" className="login-forgot-btn" onClick={() => onSwitch("forgot")}>
                Forgot Password ?
              </button>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Signing in..." : "Login »»"}
            </button>

            {/* AI badge */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, background:"linear-gradient(135deg,#1b5793,#3ec5cb)", borderRadius:20, padding:"8px 14px", fontSize:11, fontWeight:500, color:"#fff", margin:"16px 0" }}>
              <span>✦</span><span>AI Assist — Cadence brand voice</span>
            </div>

            <div className="login-divider">
              <span className="login-divider-text">Don't have an account?</span>
            </div>
            <button type="button" className="login-register-btn" onClick={() => onSwitch("register")}>
              Create an account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}