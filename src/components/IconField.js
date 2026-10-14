"use client";
import { useState } from "react";
import { FaTimes, FaThLarge } from "react-icons/fa";
import ImageField from "@/components/ImageField";
import IconPicker from "@/components/IconPicker";

// Key Benefits card icon: pick from the library, or request a new icon
// (description / reference link / attachment, via the existing ImageField).
// Value (card.image_ref): {type:"library", value:title, url, icon_id} for a
// library pick; otherwise the usual ImageField shapes, which flag Design QA.
export default function IconField({ value = null, onChange, cardTitle = "", fieldKey, requestId }) {
  const [picking, setPicking] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const isLibrary = value?.type === "library";
  const isRequest = !!value && !isLibrary && !!value.value;
  const showRequest = requesting || isRequest;

  return (
    <div className="field-wrap">
      <label className="field-label">Card Icon</label>

      {isLibrary ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #E0E0E0", borderRadius: 10, padding: "8px 12px", background: "#fff" }}>
          <img src={value.url} alt={value.value} style={{ width: 40, height: 40, objectFit: "contain" }} />
          <div style={{ flex: 1, fontSize: 13, color: "#181313" }}>{value.value}<div style={{ fontSize: 11, color: "#646464" }}>From icon library</div></div>
          <button className="btn-ghost" onClick={() => setPicking(true)}>Change</button>
          <button onClick={() => onChange(null)} title="Remove icon" aria-label="Remove icon" style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", display: "flex" }}><FaTimes size={13} /></button>
        </div>
      ) : (
        !showRequest && (
          <button className="btn-ghost" onClick={() => setPicking(true)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FaThLarge size={12} /> Choose from icon library
          </button>
        )
      )}

      {!isLibrary && (
        <div style={{ marginTop: showRequest ? 0 : 8 }}>
          {showRequest ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "#646464" }}>New icon request — describe it or give a reference. Design QA will source it.</span>
                <button className="btn-ghost" onClick={() => { onChange(null); setRequesting(false); }}>Cancel request</button>
              </div>
              <ImageField label="" value={value} onChange={onChange} fieldKey={fieldKey} requestId={requestId} />
              <button className="btn-ghost" onClick={() => setPicking(true)} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}><FaThLarge size={12} /> Choose from icon library instead</button>
            </>
          ) : (
            <button onClick={() => setRequesting(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, color: "#1b5793", textDecoration: "underline", fontFamily: "'Rubik',sans-serif" }}>
              Can’t find it? Request a new icon
            </button>
          )}
        </div>
      )}

      {picking && (
        <IconPicker cardTitle={cardTitle} selectedId={isLibrary ? value.icon_id : null}
          onSelect={(ref) => { onChange(ref); setRequesting(false); }}
          onRequestNew={() => { if (isLibrary) onChange(null); setRequesting(true); }}
          onClose={() => setPicking(false)} />
      )}
    </div>
  );
}
