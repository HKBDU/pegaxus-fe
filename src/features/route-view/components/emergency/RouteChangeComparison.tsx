import { GitCompareArrows, MapPin, Route, ShieldCheck } from "lucide-react"
import { Section } from "@/features/transport-plan/components/ApprovedBookingDetails"
import { EmptyState, ErrorState } from "@/shared/components/common"
import { Skeleton } from "@/shared/components/ui/skeleton"
import type { RoutePlanDetail } from "../../types"
import { getSegmentImpact, orderedSegments } from "../../route-comparison"
import { replacementLabel } from "../../display"
import { toRouteMapLocations } from "../../adapters/route-plan-map.adapter"
import { RouteSegmentList } from "../RouteSegmentList"
import { RouteLegalReview } from "../RouteLegalReview"
import { EmergencyChangeSummary } from "./EmergencyChangeSummary"

export function RouteChangeComparison({ primary, proposed, loading, error }: { primary?: RoutePlanDetail; proposed: RoutePlanDetail; loading: boolean; error?: string }) {
  const isBackup = proposed.routeType === "BACKUP"
  const destination = orderedSegments(proposed).at(-1)?.toLocation.locationName
  const currentLocations = primary ? toRouteMapLocations(primary).length : 0
  const proposedLocations = toRouteMapLocations(proposed).length
  return <div className="min-w-0 space-y-5">
    <section aria-label="Route comparison map"><Section title="Route Comparison Map" icon={MapPin}>
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center sm:min-h-80 lg:min-h-96">
        <MapPin aria-hidden="true" className="size-9 text-slate-400" />
        <h3 className="text-base font-semibold text-slate-800">Map data unavailable</h3>
        <p className="max-w-lg text-sm leading-6 text-slate-500">The shared route comparison map is not connected and route geometry is not supplied. Review the actual locations and segment sequence below.</p>
        <p className="text-xs text-slate-500">{primary ? `${currentLocations} PRIMARY locations with coordinates` : "PRIMARY locations awaiting data"} · {proposedLocations} proposed locations with coordinates</p>
      </div>
      <ul aria-label="Route comparison legend" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
        <li className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-sm bg-slate-700" />PRIMARY</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-sm bg-primary" />Proposed {proposed.routeType}</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-sm border-2 border-primary" />{isBackup ? "Affected PRIMARY segments" : "Remaining PRIMARY legs"}</li>
      </ul>
    </Section></section>
    <div className="grid min-w-0 gap-5 lg:grid-cols-2">
      {error ? <ErrorState message={error} /> : loading ? <div role="status" aria-label="Loading route comparison" className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div> : primary ? <EmergencyChangeSummary plan={primary} title="Current Primary Route" /> : <Section title="Current Primary Route"><EmptyState message="No current primary route is available." /></Section>}
      <EmergencyChangeSummary plan={proposed} title={`Proposed ${proposed.routeType === "BACKUP" ? "Backup" : "Return"} Route`} proposed />
    </div>
    <Section title="Change Scope" icon={Route}>
      {isBackup ? <><p className="text-sm font-medium text-slate-800">{replacementLabel(proposed)}</p><p className="text-xs leading-5 text-slate-500">Orange highlights mark only the supplied PRIMARY replacement range. Backup distance and duration cover the replacement only. Activating it does not cancel the PRIMARY route.</p></> : <><p className="text-sm font-medium text-slate-800">Return destination · {destination ?? "Not available"}</p><p className="text-xs leading-5 text-slate-500">Completed PRIMARY legs are retained. Pending legs leave the effective journey only after RETURN activation. An in-progress leg does not reveal the current position or how much of it has been traveled.</p></>}
    </Section>
    <Section title="Segment Comparison" icon={GitCompareArrows} description="Actual segment order, mode, status and planned timing. Expand a leg to inspect resources and actual timestamps.">
      <div className="grid min-w-0 gap-8 lg:grid-cols-2">
        <div className="min-w-0">{primary ? <RouteSegmentList segments={primary.segments} review={{ title: "Current PRIMARY", impact: segment => getSegmentImpact(segment, proposed, "primary") }} /> : <p className="text-sm text-slate-500">{loading ? "Loading PRIMARY segments…" : error ? "PRIMARY segments cannot be reviewed until the load error is resolved." : "No PRIMARY segments are available for comparison."}</p>}</div>
        <RouteSegmentList segments={proposed.segments} review={{ title: `Proposed ${proposed.routeType}`, impact: segment => getSegmentImpact(segment, proposed, "proposed") }} />
      </div>
    </Section>
    <Section title="Legal Review Comparison" icon={ShieldCheck}><div className="grid min-w-0 gap-5 lg:grid-cols-2">
      <div className="min-w-0 space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current PRIMARY</p>{primary ? <RouteLegalReview review={primary.legalReview} /> : <p className="text-xs text-slate-500">Legal review data unavailable.</p>}</div>
      <div className="min-w-0 space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Proposed {proposed.routeType}</p><RouteLegalReview review={proposed.legalReview} /></div>
    </div></Section>
  </div>
}
