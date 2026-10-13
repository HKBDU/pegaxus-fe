import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { EmptyState, ErrorState } from "@/shared/components/common"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ArrowRight, Check, Clock3, Route } from "lucide-react"
import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import { useRoutePlanAlternatives } from "../hooks/useRoutePlanDetail"
import { getRouteViewError } from "../services"
import { distanceLabel, durationLabel, replacementLabel } from "../display"
import type { RouteDetailPath, RoutePlanDetail } from "../types"

export function RouteContingencyTab({ plan, routeDetailPath }: { plan: RoutePlanDetail; routeDetailPath?: RouteDetailPath }) {
  const query = useRoutePlanAlternatives(plan.transportPlanId)
  if (query.isPending) return <div role="status" aria-label="Loading alternative routes" className="space-y-3"><Skeleton className="h-36 w-full" /><Skeleton className="h-36 w-full" /></div>
  if (query.isError) { const error = getRouteViewError(query.error); return <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> }
  const items = query.data?.items ?? []
  return <section aria-label="Alternative routes" className="space-y-3">
    <header className="space-y-1"><h2 className="m-0! font-heading text-base! leading-5! font-medium uppercase text-slate-900">Alternative Routes</h2>
      <p className="text-xs text-slate-500">View the PRIMARY, BACKUP and RETURN routes for this transport plan. Backup metrics cover only the replacement segments, not the combined journey.</p>
    </header>
    {!items.some((item) => item.routePlanId !== plan.routePlanId) && <EmptyState message="No alternative routes have been prepared for this transport plan." />}
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-start gap-3">{items.map((item) => <article key={item.routePlanId} data-selected={item.routePlanId === plan.routePlanId} className={`flex min-w-0 flex-col gap-3 rounded-[2px] border bg-white p-3 ${item.routePlanId === plan.routePlanId ? "border-primary/50" : "border-slate-200"}`}>
      <div className="flex flex-wrap justify-between gap-2"><ApprovedBookingBadge value={item.routeType} /><ApprovedBookingBadge value={item.status} /></div>
      <h3 className="break-all font-heading text-xl font-medium text-slate-900">{item.routePlanCode}</h3>
      <dl className="grid grid-cols-2 gap-3">
        <div><dt className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500"><Route aria-hidden="true" className="size-3" />Distance</dt><dd className="text-sm font-semibold text-slate-900">{distanceLabel(item.totalDistanceKm)}</dd></div>
        <div><dt className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500"><Clock3 aria-hidden="true" className="size-3" />Duration</dt><dd className="text-sm font-semibold text-slate-900">{durationLabel(item.estimatedDurationMinutes)}</dd></div>
      </dl>
      <p className="text-xs text-slate-500">{item.segmentCount} segments</p>
      {item.routeType === "BACKUP" && <p className="text-xs text-slate-500">Replaces: {replacementLabel(item)} · Replacement distance and duration only</p>}
      <div className="flex items-center justify-end border-t border-slate-100 pt-3">
        {item.routePlanId === plan.routePlanId ? <p className="mr-auto flex items-center gap-1.5 text-xs font-medium text-primary"><Check aria-hidden="true" className="size-3.5" />Current route</p> : routeDetailPath ?
          <Button asChild variant="outline" size="sm" className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"><Link to={routeDetailPath(item.routePlanId)}>View Route Plan<ArrowRight aria-hidden="true" className="size-3.5" /></Link></Button> :
          <div className="space-y-1 text-right"><Button variant="outline" size="sm" className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" disabled>View Route Plan<ArrowRight aria-hidden="true" className="size-3.5" /></Button><p className="text-xs text-slate-500">Route navigation is pending router integration.</p></div>}
      </div>
    </article>)}</div>
  </section>
}
