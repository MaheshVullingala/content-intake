"use client";
import { validateFile } from "@/lib/security";
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
export default function ImageField({ value = null, onChange, fieldKey = "image", requestId = "draft", label = "Image", required = false, hideDescription = false }) {
  const [active, setActive]     = useState(value?.type || null);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setProgress] = useState(0);
  const [error, setError]             = useState(null);
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
    setProgress(0);
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path          = `requests/${Date.now()}_${sanitizedName}`;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const uploadUrl   = `${supabaseUrl}/storage/v1/object/attachments/${path}`;

      // Storage RLS requires the caller's own session token, not the anon
      // key — the anon key alone is treated as unauthenticated and gets
      // rejected with "new row violates row-level security policy".
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || supabaseKey;

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
        xhr.setRequestHeader("apikey", supabaseKey);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.setRequestHeader("x-upsert", "true");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.statusText}`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/attachments/${path}`;
      onChange({ type: "attachment", value: file.name, url: publicUrl, path });
    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const clear = () => { onChange(null); setActive(null); setError(null); };

  // Icon button style
  const iconBtn = (mode) => {
    const filled   = isFilled && value.type === mode;
    const isActive = active === mode;
    return {
      position: "relative",
      width: 36, height: 36,
      borderRadius: 8,
      border: `1.5px solid ${isActive ? "#1b5793" : filled ? "#3ec5cb" : "#c8d4e0"}`,
      background: isActive ? "#1b5793" : filled ? "#e8f8f9" : "#f0f4f8",
      color: isActive ? "#fff" : filled ? "#3ec5cb" : "#3C3C3C",
      cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 17,
      transition: "all 0.15s",
      flexShrink: 0,
      boxShadow: isActive ? "0 2px 8px rgba(27,87,147,0.2)" : "none",
    };
  };

  const dot = {
    position: "absolute", top: -3, right: -3,
    width: 8, height: 8, borderRadius: "50%",
    background: "#3ec5cb", border: "1.5px solid #fff",
  };

  return (
    <div className="field-wrap" style={{ marginBottom: 0 }}>
      {/* Label row */}
      {label && (
        <label className="field-label" style={{ display: "block", marginBottom: 4 }}>
          {label}{required && <span className="req"> *</span>}
        </label>
      )}
      {/* Helper note */}
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, lineHeight: 1.5 }}>
        Choose how to provide this image for Design QA:
      </div>
      {/* Icon toolbar — below the note */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <button type="button" title="Upload a reference image from your computer" style={iconBtn("attachment")} onClick={() => toggle("attachment")}>
          📎
          {isFilled && value.type === "attachment" && <span style={dot} />}
        </button>
        <span style={{ fontSize: 11, color: "#64748b", marginRight: 4 }}>Upload</span>
        <button type="button" title="Paste an image URL" style={iconBtn("link")} onClick={() => toggle("link")}>
          🔗
          {isFilled && value.type === "link" && <span style={dot} />}
        </button>
        <span style={{ fontSize: 11, color: "#64748b", marginRight: 4 }}>Paste URL</span>
        {!hideDescription && (
          <>
            <button type="button" title="Add description / notes for Design QA" style={iconBtn("description")} onClick={() => toggle("description")}>
              📝
              {isFilled && value.type === "description" && <span style={dot} />}
            </button>
            <span style={{ fontSize: 11, color: "#64748b", marginRight: 4 }}>Describe</span>
          </>
        )}
        {isFilled && (
          <button type="button" title="Clear" onClick={clear}
            style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: 13, padding: "0 4px", marginLeft: 4 }}>✕ Clear</button>
        )}
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
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#1b5793", marginBottom: 8 }}>Uploading… {uploadProgress}%</div>
                  <div style={{ background: "#E0E0E0", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ background: "#1b5793", height: "100%", width: `${uploadProgress}%`, transition: "width 0.2s ease", borderRadius: 4 }} />
                  </div>
                </div>
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
