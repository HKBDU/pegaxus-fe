import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RoutePlanBuilder, type RoutePlanBuilderMetadata } from "../components/RoutePlanBuilder";
import { getLocations, getRoutes, getTransportPlan } from "../services";
import type { Location, RouteMaster } from "../types";
import type { MapLocation, MapRoute } from "@/shared/components/map";

const toLocation = (item: Location): MapLocation | null => item.latitude == null || item.longitude == null ? null : ({ id: item.locationId, name: item.locationName, type: item.locationType ?? undefined, city: item.city, country: item.country, latitude: item.latitude, longitude: item.longitude });
const toRoute = (item: RouteMaster, locations: MapLocation[]): MapRoute | null => {
  const fromLocation = locations.find((x) => x.id === item.fromLocation.locationId);
  const toLocationValue = locations.find((x) => x.id === item.toLocation.locationId);
  return fromLocation && toLocationValue ? { id: item.routeId, name: item.routeName, transportMode: item.transportMode, fromLocation, toLocation: toLocationValue, distanceKm: item.distanceKm, durationMinutes: item.estimatedDurationMinutes } : null;
};

export default function CreateRoutePlanPage() {
  const { transportPlanId } = useParams<{ transportPlanId: string }>();
  const [data, setData] = useState<{ metadata: RoutePlanBuilderMetadata; locations: MapLocation[]; routes: MapRoute[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!transportPlanId) { setError("Transport Plan id is missing."); return; }
    void Promise.all([getTransportPlan(transportPlanId), getLocations({ pageIndex: 1, pageSize: 200 }), getRoutes({ pageIndex: 1, pageSize: 200 })]).then(([plan, locationResult, routeResult]) => {
      const locations = locationResult.items.flatMap((x) => { const value = toLocation(x); return value ? [value] : []; });
      const raw = plan as Record<string, any>;
      const from = toLocation(raw.fromLocation ?? raw.origin);
      const to = toLocation(raw.toLocation ?? raw.destination);
      if (!from || !to) throw new Error("Transport Plan does not contain valid origin and destination coordinates.");
      setData({ locations, routes: routeResult.items.flatMap((x) => { const value = toRoute(x, locations); return value ? [value] : []; }), metadata: { planCode: raw.planCode, bookingCode: raw.bookingCode, status: "DRAFT", scope: raw.isCrossBorder ? "International" : "Domestic", departureAt: raw.plannedDepartureAt, arrivalAt: raw.plannedArrivalAt, from, to } });
    }).catch((e) => setError(e instanceof Error ? e.message : "Unable to load Transport Plan."));
  }, [transportPlanId]);
  if (error) return <main className="grid min-h-screen place-items-center p-6 text-destructive">{error}</main>;
  if (!data || !transportPlanId) return <main className="grid min-h-screen place-items-center">Loading Transport Plan…</main>;
  return <RoutePlanBuilder transportPlanId={transportPlanId} metadata={data.metadata} locations={data.locations} routes={data.routes} />;
}
