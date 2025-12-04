// app/lib/handleSave.ts

export interface Image {
  url: string;
  file: File;
}

function deriveSetName(summary: string) {
  const trimmed = summary.trim();
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const titlePart = trimmed
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 4)
    .join("-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `${titlePart || "document"}-${datePart}`;
}

/**
 * Simulates saving the current images (e.g. uploading to a server).
 * Does NOT call the summarize API – just runs the "save" workflow.
 */
export const handleSave = async ({
  images,
  summary,
  setIsSaving,
  onError,
}: {
  images: Image[];
  summary:string;
  setIsSaving: (isSaving: boolean) => void;
  onError?: (message: string) => void;
}) => {
  if (images.length === 0) return;
  const trimmedSummary = summary.trim();
  if (!trimmedSummary) return;
  setIsSaving(true);
  try {
    const setName = deriveSetName(trimmedSummary);
    const formData = new FormData();

    formData.append("summary", trimmedSummary);
    formData.append("setName", setName);

    const summaryFile = new File(
      [JSON.stringify({ summary: trimmedSummary }, null, 2)],
      `${setName}.json`,
      { type: "application/json" },
    );
    formData.append("files", summaryFile);

    images.forEach((image, index) => {
      const extension =
        image.file.name.split(".").pop() ||
        image.file.type.split("/")[1] ||
        "jpg";

      const renamed = new File([image.file], `${setName}-${index + 1}.${extension}`, {
        type: image.file.type,
        lastModified: image.file.lastModified,
      });

      formData.append("files", renamed);
    });

    const response = await fetch("/api/save-set", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to save files to Google Drive.");
    }


  } catch (error) {
    console.error("Failed to save images:", error);
    onError?.("Unable to save captured images. Please try again.");
  } finally {
    setIsSaving(false);
  }
};
