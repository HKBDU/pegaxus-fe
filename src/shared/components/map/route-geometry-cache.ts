import {
  previewGeoapifyRoute,
  type RoutePreviewError,
} from "@/shared/utils/map/routing";
import type { RouteGeometry } from "@/shared/utils/map";
import { normalizeRouteGeoJson } from "@/shared/utils/map/geojson";
import type { MapRoute } from "./types";

export type ResolvedRouteGeometry = {
  line: RouteGeometry | null;
  key: string | null;
  estimated: boolean;
  error: string | null;
};

type CacheRecord = { key: string; line: RouteGeometry; savedAt: number };

const memoryCache = new Map<string, CacheRecord>();
const inFlight = new Map<string, Promise<ResolvedRouteGeometry>>();
const DB_NAME = "pegaxus-map-cache";
const STORE_NAME = "route-lines";
const DB_VERSION = 1;

function coordinates(route: MapRoute) {
  const from = route.fromLocation;
  const to = route.toLocation;
  if (
    !from ||
    !to ||
    !Number.isFinite(from.latitude) ||
    !Number.isFinite(from.longitude) ||
    !Number.isFinite(to.latitude) ||
    !Number.isFinite(to.longitude)
  )
    return null;
  return {
    from: { latitude: from.latitude, longitude: from.longitude },
    to: { latitude: to.latitude, longitude: to.longitude },
  };
}

export function routeGeometryKey(route: MapRoute): string | null {
  if (route.transportMode !== "ROAD") return null;
  const points = coordinates(route);
  if (!points) return null;
  const round = (value: number) => value.toFixed(4);
  return `drive|${round(points.from.latitude)},${round(points.from.longitude)}|${round(points.to.latitude)},${round(points.to.longitude)}`;
}

function straightLine(route: MapRoute): RouteGeometry | null {
  const points = coordinates(route);
  if (!points) return null;
  return {
    type: "LineString",
    coordinates: [
      [points.from.longitude, points.from.latitude],
      [points.to.longitude, points.to.latitude],
    ],
  };
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function readPersistent(key: string): Promise<CacheRecord | null> {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    const request = db
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .get(key);
    request.onsuccess = () =>
      resolve((request.result as CacheRecord | undefined) ?? null);
    request.onerror = () => resolve(null);
  });
}

async function writePersistent(record: CacheRecord) {
  const db = await openDatabase();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const request = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
}

function fallback(
  route: MapRoute,
  key: string | null,
  error: string | null,
): ResolvedRouteGeometry {
  return { line: straightLine(route), key, estimated: true, error };
}

export async function resolveRouteGeometry(
  route: MapRoute,
  signal?: AbortSignal,
): Promise<ResolvedRouteGeometry> {
  const key = routeGeometryKey(route);
  const savedGeometry = route.geometry ?? route.geoJson;
  const normalizedSavedGeometry = normalizeRouteGeoJson(savedGeometry);
  if (normalizedSavedGeometry) {
    return { line: normalizedSavedGeometry, key, estimated: false, error: null };
  }
  if (route.transportMode !== "ROAD") return fallback(route, key, null);
  if (!key) return fallback(route, null, "Route coordinates are unavailable.");

  const memory = memoryCache.get(key);
  if (memory) return { line: memory.line, key, estimated: false, error: null };

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const persistent = await readPersistent(key);
    if (persistent) {
      memoryCache.set(key, persistent);
      return { line: persistent.line, key, estimated: false, error: null };
    }
    const points = coordinates(route);
    if (!points)
      return fallback(route, key, "Route coordinates are unavailable.");
    try {
      const preview = await previewGeoapifyRoute(
        points.from,
        points.to,
        signal,
      );
      const record = { key, line: preview.geometry, savedAt: Date.now() };
      memoryCache.set(key, record);
      await writePersistent(record);
      return { line: record.line, key, estimated: false, error: null };
    } catch (error) {
      const message =
        (error as RoutePreviewError).message ?? "Route preview unavailable.";
      return fallback(route, key, message);
    }
  })();
  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

export function clearRouteGeometryMemory() {
  memoryCache.clear();
}
