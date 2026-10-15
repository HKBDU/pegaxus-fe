import { Link } from "react-router-dom"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { transportPlanDetail } from "@/app/route-config"
import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import type { RoutePlanDetail } from "../types"

export function RoutePlanHeader({ plan }: { plan: RoutePlanDetail }) {
  return <header className="space-y-4 border-b border-slate-200 pb-5">
    <Link to={transportPlanDetail(plan.transportPlanId)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/30">
      <ArrowLeft aria-hidden="true" className="size-3.5" />Back to Transport Plan
    </Link>
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">Route planning <ChevronRight aria-hidden="true" className="size-3" />Route details</p>
      <h1 tabIndex={-1} className="m-0 font-heading text-3xl font-semibold uppercase leading-tight text-slate-900 outline-none sm:text-4xl">Route Plan Details</h1>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
        <h2 className="min-w-0 break-all font-heading text-xl font-medium text-slate-900 sm:text-2xl">{plan.routePlanCode}</h2>
        <ApprovedBookingBadge value={plan.routeType} /><ApprovedBookingBadge value={plan.status} />
      </div>
      <p className="text-xs text-slate-500">Booking: <span className="font-medium text-slate-700">{plan.bookingCode}</span> · {plan.isCrossBorder ? "Cross-border" : "Domestic"}</p>
    </div>
  </header>
}
