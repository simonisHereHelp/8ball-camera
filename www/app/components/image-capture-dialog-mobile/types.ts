import type { FacingMode, WebCameraHandler } from "@shivantra/react-web-camera";
import type { RefObject } from "react";

export interface ImageItem {
  url: string;
  file: File;
}

export type CaptureSource = "camera" | "file";

export interface CanonOption {
  id: string;
  label: string;
}

export interface ImageCaptureState {
  images: ImageItem[];
  captureSource: CaptureSource;
  isSaving: boolean;
  showGallery: boolean;
  cameraError: boolean;
  facingMode: FacingMode;
  draftSummary: string | null;
  editableSummary: string;
  issuerCanons: CanonOption[];
  issuerCanonsLoading: boolean;
  selectedCanon: string | null;
}

export interface ImageCaptureActions {
  addImage: (file: File) => void;
  deleteImage: (index: number) => void;
  clearImages: () => void;
  setCaptureSource: (source: CaptureSource) => void;
  setShowGallery: (show: boolean) => void;
  setCameraError: (hasError: boolean) => void;
  setEditableSummary: (summary: string) => void;
  selectCanon: (canonId: string) => void;
  handleCapture: (cameraRef: RefObject<WebCameraHandler>) => Promise<void>;
  handleCameraSwitch: (cameraRef: RefObject<WebCameraHandler>) => Promise<void>;
  handleSaveImages: () => Promise<void>;
  handleFilePick: (files: FileList | null) => void;
}

export interface CameraViewProps {
  state: ImageCaptureState;
  actions: ImageCaptureActions;
  cameraRef: RefObject<WebCameraHandler>;
}

export interface GalleryViewProps {
  state: ImageCaptureState;
  actions: ImageCaptureActions;
}
