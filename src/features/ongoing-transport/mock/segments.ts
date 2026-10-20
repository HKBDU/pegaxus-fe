import { useAuthStore } from "@/features/auth/store";
import type {
  HandoverBoundary,
  SegmentsScenario,
  TrackingSegment,
  TransportAudience,
  TransportOverview,
  TransportSegments,
} from "../types";
import { getMockTransportOverview } from "./overview";

function buildSegments(
  overview: TransportOverview,
  audience: TransportAudience,
): TrackingSegment[] {
  const current = overview.currentSegment;
  if (!current) return [];
  const count = overview.totalSegments;
  const currentOrder = current.displayOrder;
  const points = Array.from({ length: count + 1 }, (_, index) => ({
    ...current.fromLocation,
    locationId: `${current.fromLocation.locationId}-point-${index}`,
    locationName:
      index === 0
        ? "Chantilly Stables"
        : index === count
          ? "Newmarket Stables"
          : `Journey stop ${index}`,
    country: index === count ? "United Kingdom" : "France",
  }));
  points[currentOrder - 1] = current.fromLocation;
  points[currentOrder] = current.toLocation;
  const timestamp = (minutes: number) =>
    overview.departureAt === null
      ? null
      : new Date(
          Date.parse(overview.departureAt) + minutes * 60_000,
        ).toISOString();
  return Array.from({ length: count }, (_, index): TrackingSegment => {
    const order = index + 1;
    if (order === currentOrder) return current;
    const completed =
      overview.transport.status === "COMPLETED" ||
      (overview.transport.status === "IN_TRANSIT" && order < currentOrder);
    const outsourced =
      order === count && overview.transport.status !== "COMPLETED";
    const history = order < currentOrder && current.routeType !== "PRIMARY";
    return {
      ...current,
      routePlanRouteId: `${current.routePlanRouteId}-leg-${order}`,
      routePlanId: history
        ? `${current.routePlanId}-primary`
        : current.routePlanId,
      routePlanCode: history
        ? `${current.routePlanCode}-PRIMARY`
        : current.routePlanCode,
      routeType: history ? "PRIMARY" : current.routeType,
      sequenceNo: history ? order : current.sequenceNo + order - currentOrder,
      displayOrder: order,
      isCurrent: false,
      fromLocation: points[index],
      toLocation: points[index + 1],
      transportMode: outsourced ? "SEA" : "ROAD",
      distanceKm: outsourced ? null : 80 + index * 12.5,
      status: completed ? "COMPLETED" : "PLANNED",
      plannedDepartureAt: timestamp(order * 60),
      plannedArrivalAt: timestamp(order * 60 + 45),
      actualDepartureAt: completed ? timestamp(order * 60 + 5) : null,
      actualArrivalAt: completed ? timestamp(order * 60 + 50) : null,
      driver: outsourced ? null : current.driver,
      escort: outsourced ? null : current.escort,
      isOutsourced: outsourced,
      provider: outsourced
        ? {
            transportProviderId: `${current.routePlanId}-ferry`,
            providerName: "Journey Ferry Partner",
            serviceType: "Ferry crossing",
            providerReference: "FLOW4-PREVIEW",
          }
        : null,
      vehicles: outsourced ? [] : current.vehicles,
      note:
        audience === "customer"
          ? null
          : order % 2 === 0
            ? "Keep the original documents with the assigned crew."
            : null,
    };
  });
}

function buildBoundaries(
  overview: TransportOverview,
  segments: TrackingSegment[],
  audience: TransportAudience,
): HandoverBoundary[] {
  if (!segments.length) return [];
  const roles = useAuthStore.getState().principal?.roles ?? [];
  const operator = roles.some((role) =>
    [
      "LOGISTICS_MANAGER",
      "FLEET_ROUTE_COORDINATOR",
      "DRIVER",
      "ESCORT",
      "TRANSPORT_SPECIALIST",
    ].includes(role),
  );
  return Array.from(
    { length: segments.length + 1 },
    (_, index): HandoverBoundary => {
      const from = segments[index - 1] ?? null;
      const to = segments[index] ?? null;
      const first = index === 0;
      const last = index === segments.length;
      const location = first ? segments[0].fromLocation : from!.toLocation;
      const outsourced = Boolean(from?.isOutsourced || to?.isOutsourced);
      const exempt =
        !first &&
        !last &&
        !outsourced &&
        Boolean(from?.driver?.employeeId) &&
        from?.driver?.employeeId === to?.driver?.employeeId;
      const types =
        outsourced || exempt
          ? []
          : first
            ? ["PICKUP"]
            : last
              ? ["DELIVERY"]
              : ["TRANSFER", "BORDER_HANDOVER"];
      const executed =
        !outsourced &&
        (first
          ? overview.transport.status !== "READY"
          : from?.status === "COMPLETED");
      const existing =
        !exempt && executed && (audience !== "customer" || first || last);
      const canCreate =
        !exempt &&
        !outsourced &&
        !executed &&
        audience !== "customer" &&
        operator &&
        (first
          ? overview.transport.status === "READY"
          : overview.transport.status === "IN_TRANSIT");
      return {
        boundaryNo: index + 1,
        fromRoutePlanRouteId: from?.routePlanRouteId ?? null,
        toRoutePlanRouteId: to?.routePlanRouteId ?? null,
        location: {
          locationName: location.locationName,
          address: null,
          country: location.country,
        },
        allowedHandoverTypes: types,
        existingHandover: existing
          ? {
              handoverRecordId: `${overview.transport.transportId}-handover-${index}`,
              handoverCode: `HO-PREVIEW-${index + 1}`,
              handoverType: types[0],
              status: "COMPLETED",
            }
          : null,
        handoverRequired: !exempt,
        arrivalAt: from?.actualArrivalAt ?? null,
        canCreate,
        createModes: !canCreate
          ? []
          : roles.includes("LOGISTICS_MANAGER") ||
              roles.includes("FLEET_ROUTE_COORDINATOR")
            ? ["START_NOW", "SCHEDULE"]
            : roles.includes("TRANSPORT_SPECIALIST")
              ? ["SCHEDULE"]
              : ["START_NOW"],
      };
    },
  );
}

export async function getMockTransportSegments(
  transportId: string,
  audience: TransportAudience,
  scenario: SegmentsScenario,
  signal?: AbortSignal,
) {
  const source = await getMockTransportOverview(
    transportId,
    audience,
    scenario === "empty" || scenario === "no-boundaries" ? "data" : scenario,
    signal,
  );
  if (!source.isSuccess || !("value" in source) || source.value === null)
    return source;
  const overview = source.value;
  const segments =
    scenario === "empty" ? [] : buildSegments(overview, audience);
  const value: TransportSegments = {
    serverTime: overview.serverTime,
    transportId: overview.transport.transportId,
    transportStatus: overview.transport.status,
    segments,
    handoverBoundaries:
      scenario === "no-boundaries"
        ? []
        : buildBoundaries(overview, segments, audience),
  };
  return {
    isSuccess: true,
    code: 200,
    message: "Transport segments retrieved successfully",
    value,
  };
}
