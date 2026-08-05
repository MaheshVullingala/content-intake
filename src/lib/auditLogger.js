import { getAccessToken } from "@/lib/security";

// Client-side helper for writing audit_log entries. RLS blocks direct
// client inserts (audit_log is immutable / service_role-only), so this
// posts to /api/audit instead, which uses the service role key server-side.
//
// The route re-derives user_id/email/role/department from the verified
// session itself — user/email here are only used for the request to
// resolve *which* session to verify, not trusted as the log's identity.
//
// Audit logging must never break the calling flow, so every failure —
// network, validation, whatever — is swallowed silently here.
export async function logAudit(supabase, user, action, entityType, entityId, extra = {}) {
  try {
    const token = await getAccessToken(supabase);
    if (!token) return; // no session — nothing to attribute the entry to

    await fetch("/api/audit", {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({
        action,
        entity_type: entityType,
        entity_id:   entityId,
        ...extra,
      }),
    });
  } catch {
    // Swallowed — audit failures must never block the main flow.
  }
}
