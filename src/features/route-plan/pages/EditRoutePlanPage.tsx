import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  RoutePlanBuilder,
  type RoutePlanBuilderMetadata,
} from "../components/RoutePlanBuilder";
import { getRoutePlan, getRoutePlans } from "../services";
import {
  loadAllLocations,
  loadAllRoutes,
  toMapLocation,
  toMapRoute,
} from "../api-adapters";
import type { RoutePlan, RouteSegment } from "../types";
import type { MapLocation, MapRoute } from "@/shared/components/map";

function locationFromSegment(
  location: RouteSegment["fromLocation"],
): MapLocation | null {
  if (location.latitude == null || location.longitude == null) return null;
  return {
    id: location.locationId,
    name: location.locationName,
    type: location.locationType ?? undefined,
    city: location.city,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

function routeFromSegment(
  segment: RouteSegment,
  readonly = false,
): MapRoute | null {
  const fromLocation = locationFromSegment(segment.fromLocation);
  const toLocation = locationFromSegment(segment.toLocation);
  if (!fromLocation || !toLocation) return null;
  return {
    id: segment.route.routeId,
    routePlanRouteId: segment.routePlanRouteId,
    name: segment.route.routeName,
    transportMode: segment.route.transportMode,
    isOutsourced: segment.isOutsourced,
    fromLocation,
    toLocation,
    distanceKm: segment.route.distanceKm,
    durationMinutes: segment.route.estimatedDurationMinutes,
    readonly,
  };
}

function metadataFromPlan(plan: RoutePlan): RoutePlanBuilderMetadata {
  const first = plan.segments[0];
  const last = plan.segments.at(-1);
  return {
    planCode: plan.routePlanCode,
    bookingCode: plan.bookingCode,
    routeType: plan.routeType === "RETURN" ? "PRIMARY" : plan.routeType,
    status: plan.status,
    scope: plan.isCrossBorder ? "International" : "Domestic",
    departureAt: plan.plannedDepartureAt,
    arrivalAt: plan.plannedArrivalAt,
    from: first
      ? (locationFromSegment(first.fromLocation) ?? undefined)
      : undefined,
    to: last ? (locationFromSegment(last.toLocation) ?? undefined) : undefined,
  };
}

export default function EditRoutePlanPage() {
  const { routePlanId } = useParams<{ routePlanId: string }>();
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [primaryRoutes, setPrimaryRoutes] = useState<MapRoute[]>([]);
  const [catalog, setCatalog] = useState<{
    locations: MapLocation[];
    routes: MapRoute[];
  }>({ locations: [], routes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routePlanId) {
      setError("Route Plan id is missing.");
      setLoading(false);
      return;
    }
    let active = true;
    void Promise.all([
      getRoutePlan(routePlanId),
      loadAllLocations(),
      loadAllRoutes(),
    ])
      .then(async ([routePlan, locationResult, routeResult]) => {
        if (!active) return;
        setPlan(routePlan);

        const loadedLocations = locationResult.flatMap((item) => {
          const value = toMapLocation(item);
          return value ? [value] : [];
        });
        const loadedRoutes = routeResult.flatMap((item) => {
          const value = toMapRoute(item, loadedLocations);
          return value ? [value] : [];
        });
        setCatalog({ locations: loadedLocations, routes: loadedRoutes });

        if (routePlan.status !== "DRAFT") {
          setError(
            `Only DRAFT route plans can be edited. Current status: ${routePlan.status}.`,
          );
          return;
        }
        if (routePlan.routeType !== "BACKUP") return;
        const routePlans = await getRoutePlans(routePlan.transportPlanId, {
          routeType: "PRIMARY",
        });
        const primary = routePlans.items.find(
          (item) => item.routeType === "PRIMARY" && item.status !== "CANCELLED",
        );
        setPrimaryRoutes(
          primary?.segments.flatMap((segment) => {
            const route = routeFromSegment(segment, true);
            return route ? [route] : [];
          }) ?? [],
        );
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load route plan.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [routePlanId]);

  if (loading)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-sm">
        Loading route plan…
      </main>
    );
  if (!plan || error)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center text-sm text-destructive">
        {error ?? "Route plan not found."}
      </main>
    );

  const initialRoutes = plan.segments.flatMap((segment) => {
    const route = routeFromSegment(segment);
    return route ? [route] : [];
  });

  const allLocationsMap = new Map<string, MapLocation>();
  for (const loc of catalog.locations) allLocationsMap.set(String(loc.id), loc);
  for (const route of [...initialRoutes, ...primaryRoutes]) {
    if (route.fromLocation) allLocationsMap.set(String(route.fromLocation.id), route.fromLocation);
    if (route.toLocation) allLocationsMap.set(String(route.toLocation.id), route.toLocation);
  }

  const allRoutesMap = new Map<string, MapRoute>();
  for (const r of catalog.routes) allRoutesMap.set(String(r.id), r);
  for (const r of [...initialRoutes, ...primaryRoutes]) allRoutesMap.set(String(r.id), r);

  return (
    <RoutePlanBuilder
      key={plan.routePlanId}
      transportPlanId={plan.transportPlanId}
      routeType={plan.routeType === "RETURN" ? "PRIMARY" : plan.routeType}
      metadata={metadataFromPlan(plan)}
      initialRoutes={initialRoutes}
      initialRouteNote={plan.routeNote ?? ""}
      primaryRoutes={primaryRoutes}
      primaryAvailable={plan.routeType !== "BACKUP" || primaryRoutes.length > 0}
      primaryError="No valid PRIMARY route plan found. Please create a PRIMARY route plan first."
      edit={{ routePlanId: plan.routePlanId, lastUpdatedAt: plan.updatedAt }}
      locations={Array.from(allLocationsMap.values())}
      routes={Array.from(allRoutesMap.values())}
    />
  );
}

