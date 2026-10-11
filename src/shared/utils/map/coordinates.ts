export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type MapPoint = [longitude: number, latitude: number];

export function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function isValidLatitude(value: unknown): value is number {
  const latitude = parseCoordinate(value);
  return latitude !== null && latitude >= -90 && latitude <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  const longitude = parseCoordinate(value);
  return longitude !== null && longitude >= -180 && longitude <= 180;
}

export function isValidCoordinates(value: {
  latitude?: unknown;
  longitude?: unknown;
}): value is Coordinates {
  return isValidLatitude(value.latitude) && isValidLongitude(value.longitude);
}

export function toMapPoint(value: {
  latitude?: unknown;
  longitude?: unknown;
}): MapPoint | null {
  if (!isValidCoordinates(value)) return null;
  return [value.longitude, value.latitude];
}

export function toCoordinates(point: unknown): Coordinates | null {
  if (!Array.isArray(point) || point.length < 2) return null;

  const longitude = parseCoordinate(point[0]);
  const latitude = parseCoordinate(point[1]);
  if (latitude === null || longitude === null) return null;
  if (!isValidCoordinates({ latitude, longitude })) return null;

  return { latitude, longitude };
}
