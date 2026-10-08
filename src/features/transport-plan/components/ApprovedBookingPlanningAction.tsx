import type { AuthPrincipal } from "@/features/auth/types"
import { Button } from "@/shared/components/ui/button"
import { getApprovedBookingAction, planningNavigationUnavailable } from "../approved-booking-actions"
import type { ApprovedBookingDetail } from "../types"

export function ApprovedBookingPlanningAction({ principal, booking }: { principal: AuthPrincipal | null; booking: ApprovedBookingDetail }) {
  const action = getApprovedBookingAction(principal, booking)
  if (!action) return null
  return <div className="flex flex-col items-start gap-2 sm:items-end">
    <Button type="button" disabled aria-describedby="approved-booking-action-reason" className="rounded-[2px]">
      {action.label}
    </Button>
    <p id="approved-booking-action-reason" className="max-w-sm text-xs leading-relaxed text-slate-500 sm:text-right">
      {action.blockedReason ?? planningNavigationUnavailable[action.kind]}
    </p>
  </div>
}
