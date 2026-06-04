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
    const timeout = setTimeout(() => setLoading(false), 8000);

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheck);
      clearTimeout(timeout);
    };
  }, []);

  const logout = async () => {
    // Always clear local state immediately — don't wait for Supabase
    setUser(null);
    setView("dashboard");
    try {
      const signOut = supabase.auth.signOut();
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      );
      await Promise.race([signOut, timeout]);
    } catch(e) {
      // Silent — user is already signed out locally
      console.warn("Logout request did not complete:", e.message);
    }
  };

  const [navParams, setNavParams] = useState({});

  const go = (v, id = null, params = {}) => {
    setView(v);
    setReqId(id);
    setNavParams(params);
  };

  // Loading screen
  if (loading) return (
    <div className="app-loading">
      <div className="app-loading-mark">CI</div>
      <div className="app-loading-text">Loading...</div>
    </div>
  );

  // Not logged in
  if (!user) return (
    <AuthPage mode={authMode} onPasswordReset={() => setAuthMode("login")} />
  );

  // Pending role
  if (user.role === "pending") return (
    <div className="app-pending">
      <div className="app-pending-inner">
        <div className="app-pending-icon">⏳</div>
        <h1 className="app-pending-heading">Account pending approval</h1>
        <p className="app-pending-text">
          Your account has been created and is awaiting role assignment by an administrator.
        </p>
        <div className="app-pending-card">
          <div className="app-pending-card-label">Registered as</div>
          <div className="app-pending-card-name">{user.name}</div>
          <div className="app-pending-card-email">{user.email}</div>
        </div>
        <button className="auth-back-btn" onClick={logout}>Sign out</button>
      </div>
    </div>
  );

  // Main app
  return (
    <div className="app-shell">
      <Navbar go={go} view={view} user={user} logout={logout} />
      <main className="app-main">
        {view === "dashboard" && <Dashboard go={go} user={user} />}
        {view === "new"       && <NewRequest go={go} user={user} />}
        {view === "edit"      && <NewRequest go={go} user={user} draftId={reqId} />}
        {view === "detail"    && <ReqDetail reqId={reqId} go={go} user={user} navParams={navParams} />}
        {view === "admin"     && <AdminPanel user={user} />}
      </main>
    </div>
  );
}
