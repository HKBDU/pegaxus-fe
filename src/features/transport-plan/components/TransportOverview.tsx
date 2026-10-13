import { Card, CardContent } from "@/shared/components/ui/card"
import { formatPlanDate } from "../format"
import type { ApprovedBookingDetail } from "../types"

type Journey = Pick<ApprovedBookingDetail, "originAddress" | "originCountry" | "destinationAddress" | "destinationCountry" | "totalHorses">
export function TransportOverview({ journey, plannedStartAt, transportStatus }: { journey: Journey; plannedStartAt?: string | null; customerName: string; transportStatus?: string | null }) {
  const metrics = [
    { label: "Requested journey", value: `${journey.originCountry} → ${journey.destinationCountry}` },
    { label: "Horses", value: String(journey.totalHorses) },
    { label: "Planned departure", value: formatPlanDate(plannedStartAt) },
    { label: "Current progress", value: transportStatus?.replaceAll("_", " ") ?? "Not available" },
  ]
  return <Card aria-label="Transport overview" className="min-w-0 gap-0 rounded-[2px] border-slate-200 bg-white py-0 shadow-xs"><CardContent className="p-3">
    <dl className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value }, index) =>
      <div key={label} className={`min-w-0 ${index % 2 ? "sm:border-l sm:border-slate-200 sm:pl-4" : ""} ${index === 2 ? "xl:border-l xl:border-slate-200 xl:pl-4" : ""}`}>
        <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
        <dd className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900 tabular-nums">{value}</dd>
      </div>)}</dl>
  </CardContent></Card>
}
