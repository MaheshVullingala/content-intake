"use client";
import { useState } from "react";
import JSZip from "jszip";
import styles from "@/styles/web-team-view.module.css";

function formatBytes(b) {
  if (!b) return "";
  if (b < 1024)    return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

function fileIcon(name = "") {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["png","jpg","jpeg","gif","webp","svg"].includes(ext)) return "🖼️";
  if (["pdf"].includes(ext)) return "📄";
  if (["psd","ai"].includes(ext)) return "🎨";
  if (["zip","rar","7z"].includes(ext)) return "📦";
  return "📎";
}

const TEAM_LABEL = {
  editorial_qa: "Editorial QA",
  brand_team:   "Brand Team",
  seo_team:     "SEO Team",
  design_qa:    "Design QA",
};

export default function WebTeamView({ req, attachments = [], task }) {
  const [copiedKey,    setCopiedKey]    = useState(null);
  const [zipping,      setZipping]      = useState(false);

  const isLocked = task?.status === "locked";

  const downloadAll = async () => {
    if (zipping) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      await Promise.all(
        attachments.map(async (a) => {
          const res = await fetch(a.file_url);
          const blob = await res.blob();
          zip.file(a.file_name || `file-${a.id}`, blob);
        })
      );
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${req.page_title || "assets"}-assets.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipping(false);
    }
  };

  const copyToClipboard = (key, value) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const parseJson = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return []; }
  };

  // Build grouped content sections
  const kbCards  = parseJson(req.kb_cards);
  const faItems  = parseJson(req.fa_items);
  const csItems  = parseJson(req.cs_items);
  const rcCards  = parseJson(req.rc_cards);
  const rpCards  = parseJson(req.rp_cards);

  const contentSections = [
    {
      heading: "Page",
      rows: [
        ["Page Type",  req.page_type],
        ["Page URL",   req.seo_page_location],
        ["Page Title", req.page_title],
        ["Sub Title",  req.sub_title],
        ["CTA 1",      [req.cta1_label, req.cta1_link].filter(Boolean).join(" → ")],
        ["CTA 2",      [req.cta2_label, req.cta2_link].filter(Boolean).join(" → ")],
      ].filter(([, v]) => v),
    },
    {
      heading: "SEO",
      rows: [
        ["Meta Title", req.seo_meta_title],
        ["Meta Desc",  req.seo_meta_description],
        ["Keywords",   req.seo_meta_keywords],
      ].filter(([, v]) => v),
    },
    {
      heading: "Key Benefits",
      rows: [
        ["Impact",       req.kb_impact],
        ["Description",  req.kb_description],
        ...kbCards.flatMap((c, i) => [
          [`Card ${i + 1} Title`, c.title],
          [`Card ${i + 1} Desc`,  c.description],
        ]),
      ].filter(([, v]) => v),
    },
    {
      heading: "Features",
      rows: [
        ["Impact",       req.fa_impact],
        ["Description",  req.fa_description],
        ...faItems.flatMap((c, i) => [
          [`Item ${i + 1} Title`, c.title],
          [`Item ${i + 1} Desc`,  c.description],
        ]),
      ].filter(([, v]) => v),
    },
    {
      heading: "Customer Stories",
      rows: [
        ["Impact", req.cs_impact],
        ...csItems.flatMap((c, i) => [
          [`Story ${i + 1} Quote`,    c.quote],
          [`Story ${i + 1} Customer`, c.customer],
        ]),
      ].filter(([, v]) => v),
    },
    {
      heading: "Promo",
      rows: [
        ["Title",       req.promo_title],
        ["Description", req.promo_description],
        ["Button",      [req.promo_btn_label, req.promo_btn_link].filter(Boolean).join(" → ")],
      ].filter(([, v]) => v),
    },
    {
      heading: "Related Content",
      rows: [
        ["Impact", req.rc_impact],
        ...rcCards.flatMap((c, i) => [
          [`Card ${i + 1} Title`, c.title],
          [`Card ${i + 1} Desc`,  c.description],
          [`Card ${i + 1} Link`,  c.link],
        ]),
      ].filter(([, v]) => v),
    },
    {
      heading: "Related Products",
      rows: [
        ["Impact",      req.rp_impact],
        ["Description", req.rp_description],
        ...rpCards.flatMap((c, i) => [
          [`Product ${i + 1} Title`, c.title],
          [`Product ${i + 1} Desc`,  c.description],
        ]),
      ].filter(([, v]) => v),
    },
    {
      heading: "Training & Support",
      rows: [
        ["Impact", req.ts_impact],
      ].filter(([, v]) => v),
    },
    {
      heading: "Overview",
      rows: [
        ["Overview", req.overview_impact],
      ].filter(([, v]) => v),
    },
  ].filter(s => s.rows.length > 0);

  if (isLocked) {
    return (
      <div className={styles.wrap}>
        <div className={styles.unlockBanner}>
          <span className={styles.unlockIcon}>🔒</span>
          <div>
            <div className={styles.unlockTitle}>Web Team task is locked</div>
            <div className={styles.unlockSub}>
              This task unlocks automatically once Editorial QA, SEO Team, Design QA (and Brand Team if required) are all completed.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.unlockBanner}>
        <span className={styles.unlockIcon}>🌐</span>
        <div>
          <div className={styles.unlockTitle}>Ready for implementation</div>
          <div className={styles.unlockSub}>
            All prerequisite tasks are complete. Download the assets below and implement in AEM.
          </div>
        </div>
      </div>

      {/* Content Summary */}
      <div>
        <div className={styles.sectionHead}>📋 Content Summary</div>
        <div className={styles.contentCard}>
          {contentSections.map(section => (
            <div key={section.heading}>
              <div className={styles.contentSectionHeading}>{section.heading}</div>
              {section.rows.map(([k, v]) => (
                <div key={k} className={styles.contentCardRow}>
                  <div className={styles.contentCardKey}>{k}</div>
                  <div className={styles.contentCardVal}>{v}</div>
                  <button
                    className={styles.copyBtn}
                    onClick={() => copyToClipboard(k, v)}
                    title="Copy to clipboard"
                  >
                    {copiedKey === k ? (
                      <span className={styles.copiedLabel}>Copied!</span>
                    ) : (
                      <span className={styles.copyIcon}>⎘</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Attachments */}
      <div>
        <div className={styles.sectionHead}>📁 Team Attachments</div>
        {attachments.length === 0 ? (
          <div className={styles.empty}>No files have been uploaded yet.</div>
        ) : (
          <>
            <div className={styles.attachGrid}>
              {attachments.map(a => (
                <div key={a.id} className={styles.attachRow}>
                  <span className={styles.attachIcon}>{fileIcon(a.file_name)}</span>
                  <span className={styles.attachName}>{a.file_name}</span>
                  {a.uploaded_by_role && (
                    <span className={styles.attachTeamBadge}>
                      {TEAM_LABEL[a.uploaded_by_role] || a.uploaded_by_role}
                    </span>
                  )}
                  <span className={styles.attachTeamBadge}>{formatBytes(a.file_size)}</span>
                  <a
                    href={a.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attachDownload}
                  >
                    ↓ Download
                  </a>
                </div>
              ))}
            </div>
            {attachments.length > 1 && (
              <button
                className={styles.downloadAllBtn}
                onClick={downloadAll}
                disabled={zipping}
              >
                {zipping ? "⏳ Bundling…" : `↓ Download all ${attachments.length} files as ZIP`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
