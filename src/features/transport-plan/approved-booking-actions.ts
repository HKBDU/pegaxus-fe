import { canAccess } from "@/features/auth/access-control"
import type { AuthPrincipal } from "@/features/auth/types"
import { transportPlanDetail, dossierDetail, ROLE_ROUTES } from "@/app/route-config"
import { getRouteDetailPath } from "@/features/route-view/navigation"
import type { ApprovedBookingAction, ApprovedBookingDetail, ApprovedBookingListItem, BookingTransportPlanContext, TransportPlanDetail } from "./types"
import { actionEntityIdSchema } from "./schemas"
import { canEditTransportPlan } from "./transport-plan.form"

export const managerBookingDetailPath = (bookingId: string) => `/admin/transport-requests/${encodeURIComponent(actionEntityIdSchema.parse(bookingId))}`
export const editTransportPlanPath = (id: string) => `${transportPlanDetail(id)}?action=edit`

export type { ApprovedBookingAction } from "./types"

// UC-34 is embedded in the existing LM Booking Detail, not the RC/TS workspace.
export function getBookingTransportPlanAction(principal: AuthPrincipal | null, booking: BookingTransportPlanContext): ApprovedBookingAction | undefined {
  if (!canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }) || !actionEntityIdSchema.safeParse(booking.bookingId).success) return undefined
  if (booking.transportPlan) {
    const id = booking.transportPlan.transportPlanId
    return actionEntityIdSchema.safeParse(id).success ? { kind: "viewTransportPlan", label: "View Transport Plan", targetId: id, href: transportPlanDetail(id) } : undefined
  }
  if (booking.status !== "APPROVED") return undefined
  return { kind: "createTransportPlan", label: "Create Transport Plan", targetId: booking.bookingId,
    ...(!booking.transport || !actionEntityIdSchema.safeParse(booking.transport.transportId).success
      ? { blockedReason: "A transport must exist before creating its plan." } : {}) }
}

export function getManagePersonnelAction(principal: AuthPrincipal | null, plan: Pick<TransportPlanDetail, "transportPlanId" | "status"> | null): ApprovedBookingAction | undefined {
  if (!plan || !actionEntityIdSchema.safeParse(plan.transportPlanId).success || plan.status !== "APPROVED" || !canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })) return undefined
  return { kind: "managePersonnel", label: "Manage Personnel", targetId: plan.transportPlanId, href: `${transportPlanDetail(plan.transportPlanId)}?tab=personnel` }
}

export function getApprovedBookingActions(principal: AuthPrincipal | null, booking: ApprovedBookingDetail | ApprovedBookingListItem): ApprovedBookingAction[] {
  if (booking.status !== "APPROVED" || !actionEntityIdSchema.safeParse(booking.bookingId).success) return []
  const plan = booking.transportPlan
  if (plan && !actionEntityIdSchema.safeParse(plan.transportPlanId).success) return []
  const viewPlan: ApprovedBookingAction[] = plan ? [{ kind: "viewTransportPlan", label: "View Transport Plan", targetId: plan.transportPlanId, href: transportPlanDetail(plan.transportPlanId) }] : []
  if (canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })) {
    if (!plan) return []
    const personnelAction = getManagePersonnelAction(principal, plan)
    const editPlan: ApprovedBookingAction[] = "transport" in booking && booking.transport && canEditTransportPlan(principal, { status: plan.status, transport: booking.transport })
      ? [{ kind: "editTransportPlan", label: "Edit Transport Plan", targetId: plan.transportPlanId, href: editTransportPlanPath(plan.transportPlanId) }] : []
    return [...viewPlan, ...editPlan, ...(personnelAction ? [personnelAction] : [])]
  }
  // Action eligibility only; never use this to filter AB1 or grant access to AB2.
  if (plan?.status !== "APPROVED") return []
  const candidate = "routePlans" in booking ? booking.routePlans.find((item) => item.routeType === "PRIMARY" && item.status !== "CANCELLED") : booking.routePlan
  const route = candidate?.status === "CANCELLED" ? null : candidate
  const routeDetailPath = getRouteDetailPath()
  const viewRoute: ApprovedBookingAction[] = route && actionEntityIdSchema.safeParse(route.routePlanId).success ? [{ kind: "viewRoutePlan", label: "View Route Details", targetId: route.routePlanId,
    ...(routeDetailPath ? { href: routeDetailPath(route.routePlanId) } : { blockedReason: "Route Plan navigation is pending production router integration." }) }] : []
  if (canAccess(principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] })) {
    if (route) return viewRoute
    const transport = "transport" in booking ? booking.transport : null
    const hasTransport = "transport" in booking ? Boolean(transport) : Boolean(booking.transportId)
    const unlocked = !transport || !["IN_TRANSIT", "COMPLETED", "CANCELLED"].includes(transport.status)
    return plan?.status === "APPROVED" && hasTransport && unlocked ? [{ kind: "createRoutePlan", label: "Create Primary Route", targetId: plan.transportPlanId,
      blockedReason: "Route Builder navigation awaits the route-plan feature and registered route." }] : []
  }
  if (canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] })) {
    const transportId = ("transport" in booking ? booking.transport?.transportId : booking.transportId) ?? undefined
    const dossier = booking.complianceDossier
    const dossierAction: ApprovedBookingAction | undefined = dossier
      ? { kind: "viewComplianceDossier", label: "View Compliance Dossier", targetId: dossier.complianceDossierId, href: dossierDetail(dossier.complianceDossierId, "TRANSPORT_SPECIALIST") }
      : transportId ? { kind: "applyDossierTemplate", label: "Apply Dossier Template", targetId: transportId, bookingId: booking.bookingId, transportId,
        blockedReason: "Flow 2 Apply Template must use transport-scoped D2 before this integration is enabled." } : undefined
    const requirementsAction: ApprovedBookingAction[] = dossier ? [{ kind: "viewDossierRequirements", label: "View Requirements", targetId: dossier.complianceDossierId,
      href: `${ROLE_ROUTES.complianceDossiers}/${encodeURIComponent(dossier.complianceDossierId)}/requirements` }] : []
    return [...(dossierAction && (dossier || plan?.status === "APPROVED") ? [dossierAction] : []), ...requirementsAction, ...viewRoute]
  }
  return []
}
