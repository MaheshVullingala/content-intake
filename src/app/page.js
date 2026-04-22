"use client";
import { useState, useEffect } from "react";
import { AppProvider, useApp } from "@/lib/store";
import LoginPage  from "@/components/LoginPage";
import Navbar     from "@/components/layout/Navbar";
import Dashboard  from "@/components/Dashboard";
import NewRequest from "@/components/NewRequest";
import ReqDetail  from "@/components/ReqDetail";
import AdminPanel from "@/components/AdminPanel";

function Shell() {
  const { currentUser } = useApp();
  const [view,  setView]  = useState("dashboard");
  const [reqId, setReqId] = useState(null);

  // Reset to dashboard whenever user changes (login/logout/role switch)
  useEffect(() => {
    setView("dashboard");
    setReqId(null);
  }, [currentUser?.id]);

  if (!currentUser) return <LoginPage />;

  const go = (v, id = null) => { setView(v); setReqId(id); };

  return (
    <div style={{ minHeight: "100vh", background: "#F3F3F3" }}>
      <Navbar go={go} view={view} />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {view === "dashboard" && <Dashboard go={go} />}
        {view === "new"       && <NewRequest go={go} />}
        {view === "detail"    && <ReqDetail reqId={reqId} go={go} />}
        {view === "admin"     && <AdminPanel />}
      </main>
    </div>
  );
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>;
}
