"use client";
import { useState } from "react";

function CarouselPreview({ data = {}, type }) {
  const [active, setActive] = useState(0);
  const items = data.items || [];
  if (items.length === 0) return null;

  const visible = items.slice(Math.max(0, active), Math.max(0, active) + 3);

  return (
    <div style={{ marginBottom: 32 }}>
      {data.title && <h3 style={{ fontSize: 18, fontWeight: 400, color: "#181313", marginBottom: 24, textAlign: "center" }}>{data.title}</h3>}
      <div style={{ position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {visible.map((item, i) => (
            <div key={item.id || i}>
              <div style={{ background: "#F3F3F3", borderRadius: 8, aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, position: "relative", overflow: "hidden" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>▶</div>
              </div>
              <p style={{ fontSize: 14, color: "#181313", lineHeight: 1.5, fontWeight: 400 }}>{item.title || "Item title..."}</p>
            </div>
          ))}
        </div>

        {/* Navigation dots */}
        {items.length > 3 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
            {Array.from({ length: Math.ceil(items.length / 3) }).map((_, i) => (
              <button key={i} onClick={() => setActive(i * 3)}
                style={{ width: 28, height: 4, borderRadius: 2, background: Math.floor(active / 3) === i ? "#181313" : "#E0E0E0", border: "none", cursor: "pointer", padding: 0 }} />
            ))}
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", marginTop: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#B5B5B5" }}>VIEW ALL →</span>
      </div>
    </div>
  );
}

function ResourceCardsPreview({ data = {} }) {
  if (!data.r1_title && !data.r2_title) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
      {/* Resource 1 — featured */}
      {data.r1_title && (
        <div style={{ background: "#F3F3F3", borderRadius: 8, overflow: "hidden", position: "relative", minHeight: 220 }}>
          {data.r1_image
            ? <img src={data.r1_image} alt={data.r1_title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} onError={e => { e.target.style.display = "none"; }} />
            : null
          }
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 50%, transparent)", borderRadius: 8 }} />
          <div style={{ position: "absolute", top: 12, right: 12 }}>
            {data.r1_tag && <span style={{ background: "rgba(255,255,255,0.9)", color: "#181313", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{data.r1_tag}</span>}
          </div>
          <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, color: "#F3F3F3", lineHeight: 1.4, margin: 0 }}>{data.r1_title}</h3>
          </div>
        </div>
      )}

      {/* Resources 2-4 stacked */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[2, 3, 4].map(n => data[`r${n}_title`] && (
          <div key={n} style={{ border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.9rem 1rem", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {data[`r${n}_tag`] && <span style={{ fontSize: 10, fontWeight: 600, color: "#646464", textTransform: "uppercase", letterSpacing: "0.06em", background: "#F3F3F3", padding: "2px 7px", borderRadius: 4 }}>{data[`r${n}_tag`]}</span>}
            </div>
            <p style={{ fontSize: 14, color: "#181313", fontWeight: 400, lineHeight: 1.4, margin: 0 }}>{data[`r${n}_title`]}</p>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#0078d4" }}>VIEW NOW →</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsBlogsPreview({ news = {}, blogs = {} }) {
  const newsLinks  = news.links  || [];
  const blogLinks  = blogs.links || [];
  if (newsLinks.length === 0 && blogLinks.length === 0) return null;

  const Column = ({ title, items }) => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 400, color: "#181313", margin: 0 }}>{title}</h3>
        <span style={{ fontSize: 13, color: "#0078d4", fontWeight: 500 }}>VIEW ALL →</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.slice(0, 2).map((item, i) => (
          <div key={item.id || i} style={{ border: "1px solid #E0E0E0", borderRadius: 8, padding: "0.9rem 1rem" }}>
            <div style={{ width: 28, height: 3, background: "#c0392b", borderRadius: 2, marginBottom: 10 }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: "#181313", lineHeight: 1.4, marginBottom: 8, fontFamily: "monospace", wordBreak: "break-all" }}>{item.url || "Article URL..."}</p>
            <div style={{ fontSize: 11, color: "#B5B5B5" }}>{item.tag || "Tag"}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }}>
      {newsLinks.length > 0 && <Column title="News" items={newsLinks} />}
      {blogLinks.length > 0 && <Column title="Blogs" items={blogLinks} />}
    </div>
  );
}

export default function ResourcesPreview({ data = {} }) {
  const { res_label = "", res_impact = "", res_selected = [], res_video_carousel = {}, res_mixed_carousel = {}, res_resources = {}, res_news = {}, res_blogs = {} } = data;

  if (!res_impact && res_selected.length === 0) return null;

  return (
    <div style={{ padding: "3rem 3.5rem", borderTop: "1px solid #F3F3F3", background: "#F9F9F9", width: "100%", boxSizing: "border-box", fontFamily: "'Rubik', sans-serif" }}>
      {/* Label */}
      <div style={{ fontSize: 11, fontWeight: 600, color: res_label ? "#646464" : "#E0E0E0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16, textAlign: "center" }}>
        {res_label || "RESOURCES"}
      </div>

      {/* Impact */}
      {res_impact && (
        <h2 style={{ fontSize: 28, fontWeight: 400, color: "#181313", lineHeight: 1.3, marginBottom: 40, textAlign: "center", wordBreak: "break-word" }}>{res_impact}</h2>
      )}

      {res_selected.includes("video_carousel")  && <CarouselPreview data={res_video_carousel} type="video" />}
      {res_selected.includes("mixed_carousel")  && <CarouselPreview data={res_mixed_carousel} type="mixed" />}
      {res_selected.includes("resources")       && <ResourceCardsPreview data={res_resources} />}
      {res_selected.includes("news_blogs")      && <NewsBlogsPreview news={res_news} blogs={res_blogs} />}

      {res_selected.length === 0 && (
        <div style={{ background: "#fff", border: "2px dashed #E0E0E0", borderRadius: 10, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#B5B5B5" }}>Select resource types to see the preview</div>
        </div>
      )}
    </div>
  );
}
