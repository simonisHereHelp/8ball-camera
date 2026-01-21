// app/components/image-capture-dialog-mobile/useImageCapture.ts

import { useRef, useState, useCallback, useEffect } from "react";
import type { FacingMode } from "@shivantra/react-web-camera";
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
}

export const useImageCapture = (
  onOpenChange?: (open: boolean) => void,
  initialSource: "camera" | "album" = "camera",
): UseImageCaptureState => {
  const [images, setImages] = useState<Image[]>([]);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [captureSource, setCaptureSource] = useState<"camera" | "album">(
    initialSource,
  );

  const [draftSummary, setDraftSummary] = useState("");
  const [editableSummary, setEditableSummary] = useState("");

  const [summaryImageUrl, setSummaryImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showSummaryOverlay, setShowSummaryOverlay] = useState(false);
  const [issuerCanons, setIssuerCanons] = useState<IssuerCanonEntry[]>([]);
  const [issuerCanonsLoading, setIssuerCanonsLoading] = useState(false);
  const [canonError, setCanonError] = useState<string | null>(null);
  const [selectedCanon, setSelectedCanon] = useState<IssuerCanonEntry | null>(
    null,
  );
  const captureHandlerRef = useRef<(() => Promise<File | null>) | null>(null);
  const switchHandlerRef = useRef<((mode: FacingMode) => Promise<void>) | null>(
    null,
  );

  const { data: session } = useSession();

  useEffect(() => {
    setCaptureSource(initialSource);
  }, [initialSource]);

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
    setImages([]);
    setDraftSummary("");
    setEditableSummary("");
    setSummaryImageUrl(null);
    setError(null);
    setSaveMessage(null);
    setShowSummaryOverlay(false);
    setShowGallery(false);
    setIssuerCanons([]);
    setCanonError(null);
    setSelectedCanon(null);
    setCaptureSource(initialSource);
    setIsProcessingCapture(false);
    onOpenChange?.(false);
  }, [images.length, initialSource, isSaving, onOpenChange]);

  const ingestFile = useCallback(
    async (file: File, source: "camera" | "album", preferredName?: string) => {
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

        setSummaryImageUrl(null);
        setDraftSummary("");
        setEditableSummary("");
        setError(null);
        setSaveMessage(null);
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
    const capture = captureHandlerRef.current;
    if (!capture) return;
    try {
      const file = await capture();
      if (file) {
        await ingestFile(file, "camera", `capture-${Date.now()}.jpeg`);
      }
    } catch (err) {
      console.error("Capture error:", err);
      setError("Unable to access camera capture.");
    }
  }, [ingestFile]);

  const handleAlbumSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        setError("No photo selected.");
        return;
      }

      const file = files[0];
      await ingestFile(file, "album");
    },
    [ingestFile],
  );

  const handleCameraSwitch = useCallback(async () => {
    const switchCamera = switchHandlerRef.current;
    if (!switchCamera) return;
    try {
      const newMode = facingMode === "user" ? "environment" : "user";
      await switchCamera(newMode);
      setFacingMode(newMode);
    } catch (err) {
      console.error("Camera switch error:", err);
    }
  }, [facingMode]);

  const handleSourceChange = useCallback((source: "camera" | "album") => {
    setCaptureSource(source);
    setShowGallery(false);
    setError(null);
    setSaveMessage(null);
    setCameraError(false);
  }, []);

  const handleSummarize = useCallback(async () => {
    setSaveMessage(null);
    setError(null);

    const setSummaries = (newSummary: string) => {
      setDraftSummary(newSummary);
      setEditableSummary(newSummary);
    };

    const didSummarize = await handleSummary({
      images,
      setIsSaving,
      setSummary: setSummaries,
      setSummaryImageUrl,
      setShowSummaryOverlay,
      setError,
    });
    if (didSummarize && images.length > 0) {
      setShowGallery(true);
      playSuccessChime();
    }
  }, [images]);

  const refreshCanons = useCallback(async () => {
    if (issuerCanonsLoading) return;
    setIssuerCanonsLoading(true);
    setCanonError(null);
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
    setSaveMessage(null);

    const finalSummary = editableSummary.trim();

    if (!finalSummary) {
      setError("Please summarize before saving.");
      return;
    }
    setError(null);

    await handleSave({
      images,
      draftSummary,
      finalSummary,
      selectedCanon,
      setIsSaving,
      onError: setError,
      onSuccess: ({ setName: savedSetName, targetFolderId, topic }) => {
        setShowGallery(false);
        const lastSegment = targetFolderId?.split("/").pop() ?? "";
        const folderPath = topic || lastSegment || "Drive_unknown";
        const displayPath = folderPath.replace(/^Drive_/, "");
        const resolvedName = normalizeFilename(savedSetName || "(untitled)");
        setSaveMessage(
          `uploaded to path: ${displayPath} ✅\nname: ${resolvedName} ✅`,
        );
        setImages([]);
        setDraftSummary("");
        setEditableSummary("");
        setSelectedCanon(null);
        playSuccessChime();
      },
    });
  }, [session, images, draftSummary, editableSummary, selectedCanon]);

  const state: State = {
    images,
    facingMode,
    isSaving,
    isProcessingCapture,
    showGallery,
    cameraError,
    captureSource,
    draftSummary,
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
    setDraftSummary,
    setShowGallery,
    setCameraError,
    setError,
    setCanonError,
    setCaptureHandler: (handler) => {
      captureHandlerRef.current = handler;
    },
    setSwitchHandler: (handler) => {
      switchHandlerRef.current = handler;
    },
    refreshCanons,
    selectCanon,
  };

  return { state, actions };
};
