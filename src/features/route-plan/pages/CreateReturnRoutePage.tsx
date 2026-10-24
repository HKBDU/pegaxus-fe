import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RoutePlanBuilder, type RoutePlanBuilderMetadata } from "../components/RoutePlanBuilder";
import { getRoutePlan, getRoutePlans, getTransportPlan } from "../services";
import { adaptTransportPlan, loadAllLocations, loadAllRoutes, toMapLocation, toMapRoute, type TransportPlanApiValue } from "../api-adapters";
import type { MapLocation, MapRoute } from "@/shared/components/map";
import type { RoutePlan, RouteSegment } from "../types";
import { ongoingTransportService } from "@/features/ongoing-transport/services";

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
      .then(async ([plan, locationResult, routeResult, routePlanResult]) => {
        let locations = locationResult.flatMap((item) => {
          const location = toMapLocation(item);
          return location ? [location] : [];
        });
        const metadata = adaptTransportPlan(plan as TransportPlanApiValue, locations);
        let currentLocation: MapLocation | undefined;
        const transportId = (plan as TransportPlanApiValue).transportId ??
          (plan as TransportPlanApiValue).transport?.transportId;
        if (transportId != null) {
          try {
            const tracking = await ongoingTransportService.tracking(String(transportId));
            if (tracking.truck) {
              currentLocation = {
                id: `dynamic-current-${transportId}`,
                name: "Current vehicle location",
                type: "OTHER",
                city: "",
                country: "",
                latitude: tracking.truck.latitude,
                longitude: tracking.truck.longitude,
              };
              locations = [currentLocation, ...locations];
            }
          } catch (trackingErr) {
            console.warn("Could not load current tracking coordinate for return route:", trackingErr);
          }
        }

        const fullRoutePlans: RoutePlan[] = await Promise.all(
          (routePlanResult?.items ?? []).map(async (rp) => {
            if (rp.segments && rp.segments.length > 0) return rp as RoutePlan;
            try {
              return (await getRoutePlan(rp.routePlanId)) as RoutePlan;
            } catch {
              return rp as RoutePlan;
            }
          }),
        );

        const routePlanRoutes = fullRoutePlans.flatMap((routePlan: RoutePlan) =>
          (routePlan.segments ?? []).flatMap((segment: RouteSegment) => {
            const segmentFrom = toMapLocation(segment?.fromLocation);
            const segmentTo = toMapLocation(segment?.toLocation);
            if (!segmentFrom || !segmentTo) return [];
            return [{
              id: `${routePlan.routePlanId}-${segment.routePlanRouteId}`,
              routePlanRouteId: segment.routePlanRouteId,
              routePlanType: routePlan.routeType,
              name: `${segment.route?.routeName ?? "Route"} (${routePlan.routeType})`,
              transportMode: segment.route?.transportMode ?? "ROAD",
              fromLocation: segmentFrom,
              toLocation: segmentTo,
              distanceKm: segment.route?.distanceKm ?? 0,
              durationMinutes: segment.route?.estimatedDurationMinutes ?? 0,
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
            ...(currentLocation
              ? {
                  from: currentLocation,
                  isFromResolved: true,
                  unresolvedOriginAddress: undefined,
                }
              : {}),
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
