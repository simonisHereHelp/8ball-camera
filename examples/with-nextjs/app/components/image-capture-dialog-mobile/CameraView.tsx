import { Camera, CameraOff, Image as ImageIcon, Loader2, RefreshCcw, Save, X } from "lucide-react";
import WebCamera from "@shivantra/react-web-camera";
import { Button } from "@/ui/components";
import type { CameraViewProps } from "./types";

export function CameraView({ state, actions, cameraRef }: CameraViewProps) {
  const isCamera = state.captureSource === "camera";
  const latestImage = state.images[state.images.length - 1];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 relative p-0.5 min-h-0 flex flex-col">
        {/* Error Overlay */}
        {state.cameraError && isCamera && (
          <div className="flex flex-col items-center justify-center w-full h-full text-white/50 bg-black">
            <CameraOff className="w-12 h-12 mb-4" />
            <p>Camera unavailable.</p>
          </div>
        )}

        {/* Camera Feed */}
        {isCamera && !state.cameraError && (
          <WebCamera
            ref={cameraRef}
            className="w-full h-full object-cover"
            videoClassName="rounded-lg"
            captureMode="back"
            onError={() => actions.setCameraError(true)}
          />
        )}

        {/* Album Picker View */}
        {!isCamera && (
          <div className="relative w-full flex-1 rounded-lg bg-black flex items-center justify-center">
            {latestImage ? (
              <img src={latestImage.url} className="max-h-full object-contain" alt="Preview" />
            ) : (
              <div className="text-white/60 text-center">
                <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                <p>Pick a photo</p>
              </div>
            )}
            <div className="absolute bottom-6 w-full px-8 flex flex-col gap-2">
              <Button onClick={() => document.getElementById("photo-picker")?.click()} className="bg-white text-black">
                {state.isProcessingCapture ? <Loader2 className="animate-spin mr-2" /> : "Choose Photo"}
              </Button>
            </div>
          </div>
        )}

        {/* Floating Capture UI */}
        {isCamera && (
          <div className="absolute bottom-8 w-full px-8 flex items-center justify-between z-20">
             <button onClick={() => actions.setShowGallery(true)} className="w-16 h-16 rounded-xl border-2 border-white/30 overflow-hidden bg-black/50">
                {latestImage ? <img src={latestImage.url} className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
             </button>
             
             <Button onClick={actions.handleCapture} disabled={state.isSaving || state.cameraError} className="w-20 h-20 rounded-full bg-white text-black border-4 border-white/50">
               <Camera className="w-8 h-8" />
             </Button>

             <Button variant="outline" onClick={actions.handleCameraSwitch} className="w-16 h-16 rounded-full bg-white/20 text-white">
               <RefreshCcw className={`transition-transform ${state.facingMode === 'user' ? 'rotate-180' : ''}`} />
             </Button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-black/80 flex gap-2">
        <Button variant="outline" onClick={actions.handleClose} className="flex-1 text-white border-white/20">
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button onClick={actions.handleSummarize} disabled={state.images.length === 0} className="flex-1 bg-blue-500">
          {state.isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} Summarize
        </Button>
      </div>

      <input id="photo-picker" type="file" accept="image/*" className="hidden" onChange={(e) => actions.handleAlbumSelect(e.target.files)} />
    </div>
  );
}