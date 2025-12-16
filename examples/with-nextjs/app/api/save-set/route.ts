// app/api/save-set/route.ts
import { NextResponse } from "next/server";
import { driveSaveFiles } from "@/lib/driveSaveFiles";


export const runtime = "nodejs"; // ensure Node APIs like Buffer are available

const PROMPTS_URL =
  process.env.PROMPTS_URL ??
  "https://drive.google.com/uc?export=download&id=1srQP_Ekw79v45jgkwgeV67wx6j9OcmII";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type PromptConfig = {
  system: string;
  user: string;
  wordTarget?: number;
};

let cachedPrompts: PromptConfig | null = null;

// 讀取遠端 prompts.json（system / user / wordTarget）
async function fetchPrompts(): Promise<PromptConfig> {
  if (cachedPrompts) return cachedPrompts;

  const res = await fetch(PROMPTS_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const prompts = (await res.json()) as Partial<PromptConfig>;
  if (!prompts.system || !prompts.user) {
    throw new Error("Missing prompt fields");
  }

  cachedPrompts = {
    system: prompts.system,
    user: prompts.user,
    wordTarget:
      typeof prompts.wordTarget === "number" ? prompts.wordTarget : 100,
  };

  return cachedPrompts;
}


function buildUserPrompt(template: string, words: number) {
  return template.replace(/\{\{\s*wordTarget\s*\}\}/gi, String(words));
}

// 用 ChatGPT 根據 summary 產生「單位-性質-行動」，再加上日期 => setName
async function deriveSetNameFromSummary(summary: string): Promise<string> {
  const trimmed = summary.trim();

  // 日期部分：YYYYMMDD
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  // fallback 標題（如果 GPT 失敗）
  const fallbackTitle = trimmed
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 4)
    .join("-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "document";

  // 沒有 OPENAI_API_KEY 就直接用 fallback
  if (!OPENAI_API_KEY) {
    return `${fallbackTitle}-${datePart}`;
  }

  try {
    const prompts = await fetchPrompts();
    const wordTarget = prompts.wordTarget ?? 100;
    const userPrompt = buildUserPrompt(prompts.user, wordTarget);

    const userContent = `${userPrompt}\n\n以下是文件摘要：\n${trimmed}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompts.system },
          { role: "user", content: userContent },
        ],
        max_tokens: 64,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Labeling completion failed:", res.status, errText);
      return `${fallbackTitle}-${datePart}`;
    }

    const data = await res.json();
    let label = data?.choices?.[0]?.message?.content ?? "";
    if (typeof label !== "string") {
      label = String(label ?? "");
    }
    label = label.trim();

    // 安全處理成檔名可用格式
    const safeLabel =
      label
        .replace(/[\\\/:*?"<>|]/g, "-") // Windows/一般不允許字元
        .replace(/\s+/g, "") // 通常標籤不需要空白
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80) || fallbackTitle;

    return `${safeLabel}-${datePart}`;
  } catch (err) {
    console.error("deriveSetNameFromSummary GPT error:", err);
    return `${fallbackTitle}-${datePart}`;
  }
}

export async function POST(request: Request) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    return NextResponse.json(
      { error: "Missing Google Drive configuration." },
      { status: 500 },
    );
  }


  const formData = await request.formData();
  const summary = (formData.get("summary") as string | null)?.trim() ?? "";
  const setNameFromClient =
    (formData.get("setName") as string | null)?.trim() ?? "";
  const files = formData
    .getAll("files")
    .filter((file): file is File => file instanceof File);

  if (!summary) {
    return NextResponse.json(
      { error: "Summary is required before saving." },
      { status: 400 },
    );
  }

  if (!files.length) {
    return NextResponse.json(
      { error: "No files provided for upload." },
      { status: 400 },
    );
  }

  // ✅ 優先使用 client setName（若你未來要從前端傳固定標籤），否則用 GPT 從 summary 推出 setName
  const setName = setNameFromClient || (await deriveSetNameFromSummary(summary));
    try {
      await driveSaveFiles({
        folderId,
        files,
        fileToUpload: async (file) => {
          const extension = file.name.split(".").pop();
          const baseName = file.name.includes(setName)
            ? file.name
            : `${setName}.${extension ?? "dat"}`;

          return {
            name: baseName,
            buffer: Buffer.from(await file.arrayBuffer()),
            mimeType: file.type,
          };
        },
      });

      // ✅ success response
      return NextResponse.json({ setName }, { status: 200 });
    } catch (err) {
      console.error("driveSaveFiles failed:", err);
      // ❌ error response
      return new NextResponse("save-set failed.", { status: 500 });
    }
}
