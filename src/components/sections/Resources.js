"use client";
import { useState } from "react";

const Field = ({ label, value, onChange, placeholder, multiline, required, hint }) => (
  <div className="field-wrap">
    <label className="field-label">
      {label}{required && <span className="req"> *</span>}
    </label>
    {multiline
      ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="textarea" />
      : <input    value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input" />
    }
    {hint && <div className="field-hint">{hint}</div>}
  </div>
);

const PRODUCT_TAGS = [
  "Allegro", "Cadence", "Celsius", "Clarity", "Conformal", "Innovus",
  "Joules", "Modus", "Palladium", "Quantus", "Sigrity", "Spectre",
  "Tempus", "Verisium", "Voltus", "Xcelium",
];

function TagSelector({ selected = [], onChange }) {
  const [custom, setCustom] = useState("");

  const toggle = (tag) => {
    if (selected.includes(tag)) onChange(selected.filter(t => t !== tag));
    else onChange([...selected, tag]);
  };

  const addCustom = () => {
    if (!custom.trim() || selected.includes(custom.trim())) return;
    onChange([...selected, custom.trim()]);
    setCustom("");
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {PRODUCT_TAGS.map(tag => (
          <button key={tag} type="button" onClick={() => toggle(tag)}
            style={{ background: selected.includes(tag) ? "#181313" : "#F3F3F3", color: selected.includes(tag) ? "#fff" : "#646464", border: `1px solid ${selected.includes(tag) ? "#181313" : "#E0E0E0"}`, borderRadius: 20, padding: "3px 11px", fontSize: 11, cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontWeight: 500 }}>
            {tag}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addCustom()}
          placeholder="Add custom tag..." className="input" style={{ fontSize: 12 }} />
        <button type="button" onClick={addCustom}
          style={{ background: "#F3F3F3", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.4rem 0.8rem", fontSize: 12, cursor: "pointer", fontFamily: "'Rubik',sans-serif", whiteSpace: "nowrap", color: "#646464" }}>
          + Add
        </button>
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#B5B5B5" }}>
          Selected: {selected.join(", ")}
        </div>
      )}
    </div>
  );
}

// Video / Mixed Media Carousel
function CarouselForm({ data = {}, onChange, type }) {
  const items  = data.items || [];
  const upd    = (key, val) => onChange({ ...data, [key]: val });
  const addItem    = () => { if (items.length >= 9) return; upd("items", [...items, { id: `item-${Date.now()}`, title: "", url: "" }]); };
  const updateItem = (id, field, val) => upd("items", items.map(i => i.id === id ? { ...i, [field]: val } : i));
  const removeItem = (id) => upd("items", items.filter(i => i.id !== id));

  const isVideo = type === "video";

  return (
    <div>
      <Field label="Carousel Title" required value={data.title || ""} onChange={v => upd("title", v)}
        placeholder={isVideo ? 'e.g. "Watch Our Latest Videos"' : 'e.g. "Browse Recommended Resources"'} />

      <div className="field-wrap">
        <label className="field-label">Product Tags</label>
        <TagSelector selected={data.tags || []} onChange={v => upd("tags", v)} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label className="field-label" style={{ margin: 0 }}>
          {isVideo ? "Video Items" : "Resource Items"} <span className="req">*</span>
        </label>
        <button onClick={addItem} disabled={items.length >= 9}
          style={{ background: items.length >= 9 ? "#F3F3F3" : "#181313", color: items.length >= 9 ? "#B5B5B5" : "#fff", border: "none", borderRadius: 7, padding: "0.35rem 0.8rem", fontSize: 11, fontWeight: 500, cursor: items.length >= 9 ? "not-allowed" : "pointer", fontFamily: "'Rubik',sans-serif" }}>
          + Add ({items.length}/9)
        </button>
      </div>

      {items.length === 0 && (
        <div style={{ background: "#F9F9F9", border: "2px dashed #E0E0E0", borderRadius: 8, padding: "1.2rem", textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "#B5B5B5" }}>Add at least 1 {isVideo ? "video" : "resource"} item</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "start", background: "#F9F9F9", borderRadius: 8, padding: "0.75rem", border: "1px solid #E0E0E0" }}>
            <div>
              <label className="field-label">Title</label>
              <input value={item.title} onChange={e => updateItem(item.id, "title", e.target.value)}
                placeholder="Item title..." className="input" />
            </div>
            <div>
              <label className="field-label">{isVideo ? "Video URL" : "Resource URL"}</label>
              <input value={item.url} onChange={e => updateItem(item.id, "url", e.target.value)}
                placeholder="https://..." className="input" />
            </div>
            <button onClick={() => removeItem(item.id)} style={{ marginTop: 20, background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.4rem 0.6rem", fontSize: 11, cursor: "pointer" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Resources 1-4
function ResourcesForm({ data = {}, onChange }) {
  const upd = (key, val) => onChange({ ...data, [key]: val });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Resource 1 — featured with image */}
      <div className="card">
        <div style={{ fontSize: 12, fontWeight: 500, color: "#181313", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #F3F3F3" }}>
          Resource 1 <span style={{ fontSize: 11, color: "#B5B5B5", fontWeight: 400 }}>— Featured (large card with image)</span>
        </div>
        <Field label="Title" required value={data.r1_title || ""} onChange={v => upd("r1_title", v)} placeholder='e.g. "TIE Language — The Fast Path to High-Performance Embedded SoC"' />
        <Field label="Link URL" required value={data.r1_link || ""} onChange={v => upd("r1_link", v)} placeholder="https://..." />
        <Field label="Image URL" value={data.r1_image || ""} onChange={v => upd("r1_image", v)} placeholder="https://... or leave for Design QA" />
        <Field label="Image Description for Design QA" value={data.r1_image_note || ""} onChange={v => upd("r1_image_note", v)} placeholder='e.g. "Circuit board close-up photo"' hint="Design QA will source from library" />
        <div className="field-wrap">
          <label className="field-label">Tag</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["White Paper","Brochure","Video","eBook","Data Sheet","Case Study"].map(t => (
              <button key={t} type="button" onClick={() => upd("r1_tag", t)}
                style={{ background: data.r1_tag === t ? "#181313" : "#F3F3F3", color: data.r1_tag === t ? "#fff" : "#646464", border: `1px solid ${data.r1_tag === t ? "#181313" : "#E0E0E0"}`, borderRadius: 20, padding: "3px 11px", fontSize: 11, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resources 2-4 */}
      {[2, 3, 4].map(n => (
        <div key={n} className="card">
          <div style={{ fontSize: 12, fontWeight: 500, color: "#181313", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #F3F3F3" }}>
            Resource {n} <span style={{ fontSize: 11, color: "#B5B5B5", fontWeight: 400 }}>— Small card</span>
          </div>
          <Field label="Title" required value={data[`r${n}_title`] || ""} onChange={v => upd(`r${n}_title`, v)} placeholder={`Resource ${n} title...`} />
          <Field label="Link URL" required value={data[`r${n}_link`] || ""} onChange={v => upd(`r${n}_link`, v)} placeholder="https://..." />
          <div className="field-wrap">
            <label className="field-label">Tag</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["White Paper","Brochure","Video","eBook","Data Sheet","Case Study"].map(t => (
                <button key={t} type="button" onClick={() => upd(`r${n}_tag`, t)}
                  style={{ background: data[`r${n}_tag`] === t ? "#181313" : "#F3F3F3", color: data[`r${n}_tag`] === t ? "#fff" : "#646464", border: `1px solid ${data[`r${n}_tag`] === t ? "#181313" : "#E0E0E0"}`, borderRadius: 20, padding: "3px 11px", fontSize: 11, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// News & Blogs
function NewsBlogsForm({ news = {}, blogs = {}, onNewsChange, onBlogsChange }) {
  const TAGS = ["News Release", "Press Release", "Product Update", "Industry News", "Technical Blog", "How-To", "Tutorial", "Thought Leadership"];

  const addNewsLink    = () => onNewsChange({ ...news, links: [...(news.links || []), { id: `n-${Date.now()}`, url: "", tag: "" }] });
  const updateNewsLink = (id, field, val) => onNewsChange({ ...news, links: (news.links || []).map(l => l.id === id ? { ...l, [field]: val } : l) });
  const removeNewsLink = (id) => onNewsChange({ ...news, links: (news.links || []).filter(l => l.id !== id) });

  const addBlogLink    = () => onBlogsChange({ ...blogs, links: [...(blogs.links || []), { id: `b-${Date.now()}`, url: "", tag: "" }] });
  const updateBlogLink = (id, field, val) => onBlogsChange({ ...blogs, links: (blogs.links || []).map(l => l.id === id ? { ...l, [field]: val } : l) });
  const removeBlogLink = (id) => onBlogsChange({ ...blogs, links: (blogs.links || []).filter(l => l.id !== id) });

  const LinkList = ({ items, onAdd, onUpdate, onRemove, placeholder }) => (
    <div>
      {items.map((link) => (
        <div key={link.id} style={{ display: "grid", gridTemplateColumns: "1fr 160px auto", gap: 8, marginBottom: 8, alignItems: "start" }}>
          <input value={link.url} onChange={e => onUpdate(link.id, "url", e.target.value)}
            placeholder={placeholder} className="input" />
          <select value={link.tag} onChange={e => onUpdate(link.id, "tag", e.target.value)}
            style={{ background: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: 7, padding: "0.62rem 0.5rem", fontSize: 12, color: "#181313", outline: "none", fontFamily: "'Rubik',sans-serif" }}>
            <option value="">Select tag...</option>
            {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => onRemove(link.id)}
            style={{ background: "#fff5f5", color: "#c0392b", border: "1px solid #c0392b33", borderRadius: 6, padding: "0.6rem 0.6rem", fontSize: 11, cursor: "pointer", marginTop: 1 }}>✕</button>
        </div>
      ))}
      <button onClick={onAdd}
        style={{ background: "transparent", border: "2px dashed #E0E0E0", borderRadius: 7, padding: "0.5rem 1rem", fontSize: 12, color: "#B5B5B5", cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#3C3C3C"; e.currentTarget.style.color = "#3C3C3C"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.color = "#B5B5B5"; }}>
        + Add link
      </button>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #F3F3F3" }}>📰 News</div>
        <LinkList items={news.links || []} onAdd={addNewsLink} onUpdate={updateNewsLink} onRemove={removeNewsLink} placeholder="News article URL..." />
      </div>
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #F3F3F3" }}>✍️ Blogs</div>
        <LinkList items={blogs.links || []} onAdd={addBlogLink} onUpdate={updateBlogLink} onRemove={removeBlogLink} placeholder="Blog post URL..." />
      </div>
    </div>
  );
}

// Main Resources Component
const SUB_ITEMS = [
  { key: "video_carousel",  label: "Video Carousel",       icon: "🎬", desc: "Video thumbnails with play button" },
  { key: "mixed_carousel",  label: "Mixed Media Carousel", icon: "📁", desc: "Mixed resource thumbnails" },
  { key: "resources",       label: "Resources",            icon: "📄", desc: "Featured + 3 resource cards" },
  { key: "news_blogs",      label: "News & Blogs",         icon: "📰", desc: "News and blog links with tags" },
];

export default function Resources({ data = {}, onChange, isNA, onToggleNA }) {
  const [activeTab, setActiveTab] = useState(null);
  const upd      = (key, val) => onChange({ ...data, [key]: val });
  const selected = data.res_selected || [];

  const toggleSub = (key) => {
    if (selected.includes(key)) {
      onChange({ ...data, res_selected: selected.filter(k => k !== key) });
      if (activeTab === key) setActiveTab(null);
    } else {
      onChange({ ...data, res_selected: [...selected, key] });
      setActiveTab(key);
    }
  };

  if (isNA) return (
    <div className="na-placeholder">
      <div className="icon">—</div>
      <div className="text">Resources section marked as Not Applicable</div>
      <button onClick={onToggleNA} className="btn-ghost" style={{ marginTop: 12 }}>Undo</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div><h3>Resources — Header</h3><p>Label and impact statement</p></div>
        </div>
        <Field label="Label" value={data.res_label || ""} onChange={v => upd("res_label", v)}
          placeholder='e.g. "RESOURCES"' hint="Small caps tag (optional)" />
        <Field label="Impact Statement" required value={data.res_impact || ""} onChange={v => upd("res_impact", v)}
          placeholder='e.g. "Browse Recommended Resources"' multiline />
      </div>

      {/* Sub-item selector */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Select Resource Types <span style={{ fontSize: 11, color: "#B5B5B5", fontWeight: 400 }}>(choose all that apply)</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {SUB_ITEMS.map(sub => (
            <button key={sub.key} onClick={() => toggleSub(sub.key)}
              style={{ background: selected.includes(sub.key) ? "#181313" : "#F9F9F9", border: `2px solid ${selected.includes(sub.key) ? "#181313" : "#E0E0E0"}`, borderRadius: 10, padding: "0.9rem 1rem", cursor: "pointer", textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>{sub.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: selected.includes(sub.key) ? "#F3F3F3" : "#181313" }}>{sub.label}</div>
                <div style={{ fontSize: 11, color: "#B5B5B5", marginTop: 2 }}>{sub.desc}</div>
              </div>
              {selected.includes(sub.key) && <span style={{ marginLeft: "auto", color: "#2a7a4b", fontSize: 16 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-item forms */}
      {selected.length > 0 && (
        <>
          {/* Tab switcher */}
          <div className="tab-bar" style={{ marginBottom: 16 }}>
            {selected.map(key => {
              const sub = SUB_ITEMS.find(s => s.key === key);
              return (
                <button key={key} onClick={() => setActiveTab(key)} className={`tab-btn${activeTab === key ? " active" : ""}`}>
                  {sub?.icon} {sub?.label}
                </button>
              );
            })}
          </div>

          {/* Active form */}
          <div className="card">
            {activeTab === "video_carousel" && (
              <CarouselForm type="video" data={data.res_video_carousel || {}} onChange={v => upd("res_video_carousel", v)} />
            )}
            {activeTab === "mixed_carousel" && (
              <CarouselForm type="mixed" data={data.res_mixed_carousel || {}} onChange={v => upd("res_mixed_carousel", v)} />
            )}
            {activeTab === "resources" && (
              <ResourcesForm data={data.res_resources || {}} onChange={v => upd("res_resources", v)} />
            )}
            {activeTab === "news_blogs" && (
              <NewsBlogsForm
                news={data.res_news || {}}
                blogs={data.res_blogs || {}}
                onNewsChange={v => upd("res_news", v)}
                onBlogsChange={v => upd("res_blogs", v)}
              />
            )}
            {!activeTab && (
              <div style={{ textAlign: "center", color: "#B5B5B5", fontSize: 13, padding: "1rem" }}>
                Select a resource type tab above to fill in details
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
