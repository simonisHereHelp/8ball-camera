import { NextResponse } from "next/server";
import { GPT_Router } from "@/lib/gptRouter";
import { CANONICALS_BIBLE_SOURCE } from "@/lib/jsonCanonSources";

export const runtime = "nodejs";

export async function GET() {
  if (!CANONICALS_BIBLE_SOURCE) {
    return NextResponse.json(
      { error: "Missing canonical source configuration" },
      { status: 500 },
    );
  }

  try {
    const bible = await GPT_Router.fetchJsonSource(CANONICALS_BIBLE_SOURCE, true);
    const issuers = bible?.issuers || [];

    return NextResponse.json(
      issuers.map((issuer: any) => ({
        master: issuer.master,
        aliases: issuer.aliases || [],
      })),
    );
  } catch (err: any) {
    console.error("issuer-canons fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to load issuer canons" },
      { status: 500 },
    );
  }
}
