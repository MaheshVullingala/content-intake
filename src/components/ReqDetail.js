"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PCBLoader } from "@/components/PCBLoader";
import TaskBoard from "@/components/TaskBoard";

// Shown once, right after a stakeholder submits (NewRequest.js passes
// { submitted: true } through go()). Request number + a link that opens
// this request directly (handled by the ?request= deep-link effect in
// page.js), each with a copy button.
function SubmittedBanner({ req }) {
  const [copied, setCopied] = useState("");
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const number = req.request_display_id || req.id;
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/?request=${req.id}`;
  const copy = async (key, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1800); } catch { /* clipboard blocked */ }
  };
  const row = (key, label, value, mono) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#646464", minWidth: 96 }}>{label}</span>
      <code style={{ fontSize: 12, fontFamily: mono ? "monospace" : "'Rubik',sans-serif", background: "#fff", border: "1px solid #E0E0E0", borderRadius: 6, padding: "3px 8px", wordBreak: "break-all", flex: 1 }}>{value}</code>
      <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px", whiteSpace: "nowrap" }} onClick={() => copy(key, value)}>
        {copied === key ? "Copied!" : "Copy"}
      </button>
    </div>
  );
  return (
    <div style={{ background: "#ecfdf5", border: "1px solid #2a7a4b44", borderRadius: 10, padding: "0.9rem 1.1rem", margin: "1rem 1.5rem 0", fontFamily: "'Rubik',sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 14, color: "#2a7a4b" }}>Request submitted</strong>
        <button type="button" onClick={() => setDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#646464", fontSize: 12 }}>Dismiss</button>
      </div>
      {row("number", "Request number", number, true)}
      {row("url", "Request link", url, false)}
    </div>
  );
}

export default function ReqDetail({ reqId, user, go, navParams }) {
  const [req,          setReq]          = useState(null);
  const [attachments,  setAttachments]  = useState([]);
  const [loading,      setLoading]      = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: r }, { data: atts }] = await Promise.all([
        supabase.from("requests").select("*, users!requests_created_by_fkey(name, role)").eq("id", reqId).single(),
        supabase.from("attachments").select("*").eq("request_id", reqId).order("created_at"),
      ]);
      setReq(r || null);
      setAttachments(atts || []);
    } catch(e) {
      console.error("ReqDetail fetch:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [reqId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <PCBLoader label="LOADING..." />
    </div>
  );
  if (!req) return (
    <div style={{ padding: "2rem", color: "#B5B5B5", fontFamily: "'Rubik',sans-serif" }}>
      Request not found.
    </div>
  );

  if (req?.overall_status) {
    return (
      <>
        {navParams?.submitted && <SubmittedBanner req={req} />}
        <TaskBoard
          req={req}
          user={user}
          supabase={supabase}
          tasks={[]}
          attachments={attachments}
          onRefresh={fetchAll}
          go={go}
        />
      </>
    );
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center",
      color: "#B5B5B5", fontFamily: "'Rubik',sans-serif" }}>
      This request uses the legacy workflow and is no longer supported.
    </div>
  );
}
