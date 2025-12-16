// @/lib/driveCanonUtils.ts

import { auth } from "@/auth";

const CANONICAL_FILE_ID = process.env.DRIVE_FILE_ID_CANONICALS;

/**
 * 從 Google Drive 獲取 Canonical Bible JSON 檔案的原始文字內容。
 * 依賴於 session 的 Google Drive 存取權杖。
 * @returns 檔案內容的 JSON 字符串。
 */
export async function fetchCanonicalFileContent(): Promise<string> {
    const session = await auth();
    const accessToken = (session as any)?.accessToken as string | undefined;

    if (!CANONICAL_FILE_ID) {
        throw new Error("Missing DRIVE_FILE_ID_CANONICALS environment variable.");
    }
    if (!accessToken) {
        throw new Error("Missing Google Drive access token on session.");
    }
    
    // 1) LOAD current file content
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${CANONICAL_FILE_ID}?alt=media&supportsAllDrives=true`;
    const readRes = await fetch(downloadUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!readRes.ok) {
        const errText = await readRes.text().catch(() => "");
        throw new Error(`Canonical file read failed: ${readRes.status} ${errText}`);
    }

    return readRes.text();
}