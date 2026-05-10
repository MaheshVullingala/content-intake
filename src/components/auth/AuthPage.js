"use client";
import { useState } from "react";
import Login          from "./Login";
import Register       from "./Register";
import ForgotPassword from "./ForgotPassword";
import ResetPassword  from "./ResetPassword";

export default function AuthPage({ mode = "login", onPasswordReset }) {
  const [screen, setScreen] = useState(mode);

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", position: "relative", overflow: "hidden", fontFamily: "'Rubik', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>

      {/* Full screen animated circuit SVG */}
      <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0 }} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <style>{`
          @keyframes travel {
            0%   { opacity: 0; offset-distance: 0%; }
            5%   { opacity: 1; }
            95%  { opacity: 1; }
            100% { opacity: 0; offset-distance: 100%; }
          }
          @keyframes gridPulse { 0%,100%{opacity:.06} 50%{opacity:.13} }
          .cgrid { animation: gridPulse 5s ease-in-out infinite; }

          .dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: #14b8a6;
            position: absolute;
            animation: travel linear infinite;
          }

          /* Traces */
          @keyframes f1 { 0%{stroke-dashoffset:400} 100%{stroke-dashoffset:0} }
          @keyframes f2 { 0%{stroke-dashoffset:600} 100%{stroke-dashoffset:0} }
          @keyframes f3 { 0%{stroke-dashoffset:300} 100%{stroke-dashoffset:0} }
          @keyframes f4 { 0%{stroke-dashoffset:500} 100%{stroke-dashoffset:0} }
          .t1{stroke-dasharray:12 6;animation:f1 4s linear infinite;}
          .t2{stroke-dasharray:12 6;animation:f2 6s linear infinite;}
          .t3{stroke-dasharray:12 6;animation:f3 3.5s linear infinite reverse;}
          .t4{stroke-dasharray:12 6;animation:f4 5s linear infinite reverse;}
          .t5{stroke-dasharray:12 6;animation:f1 4.5s linear infinite;}
          .t6{stroke-dasharray:12 6;animation:f2 7s linear infinite reverse;}
          .t7{stroke-dasharray:12 6;animation:f3 3s linear infinite;}
          .t8{stroke-dasharray:12 6;animation:f4 5.5s linear infinite;}

          @keyframes dpulse { 0%,100%{r:4;opacity:.4;} 50%{r:7;opacity:1;} }
          @keyframes dpulse2 { 0%,100%{r:3;opacity:.3;} 50%{r:6;opacity:.9;} }
          @keyframes dpulse3 { 0%,100%{r:3;opacity:.2;} 50%{r:5;opacity:.8;} }
          .jd1{animation:dpulse 2.2s ease-in-out infinite;}
          .jd2{animation:dpulse2 3s ease-in-out infinite 0.5s;}
          .jd3{animation:dpulse3 2.8s ease-in-out infinite 1.2s;}
          .jd4{animation:dpulse 3.5s ease-in-out infinite 1.8s;}
          .jd5{animation:dpulse2 2.5s ease-in-out infinite 0.8s;}
          .jd6{animation:dpulse3 4s ease-in-out infinite 2s;}
          .jd7{animation:dpulse 2s ease-in-out infinite 1s;}
          .jd8{animation:dpulse2 3.2s ease-in-out infinite 0.3s;}

          @keyframes scan { 0%{transform:translateY(-100px)} 100%{transform:translateY(1000px)} }
          .scanline{animation:scan 10s linear infinite;opacity:0.025;}
        `}</style>

        {/* Grid */}
        <g class="cgrid">
          {[0,80,160,240,320,400,480,560,640,720,800,880,960,1040,1120,1200,1280,1360,1440].map(x =>
            `<line x1="${x}" y1="0" x2="${x}" y2="900" stroke="#14b8a6" stroke-width="0.4"/>`
          ).join("")}
          {[0,80,160,240,320,400,480,560,640,720,800,880,900].map(y =>
            `<line x1="0" y1="${y}" x2="1440" y2="${y}" stroke="#14b8a6" stroke-width="0.4"/>`
          ).join("")}
        </g>

        {/* Circuit traces — left side */}
        <path class="t1" d="M0 160 L160 160 L160 80 L320 80 L320 240 L480 240" stroke="#14b8a6" stroke-width="1.5" fill="none" opacity="0.7"/>
        <path class="t2" d="M0 400 L80 400 L80 320 L240 320 L240 480 L400 480 L400 560" stroke="#5eead4" stroke-width="1.5" fill="none" opacity="0.6"/>
        <path class="t3" d="M0 640 L160 640 L160 720 L320 720 L320 640 L480 640 L480 560" stroke="#14b8a6" stroke-width="1.2" fill="none" opacity="0.5"/>
        <path class="t7" d="M80 0 L80 160" stroke="#14b8a6" stroke-width="1.2" fill="none" opacity="0.5"/>
        <path class="t8" d="M240 0 L240 80 L160 80" stroke="#5eead4" stroke-width="1" fill="none" opacity="0.4"/>
        <path class="t5" d="M400 0 L400 160 L480 160 L480 240" stroke="#14b8a6" stroke-width="1.2" fill="none" opacity="0.5"/>
        <path class="t6" d="M0 800 L160 800 L160 720" stroke="#5eead4" stroke-width="1" fill="none" opacity="0.4"/>
        <path class="t4" d="M320 800 L320 900" stroke="#14b8a6" stroke-width="1.2" fill="none" opacity="0.5"/>

        {/* Circuit traces — right side */}
        <path class="t2" d="M1440 240 L1280 240 L1280 160 L1120 160 L1120 320 L960 320" stroke="#14b8a6" stroke-width="1.5" fill="none" opacity="0.7"/>
        <path class="t1" d="M1440 480 L1360 480 L1360 560 L1200 560 L1200 480 L1040 480 L1040 400" stroke="#5eead4" stroke-width="1.5" fill="none" opacity="0.6"/>
        <path class="t4" d="M1440 720 L1280 720 L1280 640 L1120 640 L1120 560" stroke="#14b8a6" stroke-width="1.2" fill="none" opacity="0.5"/>
        <path class="t3" d="M1360 0 L1360 160 L1280 160" stroke="#14b8a6" stroke-width="1.2" fill="none" opacity="0.5"/>
        <path class="t6" d="M1200 0 L1200 80 L1120 80 L1120 160" stroke="#5eead4" stroke-width="1" fill="none" opacity="0.4"/>
        <path class="t8" d="M1040 0 L1040 240" stroke="#14b8a6" stroke-width="1.2" fill="none" opacity="0.5"/>
        <path class="t5" d="M1440 800 L1280 800 L1280 720" stroke="#5eead4" stroke-width="1" fill="none" opacity="0.4"/>
        <path class="t7" d="M1120 800 L1120 900" stroke="#14b8a6" stroke-width="1.2" fill="none" opacity="0.5"/>

        {/* Top and bottom traces */}
        <path class="t3" d="M480 0 L480 80 L640 80 L640 0" stroke="#14b8a6" stroke-width="1.2" fill="none" opacity="0.5"/>
        <path class="t6" d="M800 0 L800 80 L960 80 L960 0" stroke="#5eead4" stroke-width="1" fill="none" opacity="0.4"/>
        <path class="t5" d="M560 900 L560 800 L720 800 L720 900" stroke="#14b8a6" stroke-width="1.2" fill="none" opacity="0.5"/>
        <path class="t8" d="M880 900 L880 800 L1040 800 L1040 900" stroke="#5eead4" stroke-width="1" fill="none" opacity="0.4"/>

        {/* Component rectangles */}
        {[
          [152,72],[312,232],[392,472],[152,632],[308,712],
          [1112,152],[1192,472],[1272,632],[1112,72],[1352,232]
        ].map(([x,y]) =>
          `<rect x="${x}" y="${y}" width="16" height="16" rx="2" fill="none" stroke="#14b8a6" stroke-width="1" opacity="0.4"/>`
        ).join("")}

        {/* Junction dots — left */}
        <circle class="jd1" cx="160" cy="160" r="4" fill="#14b8a6"/>
        <circle class="jd2" cx="320" cy="80" r="3" fill="#5eead4"/>
        <circle class="jd3" cx="480" cy="240" r="4" fill="#14b8a6"/>
        <circle class="jd4" cx="80" cy="400" r="3" fill="#5eead4"/>
        <circle class="jd5" cx="240" cy="320" r="4" fill="#14b8a6"/>
        <circle class="jd6" cx="400" cy="480" r="3" fill="#5eead4"/>
        <circle class="jd7" cx="160" cy="640" r="4" fill="#14b8a6"/>
        <circle class="jd8" cx="320" cy="720" r="3" fill="#5eead4"/>
        <circle class="jd1" cx="480" cy="560" r="4" fill="#14b8a6"/>
        <circle class="jd2" cx="80" cy="160" r="3" fill="#5eead4"/>
        <circle class="jd3" cx="240" cy="80" r="4" fill="#14b8a6"/>
        <circle class="jd4" cx="400" cy="160" r="3" fill="#5eead4"/>
        <circle class="jd5" cx="160" cy="800" r="4" fill="#14b8a6"/>
        <circle class="jd6" cx="320" cy="800" r="3" fill="#5eead4"/>

        {/* Junction dots — right */}
        <circle class="jd1" cx="1280" cy="240" r="4" fill="#14b8a6"/>
        <circle class="jd2" cx="1120" cy="160" r="3" fill="#5eead4"/>
        <circle class="jd3" cx="960" cy="320" r="4" fill="#14b8a6"/>
        <circle class="jd4" cx="1360" cy="480" r="3" fill="#5eead4"/>
        <circle class="jd5" cx="1200" cy="560" r="4" fill="#14b8a6"/>
        <circle class="jd6" cx="1040" cy="480" r="3" fill="#5eead4"/>
        <circle class="jd7" cx="1280" cy="720" r="4" fill="#14b8a6"/>
        <circle class="jd8" cx="1120" cy="640" r="3" fill="#5eead4"/>
        <circle class="jd1" cx="1360" cy="160" r="4" fill="#14b8a6"/>
        <circle class="jd2" cx="1200" cy="80" r="3" fill="#5eead4"/>
        <circle class="jd3" cx="1040" cy="240" r="4" fill="#14b8a6"/>
        <circle class="jd4" cx="1280" cy="800" r="3" fill="#5eead4"/>
        <circle class="jd5" cx="1120" cy="800" r="4" fill="#14b8a6"/>

        {/* Scan line */}
        <rect class="scanline" x="0" y="0" width="1440" height="60" fill="#14b8a6"/>
      </svg>

      {/* Content over circuit */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Logo + tagline above card */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, background: "#14b8a6", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>CI</div>
            <span style={{ fontSize: 18, fontWeight: 500, color: "#f1f5f9" }}>Content Intake</span>
            <span style={{ fontSize: 10, background: "rgba(20,184,166,0.15)", color: "#14b8a6", border: "1px solid rgba(20,184,166,0.3)", borderRadius: 4, padding: "1px 7px", fontWeight: 500 }}>BETA</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "#f1f5f9", margin: "0 0 8px", lineHeight: 1.3 }}>Streamline your content workflow</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Internal portal for content submission and approval</p>
        </div>

        {/* Glassmorphism card */}
        <div style={{
          width: "100%",
          background: "rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: "2.5rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}>
          {screen === "login"    && <Login          onSwitch={setScreen} />}
          {screen === "register" && <Register        onSwitch={setScreen} />}
          {screen === "forgot"   && <ForgotPassword  onSwitch={setScreen} />}
          {screen === "reset"    && <ResetPassword   onDone={onPasswordReset} />}
        </div>

        {/* Stats below card */}
        <div style={{ display: "flex", gap: 36, marginTop: 28, justifyContent: "center" }}>
          {[["5", "Review stages"], ["10+", "Page sections"], ["Live", "Page preview"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: "#f1f5f9" }}>{n}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "#334155", fontSize: 11, marginTop: 20 }}>
          Content Intake Portal · Internal use only
        </p>
      </div>
    </div>
  );
}
