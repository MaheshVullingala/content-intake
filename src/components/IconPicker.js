"use client";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaSearch, FaCheck } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { loadIcons, searchIcons, libraryRef } from "@/lib/icons";

// Modal icon picker. Search matches icon title and related key benefit titles.
// When opened with a card title it shows "Suggested" matches first.
// Props: cardTitle, selectedId, onSelect(refObject), onRequestNew(), onClose()
export default function IconPicker({ cardTitle = "", selectedId = null, onSelect, onRequestNew, onClose }) {
  const [icons, setIcons] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => { let alive = true; loadIcons(supabase).then(l => alive && setIcons(l)); return () => { alive = false; }; }, []);

  const searching = query.trim().length > 0;
  const results   = useMemo(() => (icons && searching ? searchIcons(icons, query) : []), [icons, query, searching]);
  const suggested = useMemo(() => (icons && !searching && cardTitle.trim() ? searchIcons(icons, cardTitle) : []), [icons, cardTitle, searching]);
  const rest      = useMemo(() => (icons || []).filter(i => !suggested.some(s => s.id === i.id)), [icons, suggested]);

  const tile = (icon) => {
    const sel = icon.id === selectedId;
    return (
      <button key={icon.id} onClick={() => { onSelect(libraryRef(icon)); onClose(); }} title={icon.title}
        style={{ background: sel ? "#e6f7f8" : "#fff", border: `1.5px solid ${sel ? "#14b8a6" : "#E0E0E0"}`, borderRadius: 10, padding: "12px 8px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontFamily: "'Rubik',sans-serif", position: "relative" }}>
        {sel && <span style={{ position: "absolute", top: 6, right: 6, color: "#14b8a6", display: "flex" }}><FaCheck size={11} /></span>}
        <img src={icon.public_url} alt={icon.title} style={{ width: 48, height: 48, objectFit: "contain", background: "#fff" }} />
        <span style={{ fontSize: 11, color: "#3C3C3C", textAlign: "center", lineHeight: 1.3, wordBreak: "break-word" }}>{icon.title}</span>
      </button>
    );
  };
  const grid = (list) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))", gap: 10 }}>{list.map(tile)}</div>;
  const heading = (t) => <div style={{ fontSize: 11, fontWeight: 600, color: "#646464", textTransform: "uppercase", letterSpacing: "0.06em", margin: "4px 0 8px" }}>{t}</div>;

  const modal = (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 640, maxHeight: "85vh", display: "flex", flexDirection: "column", fontFamily: "'Rubik',sans-serif", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "1.1rem 1.25rem 0.8rem", borderBottom: "1px solid #F3F3F3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 500, color: "#181313" }}>Choose an icon</h3>
            <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "#646464", display: "flex" }}><FaTimes size={14} /></button>
          </div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 11, top: 11, color: "#B5B5B5", display: "flex" }}><FaSearch size={13} /></span>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by icon name or benefit title..." className="input" style={{ paddingLeft: 32 }} />
          </div>
        </div>

        <div style={{ padding: "1rem 1.25rem", overflowY: "auto", flex: 1 }}>
          {icons === null && <div style={{ fontSize: 13, color: "#646464" }}>Loading icons…</div>}
          {icons !== null && icons.length === 0 && <div style={{ fontSize: 13, color: "#646464" }}>The icon library is empty. Use “Request a new icon” below.</div>}
          {icons !== null && icons.length > 0 && searching && (results.length ? <>{heading(`${results.length} match${results.length > 1 ? "es" : ""}`)}{grid(results)}</> : <div style={{ fontSize: 13, color: "#646464" }}>No icons match “{query}”.</div>)}
          {icons !== null && icons.length > 0 && !searching && <>
            {suggested.length > 0 && <>{heading(`Suggested for “${cardTitle.trim()}”`)}{grid(suggested)}<div style={{ height: 16 }} /></>}
            {rest.length > 0 && <>{heading(suggested.length ? "All other icons" : "All icons")}{grid(rest)}</>}
          </>}
        </div>

        <div style={{ padding: "0.8rem 1.25rem", borderTop: "1px solid #F3F3F3", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#646464" }}>Can’t find what you need?</span>
          <button className="btn-ghost" onClick={() => { onClose(); onRequestNew(); }}>Request a new icon</button>
        </div>
      </div>
    </div>
  );
  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
