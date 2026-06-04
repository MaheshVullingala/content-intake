"use client";

const PCB_TRACES = [
  ["#2c90b2", "M170 153 L170 90",                     0,    170, 84 ],
  ["#3ec5cb", "M163 153 L163 130 L140 130 L140 100",  .18,  140, 92 ],
  ["#2c90b2", "M157 153 L157 138 L116 138 L116 108",  .36,  116, 100],
  ["#3ec5cb", "M177 153 L177 130 L200 130 L200 100",  .54,  200, 92 ],
  ["#2c90b2", "M183 153 L183 138 L224 138 L224 108",  .72,  224, 100],
  ["#3ec5cb", "M170 187 L170 250",                    .2,   170, 256],
  ["#2c90b2", "M163 187 L163 210 L138 210 L138 242",  .38,  138, 250],
  ["#3ec5cb", "M157 187 L157 218 L112 218 L112 244",  .56,  112, 252],
  ["#2c90b2", "M177 187 L177 210 L202 210 L202 242",  .74,  202, 250],
  ["#3ec5cb", "M183 187 L183 218 L228 218 L228 244",  .92,  228, 252],
  ["#2c90b2", "M153 170 L90 170",                     .1,   84,  170],
  ["#3ec5cb", "M153 163 L128 163 L128 138 L96 138",   .28,  88,  138],
  ["#2c90b2", "M153 157 L120 157 L120 126 L92 126",   .46,  84,  126],
  ["#3ec5cb", "M153 177 L128 177 L128 202 L96 202",   .64,  88,  202],
  ["#2c90b2", "M153 183 L120 183 L120 214 L92 214",   .82,  84,  214],
  ["#3ec5cb", "M153 170 L106 170 L106 146 L70 146",   1,    62,  146],
  ["#2c90b2", "M153 177 L106 177 L106 194 L70 194",   1.18, 62,  194],
  ["#3ec5cb", "M187 170 L250 170",                    .15,  256, 170],
  ["#2c90b2", "M187 163 L212 163 L212 138 L244 138",  .33,  252, 138],
  ["#3ec5cb", "M187 157 L220 157 L220 126 L248 126",  .51,  256, 126],
  ["#2c90b2", "M187 177 L212 177 L212 202 L244 202",  .69,  252, 202],
  ["#3ec5cb", "M187 183 L220 183 L220 214 L248 214",  .87,  256, 214],
  ["#2c90b2", "M187 163 L234 163 L234 142 L270 142",  1.05, 278, 142],
  ["#3ec5cb", "M187 177 L234 177 L234 198 L270 198",  1.23, 278, 198],
];

const MINI_TRACES = [
  ["#2c90b2", "M170 153 L170 100", 0,    170, 94 ],
  ["#3ec5cb", "M170 187 L170 240", .2,   170, 246],
  ["#2c90b2", "M153 170 L100 170", .1,   94,  170],
  ["#3ec5cb", "M187 170 L240 170", .15,  246, 170],
];

const css = `
  @keyframes pcb-flow { 0% { stroke-dashoffset: 300 } 100% { stroke-dashoffset: 0 } }
  @keyframes pcb-pad  { 0%, 100% { opacity: .2 } 50% { opacity: 1 } }
  @keyframes pcb-chip { 0%, 100% { opacity: .5; stroke: #2c90b2 } 50% { opacity: 1; stroke: #3ec5cb } }
  @keyframes pcb-bar  { 0% { width: 0% } 60% { width: 80% } 100% { width: 100% } }
  @keyframes pcb-txt  { 0%, 100% { opacity: .35 } 50% { opacity: .9 } }
`;

// ── Full-size loader (used for full-page loading states) ───────────────────
export function PCBLoader({ label = "LOADING..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 360, background: "#ffffff", borderRadius: 12, gap: 24, padding: "2rem" }}>
      <style>{css}</style>
      <svg width="300" height="300" viewBox="0 0 340 340">
        <rect width="340" height="340" fill="#ffffff" />
        {/* Central chip */}
        <rect x="153" y="153" width="34" height="34" fill="#f5f5f5" stroke="#2c90b2" strokeWidth="2.5" rx="2"
          style={{ animation: "pcb-chip 2s ease-in-out infinite" }} />
        <line x1="170" y1="157" x2="170" y2="183" stroke="#2c90b2" strokeWidth="1" opacity=".4" />
        <line x1="157" y1="170" x2="183" y2="170" stroke="#2c90b2" strokeWidth="1" opacity=".4" />
        {/* Traces + pads */}
        {PCB_TRACES.map(([color, d, delay, cx, cy], i) => (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="300"
              style={{ animation: `pcb-flow 2s ${delay}s linear infinite` }}
            />
            <circle cx={cx} cy={cy} r="9"   fill="#ffffff" stroke={color} strokeWidth="2.5"
              style={{ animation: `pcb-pad 2s ${delay}s ease-in-out infinite` }} />
            <circle cx={cx} cy={cy} r="4.5" fill={color}
              style={{ animation: `pcb-pad 2s ${delay}s ease-in-out infinite` }} />
          </g>
        ))}
      </svg>
      {/* Progress bar */}
      <div style={{ width: 200, height: 3, background: "#E0E0E0", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", background: "#2c90b2", borderRadius: 2, animation: "pcb-bar 2.4s ease-in-out infinite" }} />
      </div>
      {/* Label */}
      <div style={{ fontSize: 11, color: "#646464", letterSpacing: ".12em", fontFamily: "monospace", animation: "pcb-txt 2s ease-in-out infinite" }}>
        {label}
      </div>
    </div>
  );
}

// ── Mini loader (used for inline states like uploading) ────────────────────
export function PCBLoaderMini({ label = "UPLOADING..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "1.5rem 0" }}>
      <style>{css}</style>
      <svg width="70" height="70" viewBox="80 80 180 180">
        <rect x="80" y="80" width="180" height="180" fill="none" />
        <rect x="153" y="153" width="34" height="34" fill="#f5f5f5" stroke="#2c90b2" strokeWidth="2.5" rx="2"
          style={{ animation: "pcb-chip 2s ease-in-out infinite" }} />
        {MINI_TRACES.map(([color, d, delay, cx, cy], i) => (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="300"
              style={{ animation: `pcb-flow 2s ${delay}s linear infinite` }}
            />
            <circle cx={cx} cy={cy} r="7"   fill="#ffffff" stroke={color} strokeWidth="2"
              style={{ animation: `pcb-pad 2s ${delay}s ease-in-out infinite` }} />
            <circle cx={cx} cy={cy} r="3.5" fill={color}
              style={{ animation: `pcb-pad 2s ${delay}s ease-in-out infinite` }} />
          </g>
        ))}
      </svg>
      <div style={{ fontSize: 11, color: "#646464", letterSpacing: ".1em", fontFamily: "monospace", animation: "pcb-txt 2s ease-in-out infinite" }}>
        {label}
      </div>
    </div>
  );
}
