import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RoutePlanBuilder, type RoutePlanBuilderMetadata } from "../components/RoutePlanBuilder";
import { Button } from "@/shared/components/ui/button";
import { getRoutePlan, getRoutePlans, getTransportPlan } from "../services";
import { adaptTransportPlan, loadAllLocations, loadAllRoutes, toMapLocation, toMapRoute, type TransportPlanApiValue } from "../api-adapters";
import type { MapLocation, MapRoute } from "@/shared/components/map";
import type { RoutePlan, RouteSegment } from "../types";
import { incidentService } from "@/features/incident-management/services";
import type { ReturnStartOption } from "../components/RoutePlanEndpointsStep";

export default function CreateReturnRoutePage() {
  const { transportPlanId } = useParams<{ transportPlanId: string }>();
  const [retryKey, setRetryKey] = useState(0);
  const [data, setData] = useState<{ metadata: RoutePlanBuilderMetadata; locations: MapLocation[]; routes: MapRoute[]; routePlanRoutes: MapRoute[]; startOptions: ReturnStartOption[] } | null>(null);
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
        const transportId = plan.transportId ?? plan.transport?.transportId;
        if (transportId == null) {
          throw new Error("Transport identity is missing; unable to find where the return can start.");
        }

        const fullRoutePlans: RoutePlan[] = await Promise.all(
          routePlans.map(async (rp) => {
            if (rp.segments && rp.segments.length > 0) return rp as RoutePlan;
            try {
              return (await getRoutePlan(rp.routePlanId)) as RoutePlan;
            } catch (error) {
              throw new Error(
                error instanceof Error
                  ? `Unable to load route plan detail: ${error.message}`
                  : "Unable to load route plan detail.",
              );
            }
          }),
        );

        // BE accepts a return from an open incident on the running segment, or from the end of that segment.
        const running = fullRoutePlans
          .filter((routePlan) => routePlan.status === "ACTIVE" && routePlan.routeType !== "RETURN")
          .flatMap((routePlan) => routePlan.segments ?? [])
          .find((segment) => segment.actualDepartureAt && !segment.actualArrivalAt);
        const incidents = await incidentService.list({
          status: "REPORTED,PENDING", category: "", severity: "", transportId: String(transportId),
          occurredFrom: "", occurredTo: "", search: "", pageIndex: 1, pageSize: 50, sortBy: "occurredAt:desc",
        });
        const startOptions: ReturnStartOption[] = [
          ...incidents.items.flatMap((incident) => {
            const location = toMapLocation(incident.location);
            return location ? [{ kind: "INCIDENT_LOCATION" as const, label: `At incident ${incident.incidentCode}: ${location.name}`, location }] : [];
          }),
          ...(running && toMapLocation(running.toLocation)
            ? [{ kind: "NEXT_STOP" as const, label: `End of the running segment: ${running.toLocation.locationName}`, location: toMapLocation(running.toLocation)! }]
            : []),
        ];
        if (startOptions.length === 0) {
          throw new Error("A return starts at an open incident on the running segment or at the end of that segment, and neither was found.");
        }
        for (const option of startOptions)
          if (!locations.some((location) => location.id === option.location.id)) locations = [option.location, ...locations];
        const currentLocation = startOptions[0].location;

        const routePlanRoutes = fullRoutePlans.flatMap((routePlan: RoutePlan) =>
          (routePlan.segments ?? []).flatMap((segment: RouteSegment) => {
            const segmentFrom = toMapLocation(segment?.fromLocation);
            const segmentTo = toMapLocation(segment?.toLocation);
            if (!segmentFrom || !segmentTo) return [];
            return [{
              id: `${routePlan.routePlanId}-${segment.routePlanRouteId}`,
              catalogRouteId: segment.route.routeId,
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
          startOptions,
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
  }, [retryKey, transportPlanId]);

  if (error)
    return (
      <main className="grid min-h-screen place-items-center gap-4 p-6 text-center text-destructive">
        <p>{error}</p>
        <Button type="button" onClick={() => { setError(null); setRetryKey((key) => key + 1); }}>
          Retry
        </Button>
      </main>
    );
  if (!data || !transportPlanId) return <main className="grid min-h-screen place-items-center">Loading Transport Plan…</main>;

  return (
    <RoutePlanBuilder
      routeType="RETURN"
      transportPlanId={transportPlanId}
      metadata={data.metadata}
      locations={data.locations}
      routes={data.routes}
      routePlanRoutes={data.routePlanRoutes}
      returnStartOptions={data.startOptions}
    />
  );
}
