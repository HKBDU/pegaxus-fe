import type { ComponentType } from "react"
import { MapPin } from "lucide-react"
import { toRouteMapLocations } from "../adapters/route-plan-map.adapter"
import type { RouteMapViewerProps, RoutePlanDetail } from "../types"
import { EmptyState } from "@/shared/components/common"
import { Section } from "@/features/transport-plan/components/ApprovedBookingDetails"

export function RoutePlanMapPanel({ plan, mapViewer: MapViewer }: { plan: RoutePlanDetail; mapViewer?: ComponentType<RouteMapViewerProps> }) {
  const locations = toRouteMapLocations(plan)
  return <Section title="Map View">
    {MapViewer && locations.length ? <div className="min-h-96 overflow-hidden rounded-md"><MapViewer locations={locations} canEditLocation={false} canDeleteLocation={false} showSearch={false} /></div> :
      <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-slate-50 p-6 text-center sm:min-h-96">
        <MapPin aria-hidden="true" className="size-8 text-slate-400" />
        <h3 className="text-sm font-semibold">{MapViewer ? "No valid map coordinates available" : "Shared MapViewer integration pending"}</h3>
        <p className="max-w-md text-xs text-slate-500">Route locations and segments remain accessible through the Segment List tab.</p>
      </div>}
    <p className="text-xs text-slate-500">Road geometry is not available in the route response. No road lines are generated. Locations without valid coordinates are excluded from the map only.</p>
    <div><h3 className="mb-2 font-heading text-sm uppercase">Route locations</h3>
      {!plan.segments.length ? <EmptyState message="No route locations are available." /> : <ol className="flex flex-wrap gap-2 text-xs">
        {[...plan.segments].sort((a, b) => a.sequenceNo - b.sequenceNo).map((segment) => <li key={segment.routePlanRouteId} className="rounded border bg-slate-50 px-3 py-2">
          <span className="mr-2 font-semibold text-primary">{segment.sequenceNo}</span>{segment.fromLocation.locationName} → {segment.toLocation.locationName}
        </li>)}
      </ol>}
    </div>
  </Section>
}
