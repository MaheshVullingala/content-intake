import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { prompt, systemPrompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const messages = [{ role: "user", content: prompt }];

    const body = {
      model:      "claude-haiku-4-5",
      max_tokens: 1000,
      messages,
    };

    // Add system prompt if provided (used for section-level generation)
    if (systemPrompt) {
      body.system = systemPrompt;
    }

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
