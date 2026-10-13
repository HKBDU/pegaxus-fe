import { formatBookingDate as formatDate } from "@/features/booking/utils"
import { Card, CardContent } from "@/shared/components/ui/card"
import { ArrowRight, CalendarClock, Clock3, Route, UsersRound, Waypoints } from "lucide-react"
import type { RoutePlanDetail } from "../types"
import { durationLabel, replacementLabel } from "../display"

const formatBookingDate = (value: string | null | undefined, includeTime: boolean) => value ? formatDate(value, includeTime) : "Not scheduled"

export function RoutePlanOverview({ plan }: { plan: RoutePlanDetail }) {
  const metrics = [
    { label: "Distance", value: plan.totalDistanceKm == null ? "—" : plan.totalDistanceKm.toLocaleString("en-GB", { maximumFractionDigits: 1 }), unit: plan.totalDistanceKm == null ? undefined : "km", description: plan.routeType === "BACKUP" ? "Replacement distance only" : "Planned route distance", icon: Route, complete: false },
    { label: "Duration", value: durationLabel(plan.estimatedDurationMinutes), description: plan.routeType === "BACKUP" ? "Replacement duration only" : "Estimated duration", icon: Clock3, complete: false },
    { label: "Segments", value: String(plan.segments.length), description: "Planned transport legs", icon: Waypoints, complete: false },
    { label: "Personnel", value: plan.isPersonnelComplete ? "Complete" : "Incomplete", description: "Assignment status", icon: UsersRound, complete: plan.isPersonnelComplete },
  ]
  return <section aria-label="Route overview" className="space-y-3">
    {plan.routeType === "BACKUP" && <p className="text-xs text-slate-500">Replaces: {replacementLabel(plan)}. Metrics below do not represent the full combined journey.</p>}
    <div className="grid grid-cols-1 items-start gap-3 min-[360px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(({ label, value, unit, description, icon: Icon, complete }) => <Card key={label} className="min-w-0 gap-0 rounded-[2px] border-slate-200 bg-white py-0 shadow-xs"><CardContent className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
        <span className={`flex size-6 shrink-0 items-center justify-center rounded-[2px] ${complete ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary"}`}><Icon aria-hidden="true" className="size-3.5" /></span>
      </div>
      <p className={`break-words text-xl tabular-nums font-semibold tracking-tight ${complete ? "text-emerald-700" : "text-slate-900"}`}>{value}{unit && <span className="ml-1 text-sm font-medium tracking-normal text-slate-500">{unit}</span>}</p>
      <p className="text-[11px] leading-4 text-slate-500">{description}</p>
    </CardContent></Card>)}</div>
    <dl aria-label="Planned journey schedule" className="grid gap-3 rounded-[2px] border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div><dt className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"><CalendarClock aria-hidden="true" className="size-3.5 text-primary" />Planned departure</dt><dd className="text-sm font-medium text-slate-900">{formatBookingDate(plan.plannedDepartureAt, true)}</dd></div>
      <ArrowRight aria-hidden="true" className="hidden size-5 text-slate-300 sm:block" />
      <div><dt className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500"><CalendarClock aria-hidden="true" className="size-3.5 text-primary" />Planned arrival</dt><dd className="text-sm font-medium text-slate-900">{formatBookingDate(plan.plannedArrivalAt, true)}</dd></div>
    </dl>
    {plan.routeNote && <p className="whitespace-pre-wrap break-words text-sm text-slate-600">{plan.routeNote}</p>}
  </section>
}
