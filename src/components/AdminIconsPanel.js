"use client";
import { useState, useEffect, useRef } from "react";
import { FaUpload, FaTrash, FaSpinner, FaSearch } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { clearIconCache } from "@/lib/icons";

// Admin -> Icons: manage the Key Benefits icon library (sql/36-icon-library.sql).
// Upload SVG/PNG files (multi-select; title defaults to the file name), then set
// each icon's "related key benefit titles" -- what the picker searches besides
// the icon title. Files are stored in our own 'icon-library' bucket.

const MAX_BYTES = 512 * 1024;
const titleFromFile = (name) => name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
  .replace(/\b\w/g, c => c.toUpperCase());
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
const parseKeywords = (s) => s.split(/[;,\n]/).map(x => x.trim()).filter(Boolean);

export default function AdminIconsPanel() {
  const [icons, setIcons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({}); // id -> {title, keywords}
  const fileRef = useRef(null);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 4000); };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("icon_library").select("*").order("title", { ascending: true });
    if (error) flash(`Failed to load icons: ${error.message}`);
    setIcons(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    const results = [];
    for (const file of files) {
      const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
      const isPng = file.type === "image/png" || /\.png$/i.test(file.name);
      if (!isSvg && !isPng) { results.push(`${file.name}: only SVG/PNG allowed`); continue; }
      if (file.size > MAX_BYTES) { results.push(`${file.name}: over 512 KB`); continue; }
      if (isSvg) {
        const text = await file.text();
        if (/<script|\son\w+\s*=|javascript:|<foreignObject/i.test(text)) { results.push(`${file.name}: SVG contains scripts/unsafe markup`); continue; }
      }
      const path = slug(file.name);
      const { error: upErr } = await supabase.storage.from("icon-library").upload(path, file, { upsert: false, contentType: isSvg ? "image/svg+xml" : "image/png" });
      if (upErr) { results.push(`${file.name}: ${/exists/i.test(upErr.message) ? "already uploaded" : upErr.message}`); continue; }
      const { data: { publicUrl } } = supabase.storage.from("icon-library").getPublicUrl(path);
      const { error: insErr } = await supabase.from("icon_library").insert({ title: titleFromFile(file.name), file_path: path, public_url: publicUrl });
      if (insErr) { await supabase.storage.from("icon-library").remove([path]); results.push(`${file.name}: ${insErr.message}`); }
    }
    if (fileRef.current) fileRef.current.value = "";
    clearIconCache();
    await load();
    setBusy(false);
    const ok = files.length - results.length;
    flash(`${ok} uploaded${results.length ? `; ${results.length} skipped — ${results.join("; ")}` : ""}`);
  };

  const draftOf = (i) => drafts[i.id] || { title: i.title, keywords: (i.keywords || []).join("; ") };
  const setDraft = (i, patch) => setDrafts(d => ({ ...d, [i.id]: { ...draftOf(i), ...patch } }));
  const dirty = (i) => drafts[i.id] && (drafts[i.id].title !== i.title || drafts[i.id].keywords !== (i.keywords || []).join("; "));

  const save = async (i) => {
    const d = draftOf(i);
    if (!d.title.trim()) { flash("Title can't be empty"); return; }
    const { error } = await supabase.from("icon_library").update({ title: d.title.trim(), keywords: parseKeywords(d.keywords) }).eq("id", i.id);
    if (error) { flash(`Save failed: ${error.message}`); return; }
    setDrafts(x => { const n = { ...x }; delete n[i.id]; return n; });
    clearIconCache(); load(); flash("Saved");
  };
  const toggleActive = async (i) => {
    const { error } = await supabase.from("icon_library").update({ active: !i.active }).eq("id", i.id);
    if (error) { flash(error.message); return; }
    clearIconCache(); load();
  };
  const remove = async (i) => {
    if (!confirm(`Delete "${i.title}"? Requests that already picked it keep their copy of the link, which will stop working.`)) return;
    await supabase.storage.from("icon-library").remove([i.file_path]);
    const { error } = await supabase.from("icon_library").delete().eq("id", i.id);
    if (error) { flash(error.message); return; }
    clearIconCache(); load();
  };

  const q = search.trim().toLowerCase();
  const shown = icons.filter(i => !q || i.title.toLowerCase().includes(q) || (i.keywords || []).join(" ").toLowerCase().includes(q));

  return (
    <div style={{ fontFamily: "'Rubik',sans-serif" }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div><h3>Icon library</h3><p>Icons stakeholders can pick for Key Benefits cards. Search uses the icon title and its related key benefit titles.</p></div>
          <div>
            <input ref={fileRef} type="file" accept=".svg,.png,image/svg+xml,image/png" multiple onChange={handleFiles} style={{ display: "none" }} />
            <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {busy ? <FaSpinner className="spin" size={12} /> : <FaUpload size={12} />} Upload icons
            </button>
          </div>
        </div>
        {msg && <div style={{ fontSize: 13, color: "#181313", background: "#F3F3F3", borderRadius: 8, padding: "0.5rem 0.8rem", marginBottom: 10 }}>{msg}</div>}
        <div style={{ position: "relative", maxWidth: 320 }}>
          <span style={{ position: "absolute", left: 11, top: 11, color: "#767676", display: "flex" }}><FaSearch size={12} /></span>
          <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter icons..." style={{ paddingLeft: 30 }} />
        </div>
      </div>

      {loading ? <div style={{ fontSize: 13, color: "#646464" }}>Loading…</div> : shown.length === 0 ? (
        <div style={{ fontSize: 13, color: "#646464" }}>{icons.length ? "No icons match." : "No icons yet. Click “Upload icons” and select your SVG/PNG files (multiple allowed)."}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shown.map(i => {
            const d = draftOf(i);
            return (
              <div key={i.id} className="card" style={{ display: "flex", gap: 14, alignItems: "center", opacity: i.active ? 1 : 0.55, padding: "0.75rem 1rem" }}>
                <img src={i.public_url} alt={i.title} style={{ width: 48, height: 48, objectFit: "contain", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                  <div><label className="field-label">Icon title</label><input className="input" value={d.title} onChange={e => setDraft(i, { title: e.target.value })} /></div>
                  <div><label className="field-label">Related key benefit titles (separate with ;)</label><input className="input" value={d.keywords} onChange={e => setDraft(i, { keywords: e.target.value })} placeholder="e.g. Faster Verification; Secure Design" /></div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  {dirty(i) && <button className="btn-primary" onClick={() => save(i)}>Save</button>}
                  <button className="btn-ghost" onClick={() => toggleActive(i)}>{i.active ? "Hide" : "Show"}</button>
                  <button onClick={() => remove(i)} title="Delete" aria-label="Delete" style={{ background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.35rem 0.6rem", cursor: "pointer", display: "flex" }}><FaTrash size={11} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
