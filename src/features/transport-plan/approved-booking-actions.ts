import { canAccess } from "@/features/auth/access-control"
import type { AuthPrincipal } from "@/features/auth/types"
import type { EntityId } from "@/shared/types"
import type { ApprovedBookingDetail } from "./types"

export type ApprovedBookingAction = {
  kind: "createTransportPlan" | "viewTransportPlan" | "createRoutePlan" | "viewRoutePlan"
  label: string
  targetId?: EntityId
  blockedReason?: string
}

export function getApprovedBookingAction(principal: AuthPrincipal | null, booking: ApprovedBookingDetail): ApprovedBookingAction | null {
  if (canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })) {
    return booking.transportPlan
      ? { kind: "viewTransportPlan", label: "View Transport Plan", targetId: booking.transportPlan.transportPlanId }
      : { kind: "createTransportPlan", label: "Create Transport Plan", targetId: booking.bookingId }
  }
  if (!canAccess(principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] })) return null

  // CANCELLED is the current backend RoutePlanStatus value, not the stale Flow 3 wording.
  const route = booking.routePlans.find((plan) => plan.routeType === "PRIMARY" && plan.status !== "CANCELLED")
  if (route) return { kind: "viewRoutePlan", label: "View Route Plan", targetId: route.routePlanId }
  if (!booking.transportPlan) return {
    kind: "createRoutePlan", label: "Create Route Plan",
    blockedReason: "Waiting for the Logistics Manager to create the Transport Plan.",
  }
  if (booking.transportPlan.status !== "APPROVED") return {
    kind: "createRoutePlan", label: "Create Route Plan",
    blockedReason: booking.depositStatus === "PENDING"
      ? "Route planning becomes available after the deposit is paid and the Transport Plan is approved."
      : "Waiting for the Transport Plan to be approved.",
  }
  return { kind: "createRoutePlan", label: "Create Route Plan", targetId: booking.transportPlan.transportPlanId }
}

export const planningNavigationUnavailable: Record<Exclude<ApprovedBookingAction["kind"], "viewTransportPlan">, string> = {
  createTransportPlan: "Transport Plan creation (UC-34) is not available in this application yet.",
  createRoutePlan: "The Route Builder (UC-33) is not available in this application yet.",
  viewRoutePlan: "The Route Plan detail page is not available in this application yet.",
}
