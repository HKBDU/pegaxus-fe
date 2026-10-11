import { useCallback, useState } from "react";
import type { MapLocation, MapMode, MapPoint } from "./types";

export function useMapViewerState(
  controlledMode?: MapMode,
  onModeChange?: (mode: MapMode) => void,
) {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(
    null,
  );
  const [hoveredLocation, setHoveredLocation] = useState<MapLocation | null>(
    null,
  );
  const [internalMode, setInternalMode] = useState<MapMode>("view");
  const [startPoint, setStartPoint] = useState<MapPoint | null>(null);
  const [endPoint, setEndPoint] = useState<MapPoint | null>(null);
  const mode = controlledMode ?? internalMode;

  const selectLocation = useCallback((location: MapLocation | null) => {
    setSelectedLocation(location);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLocation(null);
    setHoveredLocation(null);
  }, []);

  const setMode = useCallback((nextMode: MapMode) => {
    setInternalMode(nextMode);
    setSelectedLocation(null);
    setHoveredLocation(null);
    setStartPoint(null);
    setEndPoint(null);
    onModeChange?.(nextMode);
  }, [onModeChange]);

  const selectRoutePoint = useCallback((point: MapPoint) => {
    if (!startPoint || endPoint) {
      setStartPoint(point);
      setEndPoint(null);
    } else {
      setEndPoint(point);
    }
  }, [endPoint, startPoint]);

  return {
    selectedLocation,
    hoveredLocation,
    mode,
    startPoint,
    endPoint,
    selectLocation,
    setHoveredLocation,
    setMode,
    selectRoutePoint,
    clearSelection,
  };
}
