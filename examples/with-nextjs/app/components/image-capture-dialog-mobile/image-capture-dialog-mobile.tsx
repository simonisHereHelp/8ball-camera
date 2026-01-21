// app/components/image-capture-dialog-mobile/ImageCaptureDialogMobile.tsx
"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/ui/components"; // Assuming path is correct
import type { WebCameraHandler } from "@shivantra/react-web-camera";
import { CameraView } from "./CameraView";
import { GalleryView } from "./GalleryView";
import { useImageCapture } from "./useImageCapture";

interface ImageCaptureDialogMobileProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  initialSource?: "camera" | "album";
}

export function ImageCaptureDialogMobile({
  open,
  onOpenChange,
  initialSource = "camera",
}: ImageCaptureDialogMobileProps) {
  const cameraRef = useRef<WebCameraHandler>(null);
  const { state, actions } = useImageCapture(onOpenChange, initialSource);

  return (
    <Dialog open={open} onOpenChange={actions.handleClose}>
      <DialogTitle />
      <DialogContent className="p-0 border-0 bg-black max-w-none w-full h-full max-h-none sm:max-w-sm sm:w-[380px] sm:h-[680px] sm:rounded-[2rem] overflow-hidden [&>button:last-child]:hidden">
        <div className="relative w-full h-full flex flex-col bg-black sm:rounded-[2rem]">
          <CameraView state={state} actions={actions} cameraRef={cameraRef} />

          {state.showGallery && <GalleryView state={state} actions={actions} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageCaptureDialogMobile;
