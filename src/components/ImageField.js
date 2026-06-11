"use client";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

/**
 * ImageField — 3-mode image input (Description / Link / Attachment)
 *
 * Props:
 *   value      : { type: "description"|"link"|"attachment", value: string, url: string } | null
 *   onChange   : (newValue) => void
 *   fieldKey   : string  — used as Supabase storage filename prefix e.g. "banner_bg-image"
 *   requestId  : string  — request id for storage path
 *   label      : string  — field label shown above toolbar
 *   required   : bool
 */
export default function ImageField({ value = null, onChange, fieldKey = "image", requestId = "draft", label = "Image", required = false }) {
  const [active, setActive]     = useState(value?.type || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState(null);
  const fileRef                 = useRef();

  const ACCEPTED = "image/jpeg,image/png,image/webp,image/svg+xml,image/gif";
  const MAX_MB   = 5;

  const isFilled = value && value.value;

  const toggle = (mode) => {
    if (active === mode) {
      setActive(null);
    } else {
      // switching modes — clear previous value with confirmation if filled
      if (isFilled && value.type !== mode) {
        if (!confirm("Switching will clear the current reference. Continue?")) return;
        onChange(null);
      }
      setActive(mode);
    }
  };

  const handleDescription = (text) => {
    onChange({ type: "description", value: text, url: null });
  };

  const handleLink = (url) => {
    onChange({ type: "link", value: url, url: url });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) { setError(`Max file size is ${MAX_MB}MB`); return; }
    setError(null);
    setUploading(true);
    try {
      const ext      = file.name.split(".").pop();
      const safeName = `${fieldKey}_${Date.now()}.${ext}`;
      const path     = `${requestId}/${safeName}`;
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("attachments").getPublicUrl(path);
      onChange({ type: "attachment", value: file.name, url: publicUrl, path });
    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const clear = () => { onChange(null); setActive(null); setError(null); };

  // Icon button style
  const iconBtn = (mode) => {
    const filled  = isFilled && value.type === mode;
    const isActive = active === mode;
    return {
      position: "relative",
      width: 34, height: 34,
      borderRadius: 8,
      border: `1.5px solid ${isActive ? "#1b5793" : filled ? "#3ec5cb" : "#E0E0E0"}`,
      background: isActive ? "#1b5793" : filled ? "#f0fafb" : "#fff",
      color: isActive ? "#fff" : filled ? "#3ec5cb" : "#999",
      cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16,
      transition: "all 0.15s",
      flexShrink: 0,
    };
  };

  const dot = {
    position: "absolute", top: -3, right: -3,
    width: 8, height: 8, borderRadius: "50%",
    background: "#3ec5cb", border: "1.5px solid #fff",
  };

  return (
    <div className="field-wrap" style={{ marginBottom: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <label className="field-label" style={{ margin: 0 }}>
          {label}{required && <span className="req"> *</span>}
        </label>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Description icon */}
          <button type="button" title="Add description / notes for Design QA" style={iconBtn("description")} onClick={() => toggle("description")}>
            📝
            {isFilled && value.type === "description" && <span style={dot} />}
          </button>
          {/* Link icon */}
          <button type="button" title="Paste an image URL" style={iconBtn("link")} onClick={() => toggle("link")}>
            🔗
            {isFilled && value.type === "link" && <span style={dot} />}
          </button>
          {/* Attachment icon */}
          <button type="button" title="Upload a reference image from your computer" style={iconBtn("attachment")} onClick={() => toggle("attachment")}>
            📎
            {isFilled && value.type === "attachment" && <span style={dot} />}
          </button>
          {/* Clear */}
          {isFilled && (
            <button type="button" title="Clear" onClick={clear}
              style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: 13, padding: "0 2px" }}>✕</button>
          )}
        </div>
      </div>

      {/* Filled preview (when panel closed) */}
      {isFilled && !active && (
        <div style={{ background: "#f0fafb", border: "1px solid #3ec5cb44", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#1b5793", display: "flex", alignItems: "center", gap: 8 }}>
          <span>{value.type === "description" ? "📝" : value.type === "link" ? "🔗" : "📎"}</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {value.type === "attachment" ? value.value : value.value}
          </span>
          {value.type === "link" && <a href={value.url} target="_blank" rel="noreferrer" style={{ color: "#1b5793", fontSize: 11 }}>Open ↗</a>}
          {value.type === "attachment" && value.url && <a href={value.url} target="_blank" rel="noreferrer" style={{ color: "#1b5793", fontSize: 11 }}>View ↗</a>}
        </div>
      )}

      {/* Description panel */}
      {active === "description" && (
        <div style={{ marginTop: 4 }}>
          <textarea
            value={value?.type === "description" ? value.value : ""}
            onChange={e => handleDescription(e.target.value)}
            placeholder='e.g. "Engineer working on a PCB board in a lab setting, bright lighting, blue tones"'
            className="textarea"
            style={{ minHeight: 70 }}
            autoFocus
          />
          <div className="field-hint">Describe the image you need — Design QA will source or create it</div>
        </div>
      )}

      {/* Link panel */}
      {active === "link" && (
        <div style={{ marginTop: 4 }}>
          <input
            type="url"
            value={value?.type === "link" ? value.value : ""}
            onChange={e => handleLink(e.target.value)}
            placeholder="https://example.com/reference-image.jpg"
            className="input"
            autoFocus
          />
          <div className="field-hint">Paste a URL to an existing reference image</div>
        </div>
      )}

      {/* Attachment panel */}
      {active === "attachment" && (
        <div style={{ marginTop: 4 }}>
          {value?.type === "attachment" && value.value ? (
            <div style={{ background: "#f0fafb", border: "1px solid #3ec5cb44", borderRadius: 7, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🖼️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#181313" }}>{value.value}</div>
                {value.url && <a href={value.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#1b5793" }}>View uploaded file ↗</a>}
              </div>
              <button type="button" onClick={() => { onChange(null); fileRef.current?.click(); }}
                style={{ fontSize: 11, background: "none", border: "1px solid #E0E0E0", borderRadius: 5, padding: "3px 8px", cursor: "pointer", color: "#646464" }}>Replace</button>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              style={{ border: "2px dashed #E0E0E0", borderRadius: 8, padding: "1.5rem", textAlign: "center", cursor: uploading ? "wait" : "pointer", background: "#fafafa", transition: "all 0.15s" }}
              onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = "#1b5793"; e.currentTarget.style.background = "#f5f9ff"; }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.background = "#fafafa"; }}
            >
              {uploading ? (
                <div style={{ fontSize: 13, color: "#1b5793" }}>Uploading…</div>
              ) : (
                <>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
                  <div style={{ fontSize: 12, color: "#646464" }}>Click to upload a reference image</div>
                  <div style={{ fontSize: 11, color: "#B5B5B5", marginTop: 4 }}>JPG, PNG, WebP, SVG · Max {MAX_MB}MB</div>
                </>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept={ACCEPTED} style={{ display: "none" }} onChange={handleFile} />
          {error && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 4 }}>⚠️ {error}</div>}
        </div>
      )}
    </div>
  );
}
