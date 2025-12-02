// app/lib/handleSummary.ts

export interface Image {
  url: string;
  file: File;
}

/**
 * Uploads the latest image to /api/summarize and shows
 * the first 800 characters of the returned summary.
 */
export const handleSummary = async ({
  images,
  setIsSaving,
  setSummary,
  setSummaryImageUrl,
  setShowSummaryOverlay,
  setError,
}: {
  images: Image[];
  setIsSaving: (isSaving: boolean) => void;
  setSummary: (summary: string) => void;
  setSummaryImageUrl: (url: string | null) => void;
  setShowSummaryOverlay: (show: boolean) => void;
  setError: (message: string) => void;
}) => {
  if (images.length === 0) return;

  setIsSaving(true);
  setError("");
  try {
    const files = images.map((image) => image.file);

    // Simulate a save/upload request.
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log("Saved files:", files);
        resolve();
      }, 3000);
    });

    const latestImage = files[files.length - 1];
    const formData = new FormData();
    formData.append("image", latestImage);

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

    setSummary(summaryText);
    setSummaryImageUrl(images[images.length - 1].url);
    setShowSummaryOverlay(true);
  } catch (error) {
    console.error("Failed to summarize image:", error);
    setSummary("");
    setSummaryImageUrl(null);
    setError("Unable to summarize the captured image. Please try again.");
    setShowSummaryOverlay(false);
  } finally {
    setIsSaving(false);
  }
};
