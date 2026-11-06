import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RoutePlanBuilder, type RoutePlanBuilderMetadata } from "../components/RoutePlanBuilder";
import { getRoutePlan, getRoutePlans, getTransportPlan } from "../services";
import { adaptTransportPlan, loadAllLocations, loadAllRoutes, toMapLocation, toMapRoute, type TransportPlanApiValue } from "../api-adapters";
import { hydrateBuilderSegments } from "../builder-segments";
import type { DraftSegment } from "../components/RoutePlanBuilderParts";
import type { MapLocation, MapRoute } from "@/shared/components/map";

export default function CreateContingencyRoutePage() {
  const { transportPlanId } = useParams<{ transportPlanId: string }>();
  const [primarySegments, setPrimarySegments] = useState<DraftSegment[]>([]);
  const primaryRoutes = primarySegments.map((segment) => ({ ...segment.route, readonly: true }));
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const [metadata, setMetadata] = useState<RoutePlanBuilderMetadata>();
  const [loading, setLoading] = useState(Boolean(transportPlanId));
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!transportPlanId) {
      setLoading(false);
      setError(
        "Transport Plan id is missing. Please create a PRIMARY route plan first.",
      );
      return;
    }

    let active = true;
    void Promise.all([
      getTransportPlan(transportPlanId),
      getRoutePlans(transportPlanId, { routeType: "PRIMARY" }),
      loadAllLocations(),
      loadAllRoutes(),
    ])
      .then(async ([transportPlan, result, locationItems, routeItems]) => {
        if (!active) return;
        const mapLocations = locationItems.flatMap((item) => {
          const value = toMapLocation(item);
          return value ? [value] : [];
        });
        setLocations(mapLocations);
        setRoutes(routeItems.flatMap((item) => {
          const value = toMapRoute(item, mapLocations);
          return value ? [value] : [];
        }));
        setMetadata(adaptTransportPlan(transportPlan as TransportPlanApiValue, mapLocations));
        const primarySummary = (result?.items ?? []).find(
          (plan) =>
            plan.routeType === "PRIMARY" &&
            plan.status !== "CANCELLED",
        );
        if (!primarySummary || primarySummary.status !== "DRAFT") {
          setPrimarySegments([]);
          setError(
            "BACKUP must be created during the PRIMARY draft phase. It cannot be created after PRIMARY is approved.",
          );
          return;
        }
        const primary = await getRoutePlan(primarySummary.routePlanId);
        if (!active) return;
        if (primary.status !== "DRAFT") throw new Error("PRIMARY is no longer DRAFT. Reload before creating BACKUP.");
        const hydrated = hydrateBuilderSegments(primary.segments);
        setPrimarySegments(hydrated);
        const routes = hydrated.map((segment) => segment.route);
        if (!routes.length)
          setError(
            "No valid PRIMARY route plan found. Please create a PRIMARY route plan first.",
          );
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError instanceof Error ? requestError.message : "Unable to load PRIMARY route plan. Try again before creating BACKUP.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [transportPlanId]);

  if (loading)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-sm">
        Loading PRIMARY route plan…
      </main>
    );

  if (error && !primaryRoutes.length)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center text-sm text-destructive">
        {error}
      </main>
    );

  return (
    <RoutePlanBuilder
      routeType="BACKUP"
      transportPlanId={transportPlanId ?? ""}
      primaryRoutes={primaryRoutes}
      primarySegments={primarySegments}
      primaryAvailable={primaryRoutes.length > 0}
      primaryError={error}
      metadata={metadata}
      locations={locations.length ? locations : primaryRoutes.flatMap((route) => [route.fromLocation, route.toLocation]).filter((value): value is NonNullable<typeof value> => Boolean(value))}
      routes={routes.length ? routes : primaryRoutes}
    />
  );
}
