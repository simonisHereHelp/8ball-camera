import { NextResponse } from "next/server";

const DRIVE_UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

function deriveSetName(summary: string) {
  const trimmed = summary.trim();
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const titlePart = trimmed
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 4)
    .join("-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `${titlePart || "document"}-${datePart}`;
}

async function uploadToDrive(file: File, folderId: string, token: string) {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  formData.append("file", file);

  const response = await fetch(DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to upload to Google Drive");
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!apiKey || !folderId) {
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

  const setName = setNameFromClient || deriveSetName(summary);

  try {
    for (const file of files) {
      const extension = file.name.split(".").pop();
      const baseName = file.name.includes(setName)
        ? file.name
        : `${setName}.${extension ?? "dat"}`;

      const normalizedFile = new File([file], baseName, {
        type: file.type,
        lastModified: file.lastModified,
      });

      await uploadToDrive(normalizedFile, folderId, apiKey);
    }

    return NextResponse.json({ setName });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}