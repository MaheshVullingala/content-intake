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
  // 60, not 5 — this is a fallback for the brief window before the DB
  // value loads (or if that fetch ever fails), and it's also what any
  // component that captures this prop into its own useState (see
  // AdminPanel's localTimeout) falls back to if it renders before the
  // fetch below resolves. 5 minutes as that fallback was aggressive
  // enough to force-logout someone mid-form and, via that same staleness
  // path, get silently written back to the DB as the real setting.
  const [timeoutMins, setTimeoutMins] = useState(60);
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
              // 25s — matches the fetch-level abort ceiling in supabase.js,
              // so a slow-but-alive backend (e.g. a cold-started project)
              // gets a fair chance to answer before this falls back to
              // showing the login screen. Was 15s.
              new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 25000))
            ]);
            if (p) { setUser(p); }
            else {
              // getUserProfile() itself completed and found nothing — a
              // real "no matching profile" case, not just slowness. Safe
              // to actually sign out here.
              setUser(null);
              clearSupabaseStorage();
              await supabase.auth.signOut().catch(() => {});
            }
          } catch(e) {
            // The race's own timeout branch, not an auth failure — the
            // profile fetch was just slow (e.g. Supabase cold start after
            // idle). Treating that the same as an invalid session used to
            // force a real signOut() here, logging people out of a
            // perfectly valid session just because one request was slow.
            // Show the login screen for now, but leave the actual session
            // token alone — a retry/refresh gets a fresh INITIAL_SESSION
            // and, if the network behaves this time, logs them back in
            // without ever having actually been signed out.
            setUser(null);
          }
        } else { setUser(null); }
        setLoading(false);
      }
      if (event === "SIGNED_IN") {
        try {
          const p = await Promise.race([
            getUserProfile(),
            new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 15000))
          ]);
          if (p) setUser(prev => { if (!prev) { setView("dashboard"); setReqId(null); } return p; });
          else setUser(null); // real "no profile found", not a timeout — see INITIAL_SESSION above
        } catch(e) {
          // Timeout only — same reasoning as INITIAL_SESSION: don't sign
          // out or clear storage over mere slowness, just fall back to
          // showing the login screen.
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
