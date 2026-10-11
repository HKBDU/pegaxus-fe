import "maplibre-gl/dist/maplibre-gl.css";

import { forwardRef, useImperativeHandle, useRef } from "react";
import Map, { type MapMouseEvent, type MapRef } from "react-map-gl/maplibre";
import type { LngLatBoundsLike } from "maplibre-gl";
import { toCoordinates } from "@/shared/utils/map";
import { maplibregl } from "./maplibre-worker";

export type MapViewportHandle = {
  flyTo: (longitude: number, latitude: number) => void;
  fitBounds: (bounds: LngLatBoundsLike) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
};

type MapViewportProps = {
  styleUrl?: string;
  initialViewState?: { longitude: number; latitude: number; zoom: number };
  onMapClick?: (point: { latitude: number; longitude: number }) => void;
  interactiveLayerIds?: string[];
  onInteractiveLayerClick?: (layerId: string) => void;
  children?: React.ReactNode;
};

const DEFAULT_VIEW = { longitude: 10, latitude: 20, zoom: 2 };

export const MapViewport = forwardRef<MapViewportHandle, MapViewportProps>(
  function MapViewport(
    {
      styleUrl,
      initialViewState = DEFAULT_VIEW,
      onMapClick,
      interactiveLayerIds,
      onInteractiveLayerClick,
      children,
    },
    ref,
  ) {
    const mapRef = useRef<MapRef>(null);

    useImperativeHandle(
      ref,
      () => ({
        flyTo: (longitude, latitude) =>
          mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 10 }),
        fitBounds: (bounds) =>
          mapRef.current?.fitBounds(bounds, { padding: 48, maxZoom: 12 }),
        zoomIn: () => mapRef.current?.zoomIn(),
        zoomOut: () => mapRef.current?.zoomOut(),
        reset: () =>
          mapRef.current?.flyTo({
            center: [initialViewState.longitude, initialViewState.latitude],
            zoom: initialViewState.zoom,
          }),
      }),
      [initialViewState],
    );

    function handleClick(event: MapMouseEvent) {
      const layerId = event.features?.[0]?.layer?.id;
      if (layerId) onInteractiveLayerClick?.(layerId);

      const point = toCoordinates([event.lngLat.lng, event.lngLat.lat]);
      if (point) onMapClick?.(point);
    }
    return (
      <Map
        ref={mapRef}
        style={{ height: "100%", width: "100%" }}
        mapLib={maplibregl}
        initialViewState={initialViewState}
        mapStyle={styleUrl}
        onClick={handleClick}
        interactiveLayerIds={interactiveLayerIds}
        reuseMaps
      >
        {children}
      </Map>
    );
  },
);
