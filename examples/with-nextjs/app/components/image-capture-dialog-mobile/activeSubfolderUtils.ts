import type { ActiveSubfolderResponse } from "@/lib/typesDictionary";

export const fetchActiveSubfolderList = async (
  fetcher: typeof fetch = fetch,
): Promise<ActiveSubfolderResponse> => {
  const response = await fetcher("/api/active-subfolders");
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to fetch active subfolder list");
  }

  const payload = (await response.json()) as ActiveSubfolderResponse;
  return {
    subfolders: payload.subfolders ?? [],
    fallbackFolderId: payload.fallbackFolderId ?? null,
  };
};
