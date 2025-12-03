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
  if (cachedPrompts) {
    return cachedPrompts;
  }

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
      wordTarget: typeof prompts.wordTarget === "number" ? prompts.wordTarget : 100,
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
  const imageFile = formData.get("image");

  if (!(imageFile instanceof File)) {
    return NextResponse.json(
      { error: "Image file is required." },
      { status: 400 },
    );
  }

  const arrayBuffer = await imageFile.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString("base64");
  const imageUrl = `data:${imageFile.type};base64,${base64Image}`;
  
  const prompts = await fetchPrompts();
  const wordTarget = prompts.wordTarget ?? 100;
  const userPrompt = buildUserPrompt(prompts.user, wordTarget);

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
          content:prompts.system
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: error || "Failed to summarize image." },
      { status: response.status },
    );
  }

  const data = await response.json();
  const summary = data?.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ summary });
}