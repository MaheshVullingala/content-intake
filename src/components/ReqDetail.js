"use client";
import { useState, useRef } from "react";
import { useApp } from "@/lib/store";
import { getStatus, ROLE_META, canAct, nextActionLabel } from "@/lib/constants";
import BannerPreview from "@/components/BannerPreview";

const FLOW = ["draft","editorial_qa","design_qa","pending_approval","web_team","published"];

const inp = {
  width: "100%", background: "#F9F9F9", border: "1px solid #E0E0E0",
  borderRadius: 7, padding: "0.6rem 0.85rem", fontSize: 13,
  color: "#181313", outline: "none", fontFamily: "'Rubik', sans-serif",
  boxSizing: "border-box", transition: "border-color 0.15s",
};

function formatBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

export default function ReqDetail({ reqId, go }) {
  const { requests, currentUser, advanceStatus, returnRequest, addComment, updateBanner, addAttachment, removeAttachment } = useApp();
  const req = requests.find(r => r.id === reqId);

  const [comment,  setComment]  = useState("");
  const [tab,      setTab]      = useState("preview");
  const [editData, setEditData] = useState(null);   // null = not editing
  const [uploading, setUploading] = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const fileRef = useRef();

  if (!req) return <div style={{ padding: "2rem", color: "#B5B5B5", fontFamily: "'Rubik', sans-serif" }}>Request not found.</div>;

  const status     = getStatus(req.status);
  const actionable = canAct(currentUser.role, req.status);
  const isEditorialQA = currentUser.role === "editorial_qa" && req.status === "editorial_qa";
  const isDesignQA    = currentUser.role === "design_qa"    && req.status === "design_qa";
  const stageIdx   = FLOW.indexOf(req.status);

  // Start editing — clone current banner data into editData
  const startEdit = () => setEditData({ ...req.banner });
  const cancelEdit = () => setEditData(null);
  const updEdit = (k, v) => setEditData(p => ({ ...p, [k]: v }));

  const saveEdit = () => {
    updateBanner(req.id, editData);
    setEditData(null);
  };

  const liveBanner = editData || req.banner;

  const doAdvance = () => {
    if (editData) { updateBanner(req.id, editData); setEditData(null); }
    advanceStatus(req.id, comment);
    setComment("");
  };
  const doReturn  = () => { returnRequest(req.id, comment); setComment(""); };
  const doComment = () => { if (comment.trim()) { addComment(req.id, comment); setComment(""); } };

  // File upload handler
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await addAttachment(req.id, file);
    }
    setUploading(false);
  };

  const isImage = (att) => att.type.startsWith("image/");

  return (
    <div className="fade-in" style={{ maxWidth: 1040, margin: "0 auto", fontFamily: "'Rubik', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => go("dashboard")} style={{ background: "none", border: "none", color: "#B5B5B5", cursor: "pointer", fontSize: 14, fontFamily: "'Rubik', sans-serif" }}>← Back</button>
          <div style={{ width: 1, height: 20, background: "#E0E0E0" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
              <h1 style={{ fontSize: 19, fontWeight: 500, color: "#181313", margin: 0 }}>{req.banner?.pageTitle || "Untitled Request"}</h1>
              <span style={{ background: status.bg, color: status.color, border: `1px solid ${status.color}55`, borderRadius: 20, padding: "2px 11px", fontSize: 11, fontWeight: 500 }}>{status.label}</span>
            </div>
            <div style={{ color: "#B5B5B5", fontSize: 11, fontFamily: "monospace" }}>{req.id} · {req.pageType} · Created {req.createdAt}</div>
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {FLOW.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              <div title={s.replace(/_/g," ")} style={{ width: 9, height: 9, borderRadius: "50%", background: i <= stageIdx ? "#181313" : "#E0E0E0", boxShadow: i === stageIdx ? "0 0 0 3px #3C3C3C33" : "none" }} />
              {i < FLOW.length - 1 && <div style={{ width: 18, height: 2, background: i < stageIdx ? "#3C3C3C" : "#E0E0E0" }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 310px", gap: 20 }}>
        {/* ── Left column ── */}
        <div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, background: "#fff", border: "1px solid #E0E0E0", borderRadius: 9, padding: 4, width: "fit-content", marginBottom: 14 }}>
            {["preview", isEditorialQA || isDesignQA ? "edit" : null, isDesignQA ? "attachments" : null].filter(Boolean).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? "#181313" : "transparent",
                color: tab === t ? "#fff" : "#B5B5B5",
                border: "none", borderRadius: 6, padding: "0.38rem 1rem",
                cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 500 : 400,
                fontFamily: "'Rubik', sans-serif", transition: "all 0.15s",
              }}>
                {t === "edit" ? "✎ Edit Content" : t === "attachments" ? `📎 Attachments ${req.attachments?.length ? `(${req.attachments.length})` : ""}` : "👁 Preview"}
              </button>
            ))}
          </div>

          {/* Preview tab */}
          {tab === "preview" && <BannerPreview banner={liveBanner} pageType={req.pageType} />}

          {/* Edit tab — Editorial QA full overwrite */}
          {tab === "edit" && isEditorialQA && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #F3F3F3" }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "#181313" }}>Edit Banner Content</h3>
                  <p style={{ fontSize: 11, color: "#B5B5B5", margin: "3px 0 0" }}>As Editorial QA you can overwrite any field</p>
                </div>
                {!editData
                  ? <button onClick={startEdit} style={{ background: "#181313", color: "#fff", border: "none", borderRadius: 7, padding: "0.45rem 1rem", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik', sans-serif" }}>✎ Start Editing</button>
                  : <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={cancelEdit} style={{ background: "#F3F3F3", color: "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.45rem 0.9rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik', sans-serif" }}>Cancel</button>
                      <button onClick={saveEdit} style={{ background: "#2a7a4b", color: "#fff", border: "none", borderRadius: 7, padding: "0.45rem 1rem", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik', sans-serif" }}>✓ Save Changes</button>
                    </div>
                }
              </div>

              {[
                ["pageTitle","Page Title"],
                ["subTitle","Sub Title"],
                ["cta1Label","CTA 1 — Label"],
                ["cta1Link","CTA 1 — Link"],
                ["cta2Label","CTA 2 — Label"],
                ["cta2Link","CTA 2 — Link"],
                ["bannerImage","Banner Image URL"],
              ].map(([k, label]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: "#646464", fontWeight: 500, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <input
                      value={editData ? editData[k] ?? "" : req.banner[k] ?? ""}
                      onChange={e => editData && updEdit(k, e.target.value)}
                      readOnly={!editData}
                      style={{
                        ...inp,
                        background: editData ? "#fff" : "#F9F9F9",
                        borderColor: editData ? "#3C3C3C" : "#E0E0E0",
                        cursor: editData ? "text" : "default",
                        paddingRight: editData && (editData[k] !== req.banner[k]) ? "60px" : inp.padding,
                      }}
                    />
                    {editData && editData[k] !== req.banner[k] && (
                      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#f59e0b", fontWeight: 500 }}>modified</span>
                    )}
                  </div>
                  {editData && editData[k] !== req.banner[k] && (
                    <div style={{ fontSize: 11, color: "#B5B5B5", marginTop: 3 }}>
                      Original: <span style={{ textDecoration: "line-through" }}>{req.banner[k] || "—"}</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Live preview while editing */}
              {editData && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#B5B5B5", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Live Preview</div>
                  <BannerPreview banner={editData} pageType={req.pageType} />
                </div>
              )}
            </div>
          )}

          {/* Edit tab — Design QA (image URL only) */}
          {tab === "edit" && isDesignQA && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", padding: "1.5rem" }}>
              <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #F3F3F3" }}>
                <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "#181313" }}>Update Banner Image</h3>
                <p style={{ fontSize: 11, color: "#B5B5B5", margin: "3px 0 0" }}>Design QA can update the banner image URL</p>
              </div>
              <label style={{ fontSize: 11, color: "#646464", fontWeight: 500, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Banner Image URL</label>
              <input
                value={editData ? editData.bannerImage ?? "" : req.banner.bannerImage ?? ""}
                onChange={e => { if (!editData) startEdit(); updEdit("bannerImage", e.target.value); }}
                placeholder="https://..."
                style={{ ...inp, borderColor: "#3C3C3C", background: "#fff" }}
                onFocus={() => { if (!editData) startEdit(); }}
              />
              {editData && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={cancelEdit} style={{ background: "#F3F3F3", color: "#646464", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.45rem 0.9rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik', sans-serif" }}>Cancel</button>
                  <button onClick={saveEdit} style={{ background: "#2a7a4b", color: "#fff", border: "none", borderRadius: 7, padding: "0.45rem 1rem", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik', sans-serif" }}>✓ Save Image URL</button>
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#B5B5B5", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Preview</div>
                <BannerPreview banner={liveBanner} pageType={req.pageType} />
              </div>
            </div>
          )}

          {/* Attachments tab — Design QA */}
          {tab === "attachments" && isDesignQA && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", padding: "1.5rem" }}>
              <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #F3F3F3" }}>
                <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Design Assets</h3>
                <p style={{ fontSize: 11, color: "#B5B5B5", margin: "3px 0 0" }}>Upload images and design files for this request</p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "#3C3C3C" : "#E0E0E0"}`,
                  borderRadius: 10,
                  padding: "2.5rem 1.5rem",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "#F9F9F9" : "#FAFAFA",
                  transition: "all 0.15s",
                  marginBottom: 20,
                }}>
                <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.ai,.psd,.sketch,.fig,.svg" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
                <div style={{ fontSize: 32, marginBottom: 10 }}>📎</div>
                {uploading
                  ? <div style={{ color: "#646464", fontSize: 14 }}>Uploading...</div>
                  : <>
                    <div style={{ color: "#3C3C3C", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Drop files here or click to upload</div>
                    <div style={{ color: "#B5B5B5", fontSize: 12 }}>Images, PDFs, AI, PSD, Sketch, Figma, SVG</div>
                  </>
                }
              </div>

              {/* Attachment list */}
              {(!req.attachments || req.attachments.length === 0) ? (
                <div style={{ textAlign: "center", color: "#B5B5B5", fontSize: 13, padding: "1rem 0" }}>No attachments yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {req.attachments.map(att => (
                    <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 9, padding: "0.75rem 1rem" }}>
                      {/* Thumbnail or icon */}
                      <div style={{ width: 44, height: 44, borderRadius: 7, overflow: "hidden", background: "#E0E0E0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isImage(att)
                          ? <img src={att.url} alt={att.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 20 }}>📄</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#181313", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{att.name}</div>
                        <div style={{ fontSize: 11, color: "#B5B5B5", marginTop: 2 }}>{formatBytes(att.size)} · {att.uploadedBy} · {att.uploadedAt}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        {isImage(att) && (
                          <a href={att.url} download={att.name} style={{ background: "#F3F3F3", color: "#3C3C3C", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.35rem 0.75rem", fontSize: 11, textDecoration: "none", fontFamily: "'Rubik', sans-serif", fontWeight: 500 }}>↓ Download</a>
                        )}
                        <button onClick={() => removeAttachment(req.id, att.id)} style={{ background: "transparent", color: "#B5B5B5", border: "1px solid #E0E0E0", borderRadius: 6, padding: "0.35rem 0.65rem", fontSize: 11, cursor: "pointer", fontFamily: "'Rubik', sans-serif" }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attachments view-only for other roles */}
          {tab === "preview" && req.attachments?.length > 0 && !isDesignQA && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", padding: "1.2rem 1.5rem", marginTop: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 500, color: "#181313", marginBottom: 12 }}>Design Assets ({req.attachments.length})</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {req.attachments.map(att => (
                  <div key={att.id} style={{ width: 80, textAlign: "center" }}>
                    <div style={{ width: 80, height: 60, borderRadius: 7, overflow: "hidden", background: "#F3F3F3", border: "1px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                      {att.type.startsWith("image/")
                        ? <img src={att.url} alt={att.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 24 }}>📄</span>
                      }
                    </div>
                    <div style={{ fontSize: 10, color: "#646464", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content fields summary */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", padding: "1.2rem 1.5rem", marginTop: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 500, color: "#181313", marginBottom: 12 }}>Content Fields</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Page Type",req.pageType],["Title",req.banner?.pageTitle],["Sub Title",req.banner?.subTitle],["CTA 1",`${req.banner?.cta1Label||"—"} → ${req.banner?.cta1Link||"—"}`],["CTA 2",`${req.banner?.cta2Label||"—"} → ${req.banner?.cta2Link||"—"}`],["Banner Image",req.banner?.bannerImage||"Pending Design QA"]].map(([k,v])=>(
                <div key={k} style={{ background: "#F9F9F9", borderRadius: 8, padding: "0.6rem 0.85rem", border: "1px solid #F3F3F3" }}>
                  <div style={{ fontSize: 10, color: "#B5B5B5", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, color: "#181313" }}>{v||"—"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div>
          {actionable && (
            <div style={{ background: "#fff", border: "1px solid #E0E0E0", borderRadius: 12, padding: "1.2rem", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>{ROLE_META[currentUser.role]?.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#181313", textTransform: "uppercase", letterSpacing: "0.07em" }}>Your Review</span>
              </div>
              {editData && (
                <div style={{ background: "#fffbeb", border: "1px solid #f59e0b44", borderRadius: 8, padding: "0.6rem 0.8rem", fontSize: 12, color: "#92400e", marginBottom: 10 }}>
                  ⚠️ You have unsaved edits. Save them before approving.
                </div>
              )}
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment (optional)..."
                style={{ ...inp, minHeight: 85, resize: "vertical", display: "block" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                <button onClick={doAdvance} disabled={!!editData} style={{
                  background: editData ? "#B5B5B5" : "#181313", color: "#fff", border: "none", borderRadius: 8,
                  padding: "0.65rem", fontSize: 13, fontWeight: 500,
                  cursor: editData ? "not-allowed" : "pointer", fontFamily: "'Rubik', sans-serif",
                }}>✓ {nextActionLabel(currentUser.role)}</button>
                <button onClick={doReturn} style={{ background: "#fff", color: "#646464", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.65rem", fontSize: 13, cursor: "pointer", fontFamily: "'Rubik', sans-serif" }}>
                  ↩ Return for Revision
                </button>
              </div>
            </div>
          )}

          {!actionable && (
            <div style={{ background: "#fff", border: "1px solid #E0E0E0", borderRadius: 12, padding: "1.2rem", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#181313", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Add Comment</div>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Ask a question or leave a note..."
                style={{ ...inp, minHeight: 75, resize: "vertical", display: "block" }} />
              <button onClick={doComment} style={{ marginTop: 8, width: "100%", background: "#F3F3F3", color: "#3C3C3C", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.52rem", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik', sans-serif" }}>Post Comment</button>
            </div>
          )}

          {/* Comments */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E0E0E0", padding: "1.2rem" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#181313", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
              Comments ({req.comments.length})
            </div>
            {req.comments.length === 0
              ? <div style={{ color: "#B5B5B5", fontSize: 13, textAlign: "center", padding: "1rem 0" }}>No comments yet.</div>
              : req.comments.map(c => {
                const m = ROLE_META[c.role] || ROLE_META.stakeholder;
                const ret = c.text.startsWith("[Returned]");
                return (
                  <div key={c.id} style={{ display: "flex", gap: 9, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F3F3F3", border: "1px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{m.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "#3C3C3C" }}>{c.author} <span style={{ color: "#B5B5B5", fontWeight: 400 }}>· {c.date}</span></div>
                      <div style={{ fontSize: 13, color: ret ? "#c0392b" : "#3C3C3C", background: "#F9F9F9", border: "1px solid #F3F3F3", borderRadius: 8, padding: "0.5rem 0.75rem", marginTop: 4, lineHeight: 1.5 }}>{c.text}</div>
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
