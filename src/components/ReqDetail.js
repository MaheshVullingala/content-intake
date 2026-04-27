"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getStatus, ROLE_META, canAct, nextActionLabel, FLOW } from "@/lib/constants";
import PagePreview from "@/components/PagePreview";

function formatBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

const BANNER_FIELDS = [
  ["page_title",   "Page Title"],
  ["sub_title",    "Sub Title"],
  ["cta1_label",   "CTA 1 Label"],
  ["cta1_link",    "CTA 1 Link"],
  ["cta2_label",   "CTA 2 Label"],
  ["cta2_link",    "CTA 2 Link"],
  ["banner_image", "Banner Image URL"],
];

const OVERVIEW_FIELDS = [
  ["overview_label",       "Label",            false, false],
  ["overview_impact",      "Impact Statement", true,  false],
  ["overview_description", "Description",      true,  true],
  ["overview_media_url",   "Media URL",        false, false],
  ["overview_media_note",  "Media Note",       false, true],
];

export default function ReqDetail({ reqId, go, user }) {
  const [req,          setReq]         = useState(null);
  const [comments,     setComments]    = useState([]);
  const [attachments,  setAttachments] = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [comment,      setComment]     = useState("");
  const [tab,          setTab]         = useState("preview");
  const [editSection,  setEditSection] = useState("banner");
  const [editData,     setEditData]    = useState(null);
  const [uploading,    setUploading]   = useState(false);
  const [dragOver,     setDragOver]    = useState(false);
  const [saving,       setSaving]      = useState(false);
  const [error,        setError]       = useState("");
  const [showPreview,  setShowPreview] = useState(false);
  const fileRef = useRef();

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: r }, { data: c }, { data: a }] = await Promise.all([
      supabase.from("requests").select("*, users(name,role,department)").eq("id", reqId).single(),
      supabase.from("comments").select("*").eq("request_id", reqId).order("created_at"),
      supabase.from("attachments").select("*").eq("request_id", reqId).order("created_at"),
    ]);
    setReq(r); setComments(c || []); setAttachments(a || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [reqId]);

  if (loading) return <div style={{ padding: "3rem", textAlign: "center", color: "#B5B5B5", fontFamily: "'Rubik',sans-serif" }}>Loading...</div>;
  if (!req)    return <div style={{ padding: "2rem", color: "#B5B5B5", fontFamily: "'Rubik',sans-serif" }}>Request not found.</div>;

  const status        = getStatus(req.status);
  const actionable    = canAct(user.role, req.status);
  const isEditorialQA = user.role === "editorial_qa" && req.status === "editorial_qa";
  const isDesignQA    = user.role === "design_qa"    && req.status === "design_qa";
  const stageIdx      = FLOW.indexOf(req.status);
  const hasOverview   = req.overview_impact || req.overview_description;

  const startEdit = () => setEditData({
    page_title: req.page_title, sub_title: req.sub_title,
    cta1_label: req.cta1_label, cta1_link: req.cta1_link,
    cta2_label: req.cta2_label, cta2_link: req.cta2_link,
    banner_image: req.banner_image,
    overview_label: req.overview_label, overview_impact: req.overview_impact,
    overview_description: req.overview_description, overview_media_url: req.overview_media_url,
    overview_media_type: req.overview_media_type, overview_media_note: req.overview_media_note,
  });
  const cancelEdit = () => setEditData(null);
  const updEdit    = (k, v) => setEditData(p => ({ ...p, [k]: v }));

  const saveEdit = async () => {
    setSaving(true);
    await supabase.from("requests").update({ ...editData, updated_at: new Date().toISOString() }).eq("id", req.id);
    setEditData(null);
    await fetchAll();
    setSaving(false);
  };

  const liveData = editData ? { ...req, ...editData } : req;

  const doAdvance = async () => {
    setSaving(true); setError("");
    try {
      if (editData) await saveEdit();
      const next = FLOW[Math.min(stageIdx + 1, FLOW.length - 1)];
      await supabase.from("requests").update({ status: next, updated_at: new Date().toISOString() }).eq("id", req.id);
      if (comment.trim()) await supabase.from("comments").insert({ request_id: req.id, user_id: user.id, user_name: user.name, user_role: user.role, text: comment, is_return: false });
      await supabase.from("status_history").insert({ request_id: req.id, user_id: user.id, user_name: user.name, from_status: req.status, to_status: next });
      setComment(""); await fetchAll();
    } catch { setError("Action failed. Please try again."); }
    setSaving(false);
  };

  const doReturn = async () => {
    setSaving(true); setError("");
    try {
      const prev = FLOW[Math.max(stageIdx - 1, 0)];
      await supabase.from("requests").update({ status: prev, updated_at: new Date().toISOString() }).eq("id", req.id);
      if (comment.trim()) await supabase.from("comments").insert({ request_id: req.id, user_id: user.id, user_name: user.name, user_role: user.role, text: `[Returned] ${comment}`, is_return: true });
      await supabase.from("status_history").insert({ request_id: req.id, user_id: user.id, user_name: user.name, from_status: req.status, to_status: prev });
      setComment(""); await fetchAll();
    } catch { setError("Action failed."); }
    setSaving(false);
  };

  const doComment = async () => {
    if (!comment.trim()) return;
    await supabase.from("comments").insert({ request_id: req.id, user_id: user.id, user_name: user.name, user_role: user.role, text: comment, is_return: false });
    setComment(""); await fetchAll();
  };

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const path = `${req.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, file);
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from("attachments").getPublicUrl(path);
        await supabase.from("attachments").insert({ request_id: req.id, user_id: user.id, user_name: user.name, file_name: file.name, file_type: file.type, file_size: file.size, storage_path: path, public_url: publicUrl });
      }
    }
    await fetchAll(); setUploading(false);
  };

  const removeAttachment = async (att) => {
    await supabase.storage.from("attachments").remove([att.storage_path]);
    await supabase.from("attachments").delete().eq("id", att.id);
    await fetchAll();
  };

  const EditField = ({ k, label, required, multiline }) => {
    const original = req[k] ?? "";
    const current  = editData ? editData[k] ?? "" : original;
    const modified = editData && current !== original;
    return (
      <div className="field-wrap">
        <label className="field-label">{label}{required && <span className="req"> *</span>}</label>
        <div className="relative">
          {multiline
            ? <textarea value={current} onChange={e => editData && updEdit(k, e.target.value)} readOnly={!editData}
                className={`textarea${editData ? " editing" : " readonly"}`} />
            : <input    value={current} onChange={e => editData && updEdit(k, e.target.value)} readOnly={!editData}
                className={`input${editData ? " editing" : " readonly"}`} />
          }
          {modified && <span className="field-modified">modified</span>}
        </div>
        {modified && <div className="field-original">Was: <span>{original || "—"}</span></div>}
      </div>
    );
  };

  return (
    <div className="fade-in" style={{ maxWidth: "100%", margin: "0 auto", fontFamily: "'Rubik', sans-serif" }}>

      {/* ── Preview Modal ── */}
      {showPreview && (
        <div onClick={() => setShowPreview(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 999, padding: "2rem 1rem", overflowY: "auto" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 900, borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", marginBottom: "2rem" }}>
            {/* Modal header */}
            <div style={{ background: "#181313", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "#F3F3F3", fontWeight: 500, fontSize: 14, fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                <span>👁</span> Page Preview — {req.page_title}
              </div>
              <button onClick={() => setShowPreview(false)} style={{ background: "transparent", border: "1px solid #3C3C3C", color: "#B5B5B5", borderRadius: 6, padding: "0.3rem 0.8rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                ✕ Close
              </button>
            </div>

            {/* Banner */}
            <div style={{ minHeight: 220, display: "flex", alignItems: "center", padding: "2.5rem 3rem", position: "relative", overflow: "hidden", background: req.banner_image ? `linear-gradient(to right,rgba(24,19,19,0.92) 38%,rgba(24,19,19,0.5)),url('${req.banner_image}') center/cover` : "linear-gradient(135deg,#181313,#3C3C3C)" }}>
              <div style={{ position: "relative", zIndex: 2, maxWidth: 560 }}>
                <span style={{ background: "#F3F3F3", color: "#181313", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 4, display: "inline-block", marginBottom: 12 }}>{req.page_type}</span>
                <h1 style={{ color: "#F3F3F3", fontWeight: 500, fontSize: 28, marginBottom: 10, lineHeight: 1.25, wordBreak: "break-word" }}>{req.page_title}</h1>
                <p  style={{ color: "#B5B5B5", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>{req.sub_title}</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {req.cta1_label && <div style={{ background: "#F3F3F3", color: "#181313", borderRadius: 5, padding: "8px 18px", fontSize: 13, fontWeight: 500 }}>↗ {req.cta1_label}</div>}
                  {req.cta2_label && <div style={{ border: "1px solid #B5B5B5", color: "#F3F3F3", borderRadius: 5, padding: "8px 18px", fontSize: 13, fontWeight: 500 }}>▷ {req.cta2_label}</div>}
                </div>
              </div>
            </div>

            {/* Overview */}
            {hasOverview && (
              <div style={{ padding: "3rem 3.5rem", borderTop: "1px solid #F3F3F3", background: "#fff", width: "100%", boxSizing: "border-box", overflow: "hidden" }}>
                {req.overview_label && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#646464", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>{req.overview_label}</div>
                )}
                {req.overview_impact && (
                  <h2 style={{ fontSize: 28, fontWeight: 400, color: "#181313", lineHeight: 1.3, marginBottom: 20, wordBreak: "break-word", overflowWrap: "break-word" }}>{req.overview_impact}</h2>
                )}
                {req.overview_description && (
                  <p style={{ fontSize: 15, color: "#3C3C3C", lineHeight: 1.75, textAlign: "justify", wordBreak: "break-word", overflowWrap: "break-word", maxWidth: "100%", display: "block" }}>{req.overview_description}</p>
                )}
                {req.overview_media_url && (
                  <div style={{ marginTop: 32, textAlign: "center" }}>
                    <img src={req.overview_media_url} alt="Overview" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #E0E0E0" }} onError={e => { e.target.style.display = "none"; }} />
                    {req.overview_media_note && <div style={{ fontSize: 12, color: "#B5B5B5", marginTop: 12, fontStyle: "italic" }}>{req.overview_media_note}</div>}
                  </div>
                )}
              </div>
            )}

            {/* Modal footer */}
            <div style={{ background: "#F9F9F9", borderTop: "1px solid #E0E0E0", padding: "0.8rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#B5B5B5", fontFamily: "'Rubik',sans-serif" }}>Click outside to close</span>
              <button onClick={() => setShowPreview(false)} className="btn-ghost" style={{ fontSize: 12, padding: "0.35rem 0.9rem" }}>✕ Close Preview</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => go("dashboard")} className="btn-ghost">← Back</button>
          <div style={{ width: 1, height: 20, background: "#E0E0E0" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
              <h1 style={{ fontSize: 19, margin: 0 }}>{req.page_title || "Untitled Request"}</h1>
              <span className="badge" style={{ background: status.bg, color: status.color, borderColor: `${status.color}55` }}>{status.label}</span>
            </div>
            <div style={{ color: "#B5B5B5", fontSize: 11, fontFamily: "monospace" }}>
              {req.id.slice(0, 8)}... · {req.page_type} · {req.users?.name} · {new Date(req.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="progress-dots">
          {FLOW.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              <div title={s.replace(/_/g, " ")} className={`progress-dot${i < stageIdx ? " done" : i === stageIdx ? " current" : ""}`} />
              {i < FLOW.length - 1 && <div className={`progress-line${i < stageIdx ? " done" : ""}`} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        {/* Left */}
        <div>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <div className="tab-bar">
              {["preview", isEditorialQA || isDesignQA ? "edit" : null, isDesignQA ? "attachments" : null].filter(Boolean).map(t => (
                <button key={t} onClick={() => setTab(t)} className={`tab-btn${tab === t ? " active" : ""}`}>
                  {t === "edit" ? "✎ Edit" : t === "attachments" ? `📎 Assets${attachments.length ? ` (${attachments.length})` : ""}` : "👁 Overview"}
                </button>
              ))}
            </div>
            {tab === "edit" && isEditorialQA && (
              <div className="tab-bar">
                {[["banner", "🖼️ Banner"], hasOverview ? ["overview", "📋 Overview"] : null].filter(Boolean).map(([k, label]) => (
                  <button key={k} onClick={() => setEditSection(k)} className={`tab-btn${editSection === k ? " active" : ""}`}>{label}</button>
                ))}
              </div>
            )}
          </div>

          {/* ── Preview Tab ── */}
          {tab === "preview" && (
            <>
              {/* Preview button */}
              <button onClick={() => setShowPreview(true)} style={{ display: "flex", alignItems: "center", gap: 10, background: "#181313", color: "#fff", border: "none", borderRadius: 10, padding: "0.8rem 1.6rem", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif", marginBottom: 16, transition: "opacity 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                👁 Preview Full Page
              </button>

              {/* Content summary */}
              <div className="card">
                <h3 style={{ fontSize: 13, marginBottom: 12 }}>Content Summary</h3>
                <p className="section-group-header" style={{ marginTop: 0 }}>🖼️ Banner</p>
                <div className="summary-grid">
                  {[["Title", req.page_title], ["Sub Title", req.sub_title], ["CTA 1", `${req.cta1_label||"—"} → ${req.cta1_link||"—"}`], ["CTA 2", `${req.cta2_label||"—"} → ${req.cta2_link||"—"}`], ["Banner Image", req.banner_image || "Pending Design QA"]].map(([k, v]) => (
                    <div key={k} className="summary-cell"><div className="key">{k}</div><div className="val">{v || "—"}</div></div>
                  ))}
                </div>
                {hasOverview && (
                  <>
                    <p className="section-group-header">📋 Overview</p>
                    <div className="summary-grid">
                      {[["Label", req.overview_label], ["Impact", req.overview_impact], ["Description", req.overview_description], ["Media URL", req.overview_media_url || "Pending Design QA"], ["Media Note", req.overview_media_note]].map(([k, v]) => (
                        <div key={k} className="summary-cell"><div className="key">{k}</div><div className="val">{v || "—"}</div></div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="card" style={{ marginTop: 14 }}>
                  <h3 style={{ fontSize: 13, marginBottom: 12 }}>Design Assets ({attachments.length})</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {attachments.map(att => (
                      <a key={att.id} href={att.public_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                        <div style={{ width: 80, textAlign: "center" }}>
                          <div style={{ width: 80, height: 60, borderRadius: 7, overflow: "hidden", background: "#F3F3F3", border: "1px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                            {att.file_type?.startsWith("image/") ? <img src={att.public_url} alt={att.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>📄</span>}
                          </div>
                          <div style={{ fontSize: 10, color: "#646464", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.file_name}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Edit — Editorial QA ── */}
          {tab === "edit" && isEditorialQA && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>{editSection === "banner" ? "🖼️ Edit Banner" : "📋 Edit Overview"}</h3>
                  <p>As Editorial QA you can overwrite any field</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!editData
                    ? <button onClick={startEdit} className="btn-primary" style={{ padding: "0.45rem 1rem", fontSize: 12 }}>✎ Start Editing</button>
                    : <>
                        <button onClick={cancelEdit} className="btn-ghost">Cancel</button>
                        <button onClick={saveEdit} disabled={saving} className="btn-success">{saving ? "Saving..." : "✓ Save"}</button>
                      </>
                  }
                </div>
              </div>
              {editSection === "banner" && BANNER_FIELDS.map(([k, label]) => (
                <EditField key={k} k={k} label={label} required={false} multiline={false} />
              ))}
              {editSection === "overview" && OVERVIEW_FIELDS.map(([k, label, required, multiline]) => (
                <EditField key={k} k={k} label={label} required={required} multiline={multiline} />
              ))}
              {editData && (
                <div style={{ marginTop: 16 }}>
                  <p className="text-xs text-uppercase text-muted mb-8">Live Preview</p>
                  <PagePreview req={liveData} pageType={req.page_type} />
                </div>
              )}
            </div>
          )}

          {/* ── Edit — Design QA ── */}
          {tab === "edit" && isDesignQA && (
            <div className="card">
              <div className="card-header">
                <div><h3>Update Media URLs</h3><p>Design QA can update image and media URLs</p></div>
                {editData && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={cancelEdit} className="btn-ghost">Cancel</button>
                    <button onClick={saveEdit} disabled={saving} className="btn-success">{saving ? "Saving..." : "✓ Save"}</button>
                  </div>
                )}
              </div>
              {[["banner_image", "Banner Image URL"], ["overview_media_url", "Overview Media URL"]].map(([k, label]) => (
                <div key={k} className="field-wrap">
                  <label className="field-label">{label}</label>
                  <input value={editData ? editData[k] ?? "" : req[k] ?? ""}
                    onChange={e => { if (!editData) startEdit(); updEdit(k, e.target.value); }}
                    onFocus={() => { if (!editData) startEdit(); }}
                    placeholder="https://..." className="input editing" />
                </div>
              ))}
              <div style={{ marginTop: 14 }}>
                <p className="text-xs text-uppercase text-muted mb-8">Preview</p>
                <PagePreview req={liveData} pageType={req.page_type} />
              </div>
            </div>
          )}

          {/* ── Attachments — Design QA ── */}
          {tab === "attachments" && isDesignQA && (
            <div className="card">
              <div className="card-header">
                <div><h3>Design Assets</h3><p>Upload images and design files</p></div>
              </div>
              <div className={`drop-zone${dragOver ? " active" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.svg" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
                <div className="icon">📎</div>
                {uploading
                  ? <div className="title">Uploading...</div>
                  : <><div className="title">Drop files here or click to upload</div><div className="sub">Images, PDFs, SVGs</div></>
                }
              </div>
              {attachments.length === 0
                ? <div style={{ textAlign: "center", color: "#B5B5B5", fontSize: 13 }}>No attachments yet.</div>
                : attachments.map(att => (
                  <div key={att.id} className="attachment-item">
                    <div className="attachment-thumb">
                      {att.file_type?.startsWith("image/") ? <img src={att.public_url} alt={att.file_name} /> : <span style={{ fontSize: 20 }}>📄</span>}
                    </div>
                    <div className="attachment-info">
                      <div className="attachment-name">{att.file_name}</div>
                      <div className="attachment-meta">{formatBytes(att.file_size)} · {att.user_name} · {new Date(att.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="attachment-actions">
                      <a href={att.public_url} target="_blank" rel="noreferrer" style={{ background: "#F3F3F3", color: "#3C3C3C", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.35rem 0.75rem", fontSize: 11, textDecoration: "none", fontFamily: "'Rubik',sans-serif" }}>↗ View</a>
                      <button onClick={() => removeAttachment(att)} style={{ background: "transparent", color: "#B5B5B5", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.35rem 0.65rem", fontSize: 11, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>✕</button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {actionable && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>{ROLE_META[user.role]?.icon}</span>
                <span className="text-xs text-uppercase font-medium">Your Review</span>
              </div>
              {editData && <div className="alert alert-warning">⚠️ Save your edits before approving.</div>}
              {error     && <div className="alert alert-error">{error}</div>}
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment (optional)..." className="textarea" style={{ minHeight: 85 }} />
              <div className="flex-col gap-8 mt-8">
                <button onClick={doAdvance} disabled={saving || !!editData} className="btn-primary btn-full" style={{ opacity: saving || editData ? 0.5 : 1, justifyContent: "center" }}>
                  {saving ? "Processing..." : nextActionLabel(user.role, req.status)}
                </button>
                <button onClick={doReturn} disabled={saving} className="btn-danger">↩ Return for Revision</button>
              </div>
            </div>
          )}

          {!actionable && (
            <div className="card" style={{ marginBottom: 14 }}>
              <p className="text-xs text-uppercase font-medium mb-12">Add Comment</p>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Ask a question or leave a note..." className="textarea" style={{ minHeight: 75 }} />
              <button onClick={doComment} className="btn-secondary btn-full" style={{ marginTop: 8 }}>Post Comment</button>
            </div>
          )}

          <div className="card">
            <p className="text-xs text-uppercase font-medium mb-12">Comments ({comments.length})</p>
            {comments.length === 0
              ? <div style={{ color: "#B5B5B5", fontSize: 13, textAlign: "center", padding: "1rem 0" }}>No comments yet.</div>
              : comments.map(c => {
                const m = ROLE_META[c.user_role] || ROLE_META.stakeholder;
                return (
                  <div key={c.id} className="comment-item">
                    <div className="comment-avatar">{m.icon}</div>
                    <div className="comment-body">
                      <div className="comment-meta">{c.user_name} <span>· {new Date(c.created_at).toLocaleDateString()}</span></div>
                      <div className={`comment-text${c.is_return ? " returned" : ""}`}>{c.text}</div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}
