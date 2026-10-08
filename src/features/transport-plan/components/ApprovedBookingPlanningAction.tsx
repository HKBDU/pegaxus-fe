import type { AuthPrincipal } from "@/features/auth/types"
import { Link } from "react-router-dom"
import { transportPlanDetail } from "@/app/route-config"
import { Button } from "@/shared/components/ui/button"
import { getApprovedBookingAction, planningNavigationUnavailable } from "../approved-booking-actions"
import type { ApprovedBookingDetail } from "../types"

export function ApprovedBookingPlanningAction({ principal, booking }: { principal: AuthPrincipal | null; booking: ApprovedBookingDetail }) {
  const action = getApprovedBookingAction(principal, booking)
  if (!action) return null
  if (action.kind === "viewTransportPlan" && action.targetId != null && !action.blockedReason) {
    return <Button asChild className="rounded-[2px]"><Link to={transportPlanDetail(action.targetId)}>{action.label}</Link></Button>
  }
  return <div className="flex flex-col items-start gap-2 sm:items-end">
    <Button type="button" disabled aria-describedby="approved-booking-action-reason" className="rounded-[2px]">
      {action.label}
    </Button>
    <p id="approved-booking-action-reason" className="max-w-sm text-xs leading-relaxed text-slate-500 sm:text-right">
      {action.blockedReason ?? (action.kind === "viewTransportPlan" ? "No Transport Plan reference is available." : planningNavigationUnavailable[action.kind])}
    </p>
  </div>
}
