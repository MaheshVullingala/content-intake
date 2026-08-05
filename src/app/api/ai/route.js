import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/security";
import { SYSTEM_PROMPT, buildPrompt, SUPPORTED_SECTIONS } from "@/lib/aiPrompts";

// Ceiling for any single free-text field the client sends (currentContent,
// direction, or one brief field) — generous for a paragraph of draft
// content, tight enough that nobody can smuggle a huge payload through a
// single field to run up API cost. The actual prompt sent to Claude is
// always built server-side from src/lib/aiPrompts.js — the client never
// sends prompt or system-prompt text (see that file for why this matters).
const MAX_FIELD_CHARS = 4000;
const SUPPORTED_MODES = ["improve", "direction", "brief"];

// Verifies the caller's Supabase access token server-side. Any authenticated
// user (any role) may call AI Assist — RLS/role checks decide what they can
// do with the *result*, this route just decides whether to spend API budget
// generating it at all. Returns the verified user or null.
async function getVerifiedUser(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// Rejects if any client-supplied string field exceeds MAX_FIELD_CHARS —
// checks currentContent/direction directly and every value in brief.
function hasOversizedField({ currentContent, direction, brief }) {
  const values = [currentContent, direction, ...(brief && typeof brief === "object" ? Object.values(brief) : [])];
  return values.some(v => typeof v === "string" && v.length > MAX_FIELD_CHARS);
}

export async function POST(request) {
  try {
    const user = await getVerifiedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    // 20 AI Assist calls/minute per user — generous for normal typing-assist
    // usage, tight enough to stop someone scripting this into a free LLM proxy.
    const { allowed } = rateLimit(`ai:${user.id}`, 20, 60000);
    if (!allowed) {
      return NextResponse.json({ error: "Too many AI Assist requests — please wait a moment and try again." }, { status: 429 });
    }

    const { sectionKey, mode, currentContent, direction, brief } = await request.json();

    if (!sectionKey || !SUPPORTED_SECTIONS.includes(sectionKey)) {
      return NextResponse.json({ error: "Unsupported section." }, { status: 400 });
    }
    if (!mode || !SUPPORTED_MODES.includes(mode)) {
      return NextResponse.json({ error: "Unsupported mode." }, { status: 400 });
    }
    if (hasOversizedField({ currentContent, direction, brief })) {
      return NextResponse.json({ error: "Input is too long." }, { status: 400 });
    }

    // The prompt (both user-turn and system) is built entirely server-side
    // from the fixed templates in src/lib/aiPrompts.js — the client only
    // ever influences it through the plain-data fields above, never by
    // sending prompt/system-prompt text directly.
    const prompt = buildPrompt({ sectionKey, mode, currentContent, direction, brief });
    if (!prompt) {
      return NextResponse.json({ error: "Missing content for this request." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const body = {
      model:      "claude-haiku-4-5",
      max_tokens: 1000,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: prompt }],
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const text = data.content?.[0]?.text?.trim() || "";
    return NextResponse.json({ text });

  } catch (error) {
    return NextResponse.json({ error: "Failed to generate content. Please try again." }, { status: 500 });
  }
}
