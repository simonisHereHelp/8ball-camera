// app/components/image-capture-dialog-mobile/CameraView.tsx

import {
  Camera,
  CameraOff,
  Image as ImageIcon,
  Loader2,
  RefreshCcw,
  Save,
  X,
} from "lucide-react";
import WebCamera from "@shivantra/react-web-camera";
import type { WebCameraHandler } from "@shivantra/react-web-camera";
import { Button } from "@/ui/components"; // Assuming path is correct
import type { Image, State, Actions } from "./types";

interface CameraViewProps {
  state: State;
  actions: Actions;
  cameraRef: React.RefObject<WebCameraHandler>;
}

export function CameraView({ state, actions, cameraRef }: CameraViewProps) {
  const {
    images,
    isSaving,
    isProcessingCapture,
    cameraError,
    facingMode,
    captureSource,
    error,
    saveMessage,
  } = state;
  const {
    handleCapture,
    handleAlbumSelect,
    handleCameraSwitch,
    handleSummarize,
    handleClose,
    setShowGallery,
    setCameraError,
    setError,
  } = actions;

  const isCameraSelected = captureSource === "camera";

  const latestImage = images.length > 0 ? images[images.length - 1] : null;

  return (
    <>
      {/* Camera View Area */}
      <div className="flex-1 relative p-0.5">
        {cameraError && isCameraSelected ? (
          <div className="flex flex-col items-center justify-center w-full h-full text-white/50">
            <CameraOff className="w-12 h-12 mb-4" />
            <p>Camera not available or permission denied.</p>
            <p className="text-sm">Please check your camera settings.</p>
          </div>
        ) : null}

        {isCameraSelected && !cameraError && (
          <WebCamera
            ref={cameraRef}
            className="w-full h-full object-cover"
            style={{ backgroundColor: "black" }}
            videoClassName="rounded-lg"
            videoStyle={{ objectFit: "cover" }}
            captureMode="back"
            captureType="jpeg"
            captureQuality={0.8}
            getFileName={() => `capture-${Date.now()}.jpeg`}
            onError={(err) => {
              console.error("Camera error:", err);
              setCameraError(true);
              setError("Camera permission denied or unavailable.");
            }}
          />
        )}

        {!isCameraSelected && (
          <div className="w-full h-full rounded-lg overflow-hidden bg-black relative flex flex-col">
            {latestImage ? (
              <img
                src={latestImage.url || "/placeholder.svg"}
                alt="Selected from device"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-white/60 gap-2">
                <ImageIcon className="w-10 h-10" />
                <p className="text-sm">Pick a photo from your device</p>
              </div>
            )}

            <div className="absolute bottom-6 left-0 right-0 flex flex-col gap-3 px-8">
              <Button
                onClick={() => {
                  const input = document.getElementById(
                    "mobile-photo-picker",
                  ) as HTMLInputElement | null;
                  input?.click();
                }}
                disabled={isProcessingCapture}
                className="w-full bg-white text-black hover:bg-gray-100 cursor-pointer"
              >
                {isProcessingCapture ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading photo...
                  </>
                ) : (
                  "Choose a photo"
                )}
              </Button>
              {latestImage && (
                <Button
                  variant="outline"
                  onClick={() => setShowGallery(true)}
                  className="w-full bg-white/10 text-white border-white/40 hover:bg-white/20 cursor-pointer"
                >
                  View gallery
                </Button>
              )}
            </div>
          </div>
        )}

        {isProcessingCapture && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-black/60 text-white px-4 py-3 rounded-full flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing image...
            </div>
          </div>
        )}

        {/* Capture Controls */}
        {isCameraSelected && (
          <div className="absolute bottom-8 left-0 right-0 px-8">
            <div className="flex items-center justify-between">
              {/* Gallery Thumbnail */}
              <div className="w-16 h-16 cursor-pointer">
                {latestImage ? (
                  <button
                    onClick={() => setShowGallery(true)}
                    className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-white/30 bg-black/50 backdrop-blur-sm"
                  >
                    <img
                      src={latestImage.url || "/placeholder.svg"}
                      alt="Latest"
                      className="w-full h-full object-cover"
                    />
                    {images.length > 1 && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-none flex items-center justify-center">
                        <div className="text-white text-sm rounded-full w-8 h-8 flex items-center justify-center font-bold">
                          +{images.length - 1}
                        </div>
                      </div>
                    )}
                  </button>
                ) : (
                  <div className="w-full h-full rounded-2xl border-2 border-white/20 bg-black/20 backdrop-blur-sm" />
                )}
              </div>

              {/* Capture Button */}
              <Button
                onClick={handleCapture}
                disabled={
                  isSaving || !isCameraSelected || isProcessingCapture || cameraError
                }
                className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 text-black shadow-2xl border-4 border-white/50 cursor-pointer"
              >
                <Camera className="!w-8 !h-8" />
              </Button>

              {/* Camera Switch Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleCameraSwitch}
                disabled={
                  isSaving || !isCameraSelected || isProcessingCapture || cameraError
                }
                className="w-16 h-16 bg-white/20 border border-white/30 text-white hover:bg-white/30 backdrop-blur-md transition cursor-pointer"
              >
                <RefreshCcw
                  className={`w-6 h-6 transition-transform duration-300 ${
                    facingMode === "user" ? "rotate-180" : "rotate-0"
                  }`}
                />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions and Messages */}
      <div className="p-4 bg-gradient-to-t from-black/80 to-transparent mb-2">
        <div className="flex items-center justify-end space-x-2">
          {/* Cancel Button */}
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          {/* Summarize Button */}
          <Button
            variant="default"
            onClick={handleSummarize}
            disabled={isSaving || images.length === 0 || isProcessingCapture}
            className="flex-1 bg-blue-400 hover:bg-blue-300 text-white cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Summarizing...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Summarize
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error / Success messages */}
      {error && (
        <div className="px-4 pb-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      {saveMessage && (
        <div className="px-4 pb-4">
          <p className="text-sm text-emerald-300">{saveMessage}</p>
        </div>
      )}

      <input
        id="mobile-photo-picker"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleAlbumSelect(event.target.files);
          event.target.value = "";
        }}
      />
    </>
  );
}