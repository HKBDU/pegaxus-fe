import { CalendarClock, MapPin, UsersRound } from "lucide-react"
import { formatPlanDate } from "../format"
import type { ApprovedBookingDetail } from "../types"

type Journey = Pick<ApprovedBookingDetail, "originAddress" | "originCountry" | "destinationAddress" | "destinationCountry" | "totalHorses">
export function TransportOverview({ journey, plannedStartAt, customerName }: { journey: Journey; plannedStartAt?: string | null; customerName: string }) {
  const metrics = [
    { label: "Requested journey", value: `${journey.originCountry} → ${journey.destinationCountry}`, detail: `${journey.originAddress} → ${journey.destinationAddress}`, icon: MapPin },
    { label: "Horses", value: String(journey.totalHorses), detail: customerName, icon: UsersRound },
    { label: "Planned departure", value: formatPlanDate(plannedStartAt), detail: plannedStartAt ? "Transport plan schedule" : "Planning not scheduled yet", icon: CalendarClock },
  ]
  return <dl aria-label="Transport overview" className="grid min-w-0 gap-3 sm:grid-cols-3">{metrics.map(({ label, value, detail, icon: Icon }) =>
    <div key={label} className="min-w-0 rounded-[2px] border border-slate-200 bg-white p-4">
      <dt className="flex items-center justify-between gap-2 font-heading text-xs uppercase tracking-wide text-slate-500">{label}<Icon aria-hidden="true" className="size-4 shrink-0 text-primary" /></dt>
      <dd className="mt-2 space-y-1"><p className="break-words font-heading text-xl text-slate-900">{value}</p><p className="break-words text-xs leading-5 text-slate-500">{detail}</p></dd>
    </div>)}</dl>
}
