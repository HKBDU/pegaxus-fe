import { Link } from "react-router-dom"
import { GitBranch, Route, RefreshCw } from "lucide-react"
import { canAccess } from "@/features/auth/access-control"
import type { AuthPrincipal } from "@/features/auth/types"
import { transportPlanDetail } from "@/app/route-config"
import { Button } from "@/shared/components/ui/button"
import { EmptyState, ErrorState } from "@/shared/components/common"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import { Section } from "@/features/transport-plan/components/ApprovedBookingDetails"
import { useRoutePlanAlternatives } from "../hooks/useRoutePlanDetail"
import { canViewRoute, getRouteViewError } from "../services"
import { routePlanIdSchema } from "../schemas"
import { distanceLabel, durationLabel } from "../display"
import { getRouteDetailPath } from "../navigation"
import type { RouteDetailPath } from "../types"

function UnavailableAction({ label, reason }: { label: string; reason: string }) {
  return <div className="space-y-1"><Button variant="outline" size="sm" disabled title={reason} className="rounded-md">{label}</Button><p className="max-w-sm text-[11px] text-slate-500">{reason}</p></div>
}

// RP2 is scoped to one selected plan, never fetched for each row of the transport list.
export function RoutePlansWorkspace({ transportPlanId, planStatus, transportStatus, principal, routeDetailPath = getRouteDetailPath() }: {
  transportPlanId: string; planStatus: string; transportStatus?: string | null
  principal: AuthPrincipal | null; routeDetailPath?: RouteDetailPath
}) {
  const allowed = canViewRoute(principal)
  const validId = routePlanIdSchema.safeParse(transportPlanId).success
  const query = useRoutePlanAlternatives(transportPlanId, {}, allowed && validId)
  const manager = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const coordinator = !manager && canAccess(principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] })
  const specialist = !manager && !coordinator && canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] })
  const unlocked = Boolean(transportStatus) && !["IN_TRANSIT", "COMPLETED", "CANCELLED"].includes(transportStatus!)
  const canPlan = coordinator && planStatus === "APPROVED" && unlocked
  const items = query.data?.items ?? []
  const primary = items.find(item => item.routeType === "PRIMARY" && item.status !== "CANCELLED")
  const title = coordinator ? "Route Planning Workspace" : specialist ? "Route Legal Review" : "Route Planning Monitor"
  const error = query.isError ? getRouteViewError(query.error) : null
  return <Section title={title}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-500">Route plans for this transport plan. PRIMARY and BACKUP are separate route options.</p>
      {allowed && validId && <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching} className="rounded-md"><RefreshCw aria-hidden="true" className="size-3.5" />Refresh routes</Button>}
    </div>
    {!allowed ? <ErrorState message="You do not have permission to view route plans." /> : !validId ? <ErrorState message="A valid transport plan is required to load route plans." /> : error ?
      <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> : query.isPending ?
      <div role="status" aria-label="Loading route plans" className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-36 w-full" /><Skeleton className="h-36 w-full" /></div> : <>
        {coordinator && !unlocked && <p className="text-xs text-slate-500">Standard route editing is unavailable when transport is in transit, closed, or its status is unavailable. Emergency changes belong to UC-48.</p>}
        {coordinator && planStatus !== "APPROVED" && <p className="text-xs text-slate-500">Route planning requires an APPROVED transport plan and Phase 1 assignment.</p>}
        {canPlan && !primary && <UnavailableAction label="Create Primary Route" reason="Route Builder integration is pending the UC-33 component and registered route." />}
        {!items.length ? <EmptyState message="No route plans have been created for this transport plan." /> : <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {items.map(item => <article key={item.routePlanId} className="min-w-0 space-y-3 rounded-md border border-slate-200 p-4">
            <div className="flex flex-wrap gap-2"><ApprovedBookingBadge value={item.routeType} /><ApprovedBookingBadge value={item.status} /></div>
            <h3 className="flex items-start gap-2 break-all font-heading text-xl text-slate-900">{item.routeType === "BACKUP" ? <GitBranch aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" /> : <Route aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />}{item.routePlanCode}</h3>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-slate-500">Distance</dt><dd className="mt-1 font-medium">{distanceLabel(item.totalDistanceKm)}</dd></div>
              <div><dt className="text-slate-500">Duration</dt><dd className="mt-1 font-medium">{durationLabel(item.estimatedDurationMinutes)}</dd></div>
              <div><dt className="text-slate-500">Segments</dt><dd className="mt-1 font-medium">{item.segmentCount}</dd></div>
              <div><dt className="text-slate-500">Personnel</dt><dd className="mt-1 font-medium">{item.isPersonnelComplete ? "Complete" : "Incomplete"}</dd></div>
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {routeDetailPath ? <Button asChild variant="outline" size="sm" className="rounded-md"><Link to={routeDetailPath(item.routePlanId)}>View Route Details</Link></Button> : <UnavailableAction label="View Route Details" reason="UC-38 production route registration is pending." />}
              {canPlan && item.status === "DRAFT" && <UnavailableAction label="Continue Editing" reason="UC-39 editing integration is pending its public component and registered route." />}
              {specialist && item.status === "DRAFT" && <UnavailableAction label="Review Route Feasibility" reason="RP7 legal-review integration is pending its public component and registered route." />}
            </div>
          </article>)}
        </div>}
        {canPlan && primary?.status === "CONFIRMED" && <UnavailableAction label="Manage Backup Routes" reason="UC-37 backup management integration is pending its public component and registered route." />}
        {manager && <div className="space-y-2 border-t pt-3">
          <p className="text-xs text-slate-600">Phase 2 assigns Driver and Escort per internal segment only after the PRIMARY route is CONFIRMED. Outsourced segments use their Provider.</p>
          {planStatus === "APPROVED" && unlocked && primary?.status === "CONFIRMED" ?
            <Button asChild variant="outline" size="sm" className="rounded-md"><Link to={`${transportPlanDetail(transportPlanId)}?tab=personnel`}>View Phase 2 Personnel Workspace</Link></Button> :
            <p className="text-xs text-slate-500">Phase 2 is unavailable until the plan is APPROVED and the PRIMARY route is CONFIRMED before departure.</p>}
          <p className="text-[11px] text-slate-500">Assignment controls await the existing PersonnelAssignmentPanel integration; no assignments are created here.</p>
        </div>}
      </>}
  </Section>
}
