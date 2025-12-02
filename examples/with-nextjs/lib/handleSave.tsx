// app/lib/handleSave.ts

export interface Image {
  url: string;
  file: File;
}

/**
 * Simulates saving the current images (e.g. uploading to a server).
 * Does NOT call the summarize API – just runs the "save" workflow.
 */
export const handleSave = async ({
  images,
  setIsSaving,
  onError,
}: {
  images: Image[];
  setIsSaving: (isSaving: boolean) => void;
  onError?: (message: string) => void;
}) => {
  if (images.length === 0) return;

  setIsSaving(true);
  try {
    const files = images.map((image) => image.file);

    // Simulate a save/upload request.
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log("Saved files:", files);
        resolve();
      }, 3000);
    });
  } catch (error) {
    console.error("Failed to save images:", error);
    onError?.("Unable to save captured images. Please try again.");
  } finally {
    setIsSaving(false);
  }
};
