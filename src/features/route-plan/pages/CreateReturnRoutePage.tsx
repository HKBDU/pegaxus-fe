import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RoutePlanBuilder, type RoutePlanBuilderMetadata } from "../components/RoutePlanBuilder";
import { getRoutePlans, getTransportPlan } from "../services";
import { adaptTransportPlan, loadAllLocations, loadAllRoutes, toMapLocation, toMapRoute, type TransportPlanApiValue } from "../api-adapters";
import type { MapLocation, MapRoute } from "@/shared/components/map";

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
      loadAllLocations(),
      loadAllRoutes(),
      getRoutePlans(transportPlanId),
    ])
      .then(([plan, locationResult, routeResult, routePlanResult]) => {
        const locations = locationResult.flatMap((item) => {
          const location = toMapLocation(item);
          return location ? [location] : [];
        });
        const metadata = adaptTransportPlan(plan as TransportPlanApiValue, locations);

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
          routes: routeResult.flatMap((item) => {
            const route = toMapRoute(item, locations);
            return route ? [route] : [];
          }),
          routePlanRoutes,
          metadata: {
            ...metadata,
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
