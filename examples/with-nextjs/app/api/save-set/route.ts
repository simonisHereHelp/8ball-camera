// app/api/save-set/route.ts
import { NextResponse } from "next/server";
import { Buffer } from "buffer"; // ✅ 新增：確保 Buffer 可用
import { driveSaveFiles } from "@/lib/driveSaveFiles";
import { fetchCanonicalFileContent } from "@/lib/driveCanonUtils"; // ✅ 使用 driveCanonUtils

export const runtime = "nodejs"; // ensure Node APIs like Buffer are available
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID; // 使用 DRIVE_FOLDER_ID

const PROMPTS_URL =
  process.env.PROMPTS_URL ??
  "https://drive.google.com/uc?export=download&id=1srQP_Ekw79v45jgkwgeV67wx6j9OcmII"; //prompt_4_setName


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
      typeof prompts.wordTarget === "number" ? prompts.wordTarget : 300,
  };

  return cachedPrompts;
}


// 註：此處的 buildUserPrompt 函式在新的 Prompt 結構下已不需要
// 因為新的 Prompt 是直接替換 {{CANONICALS_JSON}} 和 {{SUMMARY}} 佔位符。
// 為了保持與舊函式簽名兼容，將其簡化為只返回模板。
function buildUserPrompt(template: string, words: number) {
  // 替換 {{wordTarget}}，儘管在新標籤 Prompt 中可能未使用
  return template.replace(/\{\{\s*wordTarget\s*\}\}/gi, String(words));
}

// ✅ 修正：新增 canonicalsJson 參數
async function deriveSetNameFromSummary(
  summary: string,
  canonicalsJson: string,
): Promise<string> {
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
    const wordTarget = prompts.wordTarget ?? 300;
    const userPromptTemplate = buildUserPrompt(prompts.user, wordTarget);

    // ✅ 修正：將 canonicalsJson 和 summary 注入 User Prompt
    const userContent = userPromptTemplate
      .replace("{{CANONICALS_JSON}}", canonicalsJson)
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
        temperature: 0, // 增加穩定性
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
  if (!DRIVE_FOLDER_ID) {
    return NextResponse.json(
      { error: "Missing DRIVE_FOLDER_ID environment variable." },
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
  
  try {
    // 1. 獲取 Canonicals 清單
    const canonicalsJson = await fetchCanonicalFileContent(); // ✅ 使用 driveCanonUtils

    // 2. 決定 setName：優先使用客戶端提供的名稱，否則通過 GPT 生成
    const setName =
      setNameFromClient ||
      (await deriveSetNameFromSummary(summary, canonicalsJson)); // ✅ 傳入 canonicalsJson

    // 3. 執行 Drive 儲存操作
    await driveSaveFiles({
      folderId: DRIVE_FOLDER_ID, // ✅ 修正：使用 folderId 命名
      files,
      fileToUpload: async (file) => {
        const baseName = setName.replace(/[\\/:*?"<>|]/g, "_"); // 清理非法字元
        const extension = file.name.split(".").pop();

        // 命名邏輯：summary.json => setName.json；其他檔案 => setName-pX.ext
        let fileName: string;
        if (file.name === "summary.json") {
            fileName = `${baseName}.json`;
        } else {
            // 找到第一個非 summary.json 檔案的索引
            const imageIndex = files.filter(f => f.name !== "summary.json").indexOf(file) + 1;
            fileName = `${baseName}-p${imageIndex}.${extension ?? "dat"}`;
        }
        
        return {
          name: fileName,
          buffer: Buffer.from(await file.arrayBuffer()),
          mimeType: file.type,
        };
      },
    });

    // ✅ success response
    return NextResponse.json({ setName }, { status: 200 });
  } catch (err: any) {
    console.error("save-set failed:", err);
    // ❌ error response
    return new NextResponse(err.message || "save-set failed.", { status: 500 });
  }
}