import { Layer, Source } from "react-map-gl/maplibre";
import { createRouteSourceData } from "@/shared/utils/map";

export function RoutePreviewLayer({ geometry }: { geometry: unknown }) {
  const sourceData = createRouteSourceData(geometry);
  if (!sourceData) return null;

  return (
    <Source id="route-preview" type="geojson" data={sourceData}>
      <Layer
        id="route-preview-line"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": "#f59e0b", "line-width": 4, "line-dasharray": [2, 1] }}
      />
    </Source>
  );
}
