// app/api/update-issuerCanon/route.ts

import { NextResponse } from "next/server";
// ✅ 匯入名稱修正為 driveUpdateCanon
import { driveUpdateCanon } from "@/lib/driveUpdateCanon"; 
import { auth } from "@/auth";

export const runtime = "nodejs";

const CANONICAL_FILE_ID = process.env.DRIVE_FILE_ID_CANONICALS;

/**
 * Fetches the raw JSON content of the canonical file from Google Drive (Read operation only).
 */
async function fetchCanonicalFileContent(): Promise<string> {
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


export async function POST(request: Request) {
    if (!CANONICAL_FILE_ID) {
        console.error("❌ Configuration Error: DRIVE_FILE_ID_CANONICALS is missing.");
        return NextResponse.json({ error: "Missing DRIVE_FILE_ID_CANONICALS configuration." }, { status: 500 });
    }

    try {
        const { draftSummary, editableSummary } = (await request.json()) as { 
            draftSummary: string; 
            editableSummary: string;
        };

        if (!draftSummary || !editableSummary) {
            return NextResponse.json({ error: "Missing summaries in request body." }, { status: 400 });
        }

        // 3. 獲取 Canonical Bible 內容
        const canonicalBibleJson = await fetchCanonicalFileContent();

        // 4. 呼叫輔助函數，獲取 GPT 判斷結果
        // ✅ 使用修正後的函式名稱
        const { canonical, alias } = await driveUpdateCanon({
            canonicalBibleJson,
            draftSummary,
            editableSummary
        });

        // 5. 決定更新行動，但不執行 Drive 寫入操作 (已移除 driveEditFile)
        if (canonical && alias) {
            console.log(`✅ [SKIPPED] Canonical update calculated: ${canonical} -> ${alias}. (Drive write operation removed by request)`);
            
            return NextResponse.json({ 
                status: "UPDATE_CALCULATED_ONLY", 
                message: "Canonical update calculated but Drive write operation was skipped.",
                canonical, 
                alias 
            }, { status: 200 });
        }

        // Case 3: No action required
        console.log("No canonical update required.");
        return NextResponse.json({ status: "NO_ACTION", message: "No update required." }, { status: 200 });

    } catch (err: any) {
        console.error("update-issuerCanon route failed:", err.message);
        return NextResponse.json({ status: "SERVER_ERROR", error: err.message }, { status: 500 });
    }
}