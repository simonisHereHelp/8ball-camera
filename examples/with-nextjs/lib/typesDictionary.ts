export interface IssuerCanonEntry {
  master: string;
  aliases?: string[];
  description?: string;
  targetFolderId?: string;
}

export interface ActiveSubfolder {
  topic: string;
  folderId: string;
  keywords?: string[];
  description?: string;
}

export interface ActiveSubfolderResponse {
  subfolders: ActiveSubfolder[];
  fallbackFolderId?: string | null;
}
