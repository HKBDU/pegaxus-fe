import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  RoutePlanBuilder,
  type RoutePlanBuilderMetadata,
} from "../components/RoutePlanBuilder";
import { getRoutePlan, getRoutePlans } from "../services";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routePlanId) {
      setError("Route Plan id is missing.");
      setLoading(false);
      return;
    }
    let active = true;
    void getRoutePlan(routePlanId)
      .then(async (routePlan) => {
        if (!active) return;
        setPlan(routePlan);
        if (routePlan.status !== "DRAFT") {
          setError(
            `Only DRAFT route plans can be edited. Current status: ${routePlan.status}.`,
          );
          return;
        }
        if (routePlan.routeType !== "BACKUP") return;
        const routePlans = await getRoutePlans(routePlan.transportPlanId, {
          routeType: "PRIMARY",
          pageIndex: 1,
          pageSize: 20,
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
    />
  );
}
