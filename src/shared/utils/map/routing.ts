import { normalizeRouteGeoJson, type RouteGeometry } from "./geojson";

export type RoutingPoint = { latitude: number; longitude: number };

export type RoutePreviewErrorCode =
  "MISSING_KEY" | "NETWORK" | "QUOTA" | "INVALID_RESPONSE" | "TIMEOUT";

export class RoutePreviewError extends Error {
  readonly code: RoutePreviewErrorCode;

  constructor(
    code: RoutePreviewErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "RoutePreviewError";
    this.code = code;
  }
}

export interface RoutePreviewResult {
  geometry: RouteGeometry;
  distanceKm: number;
  durationMinutes: number;
}

function getApiKey() {
  const key = import.meta.env.VITE_GEOAPIFY_API_KEY;
  if (!key || key.startsWith("$"))
    throw new RoutePreviewError(
      "MISSING_KEY",
      "Geoapify API key is not configured.",
    );
  return key;
}

export async function previewGeoapifyRoute(
  start: RoutingPoint,
  end: RoutingPoint,
  signal?: AbortSignal,
  timeoutMs = 10_000,
): Promise<RoutePreviewResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const params = new URLSearchParams({
      waypoints: `${start.latitude},${start.longitude}|${end.latitude},${end.longitude}`,
      mode: "drive",
      apiKey: getApiKey(),
    });
    const response = await fetch(
      `https://api.geoapify.com/v1/routing?${params}`,
      { signal: controller.signal },
    );
    if ([401, 403, 429].includes(response.status))
      throw new RoutePreviewError(
        "QUOTA",
        "Geoapify request quota or authorization failed.",
      );
    if (!response.ok)
      throw new RoutePreviewError(
        "NETWORK",
        "Geoapify routing request failed.",
      );
    const payload = (await response.json()) as {
      features?: Array<{
        geometry?: unknown;
        properties?: { distance?: unknown; time?: unknown };
      }>;
    };
    const feature = payload.features?.[0];
    const geometry = normalizeRouteGeoJson(feature?.geometry);
    const distance = Number(feature?.properties?.distance);
    const duration = Number(feature?.properties?.time);
    if (!geometry || !Number.isFinite(distance) || !Number.isFinite(duration))
      throw new RoutePreviewError(
        "INVALID_RESPONSE",
        "Geoapify returned an invalid route.",
      );
    return {
      geometry,
      distanceKm: distance / 1000,
      durationMinutes: duration / 60,
    };
  } catch (error) {
    if (error instanceof RoutePreviewError) throw error;
    if (error instanceof DOMException && error.name === "AbortError")
      throw new RoutePreviewError(
        "TIMEOUT",
        "Geoapify routing request timed out or was cancelled.",
      );
    throw new RoutePreviewError(
      "NETWORK",
      "Unable to reach Geoapify routing.",
      { cause: error },
    );
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
