import { z } from "zod";
import type { MapRoute } from "@/shared/components/map";
import { isBcpLocation } from "./bcp-detector";
import { buildEffectiveBackupRoute } from "./route-continuity";
import type { BuilderProvider, DraftSegment } from "./builder-types";
import type {
  RouteSegment,
  RouteSegmentInput,
  RouteType,
  Vehicle,
  VehicleBrief,
} from "./types";

const providerBriefSchema = z.object({
  transportProviderId: z.string(),
  providerCode: z.string(),
  providerName: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  supportedModes: z.array(z.enum(["ROAD", "SEA", "AIR"])),
});

// RP3 returns a provider directly. Keep compatibility with the existing FE wrapper.
function readProvider(value: unknown): BuilderProvider | undefined {
  const source =
    typeof value === "object" && value !== null && "provider" in value
      ? value.provider
      : value;
  const result = providerBriefSchema.safeParse(source);
  return result.success ? result.data : undefined;
}

export function hydrateBuilderSegments(
  segments: RouteSegment[],
): DraftSegment[] {
  return [...segments]
    .sort((a, b) => a.sequenceNo - b.sequenceNo)
    .map((segment, index, sorted) => {
      const { fromLocation: from, toLocation: to } = segment;
      if (!["PRIMARY", "BACKUP", "RETURN"].includes(segment.routeType)) {
        throw new Error(
          `Segment ${segment.sequenceNo} has an unsupported route type. Editing is blocked to preserve its itinerary.`,
        );
      }
      if (
        from.latitude == null ||
        from.longitude == null ||
        to.latitude == null ||
        to.longitude == null
      ) {
        throw new Error(
          `Segment ${segment.sequenceNo} has no map coordinates. Editing is blocked to avoid dropping this segment.`,
        );
      }
      const provider = readProvider(segment.outsourcing);
      if (segment.isOutsourced && !provider) {
        throw new Error(
          `Segment ${segment.sequenceNo} has no valid provider information. Reload its details before editing.`,
        );
      }
      const route: MapRoute = {
        id: segment.route.routeId,
        routePlanRouteId: segment.routePlanRouteId,
        name: segment.route.routeName,
        transportMode: segment.route.transportMode,
        isOutsourced: segment.isOutsourced,
        routePlanType: segment.routeType,
        fromLocation: {
          ...from,
          id: from.locationId,
          name: from.locationName,
          latitude: from.latitude,
          longitude: from.longitude,
          type: from.locationType ?? undefined,
        },
        toLocation: {
          ...to,
          id: to.locationId,
          name: to.locationName,
          latitude: to.latitude,
          longitude: to.longitude,
          type: to.locationType ?? undefined,
        },
        distanceKm: segment.route.distanceKm,
        durationMinutes: segment.route.estimatedDurationMinutes,
      };
      return {
        id: segment.routePlanRouteId,
        sequenceNo: segment.sequenceNo,
        route,
        arrangement: segment.isOutsourced ? "OUTSOURCED" : "INTERNAL",
        stopType:
          index === sorted.length - 1
            ? "DESTINATION"
            : isBcpLocation(route.toLocation)
              ? "BCP"
              : "REST_STOP",
        provider,
        note: segment.note ?? undefined,
        dwellAfterMinutes: segment.dwellAfterMinutes ?? undefined,
        plannedDepartureAt: segment.plannedDepartureAt ?? undefined,
        plannedArrivalAt: segment.plannedArrivalAt ?? undefined,
        vehicleIds: segment.vehicles.map((vehicle) => vehicle.vehicleId),
        vehicleDetails: segment.vehicles,
        assignmentOrigin: "saved",
        preserveTiming: true,
      };
    });
}

function sameSavedRoute(left: DraftSegment | undefined, right: DraftSegment) {
  return (
    left?.route.routePlanType === "PRIMARY" &&
    left.route.id === right.route.id &&
    left.route.fromLocation?.id === right.route.fromLocation?.id &&
    left.route.toLocation?.id === right.route.toLocation?.id
  );
}

export function resolveBackupItinerary(
  primary: DraftSegment[],
  backup: DraftSegment[],
  saved: DraftSegment[] = [],
) {
  const origin = primary[0]?.route.fromLocation?.id;
  const destination = primary.at(-1)?.route.toLocation?.id;
  if (origin == null || destination == null) return null;
  const continuity = buildEffectiveBackupRoute(
    primary.map((s) => s.route),
    backup.map((s) => s.route),
    origin,
    destination,
  );
  if (
    !continuity.valid ||
    continuity.replacementStart === undefined ||
    continuity.replacementEnd === undefined
  )
    return null;
  const start = continuity.replacementStart;
  const end = continuity.replacementEnd;
  const prefix = primary
    .slice(0, start)
    .map((segment, index) =>
      sameSavedRoute(saved[index], segment) ? saved[index] : segment,
    );
  const suffix = primary.slice(end).map((segment, index, list) => {
    const previous = saved[saved.length - list.length + index];
    return sameSavedRoute(previous, segment) ? previous : segment;
  });
  return {
    segments: [...prefix, ...backup, ...suffix],
    replaced: primary.slice(start, end),
  };
}

