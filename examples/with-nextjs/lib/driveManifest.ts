import { auth } from "@/auth";

export interface DriveManifest {
  folders: Record<string, string>;
  tree: Record<string, string[]>;
  files: Record<string, { name: string; mime: string }>;
  inlineAssets: Record<string, Record<string, string>>;
  updatedAt: number;
}

const DRIVE_LIST_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

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

function mergeArrays(existing: string[] = [], incoming: string[] = []) {
  const merged = new Set<string>([...existing, ...incoming]);
  return Array.from(merged);
}

function mergeRecordArrays(
  existing: Record<string, string[]> = {},
  incoming: Record<string, string[]> = {},
) {
  const merged: Record<string, string[]> = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = mergeArrays(existing[key] ?? [], value);
  }
  return merged;
}

function mergeManifest(
  existing: DriveManifest | null,
  incoming: DriveManifest,
  options?: { replace?: boolean },
): DriveManifest {
  if (options?.replace || !existing) {
    return incoming;
  }

  return {
    folders: { ...(existing?.folders ?? {}), ...incoming.folders },
    tree: mergeRecordArrays(existing?.tree ?? {}, incoming.tree),
    files: { ...(existing?.files ?? {}), ...incoming.files },
    inlineAssets: { ...(existing?.inlineAssets ?? {}), ...incoming.inlineAssets },
    updatedAt: incoming.updatedAt,
  };
}

async function findManifestFileId(params: {
  folderId: string;
  accessToken: string;
}): Promise<string | null> {
  const { folderId, accessToken } = params;
  const query = encodeURIComponent(
    `name = 'manifest.json' and '${folderId}' in parents and trashed = false`,
  );

  const res = await fetch(`${DRIVE_LIST_URL}?q=${query}&fields=files(id,name)&pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to list manifest.json: ${res.status} ${text}`);
  }

  const data = (await res.json().catch(() => null)) as { files?: { id: string }[] } | null;
  return data?.files?.[0]?.id ?? null;
}

async function readManifest(params: {
  fileId: string;
  accessToken: string;
}): Promise<DriveManifest | null> {
  const { fileId, accessToken } = params;
  const res = await fetch(`${DRIVE_LIST_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to read manifest.json: ${res.status} ${text}`);
  }

  const json = (await res.json().catch(() => null)) as DriveManifest | null;
  return json;
}

export async function upsertDriveManifest(params: {
  folderId: string;
  manifest: DriveManifest;
  replace?: boolean;
}) {
  const { folderId, manifest, replace } = params;
  const session = await auth();
  if (!session) throw new Error("Not authenticated.");

  const accessToken = (session as any)?.accessToken as string | undefined;
  if (!accessToken) throw new Error("Missing Google Drive access token on session.");

  const existingId = await findManifestFileId({ folderId, accessToken });
  const existingManifest = existingId
    ? await readManifest({ fileId: existingId, accessToken })
    : null;

  const merged = mergeManifest(existingManifest, manifest, { replace });
  const bodyBuffer = Buffer.from(JSON.stringify(merged, null, 2), "utf8");
  const boundary = "manifest-boundary-" + Date.now() + Math.random().toString(16);

  const metadata = existingId
    ? { name: "manifest.json" }
    : { name: "manifest.json", parents: [folderId] };

  const body = buildMultipartBody(boundary, metadata, bodyBuffer, "application/json");
  const url = existingId
    ? `${DRIVE_UPLOAD_URL}/${existingId}?uploadType=multipart&fields=id,name`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name`;

  const res = await fetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to upsert manifest.json: ${res.status} ${text}`);
  }
}
