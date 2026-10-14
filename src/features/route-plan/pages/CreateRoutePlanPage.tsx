import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RoutePlanBuilder, type RoutePlanBuilderMetadata } from "../components/RoutePlanBuilder";
import { getTransportPlan } from "../services";
import { adaptTransportPlan, loadAllLocations, loadAllRoutes, toMapLocation, toMapRoute, type TransportPlanApiValue } from "../api-adapters";
import type { MapLocation, MapRoute } from "@/shared/components/map";

export default function CreateRoutePlanPage() {
  const { transportPlanId } = useParams<{ transportPlanId: string }>();
  const [data, setData] = useState<{ metadata: RoutePlanBuilderMetadata; locations: MapLocation[]; routes: MapRoute[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!transportPlanId) { setError("Transport Plan id is missing."); return; }
    void Promise.all([getTransportPlan(transportPlanId), loadAllLocations(), loadAllRoutes()]).then(([plan, locationResult, routeResult]) => {
      const locations = locationResult.flatMap((item) => { const value = toMapLocation(item); return value ? [value] : []; });
      const metadata = adaptTransportPlan(plan as TransportPlanApiValue, locations);
      setData({ locations, routes: routeResult.flatMap((item) => { const value = toMapRoute(item, locations); return value ? [value] : []; }), metadata });
    }).catch((e) => setError(e instanceof Error ? e.message : "Unable to load Transport Plan."));
  }, [transportPlanId]);
  if (error) return <main className="grid min-h-screen place-items-center p-6 text-destructive">{error}</main>;
  if (!data || !transportPlanId) return <main className="grid min-h-screen place-items-center">Loading Transport Plan…</main>;
  return <RoutePlanBuilder transportPlanId={transportPlanId} metadata={data.metadata} locations={data.locations} routes={data.routes} />;
}
