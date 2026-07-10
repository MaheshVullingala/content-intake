"use client";
import { useState, useEffect, useRef } from "react";

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell({ user, supabase, go }) {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);
  const intervalRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const badge = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  const fetchNotifications = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, request_id, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(intervalRef.current);
  }, [user?.id]);

  const handleClick = async (n) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    setOpen(false);
    if (n.request_id) go("detail", n.request_id);
  };

  const markAllRead = async () => {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Notifications"
        style={{
          position: "relative",
          background: open ? "rgba(62,197,203,0.1)" : "none",
          border: "none", borderRadius: 8,
          padding: "5px 7px", cursor: "pointer",
          fontSize: 17, lineHeight: 1, color: "#94a3b8",
          display: "flex", alignItems: "center",
          transition: "background 0.15s",
        }}
      >
        🔔
        {badge && (
          <span style={{
            position: "absolute", top: 1, right: 1,
            background: "#dc2626", color: "#fff",
            fontSize: 9, fontWeight: 700,
            fontFamily: "'Rubik', sans-serif",
            borderRadius: 10, padding: "0 3px",
            minWidth: 14, height: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}>
            {badge}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)}
               style={{ position: "fixed", inset: 0, zIndex: 200 }} />

          {/* Dropdown */}
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: -8,
            background: "#0a1628",
            border: "1px solid #1e4f8a",
            borderRadius: 12, width: 320,
            zIndex: 201,
            boxShadow: "0 8px 28px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "11px 16px 10px",
              borderBottom: "1px solid #1e4f8a",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{
                fontSize: 13, fontWeight: 600, color: "#f1f5f9",
                fontFamily: "'Rubik', sans-serif",
              }}>
                Notifications
                {unreadCount > 0 && (
                  <span style={{ color: "#3ec5cb", marginLeft: 4 }}>· {unreadCount} new</span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: "none", border: "none", color: "#3ec5cb",
                    fontSize: 11, cursor: "pointer",
                    fontFamily: "'Rubik', sans-serif", padding: 0,
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: "28px 16px", textAlign: "center",
                  color: "#475569", fontSize: 13,
                  fontFamily: "'Rubik', sans-serif",
                }}>
                  No notifications yet
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: n.is_read ? "none" : "rgba(62,197,203,0.05)",
                      border: "none", borderBottom: "1px solid #0f2744",
                      padding: "11px 16px", cursor: "pointer",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e =>
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={e =>
                      e.currentTarget.style.background =
                        n.is_read ? "none" : "rgba(62,197,203,0.05)"}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      {/* Unread dot */}
                      <div style={{
                        width: 7, height: 7, borderRadius: "50%",
                        flexShrink: 0, marginTop: 4,
                        background: n.is_read ? "#1e4f8a" : "#3ec5cb",
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12,
                          fontWeight: n.is_read ? 400 : 600,
                          color: n.is_read ? "#94a3b8" : "#f1f5f9",
                          fontFamily: "'Rubik', sans-serif",
                          marginBottom: 3,
                          whiteSpace: "nowrap", overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {n.title}
                        </div>
                        {n.message && (
                          <div style={{
                            fontSize: 11, color: "#64748b",
                            fontFamily: "'Rubik', sans-serif",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}>
                            {n.message}
                          </div>
                        )}
                        <div style={{
                          fontSize: 10, color: "#334155",
                          fontFamily: "'Rubik', sans-serif",
                          marginTop: 4,
                        }}>
                          {timeAgo(n.created_at)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
