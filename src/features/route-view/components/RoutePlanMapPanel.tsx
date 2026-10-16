import type { ComponentType } from "react"
import type { RouteMapViewerProps, RoutePlanDetail } from "../types"
import { EmptyState } from "@/shared/components/common"
import { Section } from "@/features/transport-plan/components/ApprovedBookingDetails"
import { RoutePlanMap } from "./RoutePlanMap"

export function RoutePlanMapPanel({ plan, mapViewer }: { plan: RoutePlanDetail; mapViewer?: ComponentType<RouteMapViewerProps> }) {
  return <Section title="Map View">
    <RoutePlanMap plan={plan} mapViewer={mapViewer} />
    <div><h3 className="mb-2 font-heading text-sm uppercase">Route locations</h3>
      {!plan.segments.length ? <EmptyState message="No route locations are available." /> : <ol className="flex flex-wrap gap-2 text-xs">
        {[...plan.segments].sort((a, b) => a.sequenceNo - b.sequenceNo).map((segment) => <li key={segment.routePlanRouteId} className="min-w-0 break-words rounded border bg-slate-50 px-3 py-2">
          <span className="mr-2 font-semibold text-primary">{segment.sequenceNo}</span>{segment.fromLocation.locationName} → {segment.toLocation.locationName}
        </li>)}
      </ol>}
    </div>
  </Section>
}
