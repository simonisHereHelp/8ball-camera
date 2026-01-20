import { NextResponse } from "next/server";
import { listActiveSubfolders } from "@/lib/driveSubfolderResolver";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { subfolders, fallbackFolderId } = await listActiveSubfolders();
    return NextResponse.json({ subfolders, fallbackFolderId });
  } catch (err) {
    console.error("/api/active-subfolders failed:", err);
    return NextResponse.json(
      { error: "Unable to load active subfolders" },
      { status: 500 },
    );
  }
}
