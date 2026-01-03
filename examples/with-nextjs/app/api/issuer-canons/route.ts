import { NextResponse } from "next/server";
import { GPT_Router } from "@/lib/gptRouter";
import { CANONICALS_BIBLE_SOURCE } from "@/lib/jsonCanonSources";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!CANONICALS_BIBLE_SOURCE) {
      return NextResponse.json(
        { error: "Missing canonical source" },
        { status: 500 },
      );
    }

    const bibleData = await GPT_Router._fetchFile(CANONICALS_BIBLE_SOURCE);
    const issuers = bibleData?.issuers ?? [];

    return NextResponse.json({ issuers });
  } catch (err) {
    console.error("/api/issuer-canons failed:", err);
    return NextResponse.json(
      { error: "Unable to load issuer canons" },
      { status: 500 },
    );
  }
}
