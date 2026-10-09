import { Layer, Source } from "react-map-gl/maplibre";
import { createRouteSourceData } from "@/shared/utils/map";
import type { MapRoute } from "./types";

type RouteLayerProps = {
  route?: MapRoute | null;
  routes?: MapRoute[];
  geoJson?: unknown;
};

export function RouteLayer({ route, routes = [], geoJson }: RouteLayerProps) {
  const items = route
    ? [route, ...routes.filter((item) => item.id !== route.id)]
    : routes;
  return (
    <>
      {items.map((item, index) => {
        const sourceData = createRouteSourceData(
          index === 0 && route
            ? (geoJson ?? item.geoJson ?? item.geometry)
            : (item.geoJson ?? item.geometry),
        );
        if (!sourceData) return null;
        const suffix = String(item.id).replace(/[^a-zA-Z0-9_-]/g, "-");
        return (
          <Source
            key={suffix}
            id={`route-${suffix}`}
            type="geojson"
            data={sourceData}
          >
            <Layer
              id={`route-line-${suffix}`}
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": index === 0 && route ? "#0f172a" : "#2563eb",
                "line-width": index === 0 && route ? 4 : 3,
                "line-opacity": 0.85,
              }}
            />
          </Source>
        );
      })}
    </>
  );
}
