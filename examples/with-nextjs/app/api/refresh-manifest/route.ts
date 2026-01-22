import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertDriveManifest } from "@/lib/driveManifest";

const DRIVE_LIST_URL = "https://www.googleapis.com/drive/v3/files";
const BASE_DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

async function listDriveFiles(params: {
  accessToken: string;
  query: string;
}): Promise<DriveFile[]> {
  const { accessToken, query } = params;
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(DRIVE_LIST_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType)");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Drive list failed: ${res.status} ${text}`);
    }

    const data = (await res.json().catch(() => null)) as
      | { files?: DriveFile[]; nextPageToken?: string }
      | null;
    files.push(...(data?.files ?? []));
    pageToken = data?.nextPageToken;
  } while (pageToken);

  return files;
}

function buildInlineAssets(params: { markdownId: string; imageFiles: DriveFile[] }) {
  const { markdownId, imageFiles } = params;
  return {
    [markdownId]: Object.fromEntries(
      imageFiles.map((file) => [`./${file.name}`, file.id]),
    ),
  };
}

export async function POST() {
  if (!BASE_DRIVE_FOLDER_ID) {
    return NextResponse.json({ error: "Missing DRIVE_FOLDER_ID" }, { status: 500 });
  }

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const accessToken = (session as any)?.accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing Google Drive access token on session." },
      { status: 401 },
    );
  }

  try {
    const messages: string[] = [];
    messages.push("starting manifest refresh");
    const folderQuery = [
      `'${BASE_DRIVE_FOLDER_ID}' in parents`,
      "trashed = false",
      "mimeType = 'application/vnd.google-apps.folder'",
    ].join(" and ");
    const subfolders = await listDriveFiles({ accessToken, query: folderQuery });
    messages.push(`found ${subfolders.length} subfolder(s)`);

    const processedFiles: string[] = [];
    const foldersMap: Record<string, string> = {};
    const treeMap: Record<string, string[]> = {};
    const filesMap: Record<string, { name: string; mime: string }> = {};
    const inlineAssetsMap: Record<string, Record<string, string>> = {};

    for (const folder of subfolders) {
      messages.push(`processing folder ${folder.name}`);
      const fileQuery = [`'${folder.id}' in parents`, "trashed = false"].join(" and ");
      const files = await listDriveFiles({ accessToken, query: fileQuery });
      const treeIds = files.map((file) => file.id);
      const filesById = Object.fromEntries(
        files.map((file) => [file.id, { name: file.name, mime: file.mimeType }]),
      );
      const markdownFiles = files.filter((file) =>
        file.name.toLowerCase().match(/\.(md|mdx)$/),
      );
      const imageFiles = files.filter((file) => file.mimeType.startsWith("image/"));

      const inlineAssets = markdownFiles.reduce<Record<string, Record<string, string>>>(
        (acc, file) => ({ ...acc, ...buildInlineAssets({ markdownId: file.id, imageFiles }) }),
        {},
      );

      processedFiles.push(...files.map((file) => file.name));
      const folderKey = `docs/${folder.name}`;
      foldersMap[folderKey] = folder.id;
      treeMap[folderKey] = treeIds;
      Object.assign(filesMap, filesById);
      Object.assign(inlineAssetsMap, inlineAssets);

      messages.push(`queued manifest data for ${folder.name}`);
    }

    const manifestResult = await upsertDriveManifest({
      folderId: BASE_DRIVE_FOLDER_ID,
      manifest: {
        folders: foldersMap,
        tree: treeMap,
        files: filesMap,
        inlineAssets: inlineAssetsMap,
        updatedAt: Date.now(),
      },
      replace: true,
    });
    messages.push(
      `${manifestResult.action} manifest.json at root (${manifestResult.id})`,
    );

    messages.push("manifest refresh complete");
    return NextResponse.json({ processedFiles, messages }, { status: 200 });
  } catch (error: any) {
    console.error("refresh-manifest failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
