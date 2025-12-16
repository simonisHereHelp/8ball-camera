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
  showGallery: boolean;
  cameraError: boolean;
  summary: string;
  editableSummary: string;
  summaryImageUrl: string | null;
  error: string;
  saveMessage: string;
  showSummaryOverlay: boolean; // Retained, though not used in UI
}

export interface Actions {
  deleteImage: (index: number) => void;
  handleCapture: () => Promise<void>;
  handleCameraSwitch: () => Promise<void>;
  handleSummarize: () => Promise<void>;
  handleSaveImages: () => Promise<void>;
  handleClose: () => void;
  setEditableSummary: (summary: string) => void;
  setSummary: (summary: string) => void;
  setShowGallery: (show: boolean) => void;
  setCameraError: (error: boolean) => void;
}