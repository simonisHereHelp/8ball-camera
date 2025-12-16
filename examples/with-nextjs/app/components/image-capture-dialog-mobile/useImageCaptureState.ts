// app/components/image-capture-dialog-mobile/useImageCaptureState.ts

import { useRef, useState, useEffect, useCallback } from "react";
import type { WebCameraHandler, FacingMode } from "@shivantra/react-web-camera";
import { useSession } from "next-auth/react";
import { handleSave } from "@/lib/handleSave"; // Assuming path is correct
import { handleSummary } from "@/lib/handleSummary"; // Assuming path is correct
import type { Image, State, Actions } from "./types";

interface UseImageCaptureState {
  state: State;
  actions: Actions;
  cameraRef: React.RefObject<WebCameraHandler>;
}

export const useImageCaptureState = (
  onOpenChange?: (open: boolean) => void,
): UseImageCaptureState => {
  const [images, setImages] = useState<Image[]>([]);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [isSaving, setIsSaving] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [summary, setSummary] = useState("");
  const [editableSummary, setEditableSummary] = useState("");
  const [summaryImageUrl, setSummaryImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [showSummaryOverlay, setShowSummaryOverlay] = useState(false);

  const cameraRef = useRef<WebCameraHandler>(null);
  const { data: session } = useSession();

  // --- Callbacks and Handlers ---

  useEffect(() => {
    setEditableSummary(summary);
  }, [summary]);

  const deleteImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClose = useCallback(() => {
    if (images.length > 0 && !isSaving) {
      if (
        !window.confirm(
          "You have unsaved images. Are you sure you want to close?",
        )
      ) {
        return;
      }
    }
    // Reset all state when closing
    setImages([]);
    setSummary("");
    setSummaryImageUrl(null);
    setError("");
    setSaveMessage("");
    setShowSummaryOverlay(false);
    setShowGallery(false);
    onOpenChange?.(false);
  }, [images.length, isSaving, onOpenChange]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const file = await cameraRef.current.capture();
      if (file) {
        const url = URL.createObjectURL(file);
        // Clear previous state after a new capture
        setSummaryImageUrl(null);
        setSummary("");
        setError("");
        setSaveMessage("");
        setShowGallery(false);
        setShowSummaryOverlay(false);
        setImages((prev) => [...prev, { url, file }]);
      }
    } catch (err) {
      console.error("Capture error:", err);
    }
  }, []);

  const handleCameraSwitch = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const newMode = facingMode === "user" ? "environment" : "user";
      await cameraRef.current.switch(newMode);
      setFacingMode(newMode);
    } catch (err) {
      console.error("Camera switch error:", err);
    }
  }, [facingMode]);

  const handleSummarize = useCallback(async () => {
    setSaveMessage("");
    setError("");
    await handleSummary({
      images,
      setIsSaving,
      setSummary,
      setSummaryImageUrl,
      setShowSummaryOverlay,
      setError,
    });
    // After summarize finishes, go straight to gallery if no error
    if (images.length > 0 && !error) {
      setShowGallery(true);
    }
  }, [images, error]);

  const handleSaveImages = useCallback(async () => {
    if (!session) return;
    setSaveMessage("");
    if (!summary.trim()) {
      setError("Please summarize before saving.");
      return;
    }
    setError("");

    await handleSave({
      images,
      summary,
      setIsSaving,
      onError: setError,
      onSuccess: (savedSetName) => {
        setShowGallery(false); // Close gallery after success
        setSaveMessage(`Saved as: "${savedSetName}". ✅`);
        setImages([]); // Clear images after save
        setSummary("");
        setEditableSummary("");
      },
    });
  }, [session, images, summary]);

  const state: State = {
    images,
    facingMode,
    isSaving,
    showGallery,
    cameraError,
    summary,
    editableSummary,
    summaryImageUrl,
    error,
    saveMessage,
    showSummaryOverlay,
  };

  const actions: Actions = {
    deleteImage,
    handleCapture,
    handleCameraSwitch,
    handleSummarize,
    handleSaveImages,
    handleClose,
    setEditableSummary,
    setSummary,
    setShowGallery,
    setCameraError,
  };

  return { state, actions, cameraRef };
};