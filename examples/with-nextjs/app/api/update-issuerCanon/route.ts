// app/api/update-issuerCanon/route.ts

import { NextResponse } from "next/server";
import { GPT_Router } from "@/lib/gptRouter";

export const runtime = "nodejs";


export async function POST(request: Request) {
    const CANONICAL_FILE_ID = process.env.DRIVE_FILE_ID_CANONICALS?? "1TF4cl7w8_GG8OyCXy8qDFJB7DqTpiOUV"

    if (!CANONICAL_FILE_ID) {
        return NextResponse.json({ error: "Missing DRIVE_FILE_ID_CANONICALS" }, { status: 500 });
    }

    try {
        // Match the call method: { draftSummary, editableSummary }
        const { draftSummary, editableSummary } = await request.json();

        if (!draftSummary || !editableSummary) {
            return NextResponse.json({ error: "Missing summaries in request body." }, { status: 400 });
        }

        // 1. Extract Issuer Name (Master) from the final edited summary
        const issuerName = await GPT_Router.getIssuerName(editableSummary);
        
        // 2. Extract Issuer Alias from the original draft summary (what GPT originally saw)
        const issuerAlias = await GPT_Router.getIssuerName(draftSummary);

        // 3. Perform the logic: update master or add alias
        const result = await GPT_Router.updateCanonicals(CANONICAL_FILE_ID, {
            issuerName,
            issuerAlias
        });

        if (result.status === "NO_CHANGE") {
            return NextResponse.json({ 
                status: "NO_ACTION", 
                message: "No update required, entry already exists." 
            });
        }

        return NextResponse.json({ 
            status: "UPDATE_PERSISTED", 
            message: `✅ Bible Updated: Master [${issuerName}] with Alias [${issuerAlias}]`,
            data: result
        }, { status: 200 });

    } catch (err: any) {
        console.error("update-issuerCanon failed:", err.message);
        return NextResponse.json({ status: "SERVER_ERROR", error: err.message }, { status: 500 });
    }
}