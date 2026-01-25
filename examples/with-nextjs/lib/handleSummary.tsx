// app/lib/handleSummary.ts

import { playSuccessChime } from "../app/components/image-capture-dialog-mobile/soundEffects";

export interface Image {
  url: string;
  file: File;
}

const extensionFromFile = (file: File) => {
  const nameExtension = file.name.split(".").pop()?.toLowerCase();
  if (nameExtension) return nameExtension;

  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";

  return "jpg";
};

const buildSummaryTemplate = (images: Image[]) => {
  const assets =
    images.length > 0
      ? images
          .map((image, index) => {
            const page = index + 1;
            const extension = extensionFromFile(image.file);
            return `- [ ] ./{{setName}}-p${page}.${extension}`;
          })
          .join("\n")
      : "- [ ] ./{{setName}}-p1.jpg";

  return `### Draft Summary
單位：
類型：
行動：
内容摘要：

### Assets
${assets}
`;
};

/**
 * Uploads the latest image to /api/summarize and shows
 * the first 800 characters of the returned summary.
 */

export const handleSummary = async ({
  images,
  setIsSaving,
  setSummary, // NOTE: This function now sets BOTH draftSummary and editableSummary in the calling hook.
  setSummaryImageUrl,
  setShowSummaryOverlay,
  setError,
}: {
  images: Image[];
  setIsSaving: (isSaving: boolean) => void;
  // UPDATED: setSummary is now a function that takes the final summary string
  setSummary: (summary: string) => void;
  setSummaryImageUrl: (url: string | null) => void;
  setShowSummaryOverlay: (show: boolean) => void;
  setError: (message: string) => void;
}): Promise<boolean> => {
  if (images.length === 0) return false;

  const fallbackSummary = buildSummaryTemplate(images);

  setIsSaving(true);
  setError("");
  try {
    const formData = new FormData();

    // ✅ append ALL images
    images.forEach((image) => {
      formData.append("image", image.file);
    });

    // ✅ optionally include URLs if your server supports imageUrl
    images.forEach((image) => {
      if (image.url) {
        formData.append("imageUrl", image.url);
      }
    });
    
    const response = await fetch("/api/summarize", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to summarize image.");
    }

    const data = (await response.json()) as { summary?: string };

    // First 800 characters only
    const summaryText = (data.summary || "").slice(0, 800);
    const resolvedSummary = summaryText.trim().length ? summaryText : fallbackSummary;

    // Call the custom setter, which will update both draftSummary and editableSummary
    setSummary(resolvedSummary);
    setSummaryImageUrl(images[images.length - 1].url);
    setShowSummaryOverlay(true);
    playSuccessChime();
    return true;
  } catch (error) {
    console.error("Failed to summarize image:", error);
    setSummary(fallbackSummary);
    setSummaryImageUrl(null);
    setError("Unable to summarize the captured image. Please edit the template summary.");
    setShowSummaryOverlay(false);
    return true;
  } finally {
    setIsSaving(false);
  }
};