/** Called only for explicit topology changes, never by a refetch/rerender effect. */
export function initializeBackupVehicles(
  primary: DraftSegment[],
  backup: DraftSegment[],
  vehicles: Vehicle[],
): DraftSegment[] {
  const mapping = resolveBackupItinerary(primary, backup);
  return backup.map((segment) => {
    if (
      segment.assignmentOrigin === "saved" ||
      segment.assignmentOrigin === "manual"
    )
      return segment;
    let reason: string | undefined;
    const source =
      mapping?.replaced.length === 1 ? mapping.replaced[0] : undefined;
    const ids = source?.vehicleIds ?? [];
    const details: VehicleBrief[] = source?.vehicleDetails ?? [];
    if (segment.arrangement === "OUTSOURCED")
      reason = "Outsourced segments use a provider, not internal vehicles.";
    else if (!mapping)
      reason = "Complete the replacement route to identify its PRIMARY source.";
    else if (!source)
      reason =
        "This replacement spans multiple PRIMARY segments. Select vehicles explicitly.";
    else if (source.arrangement === "OUTSOURCED" || !ids.length)
      reason =
        "The PRIMARY segment has no internal vehicles to inherit. Select vehicles.";
    else if (
      ids.some(
        (id) =>
          details.find((v) => v.vehicleId === id)?.transportMode !==
          segment.route.transportMode,
      )
    )
      reason =
        "PRIMARY vehicles do not match this segment's transport mode. Select compatible vehicles.";
    else if (
      ids.some((id) => {
        const vehicle = vehicles.find((v) => v.vehicleId === id);
        return (
          vehicle &&
          (!assignmentStatusAllowed(vehicle) ||
            vehicle.isAvailable === false ||
            [vehicle.registrationExpiryDate, vehicle.insuranceExpiryDate].some(
              (date) =>
                date &&
                segment.plannedDepartureAt &&
                date.slice(0, 10) < segment.plannedDepartureAt.slice(0, 10),
            ))
        );
      })
    )
      reason =
        "A PRIMARY vehicle is unavailable or has expired documents for this departure. Select valid vehicles.";
    if (reason)
      return {
        ...segment,
        vehicleIds: [],
        vehicleDetails: [],
        assignmentOrigin: "new",
        inheritanceSource: undefined,
        assignmentReason: reason,
      };
    return {
      ...segment,
      vehicleIds: [...ids],
      vehicleDetails: [...details],
      assignmentOrigin: "inherited",
      inheritanceSource: source?.sequenceNo,
      assignmentReason: undefined,
    };
  });
}

export function assignmentStatusAllowed(vehicle: Vehicle) {
  return ["AVAILABLE", "ASSIGNED", "IN_USE"].includes(vehicle.status);
}

export function serializeBuilderSegment(
  segment: DraftSegment,
  index: number,
  routeType: RouteType,
): RouteSegmentInput {
  if (!segment.plannedDepartureAt || !segment.plannedArrivalAt) {
    throw new Error(
      `Segment ${index + 1} has no planned departure or arrival. Set a valid timeline before saving.`,
    );
  }
  if (segment.arrangement === "OUTSOURCED" && !segment.provider) {
    throw new Error(`Select a provider for segment ${index + 1}.`);
  }
  const route = segment.route;
  const isCatalogRoute =
    route.id != null && !String(route.id).startsWith("dynamic-");
  return {
    sequenceNo: index + 1,
    routeType,
    ...(isCatalogRoute
      ? { routeId: String(route.id) }
      : {
          fromLocationId: String(route.fromLocation?.id ?? ""),
          toLocationId: String(route.toLocation?.id ?? ""),
          transportMode: route.transportMode ?? "ROAD",
        }),
    plannedDepartureAt: segment.plannedDepartureAt,
    plannedArrivalAt: segment.plannedArrivalAt,
    ...(segment.note !== undefined ? { note: segment.note } : {}),
    ...(segment.arrangement === "OUTSOURCED" && segment.provider
      ? {
          outsourcing: {
            transportProviderId: segment.provider.transportProviderId,
          },
        }
      : { vehicleIds: [...(segment.vehicleIds ?? [])] }),
  };
}
