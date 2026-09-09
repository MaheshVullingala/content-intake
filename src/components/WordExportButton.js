"use client";
import { useState } from "react";
import { FaFileWord } from "react-icons/fa";
import { downloadRequestDocx } from "@/lib/wordExport";

// "Give an option to admin to download at anytime" — no stage-gating,
// generated fresh from whatever req currently holds at click time (not
// a cached snapshot), so it's always current whether the request is
// still in editorial review or long since complete.
export default function WordExportButton({ req }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      await downloadRequestDocx(req);
    } catch (e) {
      setError("Failed to generate document.");
    }
    setDownloading(false);
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <button
        className="btn-ghost"
        style={{ width: "100%", justifyContent: "center", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? "Generating…" : <><FaFileWord size={12} /> Download as Word</>}
      </button>
      {error && <div className="alert alert-error mt-8">{error}</div>}
    </div>
  );
}
