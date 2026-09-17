// Tags — shared, searchable tag list for the Banner section (see
// sql/28-tags.sql for schema/RLS). Two entry points:
//   searchTags()     — live search as the stakeholder types (3+ chars)
//   requestNewTag()  — stakeholder requests a brand-new tag; lands as
//                       status='pending' until an admin approves it
//                       (AdminPanel → Tags)
//
// Per-request selections are stored denormalized on requests.banner_tags
// (see NewRequest.js/ProposeChangeWizard.js banner state) as full
// snapshots — {id, name, category, url, status} — matching every other
// repeatable-item field in this app. That means a tag approved/renamed
// after a request already picked it does NOT retroactively change what
// that request shows; this mirrors kb_cards/cs_items/oth_items and is a
// deliberate "snapshot at submission time" choice, not an oversight.

const MIN_QUERY_LEN = 3;

// Search approved tags by name (case-insensitive substring). Returns []
// for queries under 3 chars rather than erroring, since the UI is meant
// to trigger this only once the user has typed enough to narrow results.
export async function searchTags(supabase, query, { limit = 25 } = {}) {
  const q = (query || "").trim();
  if (q.length < MIN_QUERY_LEN) return [];

  const { data, error } = await supabase
    .from("tags")
    .select("id, name, category, url, status")
    .eq("status", "approved")
    .ilike("name", `%${q}%`)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("searchTags failed:", error);
    return [];
  }
  return data || [];
}

// Request a brand-new tag by name. Always inserted as status='pending' —
// the RLS insert policy (tags_insert_request) enforces this server-side
// regardless of what's sent here, so this is belt-and-suspenders, not
// the actual security boundary.
//
// Returns { tag, error }. error.code === "23505" means a tag with this
// name (approved or already-pending) already exists — the unique index
// in sql/28-tags.sql is case-insensitive, so surface that as a friendly
// "already exists/pending" message rather than a raw constraint error.
export async function requestNewTag(supabase, name, userId) {
  const trimmed = (name || "").trim();
  if (!trimmed) return { tag: null, error: { message: "Tag name is required." } };

  const { data, error } = await supabase
    .from("tags")
    .insert({ name: trimmed, status: "pending", requested_by: userId })
    .select("id, name, category, url, status")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { tag: null, error: { ...error, message: `"${trimmed}" already exists or is already pending approval.` } };
    }
    return { tag: null, error };
  }
  return { tag: data, error: null };
}

// Display helper — "Category / Name" per the stakeholder's spec, falling
// back to just the name when a tag (esp. a freshly-requested one) has no
// category yet.
export const formatTagLabel = (tag) =>
  tag?.category ? `${tag.category} / ${tag.name}` : (tag?.name || "");
