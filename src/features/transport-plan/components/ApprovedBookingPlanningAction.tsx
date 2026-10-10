import type { AuthPrincipal } from "@/features/auth/types"
import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { getApprovedBookingActions } from "../approved-booking-actions"
import type { ApprovedBookingDetail } from "../types"
import { canAccess } from "@/features/auth/access-control"

export function ApprovedBookingPlanningAction({ principal, booking }: { principal: AuthPrincipal | null; booking: ApprovedBookingDetail }) {
  // RC/TS use their dedicated workspace below; only LM needs plan management in the header.
  if (!canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })) return null
  const actions = getApprovedBookingActions(principal, booking)
  return <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
    {actions.map((action) => action.href ? <Button key={action.kind} asChild className="rounded-[2px]"><Link to={action.href}>{action.label}</Link></Button> :
      <div key={action.kind} className="space-y-1">
        <Button type="button" disabled aria-describedby={`action-reason-${action.kind}`} className="rounded-[2px]">{action.label}</Button>
        <p id={`action-reason-${action.kind}`} className="max-w-xs text-xs text-slate-500">{action.blockedReason}</p>
      </div>)}
  </div>
}
