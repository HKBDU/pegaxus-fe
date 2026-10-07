import { Layer, Source } from "react-map-gl/maplibre";
import { createRouteSourceData } from "@/shared/utils/map";
import type { MapRoute } from "./types";

type RouteLayerProps = {
  route?: MapRoute | null;
  geoJson?: unknown;
};

export function RouteLayer({ route, geoJson }: RouteLayerProps) {
  const sourceData = createRouteSourceData(
    geoJson ?? route?.geoJson ?? route?.geometry,
  );
  if (!sourceData) return null;

  return (
    <Source id="selected-route" type="geojson" data={sourceData}>
      <Layer
        id="selected-route-line"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": "#0f172a",
          "line-width": 4,
          "line-opacity": 0.85,
        }}
      />
    </Source>
  );
}
