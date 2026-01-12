// app/components/image-capture-dialog-mobile/useImageCaptureState.ts

import { useRef, useState, useCallback, useEffect } from "react";
import type { WebCameraHandler, FacingMode } from "@shivantra/react-web-camera";
import { useSession } from "next-auth/react";
import { handleSave } from "@/lib/handleSave"; // Assuming path is correct
import { handleSummary } from "@/lib/handleSummary"; // Assuming path is correct
import { normalizeFilename } from "@/lib/normalizeFilename";
import {
  CaptureError,
  DEFAULTS,
  normalizeCapture,
} from "../shared/normalizeCapture";
import type { Image, State, Actions } from "./types";
import {
  applyCanonToSummary,
  fetchIssuerCanonList,
  type IssuerCanonEntry,
} from "./issuerCanonUtils";
import { playSuccessChime } from "./soundEffects";

interface UseImageCaptureState {
  state: State;
  actions: Actions;
  cameraRef: React.RefObject<WebCameraHandler>;
}

export const useImageCaptureState = (
  onOpenChange?: (open: boolean) => void,
  initialSource: "camera" | "photos" = "camera",
): UseImageCaptureState => {
  const [images, setImages] = useState<Image[]>([]);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [captureSource, setCaptureSource] = useState<"camera" | "photos">(
    initialSource,
  );
  
  // RENAMED: summary -> draftSummary
  const [draftSummary, setDraftSummary] = useState("");
  const [editableSummary, setEditableSummary] = useState("");
  
  const [summaryImageUrl, setSummaryImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [showSummaryOverlay, setShowSummaryOverlay] = useState(false);
  const [issuerCanons, setIssuerCanons] = useState<IssuerCanonEntry[]>([]);
  const [issuerCanonsLoading, setIssuerCanonsLoading] = useState(false);
  const [canonError, setCanonError] = useState("");
  const [selectedCanon, setSelectedCanon] = useState<IssuerCanonEntry | null>(
    null,
  );

  const cameraRef = useRef<WebCameraHandler>(null);
  const { data: session } = useSession();

  useEffect(() => {
    setCaptureSource(initialSource);
  }, [initialSource]);

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
    setIssuerCanons([]);
    setCanonError("");
    setSelectedCanon(null);
    setCaptureSource(initialSource);
    setIsProcessingCapture(false);
    onOpenChange?.(false);
  }, [images.length, initialSource, isSaving, onOpenChange]);

  const ingestFile = useCallback(
    async (file: File, source: "camera" | "photos", preferredName?: string) => {
      setIsProcessingCapture(true);
      try {
        const { file: normalizedFile, previewUrl } = await normalizeCapture(
          file,
          source,
          {
            maxFileSize: DEFAULTS.MAX_FILE_SIZE,
            preferredName,
          },
        );

        // Clear previous state after a new capture
        setSummaryImageUrl(null);
        setDraftSummary("");
        setEditableSummary("");
        setError("");
        setSaveMessage("");
        setShowGallery(false);
        setShowSummaryOverlay(false);
        setImages((prev) => [...prev, { url: previewUrl, file: normalizedFile }]);
      } catch (err) {
        console.error("Capture error:", err);
        if (err instanceof CaptureError) {
          setError(err.message);
        } else {
          setError("Unable to process the image. Please try again.");
        }
      } finally {
        setIsProcessingCapture(false);
      }
    },
    [],
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const file = await cameraRef.current.capture();
      if (file) {
        await ingestFile(file, "camera", `capture-${Date.now()}.jpeg`);
      }
    } catch (err) {
      console.error("Capture error:", err);
      setError("Unable to access camera capture.");
    }
  }, [ingestFile, setError]);

  const handleAlbumSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        setError("No photo selected.");
        return;
      }

      const file = files[0];
      await ingestFile(file, "photos");
    },
    [ingestFile],
  );

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

  const handleSourceChange = useCallback(
    (source: "camera" | "photos") => {
      setCaptureSource(source);
      setShowGallery(false);
      setError("");
      setSaveMessage("");
      setCameraError(false);
    },
    [],
  );

  const handleSummarize = useCallback(async () => {
    setSaveMessage("");
    setError("");
    
    // Custom setter to set both draftSummary (LLM output) and editableSummary (user view)
    const setSummaries = (newSummary: string) => {
      setDraftSummary(newSummary);
      setEditableSummary(newSummary); // Initializes editableSummary = draftSummary
    }
    
    // Pass the custom setter to the external utility
    const didSummarize = await handleSummary({
      images,
      setIsSaving,
      setSummary: setSummaries, // Utility calls this to set the summary content
      setSummaryImageUrl,
      setShowSummaryOverlay,
      setError,
    });
    // After summarize finishes, go straight to gallery if successful
    if (didSummarize && images.length > 0) {
      setShowGallery(true);
      playSuccessChime();
    }
  }, [images]);

  const refreshCanons = useCallback(async () => {
    if (issuerCanonsLoading) return;
    setIssuerCanonsLoading(true);
    setCanonError("");
    try {
      const entries = await fetchIssuerCanonList();
      setIssuerCanons(entries);
    } catch (err) {
      console.error("fetchIssuerCanonList failed:", err);
      setCanonError(
        err instanceof Error
          ? err.message
          : "Unable to load issuer canon entries.",
      );
    } finally {
      setIssuerCanonsLoading(false);
    }
  }, [issuerCanonsLoading]);

  const selectCanon = useCallback(
    (canon: IssuerCanonEntry) => {
      setSelectedCanon(canon);
      setEditableSummary((current) =>
        applyCanonToSummary({
          canon,
          currentSummary: current,
          draftSummary,
        }),
      );
    },
    [draftSummary],
  );

  useEffect(() => {
    if (showGallery && !issuerCanons.length && !issuerCanonsLoading) {
      refreshCanons();
    }
  }, [showGallery, issuerCanons.length, issuerCanonsLoading, refreshCanons]);

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
      finalSummary, // Edited and final content
      selectedCanon,
      setIsSaving,
      onError: setError,
      onSuccess: ({ setName: savedSetName, targetFolderId, topic }) => {
        setShowGallery(false); // Close gallery after success
        const lastSegment = targetFolderId?.split("/").pop() ?? "";
        const folderPath = topic || lastSegment || "Drive_unknown";
        const displayPath = folderPath.replace(/^Drive_/, "");
        const resolvedName = normalizeFilename(savedSetName || "(untitled)");
        setSaveMessage(
          `uploaded to path: ${displayPath} ✅\nname: ${resolvedName} ✅`,
        );
        setImages([]); // Clear images after save
        setDraftSummary("");
        setEditableSummary("");
        setSelectedCanon(null);
        playSuccessChime();
      },
    });
  // Added draftSummary and editableSummary to dependencies
  }, [session, images, draftSummary, editableSummary, selectedCanon]);

  const state: State = {
    images,
    facingMode,
    isSaving,
    isProcessingCapture,
    showGallery,
    cameraError,
    captureSource,
    draftSummary, // Updated
    editableSummary,
    summaryImageUrl,
    error,
    saveMessage,
    showSummaryOverlay,
    issuerCanons,
    issuerCanonsLoading,
    canonError,
    selectedCanon,
  };

  const actions: Actions = {
    deleteImage,
    handleCapture,
    handleAlbumSelect,
    handleCameraSwitch,
    handleSummarize,
    handleSaveImages,
    handleClose,
    setCaptureSource: handleSourceChange,
    setEditableSummary,
    setDraftSummary, // Updated
    setShowGallery,
    setCameraError,
    setError,
    setCanonError,
    refreshCanons,
    selectCanon,
  };

  return { state, actions, cameraRef };
};
