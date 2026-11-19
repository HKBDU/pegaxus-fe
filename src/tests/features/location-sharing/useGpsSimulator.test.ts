import { describe, expect, it } from "vitest";
import {
  CUSTOM_GEOJSON_ENDPOINT_TOLERANCE_DEG,
  isNearEndpoint,
} from "@/features/location-sharing/simulator/useGpsSimulator";

describe("CUSTOM_GEOJSON_ENDPOINT_TOLERANCE_DEG and endpoint proximity", () => {
  const endpoint = {
    latitude: 49.1944,
    longitude: 2.4858,
  };

  it("exports tolerance constant of 0.02 degrees (~2.2 km)", () => {
    expect(CUSTOM_GEOJSON_ENDPOINT_TOLERANCE_DEG).toBe(0.02);
  });

  it("accepts coordinates within the tolerance threshold", () => {
    // Within tolerance (diff: 0.015 < 0.02)
    const coordWithin: [number, number] = [
      endpoint.longitude + 0.015,
      endpoint.latitude - 0.015,
    ];
    expect(isNearEndpoint(coordWithin, endpoint)).toBe(true);

    // Exact match
    const exactMatch: [number, number] = [endpoint.longitude, endpoint.latitude];
    expect(isNearEndpoint(exactMatch, endpoint)).toBe(true);
  });

  it("rejects coordinates outside the tolerance threshold", () => {
    // Longitude out of range (diff: 0.025 > 0.02)
    const lonTooFar: [number, number] = [
      endpoint.longitude + 0.025,
      endpoint.latitude,
    ];
    expect(isNearEndpoint(lonTooFar, endpoint)).toBe(false);

    // Latitude out of range (diff: 0.03 > 0.02)
    const latTooFar: [number, number] = [
      endpoint.longitude,
      endpoint.latitude + 0.03,
    ];
    expect(isNearEndpoint(latTooFar, endpoint)).toBe(false);

    // Both out of range
    const bothTooFar: [number, number] = [
      endpoint.longitude - 0.05,
      endpoint.latitude - 0.05,
    ];
    expect(isNearEndpoint(bothTooFar, endpoint)).toBe(false);
  });

  it("strictly enforces boundary threshold (< tolerance)", () => {
    // Exactly on the boundary (0.02 is not < 0.02)
    const onBoundary: [number, number] = [
      endpoint.longitude + CUSTOM_GEOJSON_ENDPOINT_TOLERANCE_DEG,
      endpoint.latitude,
    ];
    expect(isNearEndpoint(onBoundary, endpoint)).toBe(false);

    // Just inside boundary
    const justInside: [number, number] = [
      endpoint.longitude + CUSTOM_GEOJSON_ENDPOINT_TOLERANCE_DEG - 0.0001,
      endpoint.latitude + CUSTOM_GEOJSON_ENDPOINT_TOLERANCE_DEG - 0.0001,
    ];
    expect(isNearEndpoint(justInside, endpoint)).toBe(true);
  });
});
