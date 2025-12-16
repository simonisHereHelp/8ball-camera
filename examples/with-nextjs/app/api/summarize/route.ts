// app/api/summarize/route.ts

import { NextResponse } from "next/server";

type PromptConfig = {
  system: string;
  user: string;
  wordTarget?: number;
};

const PROMPTS_URL =
  process.env.PROMPTS_URL ??
  "https://drive.google.com/uc?export=download&id=15Ax2eWZoMxj_WsxMVwxmJaLpOxZ-Fc-o";

// 已移除 CANONICALS_URL

let cachedPrompts: PromptConfig | null = null;

async function fetchPrompts(): Promise<PromptConfig> {
  if (cachedPrompts) return cachedPrompts;

  try {
    // 1) Fetch prompts.json
    const promptsRes = await fetch(PROMPTS_URL);
    if (!promptsRes.ok) {
      const body = await promptsRes.text().catch(() => "");
      console.error("❌ PROMPTS fetch failed", promptsRes.status, body);
      throw new Error(`PROMPTS HTTP ${promptsRes.status}`);
    }

    const promptsText = await promptsRes.text();
    console.log("📄 Raw prompts.json:", promptsText);

    let prompts: any;
    try {
      prompts = JSON.parse(promptsText);
    } catch (e) {
      console.error("❌ Failed to parse prompts.json as JSON", e);
      throw e;
    }

    if (!prompts.system || !prompts.user) {
      console.error("❌ Missing 'system' or 'user' fields in prompts.json", prompts);
      throw new Error("Missing prompt fields");
    }

    // 已移除所有關於 canonicals 的抓取與處理邏輯

    cachedPrompts = {
      system: prompts.system as string,
      // 直接使用 prompt 模板，不包含 canonicals 替換
      user: prompts.user as string, 
      wordTarget:
        typeof prompts.wordTarget === "number" ? prompts.wordTarget : 100,
    };

    console.log("✅ Final cachedPrompts:", cachedPrompts);
  } catch (err) {
    console.error("❌ fetchPrompts failed, using fallback:", err);

    cachedPrompts = {
      system: "You are a document reader.",
      user: "Summarize these documents in about {{wordTarget}} words.",
      wordTarget: 100,
    };
  }

  return cachedPrompts;
}

function buildUserPrompt(template: string, words: number) {
  return template.replace(/\{\{\s*wordTarget\s*\}\}/gi, String(words));
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const formData = await request.formData();

  // ✅ accept multiple files
  const imageFiles = formData
    .getAll("image")
    .filter((f): f is File => f instanceof File);

  if (!imageFiles.length) {
    return NextResponse.json({ error: "No images uploaded" }, { status: 400 });
  }

  // ✅ convert each file to base64 data URL
  const imageUrls = await Promise.all(
    imageFiles.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer()).toString("base64");
      return `data:${file.type};base64,${buffer}`;
    }),
  );

  const prompts = await fetchPrompts();
  const promptText = buildUserPrompt(prompts.user, prompts.wordTarget ?? 100);

  // ✅ Combine TEXT + ALL images into one user message
  const content = [
    { type: "text", text: promptText },
    ...imageUrls.map((url) => ({
      type: "image_url",
      image_url: { url },
    })),
  ];

  // ✅ SINGLE completion request
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompts.system },
        { role: "user", content },
      ],
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: response.status });
  }

  const data = await response.json();
  const summary = data?.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ summary });
}