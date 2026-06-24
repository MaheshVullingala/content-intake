"use client";
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
  const isLocked = task?.status === "locked";

  const downloadAll = () => {
    attachments.forEach(a => {
      const link = document.createElement("a");
      link.href = a.file_url;
      link.download = a.file_name || "attachment";
      link.target = "_blank";
      link.click();
    });
  };

  // Content summary rows
  const contentRows = [
    ["Page Type",  req.page_type],
    ["Page URL",   req.seo_page_location],
    ["Page Title", req.page_title],
    ["Sub Title",  req.sub_title],
    ["CTA 1",      [req.cta1_label, req.cta1_link].filter(Boolean).join(" → ")],
    ["CTA 2",      [req.cta2_label, req.cta2_link].filter(Boolean).join(" → ")],
    ["Meta Title", req.seo_meta_title],
    ["Meta Desc",  req.seo_meta_description],
    ["Keywords",   req.seo_meta_keywords],
    ["Overview",   req.overview_impact],
  ].filter(([, v]) => v);

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
          {contentRows.map(([k, v]) => (
            <div key={k} className={styles.contentCardRow}>
              <div className={styles.contentCardKey}>{k}</div>
              <div className={styles.contentCardVal}>{v}</div>
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
              <button className={styles.downloadAllBtn} onClick={downloadAll}>
                ↓ Open all {attachments.length} files in new tabs
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
