import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { EmptyState, ErrorState } from "@/shared/components/common"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Section } from "@/features/transport-plan/components/ApprovedBookingDetails"
import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import { useRoutePlanAlternatives } from "../hooks/useRoutePlanDetail"
import { getRouteViewError } from "../services"
import { distanceLabel, durationLabel } from "../display"
import type { RouteDetailPath, RoutePlanDetail } from "../types"

export function RouteContingencyTab({ plan, routeDetailPath }: { plan: RoutePlanDetail; routeDetailPath?: RouteDetailPath }) {
  const query = useRoutePlanAlternatives(plan.transportPlanId)
  if (query.isPending) return <div role="status" aria-label="Loading alternative routes" className="space-y-3"><Skeleton className="h-36 w-full" /><Skeleton className="h-36 w-full" /></div>
  if (query.isError) { const error = getRouteViewError(query.error); return <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> }
  const items = query.data?.items ?? []
  return <Section title="Alternative Routes">
    <p className="text-xs text-slate-500">Compare and view prepared routes for the same transport plan. This view is read-only.</p>
    {!items.some((item) => item.routePlanId !== plan.routePlanId) && <EmptyState message="No alternative routes have been prepared for this transport plan." />}
    <div className="grid gap-3">{items.map((item) => <article key={item.routePlanId} className="space-y-3 rounded-md border border-slate-200 p-4">
      <div className="flex flex-wrap justify-between gap-2"><div><p className="mb-1 text-[11px] uppercase text-slate-500">{item.routeType} route</p><h3 className="text-sm font-semibold">{item.routePlanCode}</h3></div><ApprovedBookingBadge value={item.status} /></div>
      <p className="text-xs text-slate-600">Distance: {distanceLabel(item.totalDistanceKm)} · Duration: {durationLabel(item.estimatedDurationMinutes)} · {item.segmentCount} segments</p>
      {item.routePlanId === plan.routePlanId ? <p className="text-xs font-medium text-primary">Current selected route</p> : routeDetailPath ? <Button asChild variant="outline" size="sm"><Link to={routeDetailPath(item.routePlanId)}>View Route Plan →</Link></Button> : <div className="space-y-1"><Button variant="outline" size="sm" disabled>View Route Plan →</Button><p className="text-xs text-slate-500">Route navigation is pending router integration.</p></div>}
    </article>)}</div>
  </Section>
}
