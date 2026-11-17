import { describe, expect, it } from "vitest";
import { buildRouteData, parseGeoJsonToCoordinates } from "@/features/location-sharing/simulator/engine";

describe("driver Mock GPS route input", () => {
  it("rejects disconnected route parts instead of teleporting between them", () => {
    const disconnected = {
      type: "MultiLineString",
      coordinates: [
        [[2.4858, 49.1944], [2.5, 49.2]],
        [[3.0573, 50.6292], [3.06, 50.63]],
      ],
    };
    expect(parseGeoJsonToCoordinates(disconnected)).toEqual([]);
  });

  it("accepts connected route parts with positive distance", () => {
    const connected = {
      type: "MultiLineString",
      coordinates: [
        [[2.4858, 49.1944], [2.5, 49.2]],
        [[2.5, 49.2], [2.51, 49.21]],
      ],
    };
    const coordinates = parseGeoJsonToCoordinates(connected);
    expect(coordinates).toHaveLength(4);
    expect(buildRouteData(coordinates).totalDistance).toBeGreaterThan(0);
  });
});
