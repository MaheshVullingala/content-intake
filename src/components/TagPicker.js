"use client";
import { useState, useRef, useEffect } from "react";
import { FaTimes, FaSearch, FaPlus, FaClock, FaSpinner } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { searchTags, requestNewTag, formatTagLabel } from "@/lib/tags";

// Searchable multi-select tag picker for the Banner section.
//
//   value    — array of tag snapshots: {id, name, category, url, status}
//   onChange — (newArray) => void
//   user     — current users-table row (needs .id for requested_by)
//
// Search fires once the query is 3+ characters (per spec: "when user
// enters 3 letters search for all matching in tag name"), debounced
// 250ms so we're not hitting Supabase on every keystroke. A query that
// doesn't match anything approved surfaces a "+ Request new tag" row —
// picking it inserts a status='pending' row (see src/lib/tags.js) that
// shows up in the selected list immediately with a pending badge, but
// won't appear in anyone *else's* search until an admin approves it in
// AdminPanel → Tags.
export default function TagPicker({ value = [], onChange, user, disabled }) {
  const [query, setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError]   = useState("");
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    setError("");
    if (query.trim().length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const found = await searchTags(supabase, query);
      // Hide anything already selected so the dropdown only shows new options
      setResults(found.filter(t => !value.some(v => v.id === t.id)));
      setLoading(false);
    }, 250);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, value]);

  const addTag = (tag) => {
    onChange([...value, tag]);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const removeTag = (id) => {
    onChange(value.filter(t => t.id !== id));
  };

  const handleRequestNew = async () => {
    const name = query.trim();
    if (!name || requesting) return;
    setRequesting(true);
    setError("");
    const { tag, error: reqError } = await requestNewTag(supabase, name, user?.id);
    setRequesting(false);
    if (reqError) {
      setError(reqError.message || "Couldn't request that tag.");
      return;
    }
    addTag(tag);
  };

  // Exact case-insensitive match already in results means "+ Request
  // new" would be redundant — only show it when the typed name isn't
  // already an available (or already-selected) option.
  const exactMatch =
    results.some(t => t.name.toLowerCase() === query.trim().toLowerCase()) ||
    value.some(t => t.name.toLowerCase() === query.trim().toLowerCase());

  const showDropdown = open && query.trim().length >= 3;

  return (
    <div className="field-wrap" ref={wrapRef} style={{ position: "relative" }}>
      <label className="field-label">Tags</label>

      {/* Selected chips */}
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {value.map(tag => (
            <span key={tag.id} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: tag.status === "pending" ? "#fffbeb" : "#F3F3F3",
              border: `1px solid ${tag.status === "pending" ? "#fde68a" : "#E0E0E0"}`,
              borderRadius: 20, padding: "0.3rem 0.5rem 0.3rem 0.75rem",
              fontSize: 12, color: "#181313", fontFamily: "'Rubik',sans-serif",
            }}>
              {formatTagLabel(tag)}
              {tag.status === "pending" && (
                <span title="Awaiting admin approval" style={{ display: "flex", alignItems: "center", gap: 3, color: "#d97706", fontSize: 10, fontWeight: 500 }}>
                  <FaClock size={9} /> Pending
                </span>
              )}
              {!disabled && (
                <button type="button" onClick={() => removeTag(tag.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#B5B5B5", display: "flex", padding: 0 }}
                  title="Remove tag">
                  <FaTimes size={10} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      {!disabled && (
        <div style={{ position: "relative" }}>
          <FaSearch size={12} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#B5B5B5" }} />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Type at least 3 letters to search tags..."
            className="input"
            style={{ paddingLeft: 32 }}
          />

          {showDropdown && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
              background: "#fff", border: "1px solid #E0E0E0", borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)", maxHeight: 260, overflowY: "auto",
            }}>
              {loading && (
                <div style={{ padding: "0.75rem 1rem", fontSize: 12, color: "#B5B5B5", display: "flex", alignItems: "center", gap: 8 }}>
                  <FaSpinner className="fa-spin" size={11} /> Searching...
                </div>
              )}

              {!loading && results.map(tag => (
                <div key={tag.id} onClick={() => addTag(tag)}
                  style={{ padding: "0.6rem 1rem", fontSize: 13, cursor: "pointer", color: "#181313", borderBottom: "1px solid #F3F3F3" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F9F9F9"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {formatTagLabel(tag)}
                </div>
              ))}

              {!loading && results.length === 0 && (
                <div style={{ padding: "0.6rem 1rem", fontSize: 12, color: "#B5B5B5" }}>
                  No matching tags found.
                </div>
              )}

              {!loading && !exactMatch && (
                <div onClick={handleRequestNew}
                  style={{ padding: "0.6rem 1rem", fontSize: 13, cursor: requesting ? "default" : "pointer", color: "#14b8a6", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}
                  onMouseEnter={e => !requesting && (e.currentTarget.style.background = "#f0fdfa")}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {requesting ? <FaSpinner className="fa-spin" size={11} /> : <FaPlus size={11} />}
                  {requesting ? "Requesting..." : `Request new tag "${query.trim()}"`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 5 }}>{error}</div>}
      <div className="field-hint">
        Search existing tags, or request a new one if it doesn't exist yet — new tags need admin approval before they're visible to others.
      </div>
    </div>
  );
}
