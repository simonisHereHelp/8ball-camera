"use client";

import { Loader2, X } from "lucide-react";
import { useRef } from "react";
import type { WebCameraHandler } from "@shivantra/react-web-camera";

import { Button, Dialog, DialogContent, DialogTitle } from "@/ui/components";

import { CameraView } from "./CameraView";
import { GalleryView } from "./GalleryView";
import { useImageCaptureState } from "./use-image-capture-state";

export function ImageCaptureDialogMobile({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: () => void;
}) {
  const cameraRef = useRef<WebCameraHandler>(null);
  const { state, actions } = useImageCaptureState(onOpenChange);

  /**
   * Handles the dialog close action. It prompts the user for confirmation
   * if there are unsaved images to prevent data loss.
   */
  const handleClose = () => {
    if (state.images.length > 0 && !state.isSaving) {
      if (
        !window.confirm(
          "You have unsaved images. Are you sure you want to close?"
        )
      ) {
        return;
      }
    }
    actions.clearImages();
    onOpenChange?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTitle />
      <DialogContent className="p-0 border-0 bg-black max-w-none w-full h-full max-h-none sm:max-w-sm sm:w-[380px] sm:h-[680px] sm:rounded-[2rem] overflow-hidden [&>button:last-child]:hidden">
        <div className="relative w-full h-full flex flex-col bg-black sm:rounded-[2rem]">
          <CameraView state={state} actions={actions} cameraRef={cameraRef} />

          <div className="p-4 bg-gradient-to-t from-black/80 to-transparent mb-2">
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={state.isSaving}
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={actions.handleSaveImages}
                disabled={state.isSaving}
                className="flex-1 bg-blue-400 hover:bg-blue-300 text-white cursor-pointer"
              >
                {state.isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save {state.images.length > 0 && `(${state.images.length})`}</>
                )}
              </Button>
            </div>
          </div>

          {state.showGallery && <GalleryView state={state} actions={actions} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageCaptureDialogMobile;
