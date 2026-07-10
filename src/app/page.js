"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, getUserProfile } from "@/lib/supabase";
import AuthPage      from "@/components/auth/AuthPage";
import Navbar        from "@/components/layout/Navbar";
import { ROLE_OPTIONS } from "@/lib/constants";
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
  const [pendingNav,       setPendingNav]       = useState(null);
  const [impersonatedRole, setImpersonatedRole] = useState(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") {
        if (session) {
          try {
            const p = await Promise.race([
              getUserProfile(),
              new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 8000))
            ]);
            if (p) { setUser(p); }
            else {
              setUser(null);
              clearSupabaseStorage();
              await supabase.auth.signOut().catch(() => {});
            }
          } catch(e) {
            setUser(null);
            clearSupabaseStorage();
            await supabase.auth.signOut().catch(() => {});
          }
        } else { setUser(null); }
        setLoading(false);
      }
      if (event === "SIGNED_IN") {
        try {
          const p = await Promise.race([
            getUserProfile(),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 8000))
          ]);
          if (p) setUser(prev => { if (!prev) { setView("dashboard"); setReqId(null); } return p; });
        } catch(e) {
          // Timeout on SIGNED_IN — clear and let user retry
          clearSupabaseStorage();
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
        }
        setLoading(false);
      }
      if (event === "SIGNED_OUT") { setUser(null); setView("dashboard"); setLoading(false); }
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") setLoading(false);
      if (event === "TOKEN_REFRESH_FAILED") {
        // Token refresh failed — clear storage and force re-login
        setUser(null);
        clearSupabaseStorage();
        setLoading(false);
      }
    });

    const sessionCheck = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) setUser(prev => { if (prev) supabase.auth.signOut(); return prev; });
    }, 5 * 60 * 1000);

    const timeout = setTimeout(() => setLoading(false), 8000);
    return () => { subscription.unsubscribe(); clearInterval(sessionCheck); clearTimeout(timeout); };
  }, []);

  // ── Read impersonated role from localStorage ─────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cip-impersonated-role");
      if (stored) setImpersonatedRole(stored);
    } catch {}
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
  // Clear all Supabase auth tokens from localStorage — prevents stale session accumulation
  const clearSupabaseStorage = () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("sb-") || key.startsWith("supabase") || key === "cip-auth") {
          localStorage.removeItem(key);
        }
      });
    } catch(e) {}
  };

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
    // Always clear localStorage after signOut to prevent token accumulation
    clearSupabaseStorage();
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
  const effectiveUser = user?.role === "super_admin" && impersonatedRole
    ? { ...user, role: impersonatedRole }
    : user;

  const impersonatedLabel = impersonatedRole
    ? (ROLE_OPTIONS.find(r => r.value === impersonatedRole)?.label ?? impersonatedRole)
    : null;

  return (
    <div className="app-shell">
      {/* Navbar always gets the real user so the role switcher is always visible */}
      <Navbar go={go} view={view} user={user} supabase={supabase} logout={logout} onNavigate={(dest) => { if ((view === "new" || view === "edit") && dest !== view) setPendingNav(dest); else go(dest); }} />

      {/* Impersonation banner */}
      {user?.role === "super_admin" && impersonatedRole && (
        <div style={{
          background: "#0f2744",
          borderBottom: "1px solid #3ec5cb44",
          padding: "6px 2.5rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 12, color: "#3ec5cb", fontFamily: "'Rubik', sans-serif" }}>
            ⚡ Viewing as: <strong>{impersonatedLabel}</strong>
          </span>
          <button
            onClick={() => {
              try { localStorage.removeItem("cip-impersonated-role"); } catch {}
              window.location.reload();
            }}
            style={{
              background: "none",
              border: "1px solid #3ec5cb55",
              borderRadius: 5,
              padding: "2px 10px",
              fontSize: 11,
              color: "#3ec5cb",
              cursor: "pointer",
              fontFamily: "'Rubik', sans-serif",
            }}
          >
            Switch back to Super Admin
          </button>
        </div>
      )}

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
        {view === "dashboard" && <Dashboard go={go} user={effectiveUser} />}
        {view === "new"       && <NewRequest go={go} user={effectiveUser} saveDraftRef={saveDraftRef} pendingNav={pendingNav} onClearPendingNav={() => setPendingNav(null)} />}
        {view === "edit"      && <NewRequest go={go} user={effectiveUser} draftId={reqId} saveDraftRef={saveDraftRef} pendingNav={pendingNav} onClearPendingNav={() => setPendingNav(null)} />}
        {view === "detail"    && <ReqDetail reqId={reqId} go={go} user={effectiveUser} navParams={navParams} />}
        {view === "admin"     && <AdminPanel user={effectiveUser} timeoutMins={timeoutMins} onTimeoutChange={setTimeoutMins} />}
      </main>
    </div>
  );
}
