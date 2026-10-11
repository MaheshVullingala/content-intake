// Returns the URL only if it is a plain http(s) URL, else null. Use for any
// href built from user-editable data (e.g. requests.jira_ticket_url) so a
// "javascript:" / "data:" link can never render as a clickable anchor.
export function safeHttpUrl(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!/^https?:\/\//i.test(v)) return null;
  try { new URL(v); return v; } catch { return null; }
}
