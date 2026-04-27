"use client";
import { useState, useEffect } from "react";
import { supabase, getUserProfile } from "@/lib/supabase";
import AuthPage    from "@/components/auth/AuthPage";
import Navbar      from "@/components/layout/Navbar";
import Dashboard   from "@/components/Dashboard";
import NewRequest  from "@/components/NewRequest";
import ReqDetail   from "@/components/ReqDetail";
import AdminPanel  from "@/components/AdminPanel";

export default function App() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState("dashboard");
  const [reqId,   setReqId]   = useState(null);
  const [authMode,setAuthMode]= useState("login");

  // Check session on mount
  useEffect(() => {
    const initSession = async () => {
      const profile = await getUserProfile();
      setUser(profile);
      setLoading(false);
    };
    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const profile = await getUserProfile();
        setUser(profile);
        setView("dashboard");
        setReqId(null);
      }
      if (event === "SIGNED_OUT") {
        setUser(null);
        setView("dashboard");
      }
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("reset");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const go = (v, id = null) => {
    setView(v);
    setReqId(id);
  };

  // Loading spinner
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#181313", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 52, height: 52, background: "#F3F3F3", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#181313", fontFamily: "'Rubik',sans-serif" }}>CI</div>
      <div style={{ color: "#3C3C3C", fontSize: 13, fontFamily: "'Rubik',sans-serif" }}>Loading...</div>
    </div>
  );

  // Not logged in
  if (!user) return (
    <AuthPage mode={authMode} onPasswordReset={() => { setAuthMode("login"); }} />
  );

  // Pending role — waiting for admin assignment
  if (user.role === "pending") return (
    <div style={{ minHeight: "100vh", background: "#181313", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Rubik',sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>⏳</div>
        <h1 style={{ color: "#F3F3F3", fontSize: 22, fontWeight: 500, marginBottom: 10 }}>Account pending approval</h1>
        <p style={{ color: "#646464", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          Your account has been created and is awaiting role assignment by an administrator. You will be able to access the portal once your role is assigned.
        </p>
        <div style={{ background: "#1e1a1a", border: "1px solid #2e2a2a", borderRadius: 10, padding: "1rem 1.2rem", marginBottom: 24, textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "#646464", marginBottom: 4 }}>Registered as</div>
          <div style={{ fontSize: 14, color: "#F3F3F3", fontWeight: 500 }}>{user.name}</div>
          <div style={{ fontSize: 12, color: "#646464", marginTop: 2 }}>{user.email}</div>
        </div>
        <button onClick={logout} style={{ background: "#F3F3F3", color: "#181313", border: "none", borderRadius: 8, padding: "0.65rem 1.5rem", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
          Sign out
        </button>
      </div>
    </div>
  );

  // Main app
  return (
    <div style={{ minHeight: "100vh", background: "#F3F3F3" }}>
      <Navbar go={go} view={view} user={user} logout={logout} />
      <main style={{ maxWidth: "100%", margin: "0 auto", padding: "2rem 2.5rem" }}>
        {view === "dashboard" && <Dashboard go={go} user={user} />}
        {view === "new"       && <NewRequest go={go} user={user} />}
        {view === "detail"    && <ReqDetail reqId={reqId} go={go} user={user} />}
        {view === "admin"     && <AdminPanel user={user} />}
      </main>
    </div>
  );
}
