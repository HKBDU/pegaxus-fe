import { Layer, Source } from "react-map-gl/maplibre";

// URL is resolved against the app origin at runtime.
// The GeoJSON file lives in /public and is served as a static asset.
// MapLibre caches the parsed source internally — no re-fetch on re-renders.
// File: public/eu-uk-outer-boundary.geojson (~122 KB, 50m Natural Earth, simplify 0.008°)
const BOUNDARY_URL = "/eu-uk-outer-boundary.geojson";

export function EuUkBoundaryLayer() {
  return (
    <Source
      id="eu-uk-outer-boundary"
      type="geojson"
      data={BOUNDARY_URL}
    >
      {/* Very faint orange tint — just enough to hint at the zone */}
      <Layer
        id="eu-uk-outer-boundary-fill"
        type="fill"
        paint={{
          "fill-color": "#FF8C00",
          "fill-opacity": 0.02,
        }}
      />
      {/* Soft orange border around the outer perimeter */}
      <Layer
        id="eu-uk-outer-boundary-line"
        type="line"
        paint={{
          "line-color": "#FFA940",
          "line-width": 1.2,
          "line-opacity": 0.55,
        }}
      />
    </Source>
  );
}
