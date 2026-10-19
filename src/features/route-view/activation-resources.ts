import {
  getTransportProviders,
  getVehicles,
} from "@/features/route-plan/services";
import type { PaginatedValue, Provider } from "@/features/route-plan/types";
import type {
  EmergencyRequestMap,
  RoutePlanDetail,
  RouteSegment,
} from "./types";

export type ReturnResourceOverride = NonNullable<
  EmergencyRequestMap["activation"]["segments"]
>[number];
type VehicleOption = RouteSegment["vehicles"][number];
export type SegmentResourceOptions = {
  vehicles: VehicleOption[];
  providers: Provider[];
  vehicleIssue?: string;
  providerIssue?: string;
};

async function everyPage<T>(
  read: (pageIndex: number) => Promise<PaginatedValue<T>>,
) {
  const first = await read(1);
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page++)
    items.push(...(await read(page)).items);
  return items;
}

export async function loadActivationResources(
  plan: RoutePlanDetail,
  primary?: RoutePlanDetail,
) {
  const result: Record<string, SegmentResourceOptions> = {};
  const providerReads = new Map<string, Promise<Provider[]>>();
  await Promise.all(
    plan.segments.map(async (segment) => {
      const mode = segment.route.transportMode;
      let providers: Provider[] = [];
      let providerIssue: string | undefined;
      try {
        if (!providerReads.has(mode))
          providerReads.set(
            mode,
            everyPage((pageIndex) =>
              getTransportProviders({
                pageIndex,
                pageSize: 100,
                status: "ACTIVE",
                supportedMode: mode,
              }),
            ),
          );
        providers = await providerReads.get(mode)!;
      } catch (error) {
        providerIssue =
          error instanceof Error
            ? error.message
            : "Unable to load active providers.";
      }
      if (segment.isOutsourced) {
        result[segment.routePlanRouteId] = {
          vehicles: [],
          providers,
          providerIssue,
        };
        return;
      }
      if (!segment.plannedDepartureAt || !segment.plannedArrivalAt) {
        result[segment.routePlanRouteId] = {
          vehicles: [],
          providers,
          providerIssue,
          vehicleIssue:
            "Vehicle overrides require authoritative segment departure and arrival dates.",
        };
        return;
      }
      let available: VehicleOption[] = [];
      let vehicleIssue: string | undefined;
      try {
        available = await everyPage((pageIndex) =>
          getVehicles({
            pageIndex,
            pageSize: 100,
            transportMode: mode,
            availableFrom: segment.plannedDepartureAt!.slice(0, 10),
            availableTo: segment.plannedArrivalAt!.slice(0, 10),
          }),
        );
      } catch (error) {
        vehicleIssue =
          error instanceof Error
            ? error.message
            : "Unable to load available vehicles.";
      }
      // R17 permits the same transport's PRIMARY vehicles, including IN_USE vehicles excluded by VH1 availability.
      const inherited =
        primary?.routeType === "PRIMARY" &&
        primary.transportPlanId === plan.transportPlanId &&
        primary.bookingId === plan.bookingId
          ? primary.segments
              .flatMap((item) => item.vehicles)
              .filter((vehicle) => vehicle.transportMode === mode)
          : [];
      const vehicles = new Map<string, VehicleOption>(
        inherited.map((vehicle) => [vehicle.vehicleId, vehicle]),
      );
      for (const vehicle of available) vehicles.set(vehicle.vehicleId, vehicle);
      result[segment.routePlanRouteId] = {
        vehicles: [...vehicles.values()],
        providers,
        providerIssue,
        vehicleIssue,
      };
    }),
  );
  return result;
}

export function validateActivationSelections(
  plan: RoutePlanDetail,
  overrides: ReturnResourceOverride[],
  resources: Record<string, SegmentResourceOptions> | undefined,
  horseCount?: number,
) {
  const errors: Record<string, string> = {};
  for (const override of overrides) {
    const segment = plan.segments.find(
      (item) => item.routePlanRouteId === override.routePlanRouteId,
    );
    const options = resources?.[override.routePlanRouteId];
    if (!segment || !options) {
      errors[override.routePlanRouteId] =
        "Reload current segment resources before confirming.";
      continue;
    }
    if (override.outsourcing) {
      if (
        options.providerIssue ||
        override.vehicleIds ||
        !options.providers.some(
          (provider) =>
            provider.transportProviderId ===
              override.outsourcing?.transportProviderId &&
            provider.status === "ACTIVE" &&
            provider.supportedModes.includes(segment.route.transportMode),
        )
      )
        errors[override.routePlanRouteId] =
          options.providerIssue ??
          "Select an active provider supporting this segment's mode.";
    } else if (segment.isOutsourced) {
      errors[override.routePlanRouteId] =
        "EC3 does not support switching an outsourced segment to internal resources.";
    } else {
      const ids = override.vehicleIds ?? [];
      const vehicles = options.vehicles.filter((vehicle) =>
        ids.includes(vehicle.vehicleId),
      );
      if (
        override.outsourcing ||
        !ids.length ||
        vehicles.length !== ids.length ||
        options.vehicleIssue
      )
        errors[override.routePlanRouteId] =
          options.vehicleIssue ??
          "Select at least one currently eligible vehicle.";
      else if (
        horseCount !== undefined &&
        vehicles.every((vehicle) => vehicle.capacityHorses != null) &&
        vehicles.reduce(
          (total, vehicle) => total + vehicle.capacityHorses!,
          0,
        ) < horseCount
      )
        errors[override.routePlanRouteId] =
          `Selected vehicles need capacity for ${horseCount} horses.`;
    }
  }
  return errors;
}
