// Client-side helper for writing audit_log entries. RLS blocks direct
// client inserts (audit_log is immutable / service_role-only), so this
// posts to /api/audit instead, which uses the service role key server-side.
//
// Audit logging must never break the calling flow, so every failure —
// network, validation, whatever — is swallowed silently here.
export async function logAudit(supabase, user, action, entityType, entityId, extra = {}) {
  try {
    let email = user?.email;
    if (!email && supabase?.auth) {
      const { data } = await supabase.auth.getUser();
      email = data?.user?.email ?? null;
    }

    await fetch("/api/audit", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id:         user?.id ?? null,
        user_role:       user?.role ?? null,
        user_email:      email ?? null,
        user_department: user?.department ?? null,
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
