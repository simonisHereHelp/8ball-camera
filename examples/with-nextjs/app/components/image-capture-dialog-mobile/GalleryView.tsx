// app/components/image-capture-dialog-mobile/GalleryView.tsx

import { Loader2, Save, X } from "lucide-react";
import { Button } from "@/ui/components"; // Assuming path is correct
import type { State, Actions } from "./types";

interface GalleryViewProps {
  state: State;
  actions: Actions;
}

export function GalleryView({ state, actions }: GalleryViewProps) {
  // RENAMED: summary -> draftSummary
  const {
    images,
    draftSummary,
    editableSummary,
    isSaving,
    issuerCanons,
    issuerCanonsLoading,
    canonError,
    selectedCanon,
  } = state;
  const {
    deleteImage,
    handleSaveImages,
    setShowGallery,
    setEditableSummary,
    refreshCanons,
    selectCanon,
    // REMOVED setDraftSummary from destructuring as UI should only edit editableSummary
  } = actions;

  // REMOVED handleSummaryBlur - user edits directly to editableSummary, which is passed to handleSave.
  // The 'draftSummary' must remain in its original state as per instruction.

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-40 sm:rounded-[2rem] flex flex-col">
      {/* Gallery Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <h3 className="text-white text-lg font-semibold">
          {images.length} Photo{images.length !== 1 ? "s" : ""}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowGallery(false)}
          className="text-white hover:bg-white/20 rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Gallery Body: grid + summary */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        {/* Image grid */}
        <div className="grid grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-xl overflow-hidden border border-white/20 bg-black/60 flex items-center justify-center">
                <img
                  src={image.url || "/placeholder.svg"}
                  alt={`Photo ${index + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <Button
                onClick={() => deleteImage(index)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg p-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {index + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Editor */}
        {draftSummary && ( // Use draftSummary to check if summary exists
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="text-xs font-semibold text-blue-200 mb-1">
                Final Summary (Edit Draft Below)
              </h4>

              <textarea
                className="mt-1 w-full min-h-[180px] rounded-md bg-black/30 border border-white/20 text-sm text-blue-100 px-3 py-2 leading-relaxed whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={editableSummary}
                onChange={(e) => setEditableSummary(e.target.value)}
                // Removed onBlur since state is updated on every change, and final content is used at save time.
                placeholder="Edit the AI draft summary here..."
              />
              <p className="mt-1 text-[11px] text-blue-300/70">
                This summary will be saved. The original AI draft is preserved.
              </p>
            </div>
            <div className="sm:w-56 p-3 rounded-lg bg-white/5 border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h5 className="text-xs font-semibold text-blue-200">Issuer Canons</h5>
                  <p className="text-[11px] text-blue-300/70">
                    Tap a canon to seed the summary.
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-blue-100 hover:bg-white/10"
                  onClick={refreshCanons}
                  disabled={issuerCanonsLoading}
                >
                  <Loader2
                    className={`w-4 h-4 ${issuerCanonsLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
              {canonError && (
                <p className="text-[11px] text-red-200 bg-red-900/40 border border-red-400/40 rounded-md p-2">
                  {canonError}
                </p>
              )}
              {!canonError && (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {issuerCanonsLoading && issuerCanons.length === 0 && (
                    <p className="text-[11px] text-blue-200">Loading canon list…</p>
                  )}
                  {!issuerCanonsLoading && issuerCanons.length === 0 && (
                    <p className="text-[11px] text-blue-200/70">
                      No canon entries available.
                    </p>
                  )}
                  {issuerCanons.map((canon) => {
                    const isSelected = selectedCanon?.master === canon.master;
                    return (
                      <button
                        key={canon.master}
                        onClick={() => selectCanon(canon)}
                        className={`text-left text-[11px] px-3 py-2 rounded-full border transition-colors ${
                          isSelected
                            ? "bg-blue-500/30 border-blue-300 text-blue-50"
                            : "bg-black/20 border-white/10 text-blue-50 hover:border-blue-300/70"
                        }`}
                        type="button"
                      >
                        <span className="block font-semibold leading-tight">
                          {canon.master}
                        </span>
                        {canon.aliases?.length ? (
                          <span className="block text-[10px] text-blue-100/80 leading-tight">
                            Aliases: {canon.aliases.join(", ")}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedCanon && (
                <p className="text-[11px] text-blue-200/90 border-t border-white/10 pt-1">
                  Selected canon: <strong>{selectedCanon.master}</strong>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Gallery Footer */}
      <div className="p-4 border-t border-white/20">
        <Button
          onClick={handleSaveImages}
          // Check disabled state against images and the currently edited summary
          disabled={images.length === 0 || isSaving || !editableSummary.trim()}
          className="w-full bg-blue-400 hover:bg-blue-300 text-white flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving to Google Drive...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save All
            </>
          )}
        </Button>
      </div>
    </div>
  );
}