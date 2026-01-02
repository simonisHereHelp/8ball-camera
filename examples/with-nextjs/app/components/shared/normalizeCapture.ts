export type CaptureSource = "camera" | "photos";

export interface NormalizedCapture {
  file: File;
  previewUrl: string;
  source: CaptureSource;
}

export interface NormalizeOptions {
  maxFileSize?: number;
  expectedMimePrefix?: string;
  preferredName?: string;
}

const DEFAULT_MAX_SIZE = 15 * 1024 * 1024; // 15 MB
const DEFAULT_EXPECTED_PREFIX = "image/";

export class CaptureError extends Error {}

const createPreviewUrl = (file: File) => {
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    return URL.createObjectURL(file);
  }

  // Fallback for test environments
  return `preview://${file.name}`;
};

async function maybeNormalizeOrientation(file: File): Promise<File> {
  // Some browsers support EXIF-based orientation handling via createImageBitmap.
  if (typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image" as any,
    });

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, file.type),
    );

    if (!blob) return file;

    return new File([blob], file.name, {
      type: file.type,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Orientation normalization skipped", err);
    return file;
  }
}

export async function normalizeCapture(
  file: File,
  source: CaptureSource,
  options: NormalizeOptions = {},
): Promise<NormalizedCapture> {
  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_SIZE;
  const expectedMimePrefix = options.expectedMimePrefix ?? DEFAULT_EXPECTED_PREFIX;
  const preferredName = options.preferredName;

  if (!file.type?.startsWith(expectedMimePrefix)) {
    throw new CaptureError("Only image uploads are supported.");
  }

  if (file.size > maxFileSize) {
    throw new CaptureError("Image is too large. Please choose a smaller file.");
  }

  const normalizedName = preferredName ?? (file.name || `image-${Date.now()}.jpg`);
  let workingFile = file;

  // Some browsers strip EXIF orientation when re-encoding; we preserve type here.
  workingFile = await maybeNormalizeOrientation(
    new File([file], normalizedName, {
      type: file.type,
      lastModified: Date.now(),
    }),
  );

  const previewUrl = createPreviewUrl(workingFile);

  return {
    file: workingFile,
    previewUrl,
    source,
  };
}

export const DEFAULTS = {
  MAX_FILE_SIZE: DEFAULT_MAX_SIZE,
  MIME_PREFIX: DEFAULT_EXPECTED_PREFIX,
};
