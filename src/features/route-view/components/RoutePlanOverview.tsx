import { formatBookingDate as formatDate } from "@/features/booking/utils"
import { Card, CardContent } from "@/shared/components/ui/card"
import type { RoutePlanDetail } from "../types"
import { durationLabel, replacementLabel } from "../display"

const formatBookingDate = (value: string | null | undefined, includeTime: boolean) => value ? formatDate(value, includeTime) : "Not scheduled"

export function RoutePlanOverview({ plan }: { plan: RoutePlanDetail }) {
  const metrics = [
    { label: "Distance", value: plan.totalDistanceKm == null ? "—" : `${plan.totalDistanceKm.toLocaleString("en-GB", { maximumFractionDigits: 1 })} km`, complete: false },
    { label: "Duration", value: durationLabel(plan.estimatedDurationMinutes), complete: false },
    { label: "Segments", value: String(plan.segments.length), complete: false },
    { label: "Personnel", value: plan.isPersonnelComplete ? "Complete" : "Incomplete", complete: plan.isPersonnelComplete },
  ]
  return <section aria-label="Route overview" className="space-y-3">
    {plan.routeType === "BACKUP" && <p className="text-xs text-slate-500">Replaces: {replacementLabel(plan)}. Metrics below do not represent the full combined journey.</p>}
    <Card className="min-w-0 gap-0 rounded-[2px] border-slate-200 bg-white py-0 shadow-xs"><CardContent className="space-y-3 p-3">
    <dl className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(({ label, value, complete }, index) =>
      <div key={label} className={`min-w-0 ${index % 2 ? "sm:border-l sm:border-slate-200 sm:pl-4" : ""} ${index === 2 ? "lg:border-l lg:border-slate-200 lg:pl-4" : ""}`}>
        <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
        <dd className={`mt-1 break-words text-sm font-semibold leading-5 tabular-nums ${complete ? "text-emerald-700" : "text-slate-900"}`}>{value}</dd>
      </div>)}</dl>
    <dl aria-label="Planned journey schedule" className="grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2">
      <div><dt className="mb-1 text-[11px] font-medium text-slate-500">Planned departure</dt><dd className="break-words text-sm font-medium text-slate-900">{formatBookingDate(plan.plannedDepartureAt, true)}</dd></div>
      <div><dt className="mb-1 text-[11px] font-medium text-slate-500">Planned arrival</dt><dd className="break-words text-sm font-medium text-slate-900">{formatBookingDate(plan.plannedArrivalAt, true)}</dd></div>
    </dl>
    {plan.routeNote && <p className="whitespace-pre-wrap break-words text-sm text-slate-600">{plan.routeNote}</p>}
    </CardContent></Card>
  </section>
}
