// app/components/image-capture-dialog-mobile/types.ts

import type { FacingMode } from "@shivantra/react-web-camera";

export interface Image {
  url: string;
  file: File;
}

export interface State {
  images: Image[];
  facingMode: FacingMode;
  isSaving: boolean;
  isProcessingCapture: boolean;
  showGallery: boolean;
  cameraError: boolean;
  captureSource: "camera" | "photos";
  // RENAMED: summary -> draftSummary
  draftSummary: string;
  editableSummary: string;
  summaryImageUrl: string | null;
  error: string;
  saveMessage: string;
  showSummaryOverlay: boolean; 
}

export interface Actions {
  deleteImage: (index: number) => void;
  handleCapture: () => Promise<void>;
  handleCameraSwitch: () => Promise<void>;
  handleAlbumSelect: (files: FileList | null) => Promise<void>;
  handleSummarize: () => Promise<void>;
  handleSaveImages: () => Promise<void>;
  handleClose: () => void;
  setCaptureSource: (source: "camera" | "photos") => void;
  setEditableSummary: (summary: string) => void;
  // RENAMED: setSummary -> setDraftSummary
  setDraftSummary: (summary: string) => void;
  setShowGallery: (show: boolean) => void;
  setCameraError: (error: boolean) => void;
  setError: (message: string) => void;
}