import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { transportPlanDetail } from "@/app/route-config"
import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import type { RoutePlanDetail } from "../types"

export function RoutePlanHeader({ plan }: { plan: RoutePlanDetail }) {
  return <header className="space-y-3 rounded-[2px] border border-slate-200 border-l-2 border-l-primary bg-white p-3 shadow-xs">
    <Link to={transportPlanDetail(plan.transportPlanId)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 underline decoration-primary underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
      <ArrowLeft aria-hidden="true" className="size-3.5" />Back to Transport Plan
    </Link>
    <div className="space-y-2">
      <h1 tabIndex={-1} className="m-0! font-heading text-2xl! font-semibold uppercase leading-7! text-slate-900 outline-none">Route Plan Details</h1>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
        <h2 className="m-0! min-w-0 break-all font-heading text-lg! leading-6! font-medium text-slate-900">{plan.routePlanCode}</h2>
        <ApprovedBookingBadge value={plan.routeType} /><ApprovedBookingBadge value={plan.status} />
      </div>
      <p className="text-xs text-slate-500">Booking: <span className="font-medium text-slate-700">{plan.bookingCode}</span> · {plan.isCrossBorder ? "Cross-border" : "Domestic"}</p>
    </div>
  </header>
}
