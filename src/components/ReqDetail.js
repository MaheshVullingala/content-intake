"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getStatus, ROLE_META, canAct, nextActionLabel, FLOW, returnActionLabel } from "@/lib/constants";
import PagePreview from "@/components/PagePreview";
import { PCBLoader, PCBLoaderMini } from "@/components/PCBLoader";
import KeyBenefitsPreview from "@/components/sections/KeyBenefitsPreview";
import KeyBenefits from "@/components/sections/KeyBenefits";
import FeaturesApps from "@/components/sections/FeaturesApps";
import CustomerStories from "@/components/sections/CustomerStories";
import RelatedContent from "@/components/sections/RelatedContent";
import RelatedProducts from "@/components/sections/RelatedProducts";

function formatBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}


// Flag for Design QA toggle — shown in Editorial QA edit sections
const DesignFlagToggle = ({ sectionKey, value, onChange }) => {
  const flagged = !!value;
  return (
    <div
      onClick={() => onChange(!flagged)}
      style={{ display:"inline-flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none",
        padding:"6px 14px", borderRadius:20, marginBottom:14, transition:"all 0.15s",
        background: flagged ? "#f0fdf4" : "#F9F9F9",
        border: `1px solid ${flagged ? "#2c90b244" : "#E0E0E0"}`,
      }}>
      <span style={{ width:16, height:16, borderRadius:4, border:`2px solid ${flagged ? "#2c90b2" : "#D0D0D0"}`,
        background: flagged ? "#2c90b2" : "#fff", display:"flex", alignItems:"center", justifyContent:"center",
        flexShrink:0, transition:"all 0.15s" }}>
        {flagged && <span style={{ color:"#fff", fontSize:10, lineHeight:1 }}>✓</span>}
      </span>
      <span style={{ fontSize:12, fontWeight: flagged ? 600 : 400, color: flagged ? "#2c90b2" : "#B5B5B5" }}>
        🎨 Flag for Design QA image work
      </span>
    </div>
  );
};

const SEO_FIELDS = [
  ["seo_page_location",   "Page Location",    true,  false],
  ["seo_meta_title",      "Meta Title",       true,  false],
  ["seo_meta_description","Meta Description", true,  true],
  ["seo_meta_keywords",   "Meta Keywords",    false, true],
];

const BANNER_FIELDS = [
  ["page_title",        "Page Title"],
  ["sub_title",         "Sub Title"],
  ["cta1_label",        "CTA 1 Label"],
  ["cta1_link",         "CTA 1 Link"],
  ["cta2_label",        "CTA 2 Label"],
  ["cta2_link",         "CTA 2 Link"],
  ["banner_image",      "Banner Image URL"],
  ["banner_image_note", "Banner Image Description"],
];

const OVERVIEW_FIELDS = [
  ["overview_label",       "Label",            false, false],
  ["overview_impact",      "Impact Statement", true,  false],
  ["overview_description", "Description",      true,  true],
  ["overview_media_url",   "Media URL",        false, false],
  ["overview_media_note",  "Media Note",       false, true],
];

const KB_FIELDS = [
  ["kb_label",       "Label",            false, false],
  ["kb_impact",      "Impact Statement", false, false],
  ["kb_description", "Description",      false, true],
];

const FA_FIELDS = [
  ["fa_label",       "Label",            false, false],
  ["fa_impact",      "Impact Statement", false, false],
  ["fa_description", "Description",      false, true],
];

const CS_FIELDS = [
  ["cs_label",  "Label",            false, false],
  ["cs_impact", "Impact Statement", false, false],
];

const PROMO_FIELDS = [
  ["promo_label",       "Label",           false, false],
  ["promo_title",       "Title",           false, false],
  ["promo_description", "Description",     false, true],
  ["promo_btn_label",   "Button Label",    false, false],
  ["promo_btn_link",    "Button Link",     false, false],
  ["promo_bg_image",    "Background Image URL", false, false],
  ["promo_bg_note",     "Image Note",      false, true],
];

const RC_FIELDS = [
  ["rc_label",  "Label",            false, false],
  ["rc_impact", "Impact Statement", false, false],
];

const RES_FIELDS = [
  ["res_label",  "Label",            false, false],
  ["res_impact", "Impact Statement", false, false],
];

const RP_FIELDS = [
  ["rp_label",       "Label",            false, false],
  ["rp_impact",      "Impact Statement", false, false],
  ["rp_description", "Description",      false, true],
];

const TS_FIELDS = [
  ["ts_label",  "Label",  false, false],
  ["ts_impact", "Impact", false, false],
  ["ts_card1_title", "Card 1 Title", false, false],
  ["ts_card1_description", "Card 1 Description", false, true],
  ["ts_card1_cta_label", "Card 1 CTA Label", false, false],
  ["ts_card1_cta_link",  "Card 1 CTA Link",  false, false],
  ["ts_card2_title", "Card 2 Title", false, false],
  ["ts_card2_description", "Card 2 Description", false, true],
  ["ts_card2_cta_label", "Card 2 CTA Label", false, false],
  ["ts_card2_cta_link",  "Card 2 CTA Link",  false, false],
  ["ts_card3_title", "Card 3 Title", false, false],
  ["ts_card3_description", "Card 3 Description", false, true],
  ["ts_card3_cta_label", "Card 3 CTA Label", false, false],
  ["ts_card3_cta_link",  "Card 3 CTA Link",  false, false],
];

