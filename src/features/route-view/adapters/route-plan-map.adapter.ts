import type { MapLocation, MapRoute } from "@/shared/components/map";
import type { RouteGeometry } from "@/shared/utils/map/geojson";
import type { RouteLocation, RoutePlanDetail } from "../types";
import { currentBlockedSegments } from "@/features/route-plan/legal-blocks";

function coordinate(value: unknown, limit: number) {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim()))
    return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

type MapSegments = {
  segments: {
    sequenceNo: number;
    fromLocation?: RouteLocation | null;
    toLocation?: RouteLocation | null;
  }[];
};

export function toRouteMapLocations(plan: MapSegments): MapLocation[] {
  const seen = new Set<string>();
  return [...plan.segments]
    .sort((a, b) => a.sequenceNo - b.sequenceNo)
    .flatMap((segment) => [segment.fromLocation, segment.toLocation])
    .flatMap((location) => {
      if (!location) return [];
      const latitude = coordinate(location.latitude, 90),
        longitude = coordinate(location.longitude, 180);
      if (
        latitude === null ||
        longitude === null ||
        seen.has(location.locationId)
      )
        return [];
      seen.add(location.locationId);
      return [
        {
          id: location.locationId,
          name: location.locationName,
          type: location.locationType,
          city: location.city,
          country: location.country,
          latitude,
          longitude,
        },
      ];
    });
}

// Reject the whole line if any vertex is invalid. Dropping a vertex would invent a shortcut.
export function verifiedRouteGeometry(input: unknown): RouteGeometry | null {
  if (!input || typeof input !== "object") return null;
  const value = input as { type?: unknown; coordinates?: unknown };
  const line = (points: unknown): boolean =>
    Array.isArray(points) &&
    points.length >= 2 &&
    points.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number" &&
        coordinate(point[0], 180) !== null &&
        coordinate(point[1], 90) !== null,
    );
  if (value.type === "LineString" && line(value.coordinates))
    return input as RouteGeometry;
  if (
    value.type === "MultiLineString" &&
    Array.isArray(value.coordinates) &&
    value.coordinates.length > 0 &&
    value.coordinates.every(line)
  )
    return input as RouteGeometry;
  return null;
}

/** Segments the latest legal review blocked, until the coordinator saves new segments over them. */
export function blockedSegmentNumbers(plan: Pick<RoutePlanDetail, "legalReview" | "updatedAt">): Set<number> {
  return new Set(currentBlockedSegments(plan));
}

/** An active PRIMARY lists the itinerary the transport now follows, backup segments included. Its map shows its own route only. */
export function ownSegments(plan: Pick<RoutePlanDetail, "routeType" | "segments">) {
  return plan.routeType === "PRIMARY"
    ? plan.segments.filter((segment) => segment.routeType === "PRIMARY")
    : plan.segments;
}

export function toRouteMapData(
  plan: RoutePlanDetail,
  suppliedGeometry?: unknown,
) {
  const blocked = blockedSegmentNumbers(plan);
  // RP3 currently has no saved geometry field. Build segment routes from the
  // verified endpoints so MapViewer can resolve and render their line geometry.
  const geometry = verifiedRouteGeometry(suppliedGeometry);
  const geometryStatus =
    suppliedGeometry == null ? "missing" : geometry ? "available" : "invalid";
  // The replaced primary segments stay on the map, dashed, so the change of route is visible.
  const replaced = plan.replacedSegments ?? [];
  const segments = ownSegments(plan);
  const locations = toRouteMapLocations({ segments: [...segments, ...replaced] });
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const routes: MapRoute[] = [
    ...replaced.map((segment) => ({ segment, isReplaced: true })),
    ...segments
      .slice()
      .sort((a, b) => a.sequenceNo - b.sequenceNo)
      .map((segment) => ({ segment, isReplaced: false })),
  ]
    .flatMap(({ segment, isReplaced }) => {
      const fromLocation = locationById.get(segment.fromLocation.locationId);
      const toLocation = locationById.get(segment.toLocation.locationId);
      if (!fromLocation || !toLocation) return [];
      return [
        {
          id: segment.routePlanRouteId,
          routePlanRouteId: segment.routePlanRouteId,
          name: segment.route.routeName ?? segment.route.routeCode,
          fromLocation,
          toLocation,
          transportMode: segment.route.transportMode,
          distanceKm: segment.route.distanceKm,
          durationMinutes: segment.route.estimatedDurationMinutes,
          routePlanType: segment.routeType,
          isOutsourced: segment.isOutsourced,
          // Drawn red on the map so the coordinator finds the segment the legal review blocked.
          blocked: !isReplaced && blocked.has(segment.sequenceNo),
          replaced: isReplaced,
          readonly: isReplaced || undefined,
        },
      ];
    });
  const route: MapRoute | null = geometry
    ? { id: plan.routePlanId, name: plan.routePlanCode, geometry }
    : null;
  return {
    locations,
    route,
    routes,
    geometryStatus,
    omittedStops: segments
      .flatMap((segment) => [segment.fromLocation, segment.toLocation])
      .filter(
        (location) =>
          !location ||
          coordinate(location.latitude, 90) === null ||
          coordinate(location.longitude, 180) === null,
      ).length,
  };
}
