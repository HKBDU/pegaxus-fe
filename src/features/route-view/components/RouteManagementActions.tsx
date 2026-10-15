import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { LegalFeasibilityPanel, type LegalFeasibilityPanelProps } from "@/features/route-plan/components/LegalFeasibilityPanel"
import { CancelRoutePlanDialog } from "@/features/route-plan/components/CancelRoutePlanDialog"
import { OutsourceSegmentDialog } from "@/features/route-plan/components/OutsourceSegmentDialog"
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role"
import { isFlow3MockMode } from "@/features/transport-plan/source"
import { Button } from "@/shared/components/ui/button"
import { refreshEmergencyQueries, type EmergencyContext } from "../hooks/useEmergencyRoute"
import type { RoutePlanDetail, RouteSegment } from "../types"

// The provider currently requires measured numeric fields even though it only displays routeName.
// Do not turn absent measurements into zero to satisfy that public interface.
function legalSegments(plan: RoutePlanDetail): LegalFeasibilityPanelProps["segments"] | null {
  const result: LegalFeasibilityPanelProps["segments"] = []
  for (const segment of plan.segments) {
    const { distanceKm, estimatedDurationMinutes } = segment.route
    if (distanceKm == null || estimatedDurationMinutes == null) return null
    result.push({ sequenceNo: segment.sequenceNo, route: { ...segment.route, routeName: segment.route.routeName ?? segment.route.routeCode, distanceKm, estimatedDurationMinutes } })
  }
  return result
}

export function RouteManagementActions({ plan, context }: { plan: RoutePlanDetail; context: EmergencyContext }) {
  const client = useQueryClient()
  const role = getWorkspaceRole(context.workspace.principal)
  const mockMode = isFlow3MockMode()
  const [review, setReview] = useState<RoutePlanDetail | null>(null)
  const [cancelVersion, setCancelVersion] = useState(plan.updatedAt)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)
  async function refresh() {
    setRefreshing(true)
    setRefreshFailed(false)
    try { await refreshEmergencyQueries(client, plan, "management", context.dossierId) }
    catch { setRefreshFailed(true) }
    finally { setRefreshing(false) }
  }
  const returnReviewAllowed = plan.routeType !== "RETURN" || (context.workspace.transportStatus === "IN_TRANSIT" && context.workspace.dossierStatus === "DRAFT")
  const canReview = role === "specialist" && plan.status === "DRAFT" && Boolean(context.dossierId) && returnReviewAllowed
  const canCancel = role === "coordinator" && plan.status === "DRAFT"
  const segments = legalSegments(review ?? plan)
  return <>
    {canReview ? <Button size="sm" variant="outline" disabled={mockMode || refreshing || !segments?.length} onClick={() => setReview(plan)} title={!segments?.length ? "Legal review requires complete measured route data for the existing panel." : undefined}>Review Legal Feasibility</Button> : null}
    {canCancel && plan.routeType !== "RETURN" ? <CancelRoutePlanDialog routePlanId={plan.routePlanId} status="DRAFT" lastUpdatedAt={cancelVersion} routePlanCode={plan.routePlanCode} onCancelled={() => void refresh()}><Button size="sm" variant="outline" disabled={mockMode || refreshing} onClick={() => setCancelVersion(plan.updatedAt)}>Cancel Draft Route</Button></CancelRoutePlanDialog> : null}
    {canCancel && plan.routeType === "RETURN" ? <span className="text-xs text-slate-500">RETURN cancellation is unavailable until its approval state can be verified.</span> : null}
    {(canReview || canCancel) ? <Button size="sm" variant="ghost" disabled={refreshing} onClick={() => { setReview(null); void refresh() }}>{refreshing ? "Refreshing…" : "Reload Latest Route"}</Button> : null}
    {refreshFailed ? <p role="alert" className="text-xs text-destructive">The action may have succeeded, but refresh failed. Reload the latest route before another action.</p> : null}
    {mockMode && (canReview || canCancel) ? <p className="text-xs text-slate-500">Legal/Cancel providers use real APIs. Their mutations are disabled in Flow 3 mock mode.</p> : null}
    {review && segments ? <LegalFeasibilityPanel routePlanId={review.routePlanId} lastUpdatedAt={review.updatedAt} segments={segments} legalReview={review.legalReview ? { ...review.legalReview, note: review.legalReview.note ?? null, blockedSegments: review.legalReview.blockedSegments ?? [], reviewedAt: review.legalReview.reviewedAt ?? null, reviewedBy: review.legalReview.reviewedBy ? { ...review.legalReview.reviewedBy, employeeCode: review.legalReview.reviewedBy.employeeCode ?? "" } : null } : null} open onOpenChange={open => { if (!open) setReview(null) }} onConfirmed={() => { setReview(null); void refresh() }} /> : null}
  </>
}

export function RouteSegmentOutsourceAction({ plan, segment, context }: { plan: RoutePlanDetail; segment: RouteSegment; context: EmergencyContext }) {
  const client = useQueryClient()
  if (getWorkspaceRole(context.workspace.principal) !== "manager" || plan.status !== "DRAFT") return null
  // This provider has no lastUpdatedAt prop and cannot safely submit the current UC42 contract.
  // Keep the consumer/IDs/success callback mounted, but prevent an invalid business mutation.
  return <div className="max-w-72 space-y-1 text-right">
    <OutsourceSegmentDialog routePlanId={plan.routePlanId} routePlanRouteId={segment.routePlanRouteId} transportMode={segment.route.transportMode} isOutsourced={segment.isOutsourced} currentNote={segment.note}
      onChanged={() => void refreshEmergencyQueries(client, plan, "management", context.dossierId)}>
      <Button size="sm" variant="outline" disabled aria-describedby={`outsource-blocked-${segment.routePlanRouteId}`}>{segment.isOutsourced ? "Manage Outsource" : "Outsource Segment"}</Button>
    </OutsourceSegmentDialog>
    <p id={`outsource-blocked-${segment.routePlanRouteId}`} className="text-[11px] text-slate-500">Provider update awaits lastUpdatedAt support in the shared dialog.</p>
  </div>
}
