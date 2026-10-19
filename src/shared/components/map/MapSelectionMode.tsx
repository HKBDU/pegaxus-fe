import { useEffect } from "react";
import type { MapMode } from "./types";

type MapSelectionModeProps = {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
};

const labels: Record<Exclude<MapMode, "view">, string> = {
  addLocation: "Click map to add location",
  addRoute: "Select start and end locations",
  buildPlan: "Select a route to build the plan",
  pickPoint: "Click the map or search to pick a point",
};

export function MapSelectionMode({
  mode,
  onModeChange,
}: MapSelectionModeProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && mode !== "view") onModeChange("view");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, onModeChange]);

  if (mode === "view") return null;

  return (
    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded bg-slate-900 px-3 py-2 text-sm text-white shadow">
      <span>{labels[mode]}</span>
      <button
        type="button"
        className="underline"
        onClick={() => onModeChange("view")}
      >
        Cancel
      </button>
    </div>
  );
}
