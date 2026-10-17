import { getLocations, getRoutes } from "./services";
import type { Location, LocationListParams, RouteListParams, RouteMaster } from "./types";
import type { MapLocation, MapRoute } from "@/shared/components/map";

const PAGE_SIZE = 100;

function uniqueById<T extends { locationId?: string | number; routeId?: string | number }>(items: T[], key: "locationId" | "routeId") {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = String(item[key]);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

type Page<T> = { items: T[]; totalPages?: number; hasNextPage?: boolean };

async function loadPages<T>(load: (pageIndex: number) => Promise<Page<T>>): Promise<T[]> {
  const items: T[] = [];
  for (let pageIndex = 1; ; pageIndex += 1) {
    const page = await load(pageIndex);
    items.push(...page.items);
    if (pageIndex >= (page.totalPages ?? pageIndex) || page.hasNextPage === false || page.items.length === 0) break;
  }
  return items;
}

export async function loadAllLocations(params: Omit<LocationListParams, "pageIndex" | "pageSize"> = {}) {
  const items = await loadPages((pageIndex) => getLocations({ ...params, pageIndex, pageSize: PAGE_SIZE }));
  return uniqueById(items, "locationId");
}

export async function loadAllRoutes(params: Omit<RouteListParams, "pageIndex" | "pageSize"> = {}) {
  const items = await loadPages((pageIndex) => getRoutes({ ...params, pageIndex, pageSize: PAGE_SIZE }));
  return uniqueById(items, "routeId");
}

type LocationLike = Pick<Location, "locationId" | "locationName"> & { locationType?: string | null; city?: string | null; country?: string | null; address?: string | null; latitude?: number | string | null; longitude?: number | string | null };

export function toMapLocation(item: LocationLike | null | undefined): MapLocation | null {
  if (!item) return null;
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { id: String(item.locationId), name: item.locationName, type: item.locationType ?? undefined, city: item.city, country: item.country, address: item.address, latitude, longitude };
}

export function toMapRoute(item: RouteMaster, locations: MapLocation[]): MapRoute | null {
  const fromLocation = locations.find((location) => location.id === String(item.fromLocation.locationId));
  const toLocation = locations.find((location) => location.id === String(item.toLocation.locationId));
  if (!fromLocation || !toLocation) return null;
  return { id: String(item.routeId), name: item.routeName, transportMode: item.transportMode, fromLocation, toLocation, distanceKm: item.distanceKm, durationMinutes: item.estimatedDurationMinutes };
}

export type TransportPlanApiValue = {
  planCode?: string;
  bookingCode?: string;
  isCrossBorder?: boolean;
  plannedStartAt?: string;
  plannedEndAt?: string;
  booking?: { bookingCode?: string; originAddress?: string; originCountry?: string; originLocationId?: string | number; destinationAddress?: string; destinationCountry?: string; destinationLocationId?: string | number; isInternational?: boolean };
  originLocationId?: string | number;
  destinationLocationId?: string | number;
};

function resolveLocation(locations: MapLocation[], id: string | number | undefined, address: string | undefined) {
  if (id != null && String(id).trim() !== "") {
    const byId = locations.find((location) => String(location.id) === String(id));
    if (byId) return byId;
  }
  const normalizedAddress = address?.trim().toLowerCase();
  if (!normalizedAddress) return undefined;

  const byAddress = locations.filter((location) => location.address?.trim().toLowerCase() === normalizedAddress);
  if (byAddress.length === 1) return byAddress[0];

  const byName = locations.filter((location) => location.name?.trim().toLowerCase() === normalizedAddress);
  if (byName.length === 1) return byName[0];

  const byNameSub = locations.filter(
    (location) =>
      location.name?.trim().toLowerCase().includes(normalizedAddress) ||
      normalizedAddress.includes(location.name?.trim().toLowerCase()),
  );
  if (byNameSub.length === 1) return byNameSub[0];

  if (byAddress.length > 0) return byAddress[0];
  if (byName.length > 0) return byName[0];
  if (byNameSub.length > 0) return byNameSub[0];

  return undefined;
}

export function adaptTransportPlan(plan: TransportPlanApiValue, locations: MapLocation[]) {
  const booking = plan.booking ?? {};
  const originId = plan.originLocationId ?? booking.originLocationId;
  const destinationId = plan.destinationLocationId ?? booking.destinationLocationId;
  const from = resolveLocation(locations, originId, booking.originAddress);
  const to = resolveLocation(locations, destinationId, booking.destinationAddress);
  if (!from || !to) throw new Error("The Transport Plan origin/destination could not be matched to valid map locations.");
  return { planCode: plan.planCode ?? "—", bookingCode: plan.bookingCode ?? booking.bookingCode ?? "—", status: "DRAFT" as const, scope: (plan.isCrossBorder ?? booking.isInternational) ? "International" as const : "Domestic" as const, departureAt: plan.plannedStartAt ?? "", arrivalAt: plan.plannedEndAt ?? "", from, to };
}
