import { useCallback, useState } from "react";
import type { MapLocation, SelectionMode } from "./types";

export function useMapViewerState() {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(
    null,
  );
  const [hoveredLocation, setHoveredLocation] = useState<MapLocation | null>(
    null,
  );
  const [selectionMode, setSelectionMode] = useState<SelectionMode | null>(
    null,
  );

  const selectLocation = useCallback((location: MapLocation | null) => {
    setSelectedLocation(location);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLocation(null);
    setHoveredLocation(null);
  }, []);

  return {
    selectedLocation,
    hoveredLocation,
    selectionMode,
    selectLocation,
    setHoveredLocation,
    setSelectionMode,
    clearSelection,
  };
}
