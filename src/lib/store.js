"use client";
import { createContext, useContext, useState } from "react";

const SEED = [
  {
    id: "req-001", pageType: "Product", status: "editorial_qa",
    createdBy: "stakeholder", createdAt: "2026-04-20", updatedAt: "2026-04-21",
    banner: {
      pageTitle: "Xcelium Logic Simulator",
      subTitle: "Industry-leading, highest performance simulation platform",
      cta1Label: "Read Blog", cta1Link: "/blog/xcelium",
      cta2Label: "Watch Video", cta2Link: "/video/xcelium",
      bannerImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
    },
    attachments: [],
    comments: [
      { id: "c1", author: "Sarah (Stakeholder)", role: "stakeholder", text: "Please check the title format.", date: "2026-04-21" },
    ],
  },
  {
    id: "req-002", pageType: "Solutions", status: "design_qa",
    createdBy: "stakeholder", createdAt: "2026-04-18", updatedAt: "2026-04-22",
    banner: {
      pageTitle: "Verification Solutions",
      subTitle: "Complete verification platform for complex SoC designs",
      cta1Label: "Explore", cta1Link: "/solutions",
      cta2Label: "Contact Us", cta2Link: "/contact",
      bannerImage: "",
    },
    attachments: [],
    comments: [
      { id: "c2", author: "Editorial QA", role: "editorial_qa", text: "Copy approved. Needs hero image.", date: "2026-04-22" },
    ],
  },
];

const USERS = {
  stakeholder:  { id: "stakeholder",  name: "Mahesh",  role: "stakeholder"  },
  editorial_qa: { id: "editorial_qa", name: "Editor1",  role: "editorial_qa" },
  design_qa:    { id: "design_qa",    name: "Jay",    role: "design_qa"    },
  web_team:     { id: "web_team",     name: "Subhadip",   role: "web_team"     },
  admin:        { id: "admin",        name: "Chandra",    role: "admin"        },
};

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [requests, setReqs] = useState(SEED);

  const login  = (roleId) => setUser(USERS[roleId] || null);
  const logout = ()       => setUser(null);
  const today  = ()       => new Date().toISOString().split("T")[0];

  const createRequest = (pageType, banner) => {
    const r = {
      id: `req-${Date.now()}`, pageType, status: "editorial_qa",
      createdBy: user.id, createdAt: today(), updatedAt: today(),
      banner, attachments: [], comments: [],
    };
    setReqs(p => [r, ...p]);
    return r.id;
  };

  // Full banner overwrite (Editorial QA)
  const updateBanner = (id, banner) =>
    setReqs(p => p.map(r => r.id === id ? { ...r, banner: { ...r.banner, ...banner }, updatedAt: today() } : r));

  // Add attachment (Design QA) — stores name + base64 data URL
  const addAttachment = (id, file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const att = {
          id: `att-${Date.now()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: e.target.result,
          uploadedBy: user.name,
          uploadedAt: today(),
        };
        setReqs(p => p.map(r =>
          r.id === id ? { ...r, attachments: [...(r.attachments || []), att], updatedAt: today() } : r
        ));
        resolve(att);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (reqId, attId) =>
    setReqs(p => p.map(r =>
      r.id === reqId ? { ...r, attachments: r.attachments.filter(a => a.id !== attId) } : r
    ));

  const FLOW = ["draft","editorial_qa","design_qa","pending_approval","web_team","published"];

  const advanceStatus = (id, comment = "") =>
    setReqs(p => p.map(r => {
      if (r.id !== id) return r;
      const next = FLOW[Math.min(FLOW.indexOf(r.status) + 1, FLOW.length - 1)];
      const comments = comment.trim()
        ? [...r.comments, { id: `c${Date.now()}`, author: user.name, role: user.role, text: comment, date: today() }]
        : r.comments;
      return { ...r, status: next, comments, updatedAt: today() };
    }));

  const returnRequest = (id, comment = "") =>
    setReqs(p => p.map(r => {
      if (r.id !== id) return r;
      const prev = FLOW[Math.max(FLOW.indexOf(r.status) - 1, 0)];
      const comments = comment.trim()
        ? [...r.comments, { id: `c${Date.now()}`, author: user.name, role: user.role, text: `[Returned] ${comment}`, date: today() }]
        : r.comments;
      return { ...r, status: prev, comments, updatedAt: today() };
    }));

  const addComment = (id, text) =>
    setReqs(p => p.map(r =>
      r.id === id
        ? { ...r, comments: [...r.comments, { id: `c${Date.now()}`, author: user.name, role: user.role, text, date: today() }] }
        : r
    ));

  return (
    <Ctx.Provider value={{
      currentUser: user, login, logout,
      requests, createRequest, updateBanner,
      addAttachment, removeAttachment,
      advanceStatus, returnRequest, addComment,
      allUsers: Object.values(USERS),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
