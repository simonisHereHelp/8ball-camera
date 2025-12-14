// @/lib/driveEditFile.ts

import { auth } from "@/auth";

export async function driveEditFile(params: any) {
  const fileId = params?.fileId;
  const content = params?.content ?? "";
  const contentType = params?.contentType ?? "text/plain; charset=utf-8";
  if (!fileId) throw new Error("Missing fileId");
  const session = await auth();
  if (!session) throw new Error("Not authenticated.");

  const accessToken = (session as any)?.accessToken as string | undefined;

  if (!accessToken) throw new Error("Missing Google Drive access token on session.");

  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;

  const res = await fetch(uploadUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: content,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`driveEditFile failed: ${res.status} ${errText}`);
  }

}
