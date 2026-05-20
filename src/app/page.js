"use client";
import { useState, useEffect } from "react";
import { supabase, getUserProfile } from "@/lib/supabase";
import AuthPage   from "@/components/auth/AuthPage";
import Navbar     from "@/components/layout/Navbar";
import Dashboard  from "@/components/Dashboard";
import NewRequest from "@/components/NewRequest";
import ReqDetail  from "@/components/ReqDetail";
import AdminPanel from "@/components/AdminPanel";

export default function App() {
  const [user,     setUser]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState("dashboard");
  const [reqId,    setReqId]    = useState(null);
  const [authMode, setAuthMode] = useState("login");

  useEffect(() => {
    // Single source of truth — use onAuthStateChange only
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, "Session:", !!session);

      if (event === "INITIAL_SESSION") {
        if (session) {
          try {
            const profile = await getUserProfile();
            setUser(profile);
          } catch(e) {
            console.error("Profile fetch failed:", e);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }

      if (event === "SIGNED_IN") {
        try {
          const profile = await getUserProfile();
          setUser(prev => {
            if (!prev) {
              setView("dashboard");
              setReqId(null);
            }
            return profile;
          });
        } catch(e) {
          console.error("Profile fetch on sign-in failed:", e);
        }
        setLoading(false);
      }

      if (event === "SIGNED_OUT") {
        setUser(null);
        setView("dashboard");
        setLoading(false);
      }

      if (event === "TOKEN_REFRESHED") {
        // Token refreshed silently — keep existing user
        setLoading(false);
      }

      // Session expired or refresh token invalid — force sign out
      if (event === "USER_UPDATED") {
        setLoading(false);
      }
    });

    // Detect session expiry while app is open (check every 2 minutes)
    const sessionCheck = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Session gone — user was logged in but token expired
        setUser(prev => {
          if (prev) {
            console.log("Session expired — signing out");
            supabase.auth.signOut();
          }
          return prev;
        });
      }
    }, 2 * 60 * 1000); // every 2 minutes

    // Safety timeout — if loading takes more than 6s, stop
    const timeout = setTimeout(() => setLoading(false), 6000);

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheck);
      clearTimeout(timeout);
    };
  }, []);

  const logout = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await supabase.auth.signOut();
      clearTimeout(timeout);
    } catch(e) {
      console.error("Logout error:", e);
    } finally {
      // Always clear user state even if signOut fails
      setUser(null);
      setView("dashboard");
    }
  };

  const go = (v, id = null) => {
    setView(v);
    setReqId(id);
  };

  // Loading screen
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 52, height: 52, background: "#14b8a6", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#0f172a", fontFamily: "'Rubik',sans-serif" }}>CI</div>
      <div style={{ color: "#94a3b8", fontSize: 13, fontFamily: "'Rubik',sans-serif" }}>Loading...</div>
    </div>
  );

  // Not logged in
  if (!user) return (
    <AuthPage mode={authMode} onPasswordReset={() => setAuthMode("login")} />
  );

  // Pending role
  if (user.role === "pending") return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Rubik',sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>⏳</div>
        <h1 style={{ color: "#F3F3F3", fontSize: 22, fontWeight: 500, marginBottom: 10 }}>Account pending approval</h1>
        <p style={{ color: "#646464", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          Your account has been created and is awaiting role assignment by an administrator.
        </p>
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "1rem 1.2rem", marginBottom: 24, textAlign: "left" }}>
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
      <main style={{ maxWidth: "100%", margin: "0 auto", padding: "2rem 2.5rem", background: "#f8fafc", minHeight: "calc(100vh - 56px)" }}>
        {view === "dashboard" && <Dashboard go={go} user={user} />}
        {view === "new"       && <NewRequest go={go} user={user} />}
        {view === "edit"      && <NewRequest go={go} user={user} draftId={reqId} />}
        {view === "detail"    && <ReqDetail reqId={reqId} go={go} user={user} />}
        {view === "admin"     && <AdminPanel user={user} />}
      </main>
    </div>
  );
}
