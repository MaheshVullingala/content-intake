"use client";
import { useState, useEffect } from "react";
import { getSectionsForPageType, ROLE_META } from "@/lib/constants";

// Open, section-scoped conversation — "start a conversation with
// stakeholder and other users regarding a specific section" from the
// revised post-demo flow (see PHASE1-EDITORIAL-REVIEW-PLAN.md). Reuses
// the existing `comments` table (sql/25 added section_key + fixed RLS
// to actually include editorial_team). Access is whoever RLS lets read/
// write comments on this request today: admin/super_admin, the owning
// stakeholder, and any of the working team roles — not a hand-picked
// per-request list, so no separate "add a collaborator" step is needed
// for this to feel open.
//
// One thread per request, filterable by section via a dropdown rather
// than a separate inline button per section in PagePreview — keeps this
// a single self-contained component droppable into any view (team
// member, stakeholder, admin) without threading new props through
// PagePreview's internals.
const GENERAL = "";

export default function CommentThread({ req, user, supabase }) {
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [section,  setSection]  = useState(GENERAL);
  const [text,     setText]     = useState("");
  const [posting,  setPosting]  = useState(false);
  const [error,    setError]    = useState("");

  const sectionOptions = req.page_type ? getSectionsForPageType(req.page_type) : [];

  const fetchComments = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("comments")
      .select("*")
      .eq("request_id", req.id)
      .order("created_at", { ascending: true });
    if (!err) setComments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, [req.id]);

  const visible = comments.filter(c => (c.section_key || "") === section);

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    setError("");
    const { error: err } = await supabase.from("comments").insert({
      request_id:  req.id,
      user_id:     user.id,
      user_name:   user.name,
      user_role:   user.role,
      text:        text.trim(),
      section_key: section || null,
    });
    if (err) { setError(err.message || "Failed to post."); setPosting(false); return; }
    setText("");
    setPosting(false);
    fetchComments();
  };

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <div><h3 style={{ margin: 0, fontSize: 14 }}>💬 Discussion</h3></div>
      </div>

      {sectionOptions.length > 0 && (
        <select className="select" style={{ marginBottom: 10 }} value={section} onChange={e => setSection(e.target.value)}>
          <option value={GENERAL}>General / Whole Request</option>
          {sectionOptions.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      )}

      <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 10 }}>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted" style={{ padding: "8px 0" }}>
            No comments yet{section ? " on this section" : ""}. Start the conversation below.
          </p>
        ) : (
          visible.map(c => {
            const meta = ROLE_META[c.user_role] || {};
            const isMe = c.user_id === user.id;
            return (
              <div key={c.id} style={{
                padding: "8px 10px", marginBottom: 6, borderRadius: 8,
                background: isMe ? "rgba(62,197,203,0.08)" : "var(--color-ghost)",
                border: "1px solid var(--color-border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{meta.icon || ""} {c.user_name}</span>
                  <span className="text-xs text-muted">{meta.label || c.user_role}</span>
                  <span className="text-xs text-muted" style={{ marginLeft: "auto" }}>{formatTime(c.created_at)}</span>
                </div>
                <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{c.text}</div>
              </div>
            );
          })
        )}
      </div>

      {error && <div className="alert alert-error mb-8">{error}</div>}
      <textarea
        className="textarea"
        rows={2}
        placeholder={section ? `Ask or comment about ${sectionOptions.find(s => s.key === section)?.label || "this section"}…` : "Ask or comment…"}
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <button className="btn-primary mt-8" style={{ width: "100%", justifyContent: "center" }} onClick={handlePost} disabled={posting || !text.trim()}>
        {posting ? "Posting…" : "Post"}
      </button>
    </div>
  );
}
