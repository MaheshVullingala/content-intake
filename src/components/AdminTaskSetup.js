"use client";
import { useState } from "react";
import { TASK_TEAMS, createTasksForRequest } from "@/lib/taskUtils";
import styles from "@/styles/admin-task-setup.module.css";

const TEAM_HINTS = {
  editorial_qa: "Reviews all text content for accuracy and tone",
  brand_team:   "Designs brand assets — PNGs, PSDs, imagery",
  seo_team:     "Approves meta title, description and keywords",
  design_qa:    "Resizes and optimises images for AEM",
  web_team:     "Implements content in AEM — unlocks last",
};

export default function AdminTaskSetup({ req, user, onTasksCreated }) {
  const defaultSelected = TASK_TEAMS
    .filter(t => t.alwaysRequired)
    .map(t => t.role);

  const [selected, setSelected] = useState(() => {
    const base = new Set(defaultSelected);
    if (req.needs_brand) base.add("brand_team");
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const toggle = (role) => {
    const team = TASK_TEAMS.find(t => t.role === role);
    if (team?.alwaysRequired || role === "web_team") return; // cannot deselect required
    setSelected(prev => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });
  };

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      await createTasksForRequest(req.id, Array.from(selected), user.id);
      onTasksCreated?.();
    } catch (e) {
      setError(e.message || "Failed to create tasks.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>⚙️</span>
        <div>
          <div className={styles.headerTitle}>Admin Task Setup</div>
          <div className={styles.headerSub}>
            Choose which teams should work on this request, then click Create Tasks.
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {req.needs_brand && (
          <div className={styles.brandNotice}>
            <span className={styles.brandNoticeIcon}>🎨</span>
            <div className={styles.brandNoticeText}>
              <span className={styles.brandNoticeLabel}>Stakeholder requested Brand Team involvement.</span>{" "}
              Brand Team has been pre-selected below. Uncheck if not needed.
            </div>
          </div>
        )}

        <div>
          <div className={styles.sectionLabel}>Select teams</div>
          <div className={styles.teamList}>
            {TASK_TEAMS.map(team => {
              const isChecked   = selected.has(team.role);
              const isDisabled  = team.alwaysRequired || team.role === "web_team";
              const isWebLocked = team.role === "web_team";

              return (
                <div
                  key={team.role}
                  className={`${styles.teamRow} ${isChecked ? styles.checked : ""} ${isDisabled ? styles.disabled : ""}`}
                  onClick={() => !isDisabled && toggle(team.role)}
                >
                  <div className={`${styles.teamRowCheck} ${isChecked ? styles.checked : ""}`}>
                    {isChecked && <span className={styles.checkMark}>✓</span>}
                  </div>
                  <span className={styles.teamRowIcon}>{team.icon}</span>
                  <div className={styles.teamRowInfo}>
                    <div className={styles.teamRowLabel}>{team.label}</div>
                    <div className={styles.teamRowHint}>
                      {isWebLocked ? "Unlocks automatically when all other tasks complete" : TEAM_HINTS[team.role]}
                    </div>
                  </div>
                  {team.alwaysRequired && !isWebLocked && (
                    <span className={styles.requiredBadge}>Required</span>
                  )}
                  {!team.alwaysRequired && !isWebLocked && (
                    <span className={styles.optionalBadge}>Optional</span>
                  )}
                  {isWebLocked && (
                    <span className={styles.requiredBadge}>Auto</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.webNote}>
          🔒 Web Team is always included and unlocks automatically once Editorial QA, SEO, Design QA (and Brand Team if selected) are all completed.
        </div>

        {error && <div className={styles.error}>{error}</div>}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerCount}>
          <strong>{selected.size}</strong> team{selected.size !== 1 ? "s" : ""} selected
        </div>
        <button
          className={styles.createBtn}
          onClick={handleCreate}
          disabled={saving || selected.size === 0}
        >
          {saving ? "Creating…" : "✅ Create Tasks"}
        </button>
      </div>
    </div>
  );
}
