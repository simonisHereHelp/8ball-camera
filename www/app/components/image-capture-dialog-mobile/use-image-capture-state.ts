import type { RefObject } from "react";
import { useMemo, useReducer } from "react";
import type { WebCameraHandler } from "@shivantra/react-web-camera";

import type {
  CanonOption,
  CaptureSource,
  ImageCaptureActions,
  ImageCaptureState,
  ImageItem,
} from "./types";

type Action =
  | { type: "add-image"; file: File }
  | { type: "delete-image"; index: number }
  | { type: "clear-images" }
  | { type: "set-capture-source"; source: CaptureSource }
  | { type: "set-show-gallery"; show: boolean }
  | { type: "set-camera-error"; hasError: boolean }
  | { type: "set-saving"; isSaving: boolean }
  | { type: "set-facing-mode"; facingMode: ImageCaptureState["facingMode"] }
  | { type: "set-draft-summary"; draftSummary: string | null }
  | { type: "set-editable-summary"; editableSummary: string }
  | { type: "set-canon-options"; options: CanonOption[] }
  | { type: "set-canon-loading"; loading: boolean }
  | { type: "set-selected-canon"; canonId: string | null };

const initialState: ImageCaptureState = {
  images: [],
  captureSource: "camera",
  isSaving: false,
  showGallery: false,
  cameraError: false,
  facingMode: "environment",
  draftSummary: null,
  editableSummary: "",
  issuerCanons: [],
  issuerCanonsLoading: false,
  selectedCanon: null,
};

const reducer = (state: ImageCaptureState, action: Action): ImageCaptureState => {
  switch (action.type) {
    case "add-image": {
      const url = URL.createObjectURL(action.file);
      const image: ImageItem = { url, file: action.file };
      return { ...state, images: [...state.images, image] };
    }
    case "delete-image":
      return {
        ...state,
        images: state.images.filter((_, index) => index !== action.index),
      };
    case "clear-images":
      state.images.forEach((image) => URL.revokeObjectURL(image.url));
      return { ...state, images: [] };
    case "set-capture-source":
      return { ...state, captureSource: action.source, cameraError: false };
    case "set-show-gallery":
      return { ...state, showGallery: action.show };
    case "set-camera-error":
      return { ...state, cameraError: action.hasError };
    case "set-saving":
      return { ...state, isSaving: action.isSaving };
    case "set-facing-mode":
      return { ...state, facingMode: action.facingMode };
    case "set-draft-summary":
      return { ...state, draftSummary: action.draftSummary };
    case "set-editable-summary":
      return { ...state, editableSummary: action.editableSummary };
    case "set-canon-options":
      return { ...state, issuerCanons: action.options };
    case "set-canon-loading":
      return { ...state, issuerCanonsLoading: action.loading };
    case "set-selected-canon":
      return { ...state, selectedCanon: action.canonId };
    default:
      return state;
  }
};

export const useImageCaptureState = (
  onClose: () => void,
): { state: ImageCaptureState; actions: ImageCaptureActions } => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo<ImageCaptureActions>(
    () => ({
      addImage: (file) => dispatch({ type: "add-image", file }),
      deleteImage: (index) => dispatch({ type: "delete-image", index }),
      clearImages: () => dispatch({ type: "clear-images" }),
      setCaptureSource: (source) =>
        dispatch({ type: "set-capture-source", source }),
      setShowGallery: (show) => dispatch({ type: "set-show-gallery", show }),
      setCameraError: (hasError) =>
        dispatch({ type: "set-camera-error", hasError }),
      setEditableSummary: (summary) =>
        dispatch({ type: "set-editable-summary", editableSummary: summary }),
      selectCanon: (canonId) =>
        dispatch({ type: "set-selected-canon", canonId }),
      handleCapture: async (cameraRef: RefObject<WebCameraHandler>) => {
        if (!cameraRef.current) return;
        try {
          const file = await cameraRef.current.capture();
          if (file) {
            dispatch({ type: "add-image", file });
          }
        } catch (error) {
          console.error("Capture error:", error);
        }
      },
      handleCameraSwitch: async (cameraRef: RefObject<WebCameraHandler>) => {
        if (!cameraRef.current) return;
        try {
          const newMode =
            state.facingMode === "user" ? "environment" : "user";
          await cameraRef.current.switch(newMode);
          dispatch({ type: "set-facing-mode", facingMode: newMode });
        } catch (error) {
          console.error("Camera switch error:", error);
        }
      },
      handleSaveImages: async () => {
        if (state.images.length === 0) return;
        dispatch({ type: "set-saving", isSaving: true });
        try {
          const files = state.images.map((image) => image.file);
          await new Promise<void>((resolve) => {
            setTimeout(() => {
              console.log("Saved files:", files);
              resolve();
            }, 3000);
          });

          dispatch({ type: "clear-images" });
          onClose();
        } catch (error) {
          console.error("Failed to save images:", error);
        } finally {
          dispatch({ type: "set-saving", isSaving: false });
        }
      },
      handleFilePick: (files) => {
        if (!files || files.length === 0) return;
        Array.from(files).forEach((file) =>
          dispatch({ type: "add-image", file }),
        );
      },
    }),
    [onClose, state.facingMode, state.images],
  );

  return { state, actions };
};
