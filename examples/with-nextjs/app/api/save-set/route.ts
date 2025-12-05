// app/api/save-set/route.ts
import { NextResponse } from "next/server";

const DRIVE_UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink";

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
  const metadata = {
    name,
    parents: [folderId],
  };

  const body = buildMultipartBody(boundary, metadata, buffer, mimeType);

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`, // <-- real OAuth access token
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

export async function POST(request: Request) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    return NextResponse.json(
      { error: "Missing Google Drive configuration." },
      { status: 500 },
    );
  }

  const formData = await request.formData();

  // 🔑 accessToken is sent from the client (taken from NextAuth session.accessToken)
  const accessToken =
    (formData.get("accessToken") as string | null)?.trim() ?? "";

  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing Google Drive access token." },
      { status: 401 },
    );
  }

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
