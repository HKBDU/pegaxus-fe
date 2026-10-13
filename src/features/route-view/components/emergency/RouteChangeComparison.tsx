import { GitCompareArrows, MapPin, Route, ShieldCheck } from "lucide-react"
import { Section } from "@/features/transport-plan/components/ApprovedBookingDetails"
import { EmptyState, ErrorState } from "@/shared/components/common"
import { Skeleton } from "@/shared/components/ui/skeleton"
import type { RoutePlanDetail } from "../../types"
import { getSegmentImpact, orderedSegments } from "../../route-comparison"
import { replacementLabel } from "../../display"
import { RoutePlanMap } from "../RoutePlanMap"
import { RouteSegmentList } from "../RouteSegmentList"
import { RouteLegalReview } from "../RouteLegalReview"
import { EmergencyChangeSummary } from "./EmergencyChangeSummary"

export function RouteChangeComparison({ primary, proposed, loading, error }: { primary?: RoutePlanDetail; proposed: RoutePlanDetail; loading: boolean; error?: string }) {
  const isBackup = proposed.routeType === "BACKUP"
  const destination = orderedSegments(proposed).at(-1)?.toLocation.locationName
  return <div className="min-w-0 space-y-4">
    <section aria-label="Route comparison map"><Section title="Route Comparison Map" icon={MapPin}>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-3 border-t-4 border-slate-600 pt-3">
          <h3 className="text-sm font-semibold text-slate-800">Current PRIMARY</h3>
          {error ? <ErrorState message={error} /> : loading ? <Skeleton role="status" aria-label="Loading primary map" className="h-[360px] sm:h-[420px] xl:h-[460px]" /> : primary ? <RoutePlanMap plan={primary} /> : <EmptyState message="No current primary route is available." />}
        </div>
        <div className="min-w-0 space-y-3 border-t-4 border-primary pt-3">
          <h3 className="text-sm font-semibold text-slate-800">Proposed {proposed.routeType}</h3>
          <RoutePlanMap plan={proposed} />
        </div>
      </div>
      <p className="text-xs leading-5 text-slate-500">Two independent maps show the supplied stops for each route. Panel labels identify PRIMARY and proposed routes; marker colors do not indicate replacement or travel progress. {isBackup ? "The timeline below identifies the exact replacement range." : "The timeline below distinguishes completed and remaining legs."}</p>
    </Section></section>
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
      {error ? <ErrorState message={error} /> : loading ? <div role="status" aria-label="Loading route comparison" className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div> : primary ? <EmergencyChangeSummary plan={primary} title="Current Primary Route" /> : <Section title="Current Primary Route"><EmptyState message="No current primary route is available." /></Section>}
      <EmergencyChangeSummary plan={proposed} title={`Proposed ${proposed.routeType === "BACKUP" ? "Backup" : "Return"} Route`} proposed />
    </div>
    <Section title="Change Scope" icon={Route}>
      {isBackup ? <><p className="text-sm font-medium text-slate-800">{replacementLabel(proposed)}</p><p className="text-xs leading-5 text-slate-500">Orange highlights mark only the supplied PRIMARY replacement range. Backup distance and duration cover the replacement only. Activating it does not cancel the PRIMARY route.</p></> : <><p className="text-sm font-medium text-slate-800">Return destination · {destination ?? "Not available"}</p><p className="text-xs leading-5 text-slate-500">Completed PRIMARY legs are retained. Pending legs leave the effective journey only after RETURN activation. An in-progress leg does not reveal the current position or how much of it has been traveled.</p></>}
    </Section>
    <Section title="Segment Comparison" icon={GitCompareArrows} description="Actual segment order, mode, status and planned timing. Expand a leg to inspect resources and actual timestamps.">
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        <div className="min-w-0">{primary ? <RouteSegmentList segments={primary.segments} review={{ title: "Current PRIMARY", impact: segment => getSegmentImpact(segment, proposed, "primary") }} /> : <p className="text-sm text-slate-500">{loading ? "Loading PRIMARY segments…" : error ? "PRIMARY segments cannot be reviewed until the load error is resolved." : "No PRIMARY segments are available for comparison."}</p>}</div>
        <RouteSegmentList segments={proposed.segments} review={{ title: `Proposed ${proposed.routeType}`, impact: segment => getSegmentImpact(segment, proposed, "proposed") }} />
      </div>
    </Section>
    <Section title="Legal Review Comparison" icon={ShieldCheck}><div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current PRIMARY</p>{primary ? <RouteLegalReview embedded review={primary.legalReview} /> : <p className="text-xs text-slate-500">Legal review data unavailable.</p>}</div>
      <div className="min-w-0 space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Proposed {proposed.routeType}</p><RouteLegalReview embedded review={proposed.legalReview} /></div>
    </div></Section>
  </div>
}
