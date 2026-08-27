"use client";
import { useState } from "react";
import JSZip from "jszip";
import BrandFilesPanel from "@/components/BrandFilesPanel";

const FIELD = { fontFamily: "'Rubik', sans-serif" };

function formatBytes(b) {
  if (!b) return "";
  if (b < 1024)    return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

function fileIcon(name = "") {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["png","jpg","jpeg","gif","webp","svg"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📄";
  if (["psd","ai"].includes(ext)) return "🎨";
  if (["zip","rar","7z"].includes(ext)) return "📦";
  return "📎";
}

function isImage(name = "") {
  return ["png","jpg","jpeg","gif","webp","svg"].includes(
    (name.split(".").pop() || "").toLowerCase()
  );
}

function parseJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

const CHECKS = [
  { label: "Banner",           ok: r => !!r.page_title },
  { label: "Overview",         ok: r => !!r.overview_impact },
  { label: "Key Benefits",     ok: r => parseJson(r.kb_cards).length > 0 || !!r.kb_impact },
  { label: "Features",         ok: r => !!r.fa_impact },
  { label: "Applications",     ok: r => !!r.app_impact },
  { label: "Customer Stories", ok: r => parseJson(r.cs_items).length > 0 || !!r.cs_impact },
  { label: "Promo Section",    ok: r => !!r.promo_title },
  { label: "Related Content",  ok: r => parseJson(r.rc_cards).length > 0 || !!r.rc_impact },
  { label: "Related Products", ok: r => parseJson(r.rp_cards).length > 0 || !!r.rp_impact },
  { label: "SEO Meta",         ok: r => !!r.seo_meta_title },
];

// ── Copy button ─────────────────────────────────────────────────────────────
function CopyBtn({ label, value, copied, onCopy }) {
  return (
    <button
      onClick={() => onCopy(label, value)}
      title="Copy to clipboard"
      style={{
        background: "none", border: "none",
        cursor: "pointer", padding: "2px 6px", borderRadius: 4,
        fontSize: 12, color: copied ? "#2a7a4b" : "#94a3b8",
        flexShrink: 0, transition: "color 0.15s",
        ...FIELD,
      }}
    >
      {copied ? "Copied!" : "📋"}
    </button>
  );
}

// ── Field row ───────────────────────────────────────────────────────────────
function FieldRow({ label, value, copiedKey, onCopy }) {
  if (!value) return null;
  const key = label;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      padding: "7px 0", borderBottom: "1px solid var(--color-border)",
    }}>
      <div style={{
        width: 140, flexShrink: 0, fontSize: 11,
        color: "var(--color-silver)", ...FIELD, paddingTop: 1,
      }}>
        {label}
      </div>
      <div style={{
        flex: 1, fontSize: 13, color: "var(--color-night)",
        ...FIELD, lineHeight: 1.5, wordBreak: "break-word",
      }}>
        {value}
      </div>
      <CopyBtn label={key} value={value} copied={copiedKey === key} onCopy={onCopy} />
    </div>
  );
}

// ── Section heading ──────────────────────────────────────────────────────────
function SectionHead({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.08em", color: "var(--color-silver)",
      padding: "14px 0 6px", ...FIELD,
    }}>
      {children}
    </div>
  );
}

