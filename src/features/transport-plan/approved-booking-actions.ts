import { canAccess } from "@/features/auth/access-control"
import type { AuthPrincipal } from "@/features/auth/types"
import { approvedBookingDetail, transportPlanDetail, dossierDetail, ROLE_ROUTES } from "@/app/route-config"
import type { ApprovedBookingDetail, ApprovedBookingListItem } from "./types"

// Existing detail routes host these forms until the router owner registers standalone routes.
export const createTransportPlanPath = (bookingId: string) => `${approvedBookingDetail(bookingId)}?action=create-plan`
export const editTransportPlanPath = (id: string) => `${transportPlanDetail(id)}?action=edit`

export type ApprovedBookingAction = {
  kind: "createTransportPlan" | "viewTransportPlan" | "managePersonnel" | "createRoutePlan" | "viewRoutePlan" | "applyDossierTemplate" | "viewComplianceDossier"
  label: string
  targetId: string
  href?: string
  bookingId?: string
  transportId?: string
  blockedReason?: string
}

export function getApprovedBookingActions(principal: AuthPrincipal | null, booking: ApprovedBookingDetail | ApprovedBookingListItem): ApprovedBookingAction[] {
  if (booking.status !== "APPROVED") return []
  const plan = booking.transportPlan
  const viewPlan: ApprovedBookingAction[] = plan ? [{ kind: "viewTransportPlan", label: "View Transport Plan", targetId: plan.transportPlanId, href: transportPlanDetail(plan.transportPlanId) }] : []
  if (canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })) {
    if (!plan) return [{ kind: "createTransportPlan", label: "Create Transport Plan", targetId: booking.bookingId, href: createTransportPlanPath(booking.bookingId) }]
    return plan.status === "APPROVED" ? [...viewPlan, { kind: "managePersonnel", label: "Manage Personnel", targetId: plan.transportPlanId, href: `${transportPlanDetail(plan.transportPlanId)}?tab=personnel` }] : viewPlan
  }
  const candidate = "routePlans" in booking ? booking.routePlans.find((item) => item.routeType === "PRIMARY" && item.status !== "CANCELLED") : booking.routePlan
  const route = candidate?.status === "CANCELLED" ? null : candidate
  const viewRoute: ApprovedBookingAction[] = route ? [{ kind: "viewRoutePlan", label: "View Route Plan", targetId: route.routePlanId,
    blockedReason: "Route Plan navigation awaits the route-view feature and registered route." }] : []
  if (canAccess(principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] })) {
    if (route) return [...viewPlan, ...viewRoute]
    return plan?.status === "APPROVED" ? [...viewPlan, { kind: "createRoutePlan", label: "Create Route Plan", targetId: plan.transportPlanId,
      blockedReason: "Route Builder navigation awaits the route-plan feature and registered route." }] : viewPlan
  }
  if (canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] })) {
    const transportId = "transportId" in booking ? booking.transportId : booking.transport.transportId
    const dossier = booking.complianceDossier
    const dossierAction: ApprovedBookingAction = dossier
      ? { kind: "viewComplianceDossier", label: "View Compliance Dossier", targetId: dossier.complianceDossierId, href: dossierDetail(dossier.complianceDossierId, "TRANSPORT_SPECIALIST") }
      : { kind: "applyDossierTemplate", label: "Apply Dossier Template", targetId: transportId, bookingId: booking.bookingId, transportId,
        href: `${ROLE_ROUTES.complianceDossiers}/new/${encodeURIComponent(booking.bookingId)}?transportId=${encodeURIComponent(transportId)}` }
    return [...viewPlan, dossierAction, ...viewRoute]
  }
  return []
}
