// @/lib/driveSaveFiles.ts
import { auth } from "@/auth";

const DRIVE_UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink";

const session = await auth();
if (!session) throw new Error("driveEditFile: Not authenticated");

const accessToken = (session as any)?.accessToken as string | undefined;
if (!accessToken) throw new Error("driveEditFile: Missing session.accessToken");

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
    delimiter + `Content-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`;

  return Buffer.concat([
    Buffer.from(metaPart, "utf8"),
    Buffer.from(filePartHeader, "utf8"),
    fileBuffer,
    Buffer.from(closeDelimiter, "utf8"),
  ]);
}

/**
 * Save multiple files to Google Drive.
 * - You provide `fileToUpload(file)` which returns `{ name, buffer, mimeType }`.
 * - This keeps route-level naming logic (baseName) intact and testable.
 */
export async function driveSaveFiles(params: {
  folderId: string;
  files: File[];
  fileToUpload: (file: File) => Promise<{
    name: string; // e.g. baseName
    buffer: Buffer;
    mimeType: string;
  }>;
}) {
  const { folderId, files, fileToUpload } = params;

  for (const file of files) {
    const { name, buffer, mimeType } = await fileToUpload(file);

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
      const text = await res.text().catch(() => "");
      throw new Error(`Drive upload failed: ${res.status} ${text}`);
    }
  }
}
