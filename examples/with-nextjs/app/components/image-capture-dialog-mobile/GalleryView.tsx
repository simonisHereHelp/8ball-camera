// app/components/image-capture-dialog-mobile/GalleryView.tsx

import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Loader2, Save, X } from "lucide-react";
import { Button } from "@/ui/components"; // Assuming path is correct
import type { IssuerCanonEntry } from "./issuerCanonUtils";
import type { Image, State, Actions } from "./types";

interface GalleryViewProps {
  state: State;
  actions: Actions;
}

interface GalleryHeaderProps {
  count: number;
  onClose: () => void;
}

function GalleryHeader({ count, onClose }: GalleryHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-white/20">
      <h3 className="text-white text-lg font-semibold">
        {count} Photo{count !== 1 ? "s" : ""}
      </h3>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="text-white hover:bg-white/20 rounded-full cursor-pointer"
      >
        <X className="w-5 h-5" />
      </Button>
    </div>
  );
}

interface ImageGridProps {
  images: Image[];
  onDelete: (index: number) => void;
}

function ImageGrid({ images, onDelete }: ImageGridProps) {
  return (
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
            onClick={() => onDelete(index)}
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
  );
}

interface SummaryEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function SummaryEditor({ value, onChange }: SummaryEditorProps) {
  return (
    <div className="flex-1 p-3 rounded-lg bg-white/5 border border-white/10">
      <h4 className="text-xs font-semibold text-blue-200 mb-1">
        Final Summary (Edit Draft Below)
      </h4>

      <textarea
        className="mt-1 w-full min-h-[180px] rounded-md bg-black/30 border border-white/20 text-sm text-blue-100 px-3 py-2 leading-relaxed whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Edit the AI draft summary here..."
      />
      <p className="mt-1 text-[11px] text-blue-300/70">
        This summary will be saved. The original AI draft is preserved.
      </p>
    </div>
  );
}

interface CanonSelectorProps {
  canons: IssuerCanonEntry[];
  selected: IssuerCanonEntry | null;
  onSelect: (canon: IssuerCanonEntry) => void;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function CanonSelector({
  canons,
  selected,
  onSelect,
  loading,
  error,
  onRefresh,
}: CanonSelectorProps) {
  const handleValueChange = (value: string) => {
    if (!value) return;
    const nextCanon = canons.find((canon) => canon.master === value);
    if (nextCanon) {
      onSelect(nextCanon);
    }
  };

  return (
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
          onClick={onRefresh}
          disabled={loading}
        >
          <Loader2 className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      {error && (
        <p className="text-[11px] text-red-200 bg-red-900/40 border border-red-400/40 rounded-md p-2">
          {error}
        </p>
      )}
      {!error && (
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
          {loading && canons.length === 0 && (
            <p className="text-[11px] text-blue-200">Loading canon list…</p>
          )}
          {!loading && canons.length === 0 && (
            <p className="text-[11px] text-blue-200/70">
              No canon entries available.
            </p>
          )}
          {canons.length > 0 && (
            <ToggleGroup.Root
              type="single"
              value={selected?.master ?? ""}
              onValueChange={handleValueChange}
              className="flex flex-wrap gap-2"
            >
              {canons.map((canon) => (
                <ToggleGroup.Item
                  key={canon.master}
                  value={canon.master}
                  className="text-left text-[11px] px-3 py-2 rounded-full border transition-colors data-[state=on]:bg-blue-500/30 data-[state=on]:border-blue-300 data-[state=on]:text-blue-50 data-[state=off]:bg-black/20 data-[state=off]:border-white/10 data-[state=off]:text-blue-50 data-[state=off]:hover:border-blue-300/70"
                >
                  <span className="block font-semibold leading-tight">
                    {canon.master}
                  </span>
                  {canon.aliases?.length ? (
                    <span className="block text-[10px] text-blue-100/80 leading-tight">
                      Aliases: {canon.aliases.join(", ")}
                    </span>
                  ) : null}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
          )}
        </div>
      )}
      {selected && (
        <p className="text-[11px] text-blue-200/90 border-t border-white/10 pt-1">
          Selected canon: <strong>{selected.master}</strong>
        </p>
      )}
    </div>
  );
}

interface SaveButtonProps {
  isSaving: boolean;
  onSave: () => void;
  disabled: boolean;
}

function SaveButton({ isSaving, onSave, disabled }: SaveButtonProps) {
  return (
    <Button
      onClick={onSave}
      disabled={disabled}
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
  );
}

export function GalleryView({ state, actions }: GalleryViewProps) {
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
  } = actions;
  const saveDisabled = images.length === 0 || isSaving || !editableSummary.trim();

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-40 sm:rounded-[2rem] flex flex-col">
      <GalleryHeader count={images.length} onClose={() => setShowGallery(false)} />

      <div className="flex-1 p-4 overflow-y-auto space-y-6">
        <ImageGrid images={images} onDelete={deleteImage} />

        {draftSummary && (
          <div className="space-y-4">
            <SummaryEditor value={editableSummary} onChange={setEditableSummary} />

            <CanonSelector
              canons={issuerCanons}
              selected={selectedCanon}
              onSelect={selectCanon}
              loading={issuerCanonsLoading}
              error={canonError}
              onRefresh={refreshCanons}
            />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/20">
        <SaveButton isSaving={isSaving} onSave={handleSaveImages} disabled={saveDisabled} />
      </div>
    </div>
  );
}
