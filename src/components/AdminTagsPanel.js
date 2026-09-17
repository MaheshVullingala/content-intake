"use client";
import { useState, useEffect, useRef } from "react";
import { FaCheck, FaTimes, FaTrash, FaUpload, FaTag, FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import { supabase } from "@/lib/supabase";

// Admin → Tags: approve/reject stakeholder-requested tags, and bulk-import
// the shared tag list from an Excel/CSV export (name / category / URL
// columns — see sql/28-tags.sql for the schema this reads/writes).
//
// Bulk import is parsed entirely client-side with SheetJS (the "xlsx"
// package) rather than server-side, so it works the same whether the
// import file is .xlsx, .xls, or .csv with no extra backend plumbing.
export default function AdminTagsPanel({ user }) {
  const [pending,  setPending]  = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState(null); // id currently being approved/rejected/deleted
  const [search,   setSearch]   = useState("");
  const [msg,      setMsg]      = useState("");

  const [importRows, setImportRows]   = useState(null); // parsed rows awaiting confirmation
  const [importError, setImportError] = useState("");
  const [importing,   setImporting]   = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const [{ data: pend }, { data: appr }] = await Promise.all([
      supabase.from("tags").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("tags").select("*").eq("status", "approved").order("name", { ascending: true }),
    ]);
    setPending(pend || []);
    setApproved(appr || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(""), 2500); };

  const approve = async (tag) => {
    setActing(tag.id);
    const { error } = await supabase.from("tags").update({
      status: "approved", approved_by: user?.id, approved_at: new Date().toISOString(),
    }).eq("id", tag.id);
    setActing(null);
    if (error) { flash(`Failed to approve "${tag.name}": ${error.message}`); return; }
    flash(`"${tag.name}" approved`);
    load();
  };

  const reject = async (tag) => {
    setActing(tag.id);
    // Kept, not deleted -- status='rejected' both frees the name up for a
    // future request (see the partial unique index in sql/28-tags.sql)
    // and leaves an audit trail of what was declined and why it's gone.
    const { error } = await supabase.from("tags").update({ status: "rejected" }).eq("id", tag.id);
    setActing(null);
    if (error) { flash(`Failed to reject "${tag.name}": ${error.message}`); return; }
    flash(`"${tag.name}" rejected`);
    load();
  };

  const removeApproved = async (tag) => {
    if (!confirm(`Delete tag "${tag.name}"? Requests that already selected it keep their own snapshot, but it won't be selectable going forward.`)) return;
    setActing(tag.id);
    const { error } = await supabase.from("tags").delete().eq("id", tag.id);
    setActing(null);
    if (error) { flash(`Failed to delete "${tag.name}": ${error.message}`); return; }
    flash(`"${tag.name}" deleted`);
    load();
  };

  // ── Bulk import ──────────────────────────────────────────────────────
  const HEADER_ALIASES = {
    name:     ["name", "tag name", "tag"],
    category: ["category", "tag category"],
    url:      ["url", "tag url", "link"],
  };
  const matchHeader = (headers, aliases) =>
    headers.find(h => aliases.includes(String(h).trim().toLowerCase()));

  const handleFile = async (file) => {
    setImportError("");
    setImportResult(null);
    setImportRows(null);
    if (!file) return;
    try {
      // Dynamic import -- keeps SheetJS (a few hundred KB) out of the main
      // bundle for every user who never opens this admin tab.
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!rows.length) { setImportError("That file has no rows."); return; }

      const headers = Object.keys(rows[0]);
      const nameKey     = matchHeader(headers, HEADER_ALIASES.name);
      const categoryKey = matchHeader(headers, HEADER_ALIASES.category);
      const urlKey      = matchHeader(headers, HEADER_ALIASES.url);
      if (!nameKey) {
        setImportError(`Couldn't find a "Tag Name" column. Found columns: ${headers.join(", ")}`);
        return;
      }

      const seen = new Set();
      const parsed = [];
      rows.forEach(r => {
        const name = String(r[nameKey] || "").trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (seen.has(key)) return; // dedupe within the file itself
        seen.add(key);
        parsed.push({
          name,
          category: categoryKey ? String(r[categoryKey] || "").trim() || null : null,
          url:      urlKey ? String(r[urlKey] || "").trim() || null : null,
        });
      });
      if (!parsed.length) { setImportError("No valid rows with a tag name found."); return; }
      setImportRows(parsed);
    } catch (e) {
      setImportError(e.message || "Couldn't read that file. Is it a valid .xlsx/.csv?");
    }
  };

  const confirmImport = async () => {
    if (!importRows) return;
    setImporting(true);
    let inserted = 0, skipped = 0, failed = 0;
    // Row-by-row (not a single bulk insert) so one duplicate/invalid row
    // (23505 from the case-insensitive unique index) doesn't abort the
    // whole batch -- each row succeeds or fails independently.
    for (const row of importRows) {
      const { error } = await supabase.from("tags").insert({
        name: row.name, category: row.category, url: row.url, status: "approved",
      });
      if (error) { if (error.code === "23505") skipped++; else failed++; }
      else inserted++;
    }
    setImporting(false);
    setImportResult({ inserted, skipped, failed, total: importRows.length });
    setImportRows(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    load();
  };

  const filteredApproved = approved.filter(t => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return t.name.toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q);
  });

  if (loading) return <div style={{ padding: "2rem", color: "#B5B5B5" }}>Loading tags...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Tags</h3>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            Approve stakeholder-requested tags, and bulk-import the shared tag list from Excel/CSV.
          </p>
        </div>
        {msg && <span style={{ fontSize: 12, color: "#0e7a3d", background: "#e8f9f0", padding: "4px 12px", borderRadius: 6 }}>{msg}</span>}
      </div>

      {/* Pending approval */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: "#d97706", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F3F3F3" }}>
          Pending Approval {pending.length > 0 && `(${pending.length})`}
        </h4>
        {pending.length === 0 ? (
          <div style={{ fontSize: 13, color: "#B5B5B5", padding: "0.5rem 0" }}>No tag requests waiting on review.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pending.map(tag => (
              <div key={tag.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.75rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#181313" }}>
                  <FaTag size={11} style={{ color: "#d97706" }} />
                  {tag.name}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => approve(tag)} disabled={acting === tag.id}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "#181313", color: "#fff", border: "none", borderRadius: 6, padding: "0.35rem 0.7rem", fontSize: 12, cursor: acting === tag.id ? "default" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
                    {acting === tag.id ? <FaSpinner className="fa-spin" size={10} /> : <FaCheck size={10} />} Approve
                  </button>
                  <button onClick={() => reject(tag)} disabled={acting === tag.id}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.35rem 0.7rem", fontSize: 12, cursor: acting === tag.id ? "default" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
                    <FaTimes size={10} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk import */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: "#1b5793", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F3F3F3" }}>Bulk Import</h4>
        <p style={{ fontSize: 12, color: "#646464", marginBottom: 12 }}>
          Upload an .xlsx or .csv export with columns for tag name, tag category, and tag URL (header names are matched loosely — "Tag Name", "Name", "Category", "URL", etc. all work). Imported tags land as approved immediately.
        </p>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
          onChange={e => handleFile(e.target.files?.[0])}
          style={{ fontSize: 13, fontFamily: "'Rubik',sans-serif" }} />

        {importError && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#c0392b" }}>
            <FaExclamationTriangle size={11} /> {importError}
          </div>
        )}

        {importRows && (
          <div style={{ marginTop: 12, background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.75rem 1rem" }}>
            <div style={{ fontSize: 13, color: "#181313", marginBottom: 8 }}>
              Found <strong>{importRows.length}</strong> tag{importRows.length === 1 ? "" : "s"} to import.
            </div>
            <div style={{ maxHeight: 140, overflowY: "auto", fontSize: 12, color: "#646464", marginBottom: 10 }}>
              {importRows.slice(0, 8).map((r, i) => (
                <div key={i}>{r.category ? `${r.category} / ${r.name}` : r.name}</div>
              ))}
              {importRows.length > 8 && <div>...and {importRows.length - 8} more</div>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={confirmImport} disabled={importing}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#181313", color: "#fff", border: "none", borderRadius: 6, padding: "0.5rem 1rem", fontSize: 13, cursor: importing ? "default" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
                {importing ? <FaSpinner className="fa-spin" size={11} /> : <FaUpload size={11} />}
                {importing ? "Importing..." : `Import ${importRows.length} tags`}
              </button>
              <button onClick={() => { setImportRows(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={importing}
                className="btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        )}

        {importResult && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#646464" }}>
            Imported {importResult.inserted} of {importResult.total}
            {importResult.skipped > 0 && ` — ${importResult.skipped} already existed (skipped)`}
            {importResult.failed > 0 && ` — ${importResult.failed} failed`}.
          </div>
        )}
      </div>

      {/* Approved tags browser */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F3F3F3" }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#2a7a4b", margin: 0 }}>Approved Tags ({approved.length})</h4>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="input" style={{ maxWidth: 220, fontSize: 12, padding: "0.35rem 0.6rem" }} />
        </div>
        {filteredApproved.length === 0 ? (
          <div style={{ fontSize: 13, color: "#B5B5B5", padding: "0.5rem 0" }}>No matching tags.</div>
        ) : (
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#B5B5B5", fontSize: 11, textTransform: "uppercase" }}>
                  <th style={{ padding: "6px 8px" }}>Category</th>
                  <th style={{ padding: "6px 8px" }}>Name</th>
                  <th style={{ padding: "6px 8px" }}>URL</th>
                  <th style={{ padding: "6px 8px", width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredApproved.map(tag => (
                  <tr key={tag.id} style={{ borderTop: "1px solid #F3F3F3" }}>
                    <td style={{ padding: "6px 8px", color: "#646464" }}>{tag.category || "—"}</td>
                    <td style={{ padding: "6px 8px", color: "#181313" }}>{tag.name}</td>
                    <td style={{ padding: "6px 8px", color: "#646464", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tag.url || "—"}</td>
                    <td style={{ padding: "6px 8px" }}>
                      <button onClick={() => removeApproved(tag)} disabled={acting === tag.id}
                        title="Delete tag"
                        style={{ background: "none", border: "none", cursor: acting === tag.id ? "default" : "pointer", color: "#c0392b", display: "flex" }}>
                        <FaTrash size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
