// app/api/save-set/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs"; // ensure Node APIs like Buffer are available

const DRIVE_UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink";

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

  try {
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
  } catch {
    // fallback prompts（你貼的中文說明）
    cachedPrompts = {
      system: "You are a document file labeler.",
      user:
        "你會收到一份文件內容摘要，摘要通常包含寄件單位、文件性質與需要處理的行動。\n\n" +
        "請根據摘要產生一個「標籤名稱」，標籤格式必須為：\n\n" +
        "單位-性質-行動\n\n例如：\n兆豐-餘額通知-請保存做記錄\n\n" +
        "規則：\n" +
        "1) 「單位」為文件發出方（例如：銀行、保險公司、政府機關、電信公司等）需要給出具體的名字，如兆豐、台灣銀行、中華電信，若無法判斷請填「其他單位」。\n" +
        "2) 「性質」請簡要描述文件類型（例如：帳單、通知、催繳、變更服務、補件、一般通知、廣告、節日祝賀、客戶關係等）。\n" +
        "3) 「行動」請指出收件人應採取的動作（例如：請繳費、請回覆、請保留、請更新資料、請聯絡我們、等），若無具體行動請填「一般處理」。\n\n" +
        "請只輸出最後的標籤結果，不要加上任何說明或多餘文字。",
      wordTarget: 100,
    };
  }

  return cachedPrompts;
}

function buildUserPrompt(template: string, words: number) {
  return template.replace(/\{\{\s*wordTarget\s*\}\}/gi, String(words));
}

// Node-style multipart body for Google Drive
function buildMultipartBody(
  boundary: string,
  metadata: Record<string, unknown>,
  fileBuffer: Buffer,
  mimeType: string,
) {
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata);

  const filePartHeader =
    delimiter +
    `Content-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`;

  const endPart = closeDelimiter;

  return Buffer.concat([
    Buffer.from(metaPart, "utf8"),
    Buffer.from(filePartHeader, "utf8"),
    fileBuffer,
    Buffer.from(endPart, "utf8"),
  ]);
}

async function uploadToDrive({
  accessToken,
  folderId,
  name,
  buffer,
  mimeType,
}: {
  accessToken: string;
  folderId: string;
  name: string;
  buffer: Buffer;
  mimeType: string;
}) {
  const boundary = "drive-boundary-" + Date.now() + Math.random().toString(16);
  const metadata = { name, parents: [folderId] };
  const body = buildMultipartBody(boundary, metadata, buffer, mimeType);

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Drive upload failed", res.status, text);
    throw new Error("Drive upload failed: " + text);
  }

  return res.json();
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

  // 🔐 use NextAuth session (server-side) instead of trusting client
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    );
  }

  const accessToken = (session as any)?.accessToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing Google Drive access token on session." },
      { status: 401 },
    );
  }

  // 🔧 TEST RUN: overwrite a specific Drive file with "Hello World"
  // Put the fileId in env or hardcode temporarily.
  const TARGET_FILE_ID =
    process.env.TARGET_FILE_ID ?? "1TF4cl7w8_GG8OyCXy8qDFJB7DqTpiOUV";

  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${TARGET_FILE_ID}?uploadType=media`;

  const uploadRes = await fetch(uploadUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/plain; charset=utf-8",
    },
    body: "Hello World",
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    return NextResponse.json(
      { error: `HelloWorld overwrite failed: ${uploadRes.status} ${errText}` },
      { status: 500 },
    );
  }

  const meta = await uploadRes.json().catch(() => null);
  console.log("resp", meta);

  // end of test run -> meta

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
    for (const file of files) {
      const extension = file.name.split(".").pop();
      const baseName = file.name.includes(setName)
        ? file.name
        : `${setName}.${extension ?? "dat"}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadToDrive({
        accessToken,
        folderId,
        name: baseName,
        buffer,
        mimeType: file.type,
      });
    }

    return NextResponse.json({ setName });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
