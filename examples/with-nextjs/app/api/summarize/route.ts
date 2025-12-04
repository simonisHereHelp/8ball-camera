import { NextResponse } from "next/server";

type PromptConfig = {
  system: string;
  user: string;
  wordTarget?: number;
};

const PROMPTS_URL =
  process.env.PROMPTS_URL ??
  "https://drive.google.com/uc?export=download&id=15Ax2eWZoMxj_WsxMVwxmJaLpOxZ-Fc-o";

let cachedPrompts: PromptConfig | null = null;

async function fetchPrompts(): Promise<PromptConfig> {
  if (cachedPrompts) return cachedPrompts;

  try {
    const response = await fetch(PROMPTS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch prompts: HTTP ${response.status}`);
    }

    const prompts = (await response.json()) as Partial<PromptConfig>;

    if (typeof prompts.system !== "string" || typeof prompts.user !== "string") {
      throw new Error("Prompts JSON must include 'system' and 'user' fields.");
    }

    cachedPrompts = {
      system: prompts.system,
      user: prompts.user,
      wordTarget:
        typeof prompts.wordTarget === "number" ? prompts.wordTarget : 100,
    };
  } catch (error) {
    console.error("Using fallback prompts because remote fetch failed:", error);
    cachedPrompts = {
      system:
        "You are a document reader. OCR the uploaded image, focus on structure, and return a helpful summary.",
      user:
        "Summarize the document content in about {{wordTarget}} words. Highlight the main subject, key facts, and any deadlines or action items.",
      wordTarget: 100,
    };
  }

  return cachedPrompts;
}

function buildUserPrompt(userTemplate: string, wordTarget: number) {
  return userTemplate.replace(/\{\{\s*wordTarget\s*\}\}/gi, String(wordTarget));
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY environment variable." },
      { status: 500 },
    );
  }

  const formData = await request.formData();

  // 🔹 all "image" files (multiple)
  const imageFiles = formData
    .getAll("image")
    .filter((item): item is File => item instanceof File);

  if (imageFiles.length === 0) {
    return NextResponse.json(
      { error: "At least one image file is required." },
      { status: 400 },
    );
  }

  let allImageUrls: string[];

  try {
    // Files → data URLs
    allImageUrls = await Promise.all(
      imageFiles.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = file.type || "application/octet-stream";
        return `data:${mimeType};base64,${base64Image}`;
      }),
    );
  } catch (error) {
    console.error("Failed to process images:", error);
    return NextResponse.json(
      { error: "Failed to process image inputs." },
      { status: 400 },
    );
  }

  if (allImageUrls.length === 0) {
    return NextResponse.json(
      { error: "At least one valid image input is required." },
      { status: 400 },
    );
  }

  const prompts = await fetchPrompts();
  const wordTarget = prompts.wordTarget ?? 100;
  const userPrompt = buildUserPrompt(prompts.user, wordTarget);

  const content: (
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  )[] = [
    { type: "text", text: userPrompt },
    ...allImageUrls.map((url) => ({
      type: "image_url",
      image_url: { url },
    })),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompts.system,
        },
        {
          role: "user",
          content, // text + ALL images
        },
      ],
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: error || "Failed to summarize image(s)." },
      { status: response.status },
    );
  }

  const data = await response.json();
  const summary = data?.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ summary });
}
