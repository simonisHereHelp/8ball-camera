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
  
  // RENAMED: summary -> draftSummary
  const [draftSummary, setDraftSummary] = useState("");
  const [editableSummary, setEditableSummary] = useState("");
  
  const [summaryImageUrl, setSummaryImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [showSummaryOverlay, setShowSummaryOverlay] = useState(false);

  const cameraRef = useRef<WebCameraHandler>(null);
  const { data: session } = useSession();

  // --- Callbacks and Handlers ---

  // REMOVED: The previous useEffect is replaced by initialization logic in handleSummarize
  // to avoid overwriting user edits after the first draft is created.

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
    setDraftSummary(""); // Updated
    setEditableSummary(""); // Reset editableSummary on close
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
        setDraftSummary(""); // Updated
        setEditableSummary(""); // Reset editableSummary on new capture
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
    
    // Custom setter to set both draftSummary (LLM output) and editableSummary (user view)
    const setSummaries = (newSummary: string) => {
      setDraftSummary(newSummary);
      setEditableSummary(newSummary); // Initializes editableSummary = draftSummary
    }
    
    // Pass the custom setter to the external utility
    await handleSummary({
      images,
      setIsSaving,
      setSummary: setSummaries, // Utility calls this to set the summary content
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
    
    const finalSummary = editableSummary.trim();
    
    if (!finalSummary) { // Check against the editableSummary, which is the final content
      setError("Please summarize before saving.");
      return;
    }
    setError("");

    // NEW PARAMS: Pass both draftSummary and editableSummary
    await handleSave({
      images,
      draftSummary, // Original AI draft
      editableSummary: finalSummary, // Edited and final content
      setIsSaving,
      onError: setError,
      onSuccess: (savedSetName) => {
        setShowGallery(false); // Close gallery after success
        setSaveMessage(`Saved as: "${savedSetName}". ✅`);
        setImages([]); // Clear images after save
        setDraftSummary("");
        setEditableSummary("");
      },
    });
  // Added draftSummary and editableSummary to dependencies
  }, [session, images, draftSummary, editableSummary]);

  const state: State = {
    images,
    facingMode,
    isSaving,
    showGallery,
    cameraError,
    draftSummary, // Updated
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
    setDraftSummary, // Updated
    setShowGallery,
    setCameraError,
  };

  return { state, actions, cameraRef };
};