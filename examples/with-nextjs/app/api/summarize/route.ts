import { NextResponse } from "next/server";

type PromptConfig = {
  system: string;
  user: string;
  wordTarget?: number;
};

const PROMPTS_URL =
  process.env.PROMPTS_URL ??
  "https://drive.google.com/uc?export=download&id=15Ax2eWZoMxj_WsxMVwxmJaLpOxZ-Fc-o";

const CANONICALS_URL = "https://drive.google.com/uc?export=download&id=13-Z83OU_QYug7z0_6R1VtZ35HYQrwLIC"


let cachedPrompts: PromptConfig | null = null;

async function fetchPrompts(): Promise<PromptConfig> {
  if (cachedPrompts) return cachedPrompts;

  try {
    // fetch prompts + taxonomy in parallel
    const [promptsRes, canonicalsRes] = await Promise.all([
      fetch(PROMPTS_URL),
      fetch(CANONICALS_URL),
    ]);

    if (!promptsRes.ok) throw new Error(`PROMPTS HTTP ${promptsRes.status}`);
    if (!canonicalsRes.ok) throw new Error(`CANONICALS HTTP ${canonicalsRes.status}`);

    const prompts = (await promptsRes.json()) as Partial<PromptConfig>;
    const canonicals = (await canonicalsRes.json()) as {
      issuer?: { canonical?: string[] };
      doc_type?: { canonical?: string[] };
      action?: { canonical?: string[] };
    };

    if (!prompts.system || !prompts.user) {
      throw new Error("Missing prompt fields");
    }

    const issuerList = (canonicals.issuer?.canonical ?? []).join(", ");
    const typeList = (canonicals.doc_type?.canonical ?? []).join(", ");
    const actionList = (canonicals.action?.canonical ?? []).join(", ");

    // inject taxonomy lists into the user template once
    const userWithCanonicals = prompts.user
      .replace(/\{\{\s*ISSUER_CANONICALS\s*\}\}/gi, issuerList)
      .replace(/\{\{\s*TYPE_CANONICALS\s*\}\}/gi, typeList)
      .replace(/\{\{\s*ACTION_CANONICALS\s*\}\}/gi, actionList);

    cachedPrompts = {
      system: prompts.system,
      user: userWithCanonicals,
      wordTarget:
        typeof prompts.wordTarget === "number" ? prompts.wordTarget : 100,
    };
  } catch {
    // fallback prompt if anything goes wrong
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
