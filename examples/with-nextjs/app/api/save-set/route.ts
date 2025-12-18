// app/api/save-set/route.ts
import { NextResponse } from "next/server";
import { Buffer } from "buffer"; 
import { driveSaveFiles } from "@/lib/driveSaveFiles";

// ❌ 移除：不再需要獲取 Canonical 內容來進行匹配
// import { fetchCanonicalFileContent } from "@/lib/driveCanonUtils"; 

export const runtime = "nodejs"; 
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID; 

const PROMPTS_URL =
  process.env.PROMPTS_URL ??
  "https://drive.google.com/uc?export=download&id=1srQP_Ekw79v45jgkwgeV67wx6j9OcmII";

type PromptConfig = {
  system: string;
  user: string;
  wordTarget?: number;
};

let cachedPrompts: PromptConfig | null = null;

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
    wordTarget: typeof prompts.wordTarget === "number" ? prompts.wordTarget : 100,
  };
  return cachedPrompts;
}

function buildUserPrompt(template: string, words: number) {
  return template.replace(/\{\{\s*wordTarget\s*\}\}/gi, String(words));
}

// 🎯 修正：移除 canonicalsJson 參數，純粹根據摘要產生名稱
async function deriveSetNameFromSummary(summary: string): Promise<string> {
  const trimmed = summary.trim();
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const fallbackTitle = trimmed
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 4)
    .join("-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "document";

  if (!OPENAI_API_KEY) return `${fallbackTitle}-${datePart}`;

  try {
    const prompts = await fetchPrompts(); 
    const wordTarget = prompts.wordTarget ?? 100;
    const userPromptTemplate = buildUserPrompt(prompts.user, wordTarget);

    // 🎯 修正：不再注入 {{CANONICALS_JSON}}，僅注入摘要內容
    // 即使 Prompt 模板中含有該變數，我們也不再傳入，讓 GPT 自由發揮
    const userContent = userPromptTemplate
      .replace("{{CANONICALS_JSON}}", "[]") // 傳入空陣列，強迫 GPT 不依賴外部清單
      .replace("{{SUMMARY}}", trimmed);

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
        temperature: 0, 
      }),
    });

    if (!res.ok) return `${fallbackTitle}-${datePart}`;

    const data = await res.json();
    let label = data?.choices?.[0]?.message?.content ?? "";
    label = String(label).trim();

    const safeLabel = label
        .replace(/[\\\/:*?"<>|]/g, "-") 
        .replace(/\s+/g, "") 
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80) || fallbackTitle;

    return `${safeLabel}-${datePart}`;
  } catch (err) {
    return `${fallbackTitle}-${datePart}`;
  }
}

export async function POST(request: Request) {
  if (!DRIVE_FOLDER_ID) {
    return NextResponse.json({ error: "Missing DRIVE_FOLDER_ID" }, { status: 500 });
  }

  const formData = await request.formData();
  // 使用者編輯後的最終摘要
  const summary = (formData.get("summary") as string | null)?.trim() ?? "";
  
  const files = formData
    .getAll("files")
    .filter((file): file is File => file instanceof File);

  if (!summary || !files.length) {
    return NextResponse.json({ error: "Summary and files are required." }, { status: 400 });
  }
  
  try {
    // 🎯 核心變動：不再獲取 Bible 內容，直接生成名稱
    const setName = await deriveSetNameFromSummary(summary); 

    await driveSaveFiles({
      folderId: DRIVE_FOLDER_ID, 
      files,
      fileToUpload: async (file) => {
        const baseName = setName.replace(/[\\/:*?"<>|]/g, "_"); 
        const extension = file.name.split(".").pop();
        let fileName = file.name === "summary.json" 
            ? `${baseName}.json` 
            : `${baseName}-p${files.filter(f => f.name !== "summary.json").indexOf(file) + 1}.${extension ?? "dat"}`;
        
        return {
          name: fileName,
          buffer: Buffer.from(await file.arrayBuffer()),
          mimeType: file.type,
        };
      },
    });

    // ❌ 此處不處理 Canonical Update，職責已移交
    return NextResponse.json({ setName }, { status: 200 });
  } catch (err: any) {
    return new NextResponse(err.message || "save-set failed.", { status: 500 });
  }
}