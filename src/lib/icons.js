// Icon library (Key Benefits picker). See sql/36-icon-library.sql.
// Files are in our own Supabase 'icon-library' bucket; metadata in icon_library.
// The list is small (hundreds at most), so it is fetched once and searched client-side.

let cache = null;

export async function loadIcons(supabase, { force = false } = {}) {
  if (cache && !force) return cache;
  const { data, error } = await supabase
    .from("icon_library")
    .select("id, title, keywords, category, public_url")
    .eq("active", true)
    .order("title", { ascending: true });
  if (error) { console.error("loadIcons failed:", error); return []; }
  cache = data || [];
  return cache;
}
export const clearIconCache = () => { cache = null; };

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const words = (s) => norm(s).split(" ").filter(w => w.length >= 3);

// Score one icon against free text (the typed search or the card's own title).
// Matches the icon title and its related key benefit titles (keywords).
export function scoreIcon(icon, text) {
  const q = norm(text);
  if (!q) return 0;
  const title = norm(icon.title);
  const kws = (icon.keywords || []).map(norm).filter(Boolean);
  let score = 0;
  if (title === q) score += 6;
  if (kws.includes(q)) score += 6;
  if (title.includes(q)) score += 4;
  if (kws.some(k => k.includes(q) || (q.length >= 4 && q.includes(k)))) score += 3;
  if (norm(icon.category).includes(q)) score += 1;
  const hay = [title, ...kws].join(" ");
  words(text).forEach(w => { if (hay.includes(w)) score += 1; });
  return score;
}

// Returns icons matching `text`, best first (score > 0 only).
export function searchIcons(icons, text) {
  return icons
    .map(i => ({ i, s: scoreIcon(i, text) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i.title.localeCompare(b.i.title))
    .map(x => x.i);
}

// Shape stored in a card's image_ref when a library icon is chosen.
export const libraryRef = (icon) => ({ type: "library", value: icon.title, url: icon.public_url, icon_id: icon.id });
