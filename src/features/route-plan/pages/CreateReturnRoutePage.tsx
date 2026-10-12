import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RoutePlanBuilder, type RoutePlanBuilderMetadata } from "../components/RoutePlanBuilder";
import { getLocations, getRoutePlans, getRoutes, getTransportPlan } from "../services";
import type { MapLocation, MapRoute } from "@/shared/components/map";
import type { Location, RouteMaster } from "../types";

const toMapLocation = (item: Location | { locationId: string; locationName: string; locationType?: string | null; city: string; country: string; latitude: number | null; longitude: number | null }): MapLocation | null =>
  item.latitude == null || item.longitude == null
    ? null
    : { id: item.locationId, name: item.locationName, type: item.locationType ?? undefined, city: item.city, country: item.country, latitude: item.latitude, longitude: item.longitude };

const toRoute = (item: RouteMaster, locations: MapLocation[]): MapRoute | null => {
  const fromLocation = locations.find((location) => location.id === item.fromLocation.locationId);
  const toLocation = locations.find((location) => location.id === item.toLocation.locationId);
  return fromLocation && toLocation
    ? { id: item.routeId, name: item.routeName, transportMode: item.transportMode, fromLocation, toLocation, distanceKm: item.distanceKm, durationMinutes: item.estimatedDurationMinutes }
    : null;
};

export default function CreateReturnRoutePage() {
  const { transportPlanId } = useParams<{ transportPlanId: string }>();
  const [data, setData] = useState<{ metadata: RoutePlanBuilderMetadata; locations: MapLocation[]; routes: MapRoute[]; routePlanRoutes: MapRoute[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transportPlanId) {
      setError("Transport Plan id is missing.");
      return;
    }

    void Promise.all([
      getTransportPlan(transportPlanId),
      getLocations({ pageIndex: 1, pageSize: 200 }),
      getRoutes({ pageIndex: 1, pageSize: 200 }),
      getRoutePlans(transportPlanId),
    ])
      .then(([plan, locationResult, routeResult, routePlanResult]) => {
        const locations = locationResult.items.flatMap((item) => {
          const location = toMapLocation(item);
          return location ? [location] : [];
        });
        const raw = plan as Record<string, any>;
        const from = toMapLocation(raw.fromLocation ?? raw.origin);
        const to = toMapLocation(raw.toLocation ?? raw.destination);
        if (!from || !to) throw new Error("Transport Plan does not contain valid origin and destination coordinates.");

        const routePlanRoutes = routePlanResult.items.flatMap((routePlan) =>
          routePlan.segments.flatMap((segment) => {
            const segmentFrom = toMapLocation(segment.fromLocation);
            const segmentTo = toMapLocation(segment.toLocation);
            if (!segmentFrom || !segmentTo) return [];
            return [{
              id: `${routePlan.routePlanId}-${segment.routePlanRouteId}`,
              routePlanRouteId: segment.routePlanRouteId,
              routePlanType: routePlan.routeType,
              name: `${segment.route.routeName} (${routePlan.routeType})`,
              transportMode: segment.route.transportMode,
              fromLocation: segmentFrom,
              toLocation: segmentTo,
              distanceKm: segment.route.distanceKm,
              durationMinutes: segment.route.estimatedDurationMinutes,
            }];
          }),
        );

        setData({
          locations,
          routes: routeResult.items.flatMap((item) => {
            const route = toRoute(item, locations);
            return route ? [route] : [];
          }),
          routePlanRoutes,
          metadata: {
            planCode: raw.planCode,
            bookingCode: raw.bookingCode,
            status: "DRAFT",
            scope: raw.isCrossBorder ? "International" : "Domestic",
            departureAt: raw.plannedDepartureAt,
            arrivalAt: raw.plannedArrivalAt,
            from,
            to,
          },
        });
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load Transport Plan."));
  }, [transportPlanId]);

  if (error) return <main className="grid min-h-screen place-items-center p-6 text-destructive">{error}</main>;
  if (!data || !transportPlanId) return <main className="grid min-h-screen place-items-center">Loading Transport Plan…</main>;

  return (
    <RoutePlanBuilder
      routeType="RETURN"
      transportPlanId={transportPlanId}
      metadata={data.metadata}
      locations={data.locations}
      routes={data.routes}
      routePlanRoutes={data.routePlanRoutes}
    />
  );
}
