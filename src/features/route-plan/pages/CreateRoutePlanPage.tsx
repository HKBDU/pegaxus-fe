import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import apiClient from "@/lib/axios";
import { RoutePlanBuilder, type RoutePlanBuilderMetadata } from "../components/RoutePlanBuilder";
import { getTransportPlan } from "../services";
import { adaptTransportPlan, loadAllLocations, loadAllRoutes, toMapLocation, toMapRoute, type TransportPlanApiValue } from "../api-adapters";
import type { MapLocation, MapRoute } from "@/shared/components/map";

type TemplateLocation = Parameters<typeof toMapLocation>[0];
type ReturnTemplate = {
  sourceTransportCode: string;
  segments: { sequenceNo: number; fromLocation: TemplateLocation; toLocation: TemplateLocation; transportMode: MapRoute["transportMode"]; distanceKm: number | null; estimatedDurationMinutes: number | null }[];
};

/** A return booking (horse left behind mid-trip) can start from the original trip's legs, reversed. Any other plan has no template. */
async function loadReturnTemplate(transportPlanId: string): Promise<ReturnTemplate | null> {
  try {
    const payload = (await apiClient.get(`/transport-plans/${encodeURIComponent(transportPlanId)}/return-route-template`)) as { value?: ReturnTemplate } | ReturnTemplate;
    const value = (payload && "value" in payload ? payload.value : payload) as ReturnTemplate | undefined;
    return value?.segments?.length ? value : null;
  } catch {
    return null;
  }
}

function toTemplateRoutes(template: ReturnTemplate, locations: MapLocation[], routes: MapRoute[]): MapRoute[] {
  return template.segments.flatMap((segment, index) => {
    const pick = (item: TemplateLocation) => locations.find((location) => location.id === String(item?.locationId)) ?? toMapLocation(item);
    const fromLocation = pick(segment.fromLocation);
    const toLocation = pick(segment.toLocation);
    if (!fromLocation || !toLocation) return [];
    // Reuse a catalog route when the reversed leg already exists; otherwise the BE creates it from the two locations on save.
    const catalog = routes.find((route) => route.fromLocation?.id === fromLocation.id && route.toLocation?.id === toLocation.id && route.transportMode === segment.transportMode);
    return [catalog ?? {
      id: `dynamic-return-${index}`,
      name: `${fromLocation.name} → ${toLocation.name}`,
      transportMode: segment.transportMode ?? "ROAD",
      fromLocation,
      toLocation,
      distanceKm: segment.distanceKm ?? 0,
      durationMinutes: segment.estimatedDurationMinutes ?? 0,
    }];
  });
}

export default function CreateRoutePlanPage() {
  const { transportPlanId } = useParams<{ transportPlanId: string }>();
  const [data, setData] = useState<{ metadata: RoutePlanBuilderMetadata; locations: MapLocation[]; routes: MapRoute[]; template: ReturnTemplate | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState(true);
  useEffect(() => {
    if (!transportPlanId) { setError("Transport Plan id is missing."); return; }
    void Promise.all([getTransportPlan(transportPlanId), loadAllLocations(), loadAllRoutes(), loadReturnTemplate(transportPlanId)]).then(([rawPlan, locationResult, routeResult, template]) => {
      const plan = rawPlan as TransportPlanApiValue;
      if (String(plan.status).toUpperCase() !== "APPROVED") {
        setError(
          "This Transport Plan is not approved yet. The customer deposit must be paid before creating a primary route.",
        );
        return;
      }
      const locations = locationResult.flatMap((item) => { const value = toMapLocation(item); return value ? [value] : []; });
      const metadata = adaptTransportPlan(plan, locations);
      setData({ locations, routes: routeResult.flatMap((item) => { const value = toMapRoute(item, locations); return value ? [value] : []; }), metadata, template });
    }).catch((e) => setError(e instanceof Error ? e.message : "Unable to load Transport Plan."));
  }, [transportPlanId]);
  if (error) return <main className="grid min-h-screen place-items-center p-6 text-destructive">{error}</main>;
  if (!data || !transportPlanId) return <main className="grid min-h-screen place-items-center">Loading Transport Plan…</main>;
  const templateRoutes = data.template && useTemplate ? toTemplateRoutes(data.template, data.locations, data.routes) : [];
  return (
    <>
      {data.template ? (
        <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-6 lg:mx-10">
          <p className="m-0">
            <span className="font-semibold">Return booking.</span>{" "}
            {useTemplate
              ? `The legs of transport ${data.template.sourceTransportCode} are filled in, reversed. Change times, vehicles or legs as needed.`
              : `You can start from the legs of transport ${data.template.sourceTransportCode}, reversed.`}
          </p>
          <button type="button" onClick={() => setUseTemplate((value) => !value)}
            className="inline-flex h-8 items-center rounded-[2px] border border-amber-400 bg-white px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100">
            {useTemplate ? "Start from a blank route" : "Use the original trip's route"}
          </button>
        </div>
      ) : null}
      <RoutePlanBuilder key={useTemplate ? "template" : "blank"} transportPlanId={transportPlanId} metadata={data.metadata} locations={data.locations}
        routes={data.routes} initialRoutes={templateRoutes} />
    </>
  );
}
