// app/components/image-capture-dialog-mobile/ImageCaptureDialogMobile.tsx
"use client";

import { Dialog, DialogContent, DialogTitle } from "@/ui/components"; // Assuming path is correct
import { useImageCaptureState } from "./useImageCaptureState";
import { CameraView } from "./CameraView";
import { GalleryView } from "./GalleryView";

interface ImageCaptureDialogMobileProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  initialSource?: "camera" | "photos";
}

export function ImageCaptureDialogMobile({
  open,
  onOpenChange,
  initialSource = "camera",
}: ImageCaptureDialogMobileProps) {
  // Use the custom hook to encapsulate all logic and state
  const { state, actions, cameraRef } = useImageCaptureState(
    onOpenChange,
    initialSource,
  );

  // Use state and actions to render the appropriate component
  const { showGallery } = state;
  const { handleClose } = actions;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTitle />
      <DialogContent className="p-0 border-0 bg-black max-w-none w-full h-full max-h-none sm:max-w-sm sm:w-[380px] sm:h-[680px] sm:rounded-[2rem] overflow-hidden [&>button:last-child]:hidden">
        <div className="relative w-full h-full flex flex-col bg-black sm:rounded-[2rem]">
          {/* Main View: Camera or Gallery */}
          {!showGallery && (
            <CameraView
              state={state}
              actions={actions}
              cameraRef={cameraRef}
            />
          )}

          {/* Gallery Modal (shows photos + summary + save buttons) */}
          {showGallery && <GalleryView state={state} actions={actions} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageCaptureDialogMobile;