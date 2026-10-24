import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RoutePlanBuilder, type RoutePlanBuilderMetadata } from "../components/RoutePlanBuilder";
import { createLocation, getRoutePlan, getRoutePlans, getTransportPlan } from "../services";
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
      .then(async ([rawPlan, locationResult, routeResult, routePlanResult]) => {
        const plan = rawPlan as TransportPlanApiValue;
        const routePlans = routePlanResult?.items ?? [];
        const primary = routePlans.find(
          (routePlan) =>
            routePlan.routeType === "PRIMARY" && routePlan.status === "ACTIVE",
        );
        const hasOpenReturn = routePlans.some(
          (routePlan) =>
            routePlan.routeType === "RETURN" && routePlan.status !== "CANCELLED",
        );
        const mainDossier =
          plan.complianceDossiers?.find((dossier) => dossier.dossierType === "MAIN") ??
          plan.complianceDossier;
        if (String(plan.status).toUpperCase() !== "APPROVED") {
          throw new Error("Return route requires an approved Transport Plan.");
        }
        if (String(plan.transport?.status).toUpperCase() !== "IN_TRANSIT") {
          throw new Error("Return route is only available while the transport is in transit.");
        }
        if (mainDossier?.status !== "APPROVED") {
          throw new Error("Return route requires an approved MAIN compliance dossier.");
        }
        if (!primary) {
          throw new Error("Return route requires an ACTIVE PRIMARY route.");
        }
        if (hasOpenReturn) {
          throw new Error("A non-cancelled RETURN route already exists for this transport.");
        }
        let locations = locationResult.flatMap((item) => {
          const location = toMapLocation(item);
          return location ? [location] : [];
        });
        const metadata = adaptTransportPlan(plan, locations);
        let currentLocation: MapLocation | undefined;
        const transportId = plan.transportId ?? plan.transport?.transportId;
        if (transportId == null) {
          throw new Error("Transport identity is missing; unable to resolve the current GPS location.");
        }
        try {
          const tracking = await ongoingTransportService.tracking(String(transportId));
          if (!tracking.truck) throw new Error("GPS position is unavailable for this transport.");
          const createdLocation = await createLocation({
            locationName: `RETURN GPS origin ${new Date().toISOString()}`,
            locationType: "OTHER",
            locationNote: `Created from live GPS coordinates for RETURN route of transport ${transportId}.`,
            latitude: tracking.truck.latitude,
            longitude: tracking.truck.longitude,
          });
          if (createdLocation?.locationId == null) {
            throw new Error("The GPS location was created without a locationId.");
          }
          currentLocation = toMapLocation(createdLocation) ?? undefined;
          if (!currentLocation) throw new Error("The GPS location could not be created.");
          locations = [currentLocation, ...locations];
        } catch (trackingErr) {
          throw new Error(
            trackingErr instanceof Error
              ? trackingErr.message
              : "Unable to create the current GPS location for the return route.",
          );
        }

        const fullRoutePlans: RoutePlan[] = await Promise.all(
          routePlans.map(async (rp) => {
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
