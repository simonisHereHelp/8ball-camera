// app/api/save-set/route.ts
import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { driveSaveFiles } from "@/lib/driveSaveFiles";
import { upsertDriveManifest } from "@/lib/driveManifest";
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

function buildMarkdown(params: { setName: string; summary: string; imageNames: string[] }) {
  const { setName, summary, imageNames } = params;
  const images = imageNames.map((name) => `![${name}](./${name})`);

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
    const baseName = normalizeFilename(
      normalizedSetName.replace(/[\\/:*?"<>|]/g, "_"),
    );
    const getSummaryFileName = () => normalizeFilename(`${baseName}.mdx`);
    const getImageExtension = (file: File) => {
      const mimeType = file.type?.toLowerCase() ?? "";
      if (mimeType.startsWith("image/")) {
        const subtype = mimeType.split("/")[1] ?? "";
        if (subtype) {
          return subtype;
        }
      }

      return file.name.split(".").pop() ?? "dat";
    };

    const getImageFileName = (file: File, index: number) => {
      if (index < 0) {
        throw new Error("Image file index not found.");
      }
      const extension = getImageExtension(file);
      return normalizeFilename(`${baseName}-p${index + 1}.${extension ?? "dat"}`);
    };
    const imageNames = imageFiles.map((file, index) => getImageFileName(file, index));

    const markdown = buildMarkdown({
      setName: normalizedSetName,
      summary,
      imageNames,
    });

    const summaryFile = new File([markdown], "summary.mdx", { type: "text/markdown" });
    const uploadFiles = [...imageFiles, summaryFile];

    const uploadResult = await driveSaveFiles({
      folderId: targetFolderId,
      files: uploadFiles,
      fileToUpload: async (file) => {
        const fileName =
          file === summaryFile || file.name === "summary.mdx"
            ? getSummaryFileName()
            : getImageFileName(file, imageFiles.indexOf(file));

        return {
          name: fileName,
          buffer: Buffer.from(await file.arrayBuffer()),
          mimeType: file.type,
        };
      },
    });

    const fileIdByName = new Map(
      uploadResult.files.map((file) => [file.name, file.id]),
    );
    const summaryId = fileIdByName.get(getSummaryFileName()) ?? null;
    const imageIds = imageNames
      .map((name) => fileIdByName.get(name))
      .filter((id): id is string => Boolean(id));
    const folderKey = topic ?? "Docs";
    const filesById = Object.fromEntries(
      uploadResult.files.map((file) => [
        file.id,
        {
          name: file.name,
          mime: file.mimeType,
        },
      ]),
    );
    const inlineAssetEntries = imageNames.reduce<[string, string][]>((acc, name) => {
      const id = fileIdByName.get(name);
      if (!id) return acc;
      acc.push([`./${name}`, id]);
      return acc;
    }, []);
    const inlineAssets = summaryId
      ? {
          [summaryId]: Object.fromEntries(inlineAssetEntries),
        }
      : {};

    await upsertDriveManifest({
      folderId: uploadResult.folderId,
      manifest: {
        folders: { [folderKey]: uploadResult.folderId },
        tree: {
          [folderKey]: [summaryId, ...imageIds].filter((id): id is string => Boolean(id)),
        },
        files: filesById,
        inlineAssets,
        updatedAt: Date.now(),
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
