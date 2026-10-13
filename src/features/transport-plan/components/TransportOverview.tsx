import { CalendarClock, MapPin, UsersRound, Truck } from "lucide-react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { formatPlanDate } from "../format"
import type { ApprovedBookingDetail } from "../types"

type Journey = Pick<ApprovedBookingDetail, "originAddress" | "originCountry" | "destinationAddress" | "destinationCountry" | "totalHorses">
export function TransportOverview({ journey, plannedStartAt, customerName, transportStatus }: { journey: Journey; plannedStartAt?: string | null; customerName: string; transportStatus?: string | null }) {
  const metrics = [
    { label: "Requested journey", value: `${journey.originCountry} → ${journey.destinationCountry}`, detail: `${journey.originAddress} → ${journey.destinationAddress}`, icon: MapPin },
    { label: "Horses", value: String(journey.totalHorses), detail: customerName, icon: UsersRound },
    { label: "Planned departure", value: formatPlanDate(plannedStartAt), detail: plannedStartAt ? "Transport plan schedule" : "Planning not scheduled yet", icon: CalendarClock },
    { label: "Current progress", value: transportStatus?.replaceAll("_", " ") ?? "Not available", detail: "Current transport stage", icon: Truck },
  ]
  return <div aria-label="Transport overview" className="grid min-w-0 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, detail, icon: Icon }) =>
    <Card key={label} className="min-w-0 gap-0 rounded-[2px] border-slate-200 bg-white py-0 shadow-xs"><CardContent className="p-3">
      <dl><dt className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}<span className="flex size-6 shrink-0 items-center justify-center rounded-[2px] bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-3.5" /></span></dt>
      <dd className="mt-1.5 space-y-1"><p className="break-words font-heading text-xl leading-7 text-slate-900 tabular-nums">{value}</p><p className="break-words text-xs leading-5 text-slate-500">{detail}</p></dd></dl>
    </CardContent></Card>)}</div>
}
