"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PCBLoader } from "@/components/PCBLoader";
import TaskBoard from "@/components/TaskBoard";

export default function ReqDetail({ reqId, user, go }) {
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
      <TaskBoard
        req={req}
        user={user}
        supabase={supabase}
        tasks={[]}
        attachments={attachments}
        onRefresh={fetchAll}
        go={go}
      />
    );
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center",
      color: "#B5B5B5", fontFamily: "'Rubik',sans-serif" }}>
      This request uses the legacy workflow and is no longer supported.
    </div>
  );
}
