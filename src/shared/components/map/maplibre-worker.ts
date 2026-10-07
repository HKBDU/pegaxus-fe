import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

// Vite rewrites this URL for dev and production builds.
maplibregl.setWorkerUrl(maplibreWorkerUrl);

export { maplibregl };
