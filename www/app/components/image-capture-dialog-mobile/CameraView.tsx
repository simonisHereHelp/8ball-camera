import { Camera, CameraOff, ImageIcon, RefreshCcw } from "lucide-react";
import { useId } from "react";
import WebCamera from "@shivantra/react-web-camera";

import { Button } from "@/ui/components";

import type { CameraViewProps } from "./types";

const CameraErrorOverlay = ({ active }: { active: boolean }) => {
  if (!active) return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
      <CameraOff className="w-12 h-12 mb-4" />
      <p>Camera not available or permission denied.</p>
      <p className="text-sm">Please check your camera settings.</p>
    </div>
  );
};

const CameraFeed = ({
  active,
  cameraRef,
  onCaptureError,
}: {
  active: boolean;
  cameraRef: CameraViewProps["cameraRef"];
  onCaptureError: (hasError: boolean) => void;
}) => {
  if (!active) return null;
  return (
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
        onCaptureError(true);
      }}
    />
  );
};

const FilePickerView = ({
  active,
  latestImage,
  onPick,
  onFiles,
  pickerId,
}: {
  active: boolean;
  latestImage?: string;
  onPick: () => void;
  onFiles: (files: FileList | null) => void;
  pickerId: string;
}) => {
  if (!active) return null;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-white/70">
      <ImageIcon className="w-12 h-12 mb-4" />
      <p>Pick a photo from your device.</p>
      <Button
        variant="outline"
        onClick={onPick}
        className="mt-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
      >
        Choose Photos
      </Button>
      {latestImage ? (
        <div className="mt-6 w-24 h-24 rounded-xl overflow-hidden border border-white/20">
          <img
            src={latestImage}
            alt="Latest"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="mt-6 w-24 h-24 rounded-xl border border-white/10 bg-white/5" />
      )}
      <input
        id={pickerId}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          onFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
};

const CaptureControls = ({
  onCapture,
  onSwitch,
  onOpenGallery,
  imageCount,
  latestImageUrl,
  isSaving,
  facingMode,
}: {
  onCapture: () => void;
  onSwitch: () => void;
  onOpenGallery: () => void;
  imageCount: number;
  latestImageUrl?: string;
  isSaving: boolean;
  facingMode: "user" | "environment";
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="w-16 h-16 cursor-pointer">
        {imageCount > 0 ? (
          <button
            onClick={onOpenGallery}
            className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-white/30 bg-black/50 backdrop-blur-sm"
          >
            <img
              src={latestImageUrl || "/placeholder.svg"}
              alt="Latest"
              className="w-full h-full object-cover"
            />
            {imageCount > 1 && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-none flex items-center justify-center">
                <div className="text-white text-sm rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  +{imageCount - 1}
                </div>
              </div>
            )}
          </button>
        ) : (
          <div className="w-full h-full rounded-2xl border-2 border-white/20 bg-black/20 backdrop-blur-sm" />
        )}
      </div>

      <Button
        onClick={onCapture}
        disabled={isSaving}
        className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 text-black shadow-2xl border-4 border-white/50 cursor-pointer"
      >
        <Camera className="!w-8 !h-8" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onSwitch}
        disabled={isSaving}
        className="w-16 h-16 bg-white/20 border border-white/30 text-white hover:bg-white/30 backdrop-blur-md transition cursor-pointer"
      >
        <RefreshCcw
          className={`w-6 h-6 transition-transform duration-300 ${
            facingMode === "user" ? "rotate-180" : "rotate-0"
          }`}
        />
      </Button>
    </div>
  );
};

const ViewFooter = ({
  actions,
  state,
}: {
  actions: CameraViewProps["actions"];
  state: CameraViewProps["state"];
}) => {
  return (
    <div className="p-4 bg-gradient-to-t from-black/80 to-transparent mb-2">
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => actions.setCaptureSource("file")}
          className={`flex-1 border-white/20 text-white hover:bg-white/20 hover:text-white cursor-pointer ${
            state.captureSource === "file" ? "bg-white/20" : "bg-white/10"
          }`}
        >
          Gallery
        </Button>
        <Button
          variant="outline"
          onClick={() => actions.setCaptureSource("camera")}
          className={`flex-1 border-white/20 text-white hover:bg-white/20 hover:text-white cursor-pointer ${
            state.captureSource === "camera" ? "bg-white/20" : "bg-white/10"
          }`}
        >
          Camera
        </Button>
      </div>
    </div>
  );
};

export function CameraView({ state, actions, cameraRef }: CameraViewProps) {
  const isCameraSelected = state.captureSource === "camera";
  const pickerId = useId();
  const latestImage = state.images[state.images.length - 1];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 relative p-0.5">
        <CameraErrorOverlay active={state.cameraError && isCameraSelected} />

        <CameraFeed
          active={isCameraSelected && !state.cameraError}
          cameraRef={cameraRef}
          onCaptureError={actions.setCameraError}
        />

        <FilePickerView
          active={!isCameraSelected}
          latestImage={latestImage?.url}
          onPick={() => document.getElementById(pickerId)?.click()}
          onFiles={actions.handleFilePick}
          pickerId={pickerId}
        />

        <div className="absolute bottom-8 left-0 right-0 px-8">
          <CaptureControls
            onCapture={() => actions.handleCapture(cameraRef)}
            onSwitch={() => actions.handleCameraSwitch(cameraRef)}
            onOpenGallery={() => actions.setShowGallery(true)}
            imageCount={state.images.length}
            latestImageUrl={latestImage?.url}
            isSaving={state.isSaving}
            facingMode={state.facingMode}
          />
        </div>
      </div>

      <ViewFooter actions={actions} state={state} />
    </div>
  );
}
