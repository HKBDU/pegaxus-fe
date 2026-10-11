import { LocateFixed, Minus, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { MapViewportHandle } from "./MapViewport";

type MapControlsProps = {
  viewport: React.RefObject<MapViewportHandle | null>;
  canFitBounds?: boolean;
  onFitBounds?: () => void;
  onSelectionModeChange?: () => void;
};

export function MapControls({
  viewport,
  canFitBounds,
  onFitBounds,
  onSelectionModeChange,
}: MapControlsProps) {
  const controlButtonClass =
    "border-slate-400 bg-white text-slate-800 shadow-md hover:bg-slate-100";

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
      <Button
        className={controlButtonClass}
        aria-label="Zoom in"
        size="icon"
        variant="outline"
        onClick={() => viewport.current?.zoomIn()}
      >
        <Plus />
      </Button>
      <Button
        className={controlButtonClass}
        aria-label="Zoom out"
        size="icon"
        variant="outline"
        onClick={() => viewport.current?.zoomOut()}
      >
        <Minus />
      </Button>
      <Button
        className={controlButtonClass}
        aria-label="Reset map view"
        size="icon"
        variant="outline"
        onClick={() => viewport.current?.reset()}
      >
        <LocateFixed />
      </Button>
      {canFitBounds && (
        <Button
          className={controlButtonClass}
          aria-label="Fit all locations"
          size="icon"
          variant="outline"
          onClick={onFitBounds}
        >
          <span className="text-xs">Fit</span>
        </Button>
      )}
      {onSelectionModeChange && (
        <Button
          className={controlButtonClass}
          variant="outline"
          onClick={onSelectionModeChange}
        >
          Select
        </Button>
      )}
    </div>
  );
}