export default function ReqDetail({ reqId, go, user }) {
  const [req,          setReq]         = useState(null);
  const [comments,     setComments]    = useState([]);
  const [attachments,  setAttachments] = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [comment,      setComment]     = useState("");
  const [tab,          setTab]         = useState("preview");
  const [editSection,  setEditSection] = useState("seo_meta");
  const [editData,     setEditData]    = useState(null);
  const [uploading,    setUploading]   = useState(false);
  const [dragOver,     setDragOver]    = useState(false);
  const [saving,       setSaving]      = useState(false);
  const [assigning,    setAssigning]   = useState(false);
  const [error,        setError]       = useState("");
  const [showPreview,  setShowPreview] = useState(false);
  const [teamMembers,  setTeamMembers] = useState([]);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnComment,   setReturnComment]   = useState("");
  const fileRef = useRef();

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: r }, { data: c }, { data: a }] = await Promise.all([
      supabase.from("requests").select("*, users!requests_created_by_fkey(name,role,department), assigned:users!requests_assigned_to_fkey(name,role)").eq("id", reqId).single(),
      supabase.from("comments").select("*").eq("request_id", reqId).order("created_at"),
      supabase.from("attachments").select("*").eq("request_id", reqId).order("created_at"),
    ]);
    // Parse JSONB fields that Supabase may return as strings
    const parseJ = (val, fb = []) => {
      if (!val) return fb;
      if (typeof val === "string") { try { return JSON.parse(val); } catch { return fb; } }
      return val;
    };
    const parsed = r ? { ...r,
      kb_cards:          parseJ(r.kb_cards, []),
      fa_items:          parseJ(r.fa_items, []),
      fa_columns:        parseJ(r.fa_columns, []),
      fa_rows:           parseJ(r.fa_rows, []),
      cs_items:          parseJ(r.cs_items, []),
      rc_cards:          parseJ(r.rc_cards, []),
      rp_cards:          parseJ(r.rp_cards, []),
      res_selected:      parseJ(r.res_selected, []),
      res_video_carousel:parseJ(r.res_video_carousel, {}),
      res_mixed_carousel:parseJ(r.res_mixed_carousel, {}),
      res_resources:     parseJ(r.res_resources, {}),
      res_news:          parseJ(r.res_news, {}),
      res_blogs:         parseJ(r.res_blogs, {}),
    } : null;
    setReq(parsed); setComments(c || []); setAttachments(a || []);
    setLoading(false);
  };

  const fetchTeamMembers = async (role) => {
    const { data } = await supabase.from("users").select("id, name, role").eq("role", role).neq("id", user.id);
    setTeamMembers(data || []);
  };

  useEffect(() => { fetchAll(); }, [reqId]);

  useEffect(() => {
    if (user.can_assign) fetchTeamMembers(user.role);
  }, [user.can_assign, user.role]);

    if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <PCBLoader label="LOADING..." />
    </div>
  );
  if (!req)    return <div style={{ padding: "2rem", color: "#B5B5B5", fontFamily: "'Rubik',sans-serif" }}>Request not found.</div>;

  const status        = getStatus(req.status);
  const actionable    = canAct(user.role, req.status);
  const isEditorialQA = user.role === "editorial_qa" && req.status === "editorial_qa";
  const isDesignQA    = user.role === "design_qa"    && req.status === "design_qa";
  const isStakeholderOwner = user.role === "stakeholder" && req.created_by === user.id;
  // Returned to draft by Editorial QA
  const isReturnedByEditorial = req.status === "draft" && comments.some(c => c.is_return && c.user_role === "editorial_qa");
  // Queried by Design QA (also lands in draft)
  const isQueriedByDesignQA  = req.status === "draft" && comments.some(c => c.is_return && c.user_role === "design_qa");
  // Either kind of return/query — for general draft-with-notes handling
  const isReturnedDraft = isReturnedByEditorial || isQueriedByDesignQA;
  // How many times has this been returned/queried total
  const revisionCount   = comments.filter(c => c.is_return).length;
  const stageIdx      = FLOW.indexOf(req.status);

  const startEdit = () => setEditData({ ...req, ...{
    kb_cards: liveData?.kb_cards ?? [],
    fa_items: liveData?.fa_items ?? [], fa_columns: liveData?.fa_columns ?? [], fa_rows: liveData?.fa_rows ?? [],
    cs_items: liveData?.cs_items ?? [],
    rc_cards: liveData?.rc_cards ?? [],
    rp_cards: liveData?.rp_cards ?? [],
    res_selected: liveData?.res_selected ?? [],
  }});
  const cancelEdit = () => setEditData(null);
  const updEdit    = (k, v) => setEditData(p => ({ ...p, [k]: v }));

  const saveEdit = async () => {
    setSaving(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Whitelist — only real DB columns, no joined relations like 'users', 'assigned', etc.
      const ALLOWED = new Set([
        "page_type","status","created_by","updated_at",
        "seo_page_location","seo_meta_title","seo_meta_description","seo_meta_keywords",
        "page_title","sub_title","cta1_label","cta1_link","cta2_label","cta2_link","banner_image","banner_image_note",
        "overview_label","overview_impact","overview_description","overview_media_url","overview_media_type","overview_media_note",
        "kb_label","kb_impact","kb_description","kb_cards",
        "fa_label","fa_impact","fa_description","fa_view_type","fa_items","fa_columns","fa_rows",
        "cs_label","cs_impact","cs_items",
        "promo_bg_image","promo_bg_note","promo_label","promo_title","promo_description","promo_btn_label","promo_btn_link",
        "rc_label","rc_impact","rc_cards",
        "res_label","res_impact","res_selected","res_video_carousel","res_mixed_carousel","res_resources","res_news","res_blogs",
        "rp_label","rp_impact","rp_description","rp_cards",
        "ts_label","ts_impact",
        "ts_card1_icon","ts_card1_title","ts_card1_description","ts_card1_cta_label","ts_card1_cta_link",
        "ts_card2_icon","ts_card2_title","ts_card2_description","ts_card2_cta_label","ts_card2_cta_link",
        "ts_card3_icon","ts_card3_title","ts_card3_description","ts_card3_cta_label","ts_card3_cta_link",
        "assigned_to","assigned_by","assigned_at",
        "design_flag_banner","design_flag_overview","design_flag_kb","design_flag_fa",
        "design_flag_rc","design_flag_promo","design_flag_ts",
      ]);

      const payload = { updated_at: new Date().toISOString() };
      for (const [k, v] of Object.entries(editData || {})) {
        if (ALLOWED.has(k)) payload[k] = v;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${supabaseUrl}/rest/v1/requests?id=eq.${req.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text();
        console.error("Save edit failed:", res.status, errText);
        setError(`Save failed: ${res.status} — ${errText.slice(0, 150)}`);
        return;
      }

      setEditData(null);
      setError("");
      await fetchAll();
    } catch(e) {
      if (e.name === "AbortError") {
        setError("Save timed out — please check your connection and try again.");
      } else {
        console.error("Save edit error:", e);
        setError("Save failed — please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Always re-parse JSONB arrays in liveData so editData can never reintroduce raw strings
  const safeParseArr = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } }
    return [];
  };
  const safeParseObj = (v) => {
    if (!v) return {};
    if (typeof v === "object" && !Array.isArray(v)) return v;
    if (typeof v === "string") { try { return JSON.parse(v); } catch { return {}; } }
    return {};
  };
  const rawLive = editData ? { ...req, ...editData } : req;
  const liveData = rawLive ? { ...rawLive,
    kb_cards:           safeParseArr(rawLive.kb_cards),
    fa_items:           safeParseArr(rawLive.fa_items),
    fa_columns:         safeParseArr(rawLive.fa_columns),
    fa_rows:            safeParseArr(rawLive.fa_rows),
    cs_items:           safeParseArr(rawLive.cs_items),
    rc_cards:           safeParseArr(rawLive.rc_cards),
    rp_cards:           safeParseArr(rawLive.rp_cards),
    res_selected:       safeParseArr(rawLive.res_selected),
    res_video_carousel: safeParseObj(rawLive.res_video_carousel),
    res_mixed_carousel: safeParseObj(rawLive.res_mixed_carousel),
    res_resources:      safeParseObj(rawLive.res_resources),
    res_news:           safeParseObj(rawLive.res_news),
    res_blogs:          safeParseObj(rawLive.res_blogs),
  } : rawLive;

  // Derived visibility flags — use liveData so card-only sections (no impact text) are detected
  const hasOverview    = liveData?.overview_impact || liveData?.overview_description;
  const hasKeyBenefits = liveData?.kb_impact || liveData?.kb_cards?.length > 0;

  const withTimeout = (promise, ms = 12000) =>
    Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("Request timed out")), ms))]);

  const doAdvance = async () => {
    setSaving(true); setError("");
    try {
      if (editData) await withTimeout(saveEdit());
      const next = FLOW[Math.min(stageIdx + 1, FLOW.length - 1)];
      await withTimeout(supabase.from("requests").update({ status: next, updated_at: new Date().toISOString() }).eq("id", req.id));
      if (comment.trim()) await withTimeout(supabase.from("comments").insert({ request_id: req.id, user_id: user.id, user_name: user.name, user_role: user.role, text: comment, is_return: false }));
      await withTimeout(supabase.from("status_history").insert({ request_id: req.id, user_id: user.id, user_name: user.name, from_status: req.status, to_status: next }));
      setComment(""); await fetchAll();
    } catch(e) { setError(e.message === "Request timed out" ? "Request timed out — please try again." : "Action failed. Please try again."); }
    finally { setSaving(false); }
  };

  const doReturn = async () => {
    if (!returnComment.trim()) return;
    setSaving(true); setError("");
    try {
      const prefix = user.role === "design_qa" ? "[Design Query]" : "[Returned]";
      await withTimeout(supabase.from("requests").update({ status: "draft", updated_at: new Date().toISOString() }).eq("id", req.id));
      await withTimeout(supabase.from("comments").insert({ request_id: req.id, user_id: user.id, user_name: user.name, user_role: user.role, text: `${prefix} ${returnComment.trim()}`, is_return: true }));
      await withTimeout(supabase.from("status_history").insert({ request_id: req.id, user_id: user.id, user_name: user.name, from_status: req.status, to_status: "draft" }));
      setReturnComment(""); setShowReturnModal(false); await fetchAll();
    } catch(e) { setError(e.message === "Request timed out" ? "Request timed out — please try again." : "Action failed."); }
    finally { setSaving(false); }
  };

  const doComment = async () => {
    if (!comment.trim()) return;
    try {
      await withTimeout(supabase.from("comments").insert({ request_id: req.id, user_id: user.id, user_name: user.name, user_role: user.role, text: comment, is_return: false }));
      setComment(""); await fetchAll();
    } catch(e) { setError("Failed to post comment."); }
  };

  const doResubmit = async () => {
    if (!comment.trim()) { setError("Please add a reply describing what you changed."); return; }
    setSaving(true); setError("");
    try {
      if (editData) await withTimeout(saveEdit());
      const lastReturn = [...comments].reverse().find(c => c.is_return);
      const resubmitTo = lastReturn?.user_role === "design_qa" ? "design_qa" : "editorial_qa";
      await withTimeout(supabase.from("comments").insert({ request_id: req.id, user_id: user.id, user_name: user.name, user_role: user.role, text: comment, is_return: false }));
      await withTimeout(supabase.from("requests").update({ status: resubmitTo, updated_at: new Date().toISOString() }).eq("id", req.id));
      await withTimeout(supabase.from("status_history").insert({ request_id: req.id, user_id: user.id, user_name: user.name, from_status: "draft", to_status: resubmitTo }));
      setComment(""); setEditData(null); await fetchAll();
    } catch(e) { setError(e.message === "Request timed out" ? "Request timed out — please try again." : "Resubmit failed. Please try again."); }
    finally { setSaving(false); }
  };

  const uploadToStorage = async (file, reqId) => {
    // Sanitise filename — remove spaces and special chars
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${reqId}/${safeName}`; // no timestamp — same filename = same path = dedup

    // Check if this file already exists in attachments for this request
    const { data: existing } = await supabase
      .from("attachments")
      .select("id, public_url")
      .eq("request_id", reqId)
      .eq("file_name", file.name)
      .maybeSingle();

    if (existing) {
      // Already uploaded — return existing URL without re-uploading
      return existing.public_url;
    }

    const { error: upErr } = await supabase.storage
      .from("attachments")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) throw new Error(upErr.message);

    // getPublicUrl is synchronous
    const { data } = supabase.storage.from("attachments").getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Could not get public URL");

    await supabase.from("attachments").insert({
      request_id:   reqId,
      user_id:      user.id,
      user_name:    user.name,
      file_name:    file.name,
      file_type:    file.type,
      file_size:    file.size,
      storage_path: path,
      public_url:   data.publicUrl,
    });

    return data.publicUrl;
  };

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        await uploadToStorage(file, req.id);
      }
      await fetchAll();
    } catch(e) {
      console.error("Upload failed:", e);
      setError("Upload failed — " + e.message);
    } finally {
      setUploading(false);
    }
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

      {/* ── Return for Revision Modal ── */}
      {showReturnModal && (
        <div onClick={() => !saving && setShowReturnModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: "2rem", maxWidth: 480, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: isDesignQA ? "#eff6ff" : "#fff5f5", border: `1px solid ${isDesignQA ? "#3b82f633" : "#c0392b33"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 16 }}>
              {isDesignQA ? "💬" : "↩"}
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 500, marginBottom: 6 }}>
              {isDesignQA ? "Send Query to Stakeholder" : "Return for Revision"}
            </h2>
            <p style={{ fontSize: 13, color: "#646464", marginBottom: 18, lineHeight: 1.6 }}>
              {isDesignQA
                ? "Your query will be sent directly to the Stakeholder. They can reply or update image details and resubmit back to you."
                : "This request will be sent back to the Stakeholder as a draft. Your notes are required so they know what needs to be fixed."}
            </p>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#646464", letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              {isDesignQA ? "Your Query / Image Notes" : "Revision Notes"} <span style={{ color: "#c0392b" }}>*</span>
            </label>
            <textarea
              value={returnComment}
              onChange={e => setReturnComment(e.target.value)}
              placeholder={isDesignQA ? "e.g. Can you clarify the image needed for the Key Benefits section? The description says 'product hero' but we need exact dimensions..." : "Describe what needs to be changed or corrected..."}
              className="textarea"
              style={{ minHeight: 110, marginBottom: 18 }}
              autoFocus
            />
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={doReturn}
                disabled={saving || !returnComment.trim()}
                style={{ background: !returnComment.trim() ? "#F3F3F3" : isDesignQA ? "#1b5793" : "#c0392b", color: !returnComment.trim() ? "#B5B5B5" : "#fff", border: "none", borderRadius: 8, padding: "0.7rem", fontSize: 14, fontWeight: 500, cursor: !returnComment.trim() ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", transition: "all 0.15s" }}>
                {saving ? "Sending..." : isDesignQA ? "💬 Send Query to Stakeholder" : "↩ Send Back to Stakeholder"}
              </button>
              <button onClick={() => { setShowReturnModal(false); setReturnComment(""); }} disabled={saving}
                style={{ background: "#F3F3F3", color: "#646464", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.7rem", fontSize: 14, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ── */}
      {showPreview && (
        <div onClick={() => setShowPreview(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 999, overflowY: "auto" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: "#fff", minHeight: "100vh" }}>
            {/* Modal top bar */}
            <div style={{ background: "#181313", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
              <div style={{ color: "#F3F3F3", fontWeight: 500, fontSize: 14, fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                👁 Page Preview — {req.page_title}
              </div>
              <button onClick={() => setShowPreview(false)} style={{ background: "transparent", border: "1px solid #3C3C3C", color: "#B5B5B5", borderRadius: 6, padding: "0.3rem 0.8rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                ✕ Close
              </button>
            </div>
            {/* Full page preview using PagePreview component */}
            <PagePreview req={liveData} pageType={req.page_type} fullPage={true} />
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
              {revisionCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, background: "#fff3cd", color: "#856404", border: "1px solid #ffc10766", borderRadius: 20, padding: "2px 10px" }}>
                  Rev {revisionCount}
                </span>
              )}
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
              {(isDesignQA ? [
                ["preview",     "👁 Full Preview"],
                ["image_map",   "🖼️ Image Mapping"],
                ["attachments", `📎 Assets${attachments.length ? ` (${attachments.length})` : ""}`],
              ] : [
                ["preview",  "👁 Overview"],
                isEditorialQA || (isReturnedDraft && isStakeholderOwner) ? ["edit", "✎ Edit"] : null,
              ].filter(Boolean)).map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)} className={`tab-btn${tab === t ? " active" : ""}`}>
                  {label}
                </button>
              ))}
            </div>
            {tab === "edit" && (isEditorialQA || (isReturnedDraft && isStakeholderOwner)) && (
              <div className="tab-bar" style={{ overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none" }}>
                {[
                  ["seo_meta",         "🔍 SEO Meta",         true],
                  ["banner",           "Banner",              true],
                  ["overview",         "Overview",            hasOverview],
                  ["key_benefits",     "Key Benefits",        !!liveData.kb_impact || liveData.kb_cards.length > 0],
                  ["features_apps",    "Features / Apps",     !!liveData.fa_impact || liveData.fa_items.length > 0 || liveData.fa_columns.length > 0],
                  ["customer_stories", "Customer Stories",    !!liveData.cs_impact || liveData.cs_items.length > 0],
                  ["promo_section",    "Promo Section",       !!liveData.promo_title],
                  ["related_content",  "Related Content",     !!liveData.rc_impact || liveData.rc_cards.length > 0],
                  ["resources",        "Resources",           !!liveData.res_impact || liveData.res_selected.length > 0],
                  ["related_products", "Related Products",    !!liveData.rp_impact || liveData.rp_cards.length > 0],
                  ["training_support", "Training & Support",  !!liveData.ts_label],
                ].filter(([,, show]) => show).map(([k, label]) => (
                  <button key={k} onClick={() => setEditSection(k)} className={`tab-btn${editSection === k ? " active" : ""}`}>{label}</button>
                ))}
              </div>
            )}
          </div>

          {/* ── Preview Tab ── */}
          {tab === "preview" && (
            <>
              {/* Design QA: show full page preview inline; others: show button + content summary */}
              {isDesignQA ? (
                <div>
                  {/* Image requirements callout — highlighted so Design QA sees them immediately */}
                  {(liveData.overview_media_note || liveData.promo_bg_note || liveData.banner_image_note ||
                    liveData.design_flag_banner || liveData.design_flag_overview || liveData.design_flag_promo ||
                    liveData.design_flag_kb || liveData.design_flag_fa || liveData.design_flag_rc || liveData.design_flag_ts) && (
                    <div style={{ background: "#e8f4fb", border: "1px solid #3b82f633", borderRadius: 10, padding: "1rem 1.2rem", marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#1b5793", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>📌 Image Requirements flagged by Editorial QA</div>
                      {[
                        ["Banner Image",              liveData.design_flag_banner,   "Flagged by Editorial QA"],
                        ["Overview Media",            liveData.design_flag_overview || liveData.overview_media_note, liveData.overview_media_note || "Flagged by Editorial QA"],
                        ["Promo Background Image",    liveData.design_flag_promo || liveData.promo_bg_note, liveData.promo_bg_note || "Flagged by Editorial QA"],
                        ["Key Benefits Icons",        liveData.design_flag_kb || liveData.kb_cards?.some(c => c.icon_description), `${liveData.kb_cards?.filter(c=>c.icon_description).length || 0} card(s) with icon notes — see Image Mapping tab`],
                        ["Features / Apps Images",    liveData.design_flag_fa || liveData.fa_items?.some(i => i.image_note), `${liveData.fa_items?.filter(i=>i.image_note).length || 0} tab(s) with image notes — see Image Mapping tab`],
                        ["Related Content Images",    liveData.design_flag_rc || liveData.rc_cards?.some(c => c.image_note), `${liveData.rc_cards?.filter(c=>c.image_note).length || 0} card(s) with image notes — see Image Mapping tab`],
                        ["Training & Support Icons",  liveData.design_flag_ts, "Flagged by Editorial QA — see Image Mapping tab"],
                      ].filter(([, show]) => show).map(([label, , note]) => (
                        <div key={label} style={{ display: "flex", gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid #3b82f611" }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>📷</span>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#1b5793", marginBottom: 2 }}>{label}</div>
                            <div style={{ fontSize: 12, color: "#1e3a8a", lineHeight: 1.55 }}>{note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Full page preview — white background */}
                  <div style={{ background: "#ffffff", border: "1px solid #E0E0E0", borderRadius: 10, overflow: "hidden" }}>
                    <PagePreview req={liveData} pageType={req.page_type} fullPage={false} />
                  </div>
                </div>
              ) : (
              <>
              {/* Preview + Edit buttons row */}
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <button onClick={() => setShowPreview(true)} style={{ display: "flex", alignItems: "center", gap: 10, background: "#181313", color: "#fff", border: "none", borderRadius: 10, padding: "0.8rem 1.6rem", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif", transition: "opacity 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                  👁 Open Full Screen
                </button>
                {isReturnedDraft && isStakeholderOwner && (
                  <button onClick={() => setTab("edit")} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", color: "#181313", border: "2px solid #181313", borderRadius: 10, padding: "0.8rem 1.6rem", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#181313"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#181313"; }}>
                    ✎ Edit Page
                  </button>
                )}
              </div>

              {/* Editorial QA + pending approval stakeholder — show full page preview inline */}
              {(isEditorialQA || isStakeholderOwner) && (
                <div style={{ background: "#ffffff", border: "1px solid #E0E0E0", borderRadius: 10, overflow: "hidden" }}>
                  <PagePreview req={liveData} pageType={req.page_type} fullPage={false} />
                </div>
              )}
              {!(isEditorialQA || isStakeholderOwner) && (
                <div className="card">
                <h3 style={{ fontSize: 13, marginBottom: 12 }}>Content Summary</h3>
                <p className="section-group-header" style={{ marginTop: 0 }}>🔍 SEO Meta Data</p>
                <div className="summary-grid">
                  {[["Page Location", req.seo_page_location], ["Meta Title", req.seo_meta_title], ["Meta Description", req.seo_meta_description], ["Meta Keywords", req.seo_meta_keywords]].map(([k, v]) => (
                    <div key={k} className="summary-cell"><div className="key">{k}</div><div className="val">{v || "—"}</div></div>
                  ))}
                </div>
                <p className="section-group-header">🖼️ Banner</p>
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
                {liveData.kb_cards.length > 0 && (
                  <>
                    <p className="section-group-header">🃏 Key Benefits ({liveData.kb_cards.length} cards)</p>
                    <div className="summary-grid">
                      {[["Label", liveData.kb_label], ["Impact", liveData.kb_impact], ["Description", liveData.kb_description]].map(([k, v]) => (
                        <div key={k} className="summary-cell"><div className="key">{k}</div><div className="val">{v || "—"}</div></div>
                      ))}
                    </div>
                    {liveData.kb_cards.map((card, i) => (
                      <div key={i} className="summary-grid" style={{ marginTop: 6, borderLeft: "3px solid #E0E0E0", paddingLeft: 10 }}>
                        {[["Card " + (i+1) + " Title", card.title], ["Description", card.description], ["Icon Note", card.icon_description]].map(([k, v]) => (
                          <div key={k} className="summary-cell"><div className="key">{k}</div><div className="val">{v || "—"}</div></div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
                {liveData.cs_items.length > 0 && (
                  <>
                    <p className="section-group-header">💬 Customer Stories ({liveData.cs_items.length} items)</p>
                    <div className="summary-grid">
                      {[["Label", liveData.cs_label], ["Impact", liveData.cs_impact]].map(([k, v]) => (
                        <div key={k} className="summary-cell"><div className="key">{k}</div><div className="val">{v || "—"}</div></div>
                      ))}
                    </div>
                    {liveData.cs_items.map((item, i) => (
                      <div key={i} className="summary-grid" style={{ marginTop: 6, borderLeft: "3px solid #E0E0E0", paddingLeft: 10 }}>
                        {[["Story " + (i+1) + " Quote", item.quote], ["Author", item.author], ["Company", item.company]].map(([k, v]) => (
                          <div key={k} className="summary-cell"><div className="key">{k}</div><div className="val">{v || "—"}</div></div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
                {liveData.fa_items.length > 0 && (
                  <>
                    <p className="section-group-header">⚙️ Features / Apps ({liveData.fa_items.length} items)</p>
                    <div className="summary-grid">
                      {[["Label", liveData.fa_label], ["Impact", liveData.fa_impact], ["View Type", liveData.fa_view_type]].map(([k, v]) => (
                        <div key={k} className="summary-cell"><div className="key">{k}</div><div className="val">{v || "—"}</div></div>
                      ))}
                    </div>
                  </>
                )}
                {attachments.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <p className="section-group-header">📎 Design Assets ({attachments.length})</p>
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
              </div>
            )}
            </>
            )}
            </>
          )}

          {/* ── Image Mapping — Design QA ── */}
          {tab === "image_map" && isDesignQA && (() => {
            // Build dynamic slots from all sections that have image requirements
            // Helper: get reference label from image_ref object
            const refLabel = (ref) => {
              if (!ref) return null;
              if (ref.type === "description") return { icon: "📝", text: ref.value };
              if (ref.type === "link")        return { icon: "🔗", text: ref.value, url: ref.url };
              if (ref.type === "attachment")  return { icon: "📎", text: ref.value, url: ref.url };
              return null;
            };

            const buildSlots = () => {
              const s = [];
              // Banner
              s.push({ type: "top", key: "banner_image", label: "Banner Image", ref: refLabel(liveData.banner_image_ref), section: "Banner", icon: "🖼️", urlVal: editData?.banner_image ?? liveData.banner_image ?? "" });
              // Overview
              s.push({ type: "top", key: "overview_media_url", label: "Overview Media", ref: refLabel(liveData.overview_media_ref), section: "Overview", icon: "📷", urlVal: editData?.overview_media_url ?? liveData.overview_media_url ?? "" });
              // Promo
              s.push({ type: "top", key: "promo_bg_image", label: "Promo Background", ref: refLabel(liveData.promo_bg_image_ref), section: "Promo Section", icon: "🎨", urlVal: editData?.promo_bg_image ?? liveData.promo_bg_image ?? "" });
              // KB cards
              (liveData.kb_cards || []).forEach((card, i) => {
                s.push({ type: "card", cardArr: "kb_cards", cardIdx: i, cardField: "icon_url", key: `kb_card_${i}_icon`, label: `KB Card ${i+1} — Icon`, ref: card.icon_description ? { icon: "📝", text: card.icon_description } : refLabel(card.image_ref), section: "Key Benefits", icon: "💡", urlVal: card.icon_url || "" });
              });
              // FA tabs
              (liveData.fa_items || []).forEach((item, i) => {
                s.push({ type: "card", cardArr: "fa_items", cardIdx: i, cardField: "image_url", key: `fa_item_${i}_img`, label: `Features Tab ${i+1} — Image`, ref: refLabel(item.image_ref), section: "Features / Apps", icon: "⚙️", urlVal: item.image_url || "" });
              });
              // CS items
              (liveData.cs_items || []).forEach((item, i) => {
                s.push({ type: "card", cardArr: "cs_items", cardIdx: i, cardField: "logo_url", key: `cs_item_${i}_logo`, label: `Customer Story ${i+1} — Logo`, ref: refLabel(item.logo_ref), section: "Customer Stories", icon: "💬", urlVal: item.logo_url || "" });
              });
              // RC cards
              (liveData.rc_cards || []).forEach((card, i) => {
                s.push({ type: "card", cardArr: "rc_cards", cardIdx: i, cardField: "image_url", key: `rc_card_${i}_img`, label: `Related Content Card ${i+1}`, ref: refLabel(card.image_ref), section: "Related Content", icon: "📄", urlVal: card.image_url || "" });
              });
              // RP cards
              (liveData.rp_cards || []).forEach((card, i) => {
                s.push({ type: "card", cardArr: "rp_cards", cardIdx: i, cardField: "image_url", key: `rp_card_${i}_img`, label: `Related Product Card ${i+1}`, ref: refLabel(card.image_ref), section: "Related Products", icon: "📦", urlVal: card.image_url || "" });
              });
              // Training & Support
              [1,2,3].forEach(n => {
                s.push({ type: "top", key: `ts_card${n}_icon`, label: `Support Card ${n} Icon`, ref: null, section: "Training & Support", icon: "🎓", urlVal: editData?.[`ts_card${n}_icon`] ?? liveData[`ts_card${n}_icon`] ?? "" });
              });
              return s;
            };
            const slots = buildSlots();
            const filledCount = slots.filter(s => s.urlVal && s.urlVal.trim()).length;

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Progress */}
                <div className="card" style={{ padding: "1rem 1.2rem", background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#181313" }}>Image Slots Progress</span>
                    <span style={{ fontSize: 12, color: "#646464" }}>{filledCount} / {slots.length} filled</span>
                  </div>
                  <div style={{ height: 6, background: "#F3F3F3", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(filledCount / slots.length) * 100}%`, background: "#2c90b2", borderRadius: 4, transition: "width 0.4s ease" }} />
                  </div>
                </div>

                {/* Slots */}
                {slots.map(slot => {
                  const currentVal = slot.urlVal;
                  const isFilled   = !!currentVal.trim();
                  const isImg      = /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(currentVal);

                  // Helper to update value — handles both top-level fields and card array fields
                  const updateSlotValue = (newUrl) => {
                    setEditData(prev => {
                      const base = prev || req;
                      if (slot.type === "card") {
                        // Read from current editData (or req) to get latest array state
                        const arr = [...(base[slot.cardArr] || liveData[slot.cardArr] || [])];
                        if (arr[slot.cardIdx]) arr[slot.cardIdx] = { ...arr[slot.cardIdx], [slot.cardField]: newUrl };
                        return { ...base, [slot.cardArr]: arr };
                      } else {
                        return { ...base, [slot.key]: newUrl };
                      }
                    });
                  };

                  const handleSlotUpload = async (file) => {
                    if (!file) return;
                    setUploading(true);
                    setError("");
                    try {
                      const publicUrl = await uploadToStorage(file, req.id);
                      updateSlotValue(publicUrl);
                      await fetchAll();
                    } catch(e) {
                      console.error("Slot upload failed:", e);
                      setError("Upload failed — " + e.message);
                    } finally {
                      setUploading(false);
                    }
                  };

                  return (
                    <div key={slot.key} className="card" style={{ background: "#fff", border: isFilled ? "1px solid #2c90b244" : "1px solid #E0E0E0" }}>
                      {/* Header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <span style={{ fontSize: 18 }}>{slot.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#181313" }}>{slot.label}</div>
                          <div style={{ fontSize: 11, color: "#B5B5B5" }}>{slot.section}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                          background: isFilled ? "#f0fdf4" : "#fffbeb",
                          color:      isFilled ? "#2c90b2"  : "#f59e0b",
                          border:     `1px solid ${isFilled ? "#2c90b233" : "#f59e0b44"}` }}>
                          {isFilled ? "✓ Filled" : "⚠ Pending"}
                        </span>
                      </div>

                      {/* Stakeholder reference — collapses after design uploads */}
                      {slot.ref && (
                        <details open={!isFilled} style={{ marginBottom: 12 }}>
                          <summary style={{ fontSize: 11, fontWeight: 600, color: isFilled ? "#B5B5B5" : "#1b5793", cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 6, userSelect: "none" }}>
                            <span>{slot.ref.icon}</span>
                            <span>{isFilled ? "Stakeholder reference (archived)" : "Stakeholder reference"}</span>
                            <span style={{ marginLeft: "auto", fontSize: 10 }}>{isFilled ? "▶ show" : "▼ hide"}</span>
                          </summary>
                          <div style={{ marginTop: 8, background: isFilled ? "#F9F9F9" : "#e8f4fb", border: `1px solid ${isFilled ? "#E0E0E0" : "#3b82f622"}`, borderLeft: `3px solid ${isFilled ? "#E0E0E0" : "#3b82f6"}`, borderRadius: 8, padding: "0.6rem 0.8rem", fontSize: 12, color: isFilled ? "#B5B5B5" : "#1b5793", lineHeight: 1.6 }}>
                            {slot.ref.text}
                            {slot.ref.url && <a href={slot.ref.url} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: "#2c90b2" }}>Open ↗</a>}
                          </div>
                        </details>
                      )}

                      {/* URL input + upload */}
                      <div style={{ display: "flex", gap: 8, marginBottom: currentVal ? 12 : 0 }}>
                        <input value={currentVal}
                          onChange={e => updateSlotValue(e.target.value)}
                          placeholder="Paste image URL or upload below..."
                          className="input" style={{ flex: 1, fontSize: 12 }} />
                        <label style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0 12px", cursor: uploading ? "not-allowed" : "pointer", fontSize: 12, color: "#646464", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontFamily: "'Rubik',sans-serif", opacity: uploading ? 0.6 : 1 }}>
                          {uploading ? "⏳" : "📤"} Upload
                          <input type="file" accept="image/*,.svg" style={{ display: "none" }} disabled={uploading}
                            onChange={e => handleSlotUpload(e.target.files?.[0])} />
                        </label>
                      </div>

                      {/* Live thumbnail */}
                      {currentVal && (
                        <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #E0E0E0", background: "#F9F9F9", marginTop: 12 }}>
                          {isImg
                            ? <img src={currentVal} alt={slot.label} style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} onError={e => { e.currentTarget.style.display = "none"; }} />
                            : <div style={{ padding: "0.6rem 0.8rem", fontSize: 12, color: "#646464" }}>
                                <a href={currentVal} target="_blank" rel="noreferrer" style={{ color: "#2c90b2" }}>↗ {currentVal}</a>
                              </div>
                          }
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Save */}
                {editData && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={saveEdit} disabled={saving} className="btn-success" style={{ flex: 1 }}>
                      {saving ? "Saving..." : "✓ Save Image URLs"}
                    </button>
                    <button onClick={cancelEdit} className="btn-ghost">Cancel</button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Edit — Editorial QA ── */}
          {tab === "edit" && (isEditorialQA || (isReturnedDraft && isStakeholderOwner)) && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>Edit {editSection.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</h3>
                  <p>{isReturnedDraft && isStakeholderOwner ? "Address the revision notes and update your content" : "As Editorial QA you can overwrite any field"}</p>
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
              {editSection === "seo_meta"         && SEO_FIELDS.map(([k, label, r, ml]) => <EditField key={k} k={k} label={label} required={!!r} multiline={!!ml} />)}
              {editSection === "banner"           && <><DesignFlagToggle sectionKey="banner" value={editData?.design_flag_banner ?? liveData.design_flag_banner} onChange={v => { if (!editData) startEdit(); updEdit("design_flag_banner", v); }} />{BANNER_FIELDS.map(([k, label, r, ml]) => <EditField key={k} k={k} label={label} required={!!r} multiline={!!ml} />)}</>}
              {editSection === "overview"         && <><DesignFlagToggle sectionKey="overview" value={editData?.design_flag_overview ?? liveData.design_flag_overview} onChange={v => { if (!editData) startEdit(); updEdit("design_flag_overview", v); }} />{OVERVIEW_FIELDS.map(([k, label, r, ml]) => <EditField key={k} k={k} label={label} required={!!r} multiline={!!ml} />)}</>}
              {editSection === "key_benefits"     && (
                <><DesignFlagToggle sectionKey="kb" value={editData?.design_flag_kb ?? liveData.design_flag_kb} onChange={v => { if (!editData) startEdit(); updEdit("design_flag_kb", v); }} />
                <KeyBenefits
                  data={editData ? { kb_label: editData.kb_label ?? req.kb_label ?? "", kb_impact: editData.kb_impact ?? req.kb_impact ?? "", kb_description: editData.kb_description ?? req.kb_description ?? "", kb_cards: liveData.kb_cards } : { kb_label: req.kb_label ?? "", kb_impact: req.kb_impact ?? "", kb_description: req.kb_description ?? "", kb_cards: liveData.kb_cards }}
                  onChange={d => { if (!editData) startEdit(); setEditData(p => ({ ...(p || req), kb_label: d.kb_label, kb_impact: d.kb_impact, kb_description: d.kb_description, kb_cards: d.kb_cards })); }}
                /></>)}
              {editSection === "features_apps"    && (
                <><DesignFlagToggle sectionKey="fa" value={editData?.design_flag_fa ?? liveData.design_flag_fa} onChange={v => { if (!editData) startEdit(); updEdit("design_flag_fa", v); }} />
                <FeaturesApps
                  data={editData ? { fa_label: editData.fa_label ?? req.fa_label ?? "", fa_impact: editData.fa_impact ?? req.fa_impact ?? "", fa_description: editData.fa_description ?? req.fa_description ?? "", fa_view_type: editData.fa_view_type ?? req.fa_view_type ?? "", fa_items: liveData.fa_items, fa_columns: liveData.fa_columns, fa_rows: liveData.fa_rows } : { fa_label: req.fa_label ?? "", fa_impact: req.fa_impact ?? "", fa_description: req.fa_description ?? "", fa_view_type: req.fa_view_type ?? "", fa_items: liveData.fa_items, fa_columns: liveData.fa_columns, fa_rows: liveData.fa_rows }}
                  onChange={d => { if (!editData) startEdit(); setEditData(p => ({ ...(p || req), fa_label: d.fa_label, fa_impact: d.fa_impact, fa_description: d.fa_description, fa_view_type: d.fa_view_type, fa_items: d.fa_items, fa_columns: d.fa_columns, fa_rows: d.fa_rows })); }}
                /></>)}
              {editSection === "customer_stories" && (
                <CustomerStories
                  data={editData ? { cs_label: editData.cs_label ?? req.cs_label ?? "", cs_impact: editData.cs_impact ?? req.cs_impact ?? "", cs_items: liveData.cs_items } : { cs_label: req.cs_label ?? "", cs_impact: req.cs_impact ?? "", cs_items: liveData.cs_items }}
                  onChange={d => { if (!editData) startEdit(); setEditData(p => ({ ...(p || req), cs_label: d.cs_label, cs_impact: d.cs_impact, cs_items: d.cs_items })); }}
                />
              )}
              {editSection === "promo_section"    && <><DesignFlagToggle sectionKey="promo" value={editData?.design_flag_promo ?? liveData.design_flag_promo} onChange={v => { if (!editData) startEdit(); updEdit("design_flag_promo", v); }} />{PROMO_FIELDS.map(([k, label, r, ml]) => <EditField key={k} k={k} label={label} required={!!r} multiline={!!ml} />)}</>}
              {editSection === "related_content"  && (
                <><DesignFlagToggle sectionKey="rc" value={editData?.design_flag_rc ?? liveData.design_flag_rc} onChange={v => { if (!editData) startEdit(); updEdit("design_flag_rc", v); }} />
                <RelatedContent
                  data={editData ? { rc_label: editData.rc_label ?? req.rc_label ?? "", rc_impact: editData.rc_impact ?? req.rc_impact ?? "", rc_cards: liveData.rc_cards } : { rc_label: req.rc_label ?? "", rc_impact: req.rc_impact ?? "", rc_cards: liveData.rc_cards }}
                  onChange={d => { if (!editData) startEdit(); setEditData(p => ({ ...(p || req), rc_label: d.rc_label, rc_impact: d.rc_impact, rc_cards: d.rc_cards })); }}
                /></>)}
              {editSection === "resources"        && RES_FIELDS.map(([k, label, r, ml]) => <EditField key={k} k={k} label={label} required={!!r} multiline={!!ml} />)}
              {editSection === "related_products" && (
                <RelatedProducts
                  data={editData ? { rp_label: editData.rp_label ?? req.rp_label ?? "", rp_impact: editData.rp_impact ?? req.rp_impact ?? "", rp_description: editData.rp_description ?? req.rp_description ?? "", rp_cards: liveData.rp_cards } : { rp_label: req.rp_label ?? "", rp_impact: req.rp_impact ?? "", rp_description: req.rp_description ?? "", rp_cards: liveData.rp_cards }}
                  onChange={d => { if (!editData) startEdit(); setEditData(p => ({ ...(p || req), rp_label: d.rp_label, rp_impact: d.rp_impact, rp_description: d.rp_description, rp_cards: d.rp_cards })); }}
                />
              )}
              {editSection === "training_support" && <><DesignFlagToggle sectionKey="ts" value={editData?.design_flag_ts ?? liveData.design_flag_ts} onChange={v => { if (!editData) startEdit(); updEdit("design_flag_ts", v); }} />{TS_FIELDS.map(([k, label, r, ml]) => <EditField key={k} k={k} label={label} required={!!r} multiline={!!ml} />)}</>}
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
              {[
                ["banner_image",       "Banner Image URL"],
                ["overview_media_url", "Overview Media URL"],
                ["promo_bg_image",     "Promo Section Background Image URL"],
              ].map(([k, label]) => (
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
                  ? (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"1.5rem 0" }}>
                    <svg width="70" height="70" viewBox="80 80 180 180">
                      <rect x="80" y="80" width="180" height="180" fill="none"/>
                      <rect x="153" y="153" width="34" height="34" fill="#1f1a1a" stroke="#2c90b2" strokeWidth="2.5" rx="2" style={{ animation:"pcb-chip 2s ease-in-out infinite" }}/>
                      <path className="pcb-tr"  d="M170 153 L170 100" style={{ animationDelay:"0s" }}/>
                      <path className="pcb-tr2" d="M170 187 L170 240" style={{ animationDelay:".2s" }}/>
                      <path className="pcb-tr"  d="M153 170 L100 170" style={{ animationDelay:".1s" }}/>
                      <path className="pcb-tr2" d="M187 170 L240 170" style={{ animationDelay:".15s" }}/>
                      {[[170,94,0,"#2c90b2"],[170,246,.2,"#3ec5cb"],[94,170,.1,"#2c90b2"],[246,170,.15,"#3ec5cb"]].map(([cx,cy,d,f],i)=>(
                        <g key={i}>
                          <circle cx={cx} cy={cy} r="7"   fill="#181313" stroke={f} strokeWidth="2" style={{ animation:`pcb-pad 2s ${d}s ease-in-out infinite` }}/>
                          <circle cx={cx} cy={cy} r="3.5" fill={f}                                  style={{ animation:`pcb-pad 2s ${d}s ease-in-out infinite` }}/>
                        </g>
                      ))}
                    </svg>
                    <div style={{ fontSize:11, color:"#646464", letterSpacing:".1em", fontFamily:"monospace", animation:"pcb-txt 2s ease-in-out infinite" }}>UPLOADING...</div>
                  </div>
                  )
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

          {/* ── Editorial QA Review Panel ── */}
          {actionable && isEditorialQA && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>✍️</span>
                <span className="text-xs text-uppercase font-medium">Editorial QA Review</span>
              </div>
              {user.can_assign && (
                <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #F3F3F3" }}>
                  <label style={{ fontSize: 11, color: "#646464", fontWeight: 500, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Assign to team member</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select defaultValue={req.assigned_to || ""} onChange={async (e) => { setAssigning(true); await supabase.from("requests").update({ assigned_to: e.target.value || null, assigned_by: user.id, assigned_at: new Date().toISOString() }).eq("id", req.id); await fetchAll(); setAssigning(false); }}
                      style={{ flex: 1, background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.55rem 0.8rem", fontSize: 13, color: "#181313", outline: "none", fontFamily: "'Rubik',sans-serif", cursor: "pointer" }}>
                      <option value="">Unassigned</option>
                      <option value={user.id}>Assign to myself</option>
                      {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {assigning && <span style={{ fontSize: 12, color: "#B5B5B5", alignSelf: "center" }}>Saving...</span>}
                  </div>
                </div>
              )}
              {editData && <div className="alert alert-warning" style={{ marginBottom: 10 }}>⚠️ Save your edits before approving.</div>}
              {error    && <div className="alert alert-error"  style={{ marginBottom: 10 }}>{error}</div>}
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add an approval note (optional)..." className="textarea" style={{ minHeight: 80, marginBottom: 10 }} />
              <div className="flex-col gap-8">
                <button onClick={doAdvance} disabled={saving || !!editData} className="btn-primary btn-full" style={{ opacity: saving || !!editData ? 0.5 : 1, justifyContent: "center" }}>
                  {saving ? "Processing..." : "Approve → Send to Design QA"}
                </button>
                <button onClick={() => setShowReturnModal(true)} disabled={saving} className="btn-danger">↩ Return for Revision</button>
              </div>
            </div>
          )}

          {/* ── Design QA Review Panel ── */}
          {actionable && isDesignQA && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>🎨</span>
                <span className="text-xs text-uppercase font-medium">Design QA Review</span>
              </div>
              {user.can_assign && (
                <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #F3F3F3" }}>
                  <label style={{ fontSize: 11, color: "#646464", fontWeight: 500, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Assign to team member</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select defaultValue={req.assigned_to || ""} onChange={async (e) => { setAssigning(true); await supabase.from("requests").update({ assigned_to: e.target.value || null, assigned_by: user.id, assigned_at: new Date().toISOString() }).eq("id", req.id); await fetchAll(); setAssigning(false); }}
                      style={{ flex: 1, background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.55rem 0.8rem", fontSize: 13, color: "#181313", outline: "none", fontFamily: "'Rubik',sans-serif", cursor: "pointer" }}>
                      <option value="">Unassigned</option>
                      <option value={user.id}>Assign to myself</option>
                      {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {assigning && <span style={{ fontSize: 12, color: "#B5B5B5", alignSelf: "center" }}>Saving...</span>}
                  </div>
                </div>
              )}
              {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a design review note (optional)..." className="textarea" style={{ minHeight: 80, marginBottom: 10 }} />
              <div className="flex-col gap-8">
                <button onClick={doAdvance} disabled={saving} className="btn-primary btn-full" style={{ justifyContent: "center" }}>
                  {saving ? "Processing..." : "Submit for Stakeholder Approval"}
                </button>
                <button onClick={() => setShowReturnModal(true)} disabled={saving} style={{ width: "100%", background: "#eff6ff", color: "#1b5793", border: "1px solid #3b82f633", borderRadius: 8, padding: "0.65rem", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                  💬 Query Stakeholder
                </button>
              </div>
            </div>
          )}

          {/* ── Stakeholder Pending Approval Panel ── */}
          {actionable && isStakeholderOwner && req.status === "pending_approval" && (
            <div className="card" style={{ marginBottom: 14, border: "2px solid #0e7a3d" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <span className="text-xs text-uppercase font-medium" style={{ color: "#0e7a3d" }}>Final Sign-off Required</span>
              </div>
              <p style={{ fontSize: 12, color: "#646464", lineHeight: 1.65, marginBottom: 14 }}>
                Editorial QA has approved the content and Design QA has finalised the images. Please review the full page before approving.
              </p>

              {/* Checklist */}
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "0.8rem 1rem", marginBottom: 14 }}>
                {[
                  ["Content approved by Editorial QA", true],
                  ["Images finalised by Design QA", true],
                  [`${attachments.length} asset${attachments.length !== 1 ? "s" : ""} uploaded by Design QA`, attachments.length > 0],
                  ["Ready for Web Team", true],
                ].map(([label, done]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: done ? "#166534" : "#B5B5B5", marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{done ? "✓" : "○"}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              {/* Design QA uploaded assets preview */}
              {attachments.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#3C3C3C", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>📎 Design QA Assets ({attachments.length})</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {attachments.map(a => (
                      <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 0.7rem", background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 7, textDecoration: "none", fontSize: 12, color: "#181313" }}>
                        <span style={{ fontSize: 15 }}>{a.name?.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ? "🖼️" : "📄"}</span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                        <span style={{ color: "#06b6d4", fontSize: 11, fontWeight: 500 }}>View ↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt to preview */}
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "0.65rem 0.8rem", marginBottom: 14, fontSize: 12, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
                <span>👁</span>
                <span>Use <strong>Preview Full Page</strong> on the left to review the complete layout before approving.</span>
              </div>

              {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a note for the Web Team (optional)..." className="textarea" style={{ minHeight: 70, marginBottom: 12 }} />
              <button onClick={doAdvance} disabled={saving}
                style={{ width: "100%", background: saving ? "#B5B5B5" : "#0e7a3d", color: "#fff", border: "none", borderRadius: 8, padding: "0.8rem", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {saving ? "Submitting..." : "✅ Approve & Send to Web Team"}
              </button>
            </div>
          )}

          {/* ── Returned Draft: Stakeholder resubmit panel ── */}
          {isReturnedDraft && isStakeholderOwner && (() => {
            const isDesignQuery = isQueriedByDesignQA;
            const accentColor   = isDesignQuery ? "#1b5793" : "#856404";
            const borderColor   = isDesignQuery ? "#3b82f633" : "#ffc107";
            const bgColor       = isDesignQuery ? "#eff6ff"   : "#fff8e6";
            const noteColor     = isDesignQuery ? "#1e40af"   : "#856404";
            const noteBorder    = isDesignQuery ? "#3b82f644" : "#ffc10744";
            const noteBorderL   = isDesignQuery ? "#3b82f6"   : "#ffc107";
            const icon          = isDesignQuery ? "💬"        : "↩";
            const title         = isDesignQuery ? "Design QA Query" : "Editorial QA — Revision Required";
            const description   = isDesignQuery
              ? "Design QA has a question about image requirements. Reply below and resubmit directly to Design QA — Editorial QA is not involved."
              : "Editorial QA has returned this for revision. Review their notes, use the ✎ Edit tab to make changes, then reply and resubmit.";
            const resubmitLabel = isDesignQuery ? "💬 Reply & Resubmit to Design QA" : "🚀 Resubmit to Editorial QA";
            const replyRequired = isDesignQuery; // Design QA queries always need a reply

            return (
              <div className="card" style={{ marginBottom: 14, border: `2px solid ${borderColor}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <span className="text-xs text-uppercase font-medium" style={{ color: accentColor }}>{title}</span>
                </div>
                <p style={{ fontSize: 12, color: "#646464", marginBottom: 14, lineHeight: 1.65 }}>{description}</p>

                {/* Notes from QA */}
                {comments.filter(c => c.is_return).length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: accentColor, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                      {isDesignQuery ? "Design QA Query" : "Revision Notes"}
                    </p>
                    {comments.filter(c => c.is_return).map(c => {
                      const m = ROLE_META[c.user_role] || ROLE_META.stakeholder;
                      return (
                        <div key={c.id} style={{ marginBottom: 8, padding: "0.65rem 0.8rem", background: bgColor, border: `1px solid ${noteBorder}`, borderRadius: 8, borderLeft: `3px solid ${noteBorderL}` }}>
                          <div style={{ fontSize: 11, color: noteColor, fontWeight: 600, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                            <span>{m.icon} {c.user_name}</span>
                            <span style={{ fontWeight: 400 }}>{new Date(c.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                          </div>
                          <div style={{ fontSize: 13, color: "#3C3C3C", lineHeight: 1.55 }}>
                            {c.text.replace(/^\[(Returned|Design Query)\]\s*/, "")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <label style={{ fontSize: 11, fontWeight: 600, color: "#646464", letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Your Reply {replyRequired
                    ? <span style={{ color: "#c0392b" }}>*</span>
                    : <span style={{ color: "#B5B5B5", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>}
                </label>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  placeholder={isDesignQuery ? "Answer their query or describe any image detail changes..." : "Explain what you changed or ask a question..."}
                  className="textarea" style={{ minHeight: 80, marginBottom: 12 }} />

                {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}
                {editData && <div className="alert alert-warning" style={{ marginBottom: 10 }}>⚠️ Unsaved edits will be saved automatically on resubmit.</div>}

                <button onClick={doResubmit} disabled={saving || (replyRequired && !comment.trim())}
                  style={{ width: "100%", background: saving || (replyRequired && !comment.trim()) ? "#B5B5B5" : isDesignQuery ? "#1b5793" : "#0e7a3d", color: "#fff", border: "none", borderRadius: 8, padding: "0.75rem", fontSize: 14, fontWeight: 500, cursor: saving || (replyRequired && !comment.trim()) ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {saving ? "Submitting..." : resubmitLabel}
                </button>
              </div>
            );
          })()}

          {/* ── Regular !actionable comment box (non-stakeholder returned draft) ── */}
          {!actionable && !isReturnedDraft && (
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
                      <div className={`comment-text${c.is_return ? " returned" : ""}`}>{c.text.replace(/^\[Returned\]\s*/, "")}</div>
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
