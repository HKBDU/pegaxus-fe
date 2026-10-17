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
import { MapViewport, type MapViewportHandle } from "./MapViewport";
import { RouteLayer } from "./RouteLayer";
import { RoutePreviewLayer } from "./RoutePreviewLayer";
import { useResolvedRouteGeometries } from "./useResolvedRouteGeometries";
import { useMapViewerState } from "./useMapViewerState";
import type { MapLocation, MapViewerProps } from "./types";

const EMPTY_LOCATIONS: MapLocation[] = [];
const EMPTY_ROUTES: NonNullable<MapViewerProps["routes"]> = [];

export function MapViewer({
  locations,
  route,
  routes = EMPTY_ROUTES,
  routeGeoJson,
  preview,
  mode,
  onModeChange,
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
  onMarkerSelect,
  onLocationHover,
  onMapClick,
  onRoutePointSelect,
  onMarkerAction,
  onRouteSelect,
  buildStartLocation,
  buildEndLocation,
}: MapViewerProps) {
  const viewport = useRef<MapViewportHandle>(null);
  const popupHideTimer = useRef<number | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [popupLocation, setPopupLocation] = useState<MapLocation | null>(null);
  const state = useMapViewerState(mode, onModeChange);
  const routeSources = useMemo(
    () => [...(route ? [route] : []), ...routes],
    [route, routes],
  );
  const resolvedRoutes = useResolvedRouteGeometries(routeSources);
  const resolvedRoute = route
    ? resolvedRoutes.find((item) => item.id === route.id)
    : null;
  const resolvedOtherRoutes = resolvedRoutes.filter(
    (item) => item.id !== route?.id,
  );
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

  function selectLocation(location: MapLocation, fromSearch = false) {
    state.selectLocation(location);
    if (state.mode === "addRoute") {
      const point = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      state.selectRoutePoint(point);
      onRoutePointSelect?.(point, location);
    }
    onLocationSelect?.(location);
    if (!fromSearch) onMarkerSelect?.(location);
    if (fromSearch) {
      viewport.current?.flyTo(location.longitude, location.latitude);
    }
  }

  function handleMapClick(point: { latitude: number; longitude: number }) {
    onMapClick?.(point);
    if (state.mode === "addLocation") state.setMode("view");
  }

  return (
    <div className="relative h-[min(87vh,720px)] min-h-[420px] w-full overflow-hidden rounded border bg-muted">
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
      {!loading && !validLocations.length && mode !== "pickPoint" && (
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
          onSelect={(location) => selectLocation(location, true)}
        />
      )}
      <MapViewport
        ref={viewport}
        styleUrl={styleUrl ?? createGeoapifyMapStyleUrl()}
        onMapClick={handleMapClick}
        interactiveLayerIds={[...routes, ...(route ? [route] : [])].map(
          (item) =>
            `route-line-${String(item.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`,
        )}
        onInteractiveLayerClick={(layerId) => {
          const selected = [...routes, ...(route ? [route] : [])].find(
            (item) =>
              `route-line-${String(item.id).replace(/[^a-zA-Z0-9_-]/g, "-")}` ===
              layerId,
          );
          if (selected) onRouteSelect?.(selected);
        }}
      >
        <LocationMarkers
          locations={validLocations}
          selectedLocation={state.selectedLocation}
          startLocation={mode === "buildPlan" || mode === "pickPoint" ? buildStartLocation : null}
          endLocation={mode === "buildPlan" || mode === "pickPoint" ? buildEndLocation : null}
          onSelect={(location) => selectLocation(location)}
          onHover={handleMarkerHover}
        />
        <RouteLayer
          route={resolvedRoute}
          routes={resolvedOtherRoutes}
          geoJson={routeGeoJson}
        />
        {preview && <RoutePreviewLayer geometry={preview.geometry} />}
      </MapViewport>
      {popupLocation && (
        <LocationPopup
          location={popupLocation}
          open={!!state.hoveredLocation && !searchValue.trim()}
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
    </div>
  );
}