export default function WebTeamView({ req, user, supabase, attachments = [], onRefresh }) {
  const [copiedKey,  setCopiedKey]  = useState(null);
  const [zipping,    setZipping]    = useState(false);
  const [publishing,     setPublishing]     = useState(false);
  const [pubError,       setPubError]       = useState("");
  // Shown once, right after this session's own publish click — distinct
  // from isPublished below, which persists across visits regardless of
  // who published or when.
  const [publishSuccess, setPublishSuccess] = useState(false);

  const isPublished = req.overall_status === "published";

  const copy = (key, value) => {
    navigator.clipboard.writeText(String(value)).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  // ── Content completeness ────────────────────────────────────────────────
  const checks   = CHECKS.map(c => ({ ...c, pass: c.ok(req) }));
  const passCount = checks.filter(c => c.pass).length;
  const missing   = checks.filter(c => !c.pass).map(c => c.label);

  // ── Download all as ZIP ─────────────────────────────────────────────────
  const downloadAll = async () => {
    if (zipping || !attachments.length) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      await Promise.all(
        attachments.map(async (a) => {
          const url = a.public_url || a.file_url;
          if (!url) return;
          const res  = await fetch(url);
          const blob = await res.blob();
          zip.file(a.file_name || `file-${a.id}`, blob);
        })
      );
      const content = await zip.generateAsync({ type: "blob" });
      const link    = document.createElement("a");
      link.href     = URL.createObjectURL(content);
      link.download = `${req.page_title || "assets"}-assets.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally { setZipping(false); }
  };

  // ── Mark as Published ───────────────────────────────────────────────────
  const handlePublish = async () => {
    if (publishing || isPublished) return;
    setPublishing(true);
    setPubError("");
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("requests")
        .update({ overall_status: "published", published_at: now })
        .eq("id", req.id);
      if (error) { setPubError(error.message); return; }
      // Also mark web_team task completed
      const { data: wt } = await supabase.from("tasks")
        .select("id").eq("request_id", req.id).eq("team_role", "web_team").single();
      if (wt) {
        await supabase.from("tasks")
          .update({ status: "completed", completed_at: now })
          .eq("id", wt.id);
      }

      // Notify stakeholder + admins — fire and forget, never let a
      // notification failure block the publish flow.
      try {
        const notifications = [];
        if (req.created_by) {
          notifications.push({
            user_id:    req.created_by,
            type:       "published",
            title:      "Your page has been published!",
            message:    `"${req.page_title}" has been published to AEM by the Web Team.`,
            request_id: req.id,
            action_url: `/requests/${req.id}`,
          });
        }
        const { data: admins } = await supabase.from("users").select("id").in("role", ["admin", "super_admin"]);
        (admins || []).forEach(a => notifications.push({
          user_id:    a.id,
          type:       "published",
          title:      "Page published",
          message:    `"${req.page_title}" has been published.`,
          request_id: req.id,
          action_url: `/requests/${req.id}`,
        }));
        if (notifications.length) {
          supabase.from("notifications").insert(notifications).then(() => {}).catch(() => {});
        }
      } catch { /* notification failure must not block publish */ }

      setPublishSuccess(true);
      onRefresh?.();
    } catch (e) { setPubError(e.message || "Error."); }
    finally     { setPublishing(false); }
  };

  // ── Parse JSONB arrays ──────────────────────────────────────────────────
  const kbCards = parseJson(req.kb_cards);
  const faItems = parseJson(req.fa_items);
  const appItems = parseJson(req.app_items);
  const csItems = parseJson(req.cs_items);
  const rcCards = parseJson(req.rc_cards);
  const rpCards = parseJson(req.rp_cards);

  return (
    <div style={{ padding: "0 0 2rem" }}>

      {/* ── Content completeness ─────────────────────────────────────── */}
      <div className="card mb-16" style={{ padding: "14px 16px" }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 8,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600,
                         color: "var(--color-night)", ...FIELD }}>
            Content Completeness
          </span>
          <span style={{
            fontSize: 12, fontWeight: 700, ...FIELD,
            color: passCount === 9 ? "var(--color-success)" : "var(--color-primary)",
          }}>
            {passCount}/9 sections
          </span>
        </div>
        {/* Mini progress bar */}
        <div style={{ height: 5, background: "var(--color-smoke)",
                      borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
          <div style={{
            height: "100%",
            width: `${Math.round((passCount / 9) * 100)}%`,
            background: passCount === 9 ? "var(--color-success)" : "var(--color-primary)",
            borderRadius: 4, transition: "width 0.4s",
          }} />
        </div>
        {missing.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {missing.map(m => (
              <span key={m} style={{
                fontSize: 10, ...FIELD,
                background: "#fef2f2", color: "#c0392b",
                border: "1px solid #c0392b33",
                borderRadius: 10, padding: "2px 8px",
              }}>
                {m}
              </span>
            ))}
          </div>
        )}
        {missing.length === 0 && (
          <p className="text-xs text-muted" style={{ margin: 0 }}>
            All sections complete ✓
          </p>
        )}
        <p className="field-hint" style={{ marginTop: 8, marginBottom: 0 }}>
          Not a blocker — proceed regardless of completeness.
        </p>
      </div>

      {/* ── Banner ───────────────────────────────────────────────────── */}
      <SectionHead>📄 Banner</SectionHead>
      <div className="card" style={{ padding: "0 14px", marginBottom: 12 }}>
        <FieldRow label="Page Title"   value={req.page_title}   copiedKey={copiedKey} onCopy={copy} />
        <FieldRow label="Sub Title"    value={req.sub_title}    copiedKey={copiedKey} onCopy={copy} />
        <FieldRow label="CTA 1 Label"  value={req.cta1_label}   copiedKey={copiedKey} onCopy={copy} />
        <FieldRow label="CTA 1 Link"   value={req.cta1_link}    copiedKey={copiedKey} onCopy={copy} />
        <FieldRow label="CTA 2 Label"  value={req.cta2_label}   copiedKey={copiedKey} onCopy={copy} />
        <FieldRow label="CTA 2 Link"   value={req.cta2_link}    copiedKey={copiedKey} onCopy={copy} />
      </div>

      {/* ── Overview ─────────────────────────────────────────────────── */}
      {(req.overview_impact || req.overview_description) && (<>
        <SectionHead>📋 Overview</SectionHead>
        <div className="card" style={{ padding: "0 14px", marginBottom: 12 }}>
          <FieldRow label="Impact"      value={req.overview_impact}      copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Description" value={req.overview_description} copiedKey={copiedKey} onCopy={copy} />
        </div>
      </>)}

      {/* ── Key Benefits ─────────────────────────────────────────────── */}
      {(req.kb_impact || kbCards.length > 0) && (<>
        <SectionHead>⭐ Key Benefits</SectionHead>
        <div className="card" style={{ padding: "0 14px", marginBottom: 12 }}>
          <FieldRow label="Impact"      value={req.kb_impact}      copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Description" value={req.kb_description} copiedKey={copiedKey} onCopy={copy} />
          {kbCards.map((c, i) => (
            <div key={i}>
              <FieldRow label={`Card ${i+1} Title`} value={c.title}       copiedKey={copiedKey} onCopy={copy} />
              <FieldRow label={`Card ${i+1} Desc`}  value={c.description} copiedKey={copiedKey} onCopy={copy} />
            </div>
          ))}
        </div>
      </>)}

      {/* ── Features ─────────────────────────────────────────────────── */}
      {(req.fa_impact || faItems.length > 0) && (<>
        <SectionHead>🔧 Features</SectionHead>
        <div className="card" style={{ padding: "0 14px", marginBottom: 12 }}>
          <FieldRow label="Impact"      value={req.fa_impact}      copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Description" value={req.fa_description} copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="View Type"   value={req.fa_view_type}   copiedKey={copiedKey} onCopy={copy} />
          {faItems.map((c, i) => (
            <div key={i}>
              <FieldRow label={`Item ${i+1} Title`} value={c.title}       copiedKey={copiedKey} onCopy={copy} />
              <FieldRow label={`Item ${i+1} Desc`}  value={c.description} copiedKey={copiedKey} onCopy={copy} />
            </div>
          ))}
        </div>
      </>)}

      {/* ── Applications ─────────────────────────────────────────────── */}
      {(req.app_impact || appItems.length > 0) && (<>
        <SectionHead>🧩 Applications</SectionHead>
        <div className="card" style={{ padding: "0 14px", marginBottom: 12 }}>
          <FieldRow label="Impact"      value={req.app_impact}      copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Description" value={req.app_description} copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="View Type"   value={req.app_view_type}   copiedKey={copiedKey} onCopy={copy} />
          {appItems.map((c, i) => (
            <div key={i}>
              <FieldRow label={`Tab ${i+1} Title`} value={c.title}       copiedKey={copiedKey} onCopy={copy} />
              <FieldRow label={`Tab ${i+1} Desc`}  value={c.description} copiedKey={copiedKey} onCopy={copy} />
            </div>
          ))}
        </div>
      </>)}

      {/* ── Customer Stories ─────────────────────────────────────────── */}
      {(req.cs_impact || csItems.length > 0) && (<>
        <SectionHead>💬 Customer Stories</SectionHead>
        <div className="card" style={{ padding: "0 14px", marginBottom: 12 }}>
          <FieldRow label="Impact" value={req.cs_impact} copiedKey={copiedKey} onCopy={copy} />
          {csItems.map((c, i) => (
            <div key={i}>
              <FieldRow label={`Story ${i+1} Quote`}    value={c.quote}    copiedKey={copiedKey} onCopy={copy} />
              <FieldRow label={`Story ${i+1} Customer`} value={c.customer} copiedKey={copiedKey} onCopy={copy} />
            </div>
          ))}
        </div>
      </>)}

      {/* ── Promo ────────────────────────────────────────────────────── */}
      {req.promo_title && (<>
        <SectionHead>📣 Promo Section</SectionHead>
        <div className="card" style={{ padding: "0 14px", marginBottom: 12 }}>
          <FieldRow label="Title"       value={req.promo_title}       copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Description" value={req.promo_description} copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Button Label" value={req.promo_btn_label}  copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Button Link"  value={req.promo_btn_link}   copiedKey={copiedKey} onCopy={copy} />
        </div>
      </>)}

      {/* ── Related Content ───────────────────────────────────────────── */}
      {(req.rc_impact || rcCards.length > 0) && (<>
        <SectionHead>📄 Related Content</SectionHead>
        <div className="card" style={{ padding: "0 14px", marginBottom: 12 }}>
          <FieldRow label="Impact" value={req.rc_impact} copiedKey={copiedKey} onCopy={copy} />
          {rcCards.map((c, i) => (
            <div key={i}>
              <FieldRow label={`Card ${i+1} Title`} value={c.title}       copiedKey={copiedKey} onCopy={copy} />
              <FieldRow label={`Card ${i+1} Desc`}  value={c.description} copiedKey={copiedKey} onCopy={copy} />
              <FieldRow label={`Card ${i+1} Link`}  value={c.link}        copiedKey={copiedKey} onCopy={copy} />
            </div>
          ))}
        </div>
      </>)}

      {/* ── Related Products ─────────────────────────────────────────── */}
      {(req.rp_impact || rpCards.length > 0) && (<>
        <SectionHead>📦 Related Products</SectionHead>
        <div className="card" style={{ padding: "0 14px", marginBottom: 12 }}>
          <FieldRow label="Impact"      value={req.rp_impact}      copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Description" value={req.rp_description} copiedKey={copiedKey} onCopy={copy} />
          {rpCards.map((c, i) => (
            <div key={i}>
              <FieldRow label={`Product ${i+1} Title`} value={c.title}       copiedKey={copiedKey} onCopy={copy} />
              <FieldRow label={`Product ${i+1} Desc`}  value={c.description} copiedKey={copiedKey} onCopy={copy} />
            </div>
          ))}
        </div>
      </>)}

      {/* ── Training & Support ───────────────────────────────────────── */}
      {req.ts_impact && (<>
        <SectionHead>🎓 Training & Support</SectionHead>
        <div className="card" style={{ padding: "0 14px", marginBottom: 12 }}>
          <FieldRow label="Impact"        value={req.ts_impact}             copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Card 1 Title"  value={req.ts_card1_title}        copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Card 1 Desc"   value={req.ts_card1_description}  copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Card 1 CTA"    value={req.ts_card1_cta_label}    copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Card 2 Title"  value={req.ts_card2_title}        copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Card 2 Desc"   value={req.ts_card2_description}  copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Card 3 Title"  value={req.ts_card3_title}        copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Card 3 Desc"   value={req.ts_card3_description}  copiedKey={copiedKey} onCopy={copy} />
        </div>
      </>)}

      {/* ── SEO ──────────────────────────────────────────────────────── */}
      {(req.seo_meta_title || req.seo_meta_description || req.seo_meta_keywords) && (<>
        <SectionHead>🔍 SEO Meta</SectionHead>
        <div className="card" style={{ padding: "0 14px", marginBottom: 12 }}>
          <FieldRow label="Page URL"    value={req.seo_page_location}   copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Meta Title"  value={req.seo_meta_title}       copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Meta Desc"   value={req.seo_meta_description} copiedKey={copiedKey} onCopy={copy} />
          <FieldRow label="Keywords"    value={req.seo_meta_keywords}    copiedKey={copiedKey} onCopy={copy} />
        </div>
      </>)}

      {/* ── Brand Team Files (reference only) ───────────────────────────── */}
      <BrandFilesPanel requestId={req.id} supabase={supabase} />

      {/* ── Attachments ───────────────────────────────────────────────── */}
      <SectionHead>📁 Team Attachments</SectionHead>
      {attachments.length === 0 ? (
        <div className="alert alert-info mb-12">No files have been uploaded yet.</div>
      ) : (
        <div className="card mb-12" style={{ padding: "10px 14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {attachments.map(a => {
              const url = a.public_url || a.file_url;
              return (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "6px 0", borderBottom: "1px solid var(--color-border)",
                }}>
                  {isImage(a.file_name) && url ? (
                    <img
                      src={url} alt={a.file_name}
                      style={{
                        width: 40, height: 40, objectFit: "cover",
                        borderRadius: 4, flexShrink: 0,
                        border: "1px solid var(--color-border)",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 22, flexShrink: 0 }}>
                      {fileIcon(a.file_name)}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 500,
                      color: "var(--color-night)", ...FIELD,
                      whiteSpace: "nowrap", overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {a.file_name}
                    </div>
                    {a.user_name && (
                      <div style={{
                        fontSize: 10, color: "var(--color-silver)", ...FIELD,
                      }}>
                        {a.user_name} · {formatBytes(a.file_size)}
                      </div>
                    )}
                  </div>
                  {url && (
                    <a
                      href={url}
                      download={a.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11, color: "var(--color-primary)",
                        textDecoration: "none", flexShrink: 0, ...FIELD,
                      }}
                    >
                      ↓ Download
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {attachments.length > 1 && (
            <button
              className="btn-ghost btn-full mt-8"
              onClick={downloadAll}
              disabled={zipping}
            >
              {zipping ? "⏳ Bundling…" : `📦 Download All as ZIP (${attachments.length} files)`}
            </button>
          )}
        </div>
      )}

      {/* ── Mark as Published ────────────────────────────────────────── */}
      <div style={{ marginTop: 8 }}>
        {pubError && <div className="alert alert-error mb-8">{pubError}</div>}
        {isPublished ? (
          <div className="alert alert-success">
            {publishSuccess
              ? "🎉 Page published successfully! The stakeholder has been notified."
              : "✅ This request has been published."}
          </div>
        ) : (
          <button
            className="btn-success btn-full"
            onClick={handlePublish}
            disabled={publishing}
            style={{ justifyContent: "center" }}
          >
            {publishing ? "Publishing…" : "✅ Mark as Published"}
          </button>
        )}
      </div>
    </div>
  );
}
