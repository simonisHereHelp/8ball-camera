// app/components/image-capture-dialog-mobile/types.ts

import type { FacingMode } from "@shivantra/react-web-camera";
import type { IssuerCanonEntry } from "@/types/issuerCanon";

export interface Image {
  url: string;
  file: File;
}

export interface State {
  images: Image[];
  captureSource: "camera" | "album";
  facingMode: FacingMode;
  isSaving: boolean;
  isProcessingCapture: boolean;
  showGallery: boolean;
  cameraError: boolean;
  draftSummary: string;
  editableSummary: string;
  summaryImageUrl: string | null;
  error: string | null;
  saveMessage: string | null;
  showSummaryOverlay: boolean;
  issuerCanons: IssuerCanonEntry[];
  issuerCanonsLoading: boolean;
  selectedCanon: IssuerCanonEntry | null;
  canonError: string | null;
}

export interface Actions {
  handleCapture: () => Promise<void>;
  handleAlbumSelect: (files: FileList | null) => Promise<void>;
  handleCameraSwitch: () => Promise<void>;
  handleSummarize: () => Promise<void>;
  handleSaveImages: () => Promise<void>;
  handleClose: () => void;
  setShowGallery: (show: boolean) => void;
  setCameraError: (error: boolean) => void;
  setError: (msg: string | null) => void;
  setEditableSummary: (val: string) => void;
  deleteImage: (index: number) => void;
  selectCanon: (canon: IssuerCanonEntry) => void;
  refreshCanons: () => Promise<void>;
  setCaptureSource: (source: "camera" | "album") => void;
  setDraftSummary: (summary: string) => void;
  setCanonError: (value: string | null) => void;
  setCaptureHandler: (handler: (() => Promise<File | null>) | null) => void;
  setSwitchHandler: (handler: ((mode: FacingMode) => Promise<void>) | null) => void;
}
