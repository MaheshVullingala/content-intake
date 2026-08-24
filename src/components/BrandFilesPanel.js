"use client";
import { useState, useEffect } from "react";

function isImageFile(name = "") {
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(
    (name.split(".").pop() || "").toLowerCase()
  );
}

function formatBytes(b) {
  if (!b) return "";
  return b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB";
}

// Thumbnail that falls back to a plain file icon if the image fails to load —
// the download link next to it always works regardless.
function Thumb({ file }) {
  const [errored, setErrored] = useState(false);
  if (isImageFile(file.file_name) && !errored) {
    return (
      <img
        src={file.public_url} alt={file.file_name}
        onError={() => setErrored(true)}
        style={{
          width: 36, height: 36, objectFit: "cover", borderRadius: 4,
          border: "1px solid var(--color-border)", flexShrink: 0,
        }}
      />
    );
  }
  return <span style={{ fontSize: 20, flexShrink: 0 }}>📎</span>;
}

// Read-only reference list of files brand_team uploaded for this request.
// Visible to design_team, web_team and stakeholder — never editable here.
export default function BrandFilesPanel({ requestId, supabase }) {
  const [files,   setFiles]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("task_attachments")
      .select("*, tasks!task_id(team_role)")
      .eq("request_id", requestId)
      .then(({ data }) => {
        if (cancelled) return;
        // Filter by the task's team_role, not the uploader's current
        // users.role — an admin/super_admin can upload on brand team's
        // behalf (or while impersonating brand_team for testing), which
        // leaves uploaded_by pointing at their own account. task_id always
        // points at the brand_team task itself (see TaskPanel.js myTask,
        // resolved via tasks.team_role), so that's the reliable signal.
        setFiles((data || []).filter(f => f.tasks?.team_role === "brand_team"));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || files.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="text-xs text-uppercase text-muted" style={{ marginBottom: 8, fontWeight: 600 }}>
        🎨 Brand Team Files <span style={{ fontWeight: 400, textTransform: "none" }}>(reference only)</span>
      </div>
      <div className="flex-col gap-6">
        {files.map(f => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Thumb file={f} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 500, color: "var(--color-night)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {f.file_name}
              </div>
              <div style={{ fontSize: 10, color: "var(--color-silver)" }}>
                {formatBytes(f.file_size)}
              </div>
            </div>
            <a
              href={f.public_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: "var(--color-primary)", textDecoration: "none", flexShrink: 0 }}
            >
              ↓ Download
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
