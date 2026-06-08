"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, getUserProfile } from "@/lib/supabase";
import AuthPage   from "@/components/auth/AuthPage";
import Navbar     from "@/components/layout/Navbar";
import Dashboard  from "@/components/Dashboard";
import NewRequest from "@/components/NewRequest";
import ReqDetail  from "@/components/ReqDetail";
import AdminPanel from "@/components/AdminPanel";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
const WARNING_SECS    = 60; // show warning 60s before logout

export default function App() {
  const [user,        setUser]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [view,        setView]        = useState("dashboard");
  const [reqId,       setReqId]       = useState(null);
  const [navParams,   setNavParams]   = useState({});
  const [authMode,    setAuthMode]    = useState("login");
  const [timeoutMins, setTimeoutMins] = useState(5); // default, overridden from DB
  const [idleWarning, setIdleWarning] = useState(false);
  const [countdown,   setCountdown]   = useState(WARNING_SECS);

  const idleTimer    = useRef(null);
  const warnTimer    = useRef(null);
  const countTimer   = useRef(null);
  const currentView  = useRef("dashboard");
  const saveDraftRef = useRef(null); // NewRequest will register its save fn here

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") {
        if (session) {
          try { const p = await getUserProfile(); setUser(p); } catch(e) { setUser(null); }
        } else { setUser(null); }
        setLoading(false);
      }
      if (event === "SIGNED_IN") {
        try {
          const p = await getUserProfile();
          setUser(prev => { if (!prev) { setView("dashboard"); setReqId(null); } return p; });
        } catch(e) {}
        setLoading(false);
      }
      if (event === "SIGNED_OUT") { setUser(null); setView("dashboard"); setLoading(false); }
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") setLoading(false);
    });

    const sessionCheck = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) setUser(prev => { if (prev) supabase.auth.signOut(); return prev; });
    }, 2 * 60 * 1000);

    const timeout = setTimeout(() => setLoading(false), 8000);
    return () => { subscription.unsubscribe(); clearInterval(sessionCheck); clearTimeout(timeout); };
  }, []);

  // ── Fetch timeout setting from DB when user logs in ───────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchTimeout = async () => {
      const { data } = await supabase.from("settings").select("timeout_mins").eq("id", "global").single();
      if (data?.timeout_mins) setTimeoutMins(data.timeout_mins);
    };
    fetchTimeout();
  }, [user?.id]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    setUser(null);
    setView("dashboard");
    setIdleWarning(false);
    clearTimeout(idleTimer.current);
    clearTimeout(warnTimer.current);
    clearInterval(countTimer.current);
    try {
      await Promise.race([supabase.auth.signOut(), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 5000))]);
    } catch(e) {}
  }, []);

  // ── Auto-logout on idle ───────────────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (!user) return;
    setIdleWarning(false);
    clearTimeout(idleTimer.current);
    clearTimeout(warnTimer.current);
    clearInterval(countTimer.current);

    const totalMs  = timeoutMins * 60 * 1000;
    const warnMs   = totalMs - (WARNING_SECS * 1000);

    // Show warning before logout
    warnTimer.current = setTimeout(() => {
      setIdleWarning(true);
      setCountdown(WARNING_SECS);
      // Countdown ticker
      countTimer.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(countTimer.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }, warnMs > 0 ? warnMs : 0);

    // Auto-save draft + logout
    idleTimer.current = setTimeout(async () => {
      // Auto-save if user is in NewRequest view
      if (currentView.current === "new" || currentView.current === "edit") {
        if (saveDraftRef.current) {
          try { await saveDraftRef.current(); } catch(e) {}
        }
      }
      await logout();
    }, totalMs);
  }, [user, timeoutMins, logout]);

  // Track current view for auto-save decision
  const go = (v, id = null, params = {}) => {
    setView(v);
    setReqId(id);
    setNavParams(params);
    currentView.current = v;
  };

  // Attach activity listeners when user is logged in
  useEffect(() => {
    if (!user) return;
    resetIdleTimer();
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetIdleTimer));
      clearTimeout(idleTimer.current);
      clearTimeout(warnTimer.current);
      clearInterval(countTimer.current);
    };
  }, [user, resetIdleTimer]);

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="app-loading">
      <div className="app-loading-mark">CI</div>
      <div className="app-loading-text">Loading...</div>
    </div>
  );

  if (!user) return <AuthPage mode={authMode} onPasswordReset={() => setAuthMode("login")} />;

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

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <Navbar go={go} view={view} user={user} logout={logout} />

      {/* ── Idle Warning Toast ── */}
      {idleWarning && (
        <div className="idle-warning-toast">
          <span className="idle-warning-icon">⚠️</span>
          <div className="idle-warning-text">
            <div className="idle-warning-title">You'll be logged out in {countdown}s due to inactivity</div>
            <div className="idle-warning-sub">Click anywhere to stay logged in</div>
          </div>
          <button className="idle-warning-stay" onClick={resetIdleTimer}>Stay logged in</button>
        </div>
      )}

      <main className="app-main">
        {view === "dashboard" && <Dashboard go={go} user={user} />}
        {view === "new"       && <NewRequest go={go} user={user} saveDraftRef={saveDraftRef} />}
        {view === "edit"      && <NewRequest go={go} user={user} draftId={reqId} saveDraftRef={saveDraftRef} />}
        {view === "detail"    && <ReqDetail reqId={reqId} go={go} user={user} navParams={navParams} />}
        {view === "admin"     && <AdminPanel user={user} timeoutMins={timeoutMins} onTimeoutChange={setTimeoutMins} />}
      </main>
    </div>
  );
}
