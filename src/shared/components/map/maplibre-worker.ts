import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// Vite bundles the worker and its dependencies (including maplibre-gl-shared.mjs)
// via ?worker&url so chunks are emitted correctly in production.
maplibregl.setWorkerUrl(maplibreWorkerUrl);

export { maplibregl };
