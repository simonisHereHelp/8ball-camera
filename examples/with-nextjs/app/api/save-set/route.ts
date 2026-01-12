// app/api/save-set/route.ts
import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { driveSaveFiles } from "@/lib/driveSaveFiles";
import { GPT_Router } from "@/lib/gptRouter";
import {
  DRIVE_FALLBACK_FOLDER_ID,
  PROMPT_SET_NAME_SOURCE,
} from "@/lib/jsonCanonSources";
import { resolveDriveFolder } from "@/lib/driveSubfolderResolver";
import { normalizeFilename } from "@/lib/normalizeFilename";

interface SelectedCanonMeta {
  master: string;
  aliases?: string[];
}

function buildMarkdown(params: {
  setName: string;
  summary: string;
  pageCount: number;
}) {
  const { setName, summary, pageCount } = params;
  const images = Array.from({ length: Math.max(pageCount, 0) }).map((_, idx) => {
    const pageNumber = idx + 1;
    return `![${setName}-p${pageNumber}](./${setName}-p${pageNumber}.jpeg)`;
  });

  return `# ${setName}

## summary

${summary.trim()}

---

## support

${images.join("\n\n")}
`;
}

export const runtime = "nodejs";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PROMPT_ID = PROMPT_SET_NAME_SOURCE;
const BASE_DRIVE_FOLDER_ID = DRIVE_FALLBACK_FOLDER_ID;
/**
 * 根據摘要產生檔案名稱標籤
 */
async function deriveSetNameFromSummary(summary: string): Promise<string> {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fallbackTitle = "document";

  if (!OPENAI_API_KEY) return `${fallbackTitle}-${datePart}`;

  try {
    // 1. 使用一致的風格獲取 System 與 User Prompt (注入 Summary)
    const systemPrompt = await GPT_Router.getSystemPrompt(PROMPT_ID);
    const userPrompt = await GPT_Router.getUserPrompt(
        PROMPT_ID, { 
        summary: summary,
        wordTarget: 150 // 可選覆蓋
      });

    // 2. 呼叫 OpenAI 產生名稱
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 64,
      }),
    });

    if (!res.ok) return `${fallbackTitle}-${datePart}`;

    const data = await res.json();
    let label = data?.choices?.[0]?.message?.content ?? "";
    
    // 3. 檔名清理
    const safeLabel = label.trim()
      .replace(/[\\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || fallbackTitle;

    return `${safeLabel}-${datePart}`;
  } catch (err) {
    console.error("deriveSetNameFromSummary failed:", err);
    return `${fallbackTitle}-${datePart}`;
  }
}

export async function POST(request: Request) {
  if (!BASE_DRIVE_FOLDER_ID) {
    return NextResponse.json({ error: "Missing DRIVE_FOLDER_ID" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const summary = (formData.get("summary") as string | null)?.trim() ?? "";
    const selectedCanonRaw = formData.get("selectedCanon");
    let selectedCanon: SelectedCanonMeta | null = null;
    if (typeof selectedCanonRaw === "string") {
      try {
        selectedCanon = (JSON.parse(selectedCanonRaw) as SelectedCanonMeta) ?? null;
      } catch (err) {
        console.warn("Unable to parse selectedCanon from request:", err);
      }
    }

    const files = formData.getAll("files").filter((file): file is File => file instanceof File);

    if (!summary || !files.length) {
      return NextResponse.json({ error: "Summary and files are required." }, { status: 400 });
    }

    // ✅ 執行核心命名邏輯 (調用新的 GPT_Router 流程)
    const setName = await deriveSetNameFromSummary(summary);
    const normalizedSetName = normalizeFilename(setName);

    // 儲存檔案到 Google Drive (auto-route into active subfolders)
    const { folderId: targetFolderId, topic } = await resolveDriveFolder(summary);

    const imageFiles = files;
    const markdown = buildMarkdown({
      setName: normalizedSetName,
      summary,
      pageCount: imageFiles.length,
    });

    const summaryFile = new File([markdown], "summary.md", { type: "text/markdown" });
    const uploadFiles = [...imageFiles, summaryFile];

    await driveSaveFiles({
      folderId: targetFolderId,
      files: uploadFiles,
      fileToUpload: async (file) => {
        const baseName = normalizeFilename(
          normalizedSetName.replace(/[\\/:*?"<>|]/g, "_"),
        );
        const extension = file.name.split(".").pop();

        const fileName = normalizeFilename(
          file === summaryFile || file.name === "summary.md"
            ? `${baseName}.md`
            : `${baseName}-p${imageFiles.indexOf(file) + 1}.${extension ?? "dat"}`,
        );

        return {
          name: fileName,
          buffer: Buffer.from(await file.arrayBuffer()),
          mimeType: file.type,
        };
      },
    });

    return NextResponse.json(
      { setName: normalizedSetName, targetFolderId, topic },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("save-set failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
