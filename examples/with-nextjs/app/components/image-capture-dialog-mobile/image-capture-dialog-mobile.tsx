"use client";

import { Dialog, DialogContent, DialogTitle } from "@/ui/components";
import { useImageCaptureState } from "./useImageCaptureState";
import { CameraView } from "./CameraView";
import { GalleryView } from "./GalleryView";

export function ImageCaptureDialogMobile({ open, onOpenChange, initialSource = "camera" }) {
  const { state, actions, cameraRef } = useImageCaptureState(onOpenChange, initialSource);

  return (
    <Dialog open={open} onOpenChange={actions.handleClose}>
      <DialogTitle className="sr-only">Capture Image</DialogTitle>
      <DialogContent className="p-0 border-0 bg-black w-full h-[100dvh] sm:max-w-sm sm:h-[700px] overflow-hidden">
        <CameraView state={state} actions={actions} cameraRef={cameraRef} />
        {state.showGallery && <GalleryView state={state} actions={actions} />}
      </DialogContent>
    </Dialog>
  );
}