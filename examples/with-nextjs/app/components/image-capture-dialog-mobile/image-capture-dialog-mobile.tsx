// app/components/image-capture-dialog-mobile/ImageCaptureDialogMobile.tsx
"use client";

import { Dialog, DialogContent, DialogTitle } from "@/ui/components"; 
import { useImageCaptureState } from "./useImageCaptureState";
import { CameraView } from "./CameraView";
import { GalleryView } from "./GalleryView";

// Add this interface to define the props
interface ImageCaptureDialogMobileProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  initialSource?: "camera" | "photos";
}

export function ImageCaptureDialogMobile({
  open,
  onOpenChange,
  initialSource = "camera",
}: ImageCaptureDialogMobileProps) { // Apply the interface here
  const { state, actions, cameraRef } = useImageCaptureState(
    onOpenChange,
    initialSource,
  );

  const { showGallery } = state;
  const { handleClose } = actions;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* Accessible title for screen readers */}
      <DialogTitle className="sr-only">Image Capture</DialogTitle>
      
      <DialogContent className="p-0 border-0 bg-black max-w-none w-full h-[100dvh] sm:max-w-sm sm:h-[680px] sm:rounded-[2rem] overflow-hidden [&>button:last-child]:hidden">
        <div className="relative w-full h-full flex flex-col bg-black">
          
          {/* Main View: Camera */}
          {!showGallery && (
            <CameraView
              state={state}
              actions={actions}
              cameraRef={cameraRef}
            />
          )}

          {/* Gallery Overlay */}
          {showGallery && (
            <GalleryView 
              state={state} 
              actions={actions} 
            />
          )}
          
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageCaptureDialogMobile;