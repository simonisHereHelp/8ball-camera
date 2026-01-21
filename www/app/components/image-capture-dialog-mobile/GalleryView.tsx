import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Save, X } from "lucide-react";

import { Button } from "@/ui/components";

import type { GalleryViewProps } from "./types";

const GalleryHeader = ({
  count,
  onClose,
}: {
  count: number;
  onClose: () => void;
}) => {
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
};

const ImageGrid = ({
  images,
  onDelete,
}: {
  images: GalleryViewProps["state"]["images"];
  onDelete: (index: number) => void;
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {images.map((image, index) => (
        <div key={image.url} className="relative group">
          <div className="aspect-square rounded-xl overflow-hidden border border-white/20">
            <img
              src={image.url || "/placeholder.svg"}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
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
};

const SummaryEditor = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="space-y-2">
      <label className="text-white/80 text-sm font-medium">Summary</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-h-[120px] rounded-lg bg-black/40 border border-white/20 text-white p-3 focus:outline-none focus:ring-2 focus:ring-white/30"
        placeholder="Write a summary..."
      />
    </div>
  );
};

const CanonSelector = ({
  canons,
  selected,
  onSelect,
  loading,
}: {
  canons: GalleryViewProps["state"]["issuerCanons"];
  selected: GalleryViewProps["state"]["selectedCanon"];
  onSelect: (canonId: string) => void;
  loading: boolean;
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-white/80 text-sm font-medium">
        <span>Canons</span>
        {loading && <span className="text-xs text-white/50">Loading...</span>}
      </div>
      <ToggleGroup.Root
        type="single"
        value={selected ?? undefined}
        onValueChange={(value) => value && onSelect(value)}
        className="flex flex-wrap gap-2"
      >
        {canons.map((canon) => (
          <ToggleGroup.Item
            key={canon.id}
            value={canon.id}
            className={`px-3 py-1 rounded-full border text-sm transition ${
              selected === canon.id
                ? "bg-white text-black border-white"
                : "bg-white/10 text-white border-white/20 hover:bg-white/20"
            }`}
          >
            {canon.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
};

const SaveButton = ({
  isSaving,
  onSave,
}: {
  isSaving: boolean;
  onSave: () => void;
}) => {
  return (
    <Button
      onClick={onSave}
      disabled={isSaving}
      className="w-full bg-blue-500 hover:bg-blue-400 text-white cursor-pointer"
    >
      <Save className="w-4 h-4 mr-2" />
      {isSaving ? "Saving..." : "Save All"}
    </Button>
  );
};

export function GalleryView({ state, actions }: GalleryViewProps) {
  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-40 flex flex-col">
      <GalleryHeader
        count={state.images.length}
        onClose={() => actions.setShowGallery(false)}
      />

      <div className="flex-1 p-4 overflow-y-auto space-y-6">
        <ImageGrid images={state.images} onDelete={actions.deleteImage} />

        {state.draftSummary && (
          <div className="space-y-4">
            <SummaryEditor
              value={state.editableSummary}
              onChange={actions.setEditableSummary}
            />

            <CanonSelector
              canons={state.issuerCanons}
              selected={state.selectedCanon}
              onSelect={actions.selectCanon}
              loading={state.issuerCanonsLoading}
            />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/20">
        <SaveButton isSaving={state.isSaving} onSave={actions.handleSaveImages} />
      </div>
    </div>
  );
}
