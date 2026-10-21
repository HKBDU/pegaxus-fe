import type { Coordinates } from "./coordinates";

const GEOAPIFY_BASE_URL = "https://api.geoapify.com/v1";
const GEOAPIFY_PLACES_URL = "https://api.geoapify.com/v2";

export type GeoapifyPlace = {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  country?: string | null;
  countryCode?: string | null;
  latitude: number;
  longitude: number;
  distanceMeters?: number | null;
};

export const nearbyCategories = [
  "populated_place.city",
  "airport",
  "service.vehicle",
] as const;

export class GeoapifyError extends Error {
  readonly code: "MISSING_KEY" | "NETWORK" | "QUOTA" | "INVALID_RESPONSE";

  constructor(
    message: string,
    code: "MISSING_KEY" | "NETWORK" | "QUOTA" | "INVALID_RESPONSE",
  ) {
    super(message);
    this.name = "GeoapifyError";
    this.code = code;
  }
}

function getApiKey() {
  const key = import.meta.env.VITE_GEOAPIFY_API_KEY;
  if (!key || key.startsWith("$")) {
    throw new GeoapifyError(
      "Geoapify API key is not configured.",
      "MISSING_KEY",
    );
  }
  return key;
}

async function request<T>(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal,
  baseUrl = GEOAPIFY_BASE_URL,
): Promise<T> {
  const searchParams = new URLSearchParams({ ...params, apiKey: getApiKey() });

  try {
    const response = await fetch(`${baseUrl}${path}?${searchParams}`, {
      signal,
    });
    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 429
    ) {
      throw new GeoapifyError(
        "Geoapify request quota or authorization failed.",
        "QUOTA",
      );
    }
    if (!response.ok)
      throw new GeoapifyError("Geoapify request failed.", "NETWORK");
    return (await response.json()) as T;
  } catch (error) {
    if (
      error instanceof GeoapifyError ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      throw error;
    }
    throw new GeoapifyError("Unable to reach Geoapify.", "NETWORK");
  }
}

type GeoapifyFeature = {
  properties?: Record<string, unknown>;
};

type GeoapifyResponse = { features?: GeoapifyFeature[] };

function parseFeature(
  feature: GeoapifyFeature | undefined,
): GeoapifyPlace | null {
  const properties = feature?.properties;
  if (!properties) return null;

  const rawLat = Number(properties.lat);
  const rawLon = Number(properties.lon);
  if (!Number.isFinite(rawLat) || !Number.isFinite(rawLon)) return null;

  const latitude = Number(rawLat.toFixed(4));
  const longitude = Number(rawLon.toFixed(4));

  return {
    name: typeof properties.name === "string" ? properties.name : null,
    address:
      typeof properties.formatted === "string"
        ? properties.formatted
        : typeof properties.address_line1 === "string"
          ? properties.address_line1
          : null,
    city: typeof properties.city === "string" ? properties.city : null,
    stateProvince:
      typeof properties.state === "string" ? properties.state : null,
    country: typeof properties.country === "string" ? properties.country : null,
    countryCode:
      typeof properties.country_code === "string"
        ? properties.country_code.toUpperCase()
        : null,
    latitude,
    longitude,
    distanceMeters: Number.isFinite(Number(properties.distance))
      ? Number(properties.distance)
      : null,
  };
}

export function createGeoapifyMapStyleUrl(): string {
  return `https://maps.geoapify.com/v1/styles/osm-bright-smooth/style.json?apiKey=${encodeURIComponent(getApiKey())}`;
}

export async function searchGeoapifyPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<GeoapifyPlace[]> {
  if (!query.trim()) return [];
  const response = await request<GeoapifyResponse>(
    "/geocode/search",
    { text: query.trim(), limit: "10" },
    signal,
  );
  return (response.features ?? [])
    .map(parseFeature)
    .filter((place): place is GeoapifyPlace => place !== null);
}

export async function searchNearbyGeoapifyPlaces(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<GeoapifyPlace[]> {
  const response = await request<GeoapifyResponse>(
    "/places",
    {
      categories: nearbyCategories.join(","),
      filter: `circle:${coordinates.longitude},${coordinates.latitude},10000`,
      bias: `proximity:${coordinates.longitude},${coordinates.latitude}`,
      limit: "50",
    },
    signal,
    GEOAPIFY_PLACES_URL,
  );

  return (response.features ?? [])
    .map(parseFeature)
    .filter((place): place is GeoapifyPlace => place !== null);
}

export async function reverseGeocodeGeoapify(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<GeoapifyPlace | null> {
  const response = await request<GeoapifyResponse>(
    "/geocode/reverse",
    {
      lat: String(coordinates.latitude),
      lon: String(coordinates.longitude),
      limit: "1",
    },
    signal,
  );
  return parseFeature(response.features?.[0]);
}
