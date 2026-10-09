import { formatBookingDate } from "@/features/booking/utils"
import { Card, CardContent } from "@/shared/components/ui/card"
import type { RoutePlanDetail } from "../types"
import { distanceLabel, durationLabel } from "../display"

export function RoutePlanOverview({ plan }: { plan: RoutePlanDetail }) {
  const metrics = [
    { label: "Distance", value: distanceLabel(plan.totalDistanceKm) },
    { label: "Duration", value: durationLabel(plan.estimatedDurationMinutes) },
    { label: "Segments", value: String(plan.segments.length) },
    { label: "Personnel", value: plan.isPersonnelComplete ? "Complete" : "Incomplete" },
  ]
  return <section aria-label="Route overview" className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(({ label, value }) => <Card key={label} className="gap-0 rounded-md bg-white py-0 shadow-none"><CardContent className="space-y-2 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="text-lg font-semibold text-slate-900">{value}</p>
    </CardContent></Card>)}</div>
    <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm"><div><dt className="inline text-slate-500">Departure: </dt><dd className="inline">{formatBookingDate(plan.plannedDepartureAt, true)}</dd></div>
      <div><dt className="inline text-slate-500">Arrival: </dt><dd className="inline">{formatBookingDate(plan.plannedArrivalAt, true)}</dd></div></dl>
    {plan.routeNote && <p className="whitespace-pre-wrap break-words text-sm text-slate-600">{plan.routeNote}</p>}
  </section>
}
