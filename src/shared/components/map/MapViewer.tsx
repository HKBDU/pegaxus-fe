import { useEffect, useMemo, useRef, useState } from "react";
import {
  boundsFromLocations,
  boundsFromRoute,
  createGeoapifyMapStyleUrl,
  toMapPoint,
} from "@/shared/utils/map";
import { MapControls } from "./MapControls";
import { LocationMarkers } from "./LocationMarkers";
import { LocationPopup } from "./LocationPopup";
import { LocationSearch } from "./LocationSearch";
import { MapSelectionMode } from "./MapSelectionMode";
import { MapViewport, type MapViewportHandle } from "./MapViewport";
import { RouteLayer } from "./RouteLayer";
import { useMapViewerState } from "./useMapViewerState";
import type { MapLocation, MapViewerProps } from "./types";

const EMPTY_LOCATIONS: MapLocation[] = [];

export function MapViewer({
  locations,
  route,
  routeGeoJson,
  styleUrl,
  loading,
  error,
  canEditLocation,
  canDeleteLocation,
  showSearch = false,
  searchOptions = EMPTY_LOCATIONS,
  searchLoading,
  searchEmptyMessage,
  onSearchChange,
  onLocationSelect,
  onLocationHover,
  onMapClick,
  onMarkerAction,
  onRouteSelect,
}: MapViewerProps) {
  const viewport = useRef<MapViewportHandle>(null);
  const popupHideTimer = useRef<number | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [popupLocation, setPopupLocation] = useState<MapLocation | null>(null);
  const state = useMapViewerState();
  const validLocations = useMemo(
    () => locations.filter((location) => toMapPoint(location) !== null),
    [locations],
  );
  const allBounds = useMemo(
    () =>
      boundsFromLocations(validLocations) ??
      boundsFromRoute(routeGeoJson ?? route?.geometry),
    [route, routeGeoJson, validLocations],
  );

  useEffect(() => {
    if (allBounds) viewport.current?.fitBounds(allBounds);
  }, [allBounds]);

  useEffect(() => {
    return () => {
      if (popupHideTimer.current) {
        window.clearTimeout(popupHideTimer.current);
      }
    };
  }, []);

  function clearPopupHideTimer() {
    if (!popupHideTimer.current) return;
    window.clearTimeout(popupHideTimer.current);
    popupHideTimer.current = null;
  }

  function schedulePopupHide() {
    clearPopupHideTimer();
    popupHideTimer.current = window.setTimeout(() => {
      state.setHoveredLocation(null);
      popupHideTimer.current = null;
    }, 3000);
  }

  function handleMarkerHover(location: MapLocation | null) {
    if (location) {
      clearPopupHideTimer();
      setPopupLocation(location);
      state.setHoveredLocation(location);
      onLocationHover?.(location);
      return;
    }

    schedulePopupHide();
    onLocationHover?.(null);
  }

  function handlePopupHover(hovered: boolean) {
    if (hovered) {
      clearPopupHideTimer();
      return;
    }

    schedulePopupHide();
  }

  function selectLocation(location: MapLocation) {
    state.selectLocation(location);
    onLocationSelect?.(location);
    viewport.current?.flyTo(location.longitude, location.latitude);
  }

  function handleMapClick(point: { latitude: number; longitude: number }) {
    onMapClick?.(point);
    if (state.selectionMode === "ADD_LOCATION") state.setSelectionMode(null);
  }

  return (
    <div className="relative min-h-96 overflow-hidden rounded border bg-muted">
      {error && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-white/90 p-4 text-center text-sm text-destructive">
          {error}
        </div>
      )}
      {loading && (
        <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded bg-white px-3 py-2 text-sm shadow">
          Loading locations...
        </div>
      )}
      {!loading && !validLocations.length && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded bg-white px-3 py-2 text-sm shadow">
          No valid locations to display.
        </div>
      )}
      {showSearch && (
        <LocationSearch
          options={searchOptions}
          value={searchValue}
          loading={searchLoading}
          emptyMessage={searchEmptyMessage}
          onChange={(value) => {
            setSearchValue(value);
            onSearchChange?.(value);
          }}
          onSelect={selectLocation}
        />
      )}
      <MapViewport
        ref={viewport}
        styleUrl={styleUrl ?? createGeoapifyMapStyleUrl()}
        onMapClick={handleMapClick}
        interactiveLayerIds={route ? ["selected-route-line"] : undefined}
        onInteractiveLayerClick={(layerId) => {
          if (layerId === "selected-route-line" && route)
            onRouteSelect?.(route);
        }}
      >
        <LocationMarkers
          locations={validLocations}
          selectedLocation={state.selectedLocation}
          onSelect={selectLocation}
          onHover={handleMarkerHover}
        />
        <RouteLayer route={route} geoJson={routeGeoJson} />
      </MapViewport>
      {popupLocation && (
        <LocationPopup
          location={popupLocation}
          open={!!state.hoveredLocation}
          canEdit={canEditLocation}
          canDelete={canDeleteLocation}
          onClose={() => handleMarkerHover(null)}
          onHoverChange={handlePopupHover}
          onAction={onMarkerAction}
        />
      )}
      <MapControls
        viewport={viewport}
        canFitBounds={!!allBounds}
        onFitBounds={() => allBounds && viewport.current?.fitBounds(allBounds)}
      />
      <MapSelectionMode
        mode={state.selectionMode}
        onModeChange={state.setSelectionMode}
      />
    </div>
  );
}
