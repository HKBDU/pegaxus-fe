import type { SelectionMode } from "./types";

type MapSelectionModeProps = {
  mode: SelectionMode | null;
  onModeChange: (mode: SelectionMode | null) => void;
};

const labels: Record<SelectionMode, string> = {
  ADD_LOCATION: "Click map to add location",
  FROM_LOCATION: "Click a marker for From location",
  TO_LOCATION: "Click a marker for To location",
};

export function MapSelectionMode({
  mode,
  onModeChange,
}: MapSelectionModeProps) {
  if (!mode) return null;

  return (
    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded bg-slate-900 px-3 py-2 text-sm text-white shadow">
      <span>{labels[mode]}</span>
      <button
        type="button"
        className="underline"
        onClick={() => onModeChange(null)}
      >
        Cancel
      </button>
    </div>
  );
}
