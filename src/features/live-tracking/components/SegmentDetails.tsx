import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { formatDateTime, humanize } from "../lib/format"
import { welfareText, welfareTone } from "../lib/summary"
import type { SegmentDetail, TransportOverview } from "../types"
import { StatusBadge } from "./StatusBadge"

const WELFARE_TONE = { good: "text-emerald-700", warn: "text-amber-700", bad: "text-red-700", none: "text-gray-700" } as const

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-[#faf9f5] px-3 py-2.5">
      <dt className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm leading-5 font-semibold break-words text-gray-900">{children}</dd>
    </div>
  )
}

function Sub({ children }: { children: ReactNode }) {
  return <span className="block text-xs font-normal text-gray-500">{children}</span>
}

function crew(member: SegmentDetail["driver"]) {
  if (!member) return "-"
  return (
    <>
      {member.fullName}
      {member.phone ? <Sub>{member.phone}</Sub> : null}
    </>
  )
}

/** "Selected Segment Details": crew, provider, vehicles, times and note of the chosen leg, plus the horses' welfare. */
export function SegmentDetails({ segment, overview }: { segment: SegmentDetail | undefined; overview: TransportOverview | undefined }) {
  if (!segment) return null
  const vehicles = segment.vehicles
    .map((vehicle) => vehicle.licensePlate || vehicle.vehicleCode)
    .filter(Boolean)
    .join(", ")

  return (
    <section aria-label="Selected segment details" className="rounded-lg border border-[#e5e2d9] bg-white p-4 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center gap-2.5">
        <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-primary text-[11px] font-semibold text-white">
          {segment.displayOrder}
        </span>
        <h2 className="font-heading text-sm! leading-5! font-medium uppercase tracking-[0.06em]">Selected Segment Details</h2>
        <span className="text-xs text-gray-500">
          {segment.fromLocation.locationName} → {segment.toLocation.locationName}
        </span>
        <StatusBadge status={segment.status} className="ml-auto" />
      </header>
      <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Item label="Driver">{crew(segment.driver)}</Item>
        <Item label="Escort">{crew(segment.escort)}</Item>
        <Item label="Provider">
          {segment.provider?.providerName ?? (segment.isOutsourced ? "Outsourced" : "In-house")}
          {segment.provider?.serviceType ? <Sub>{humanize(segment.provider.serviceType)}</Sub> : null}
          {segment.provider?.providerReference ? <Sub>Ref. {segment.provider.providerReference}</Sub> : null}
        </Item>
        <Item label="Vehicles">{vehicles || "-"}</Item>
        <Item label="Departure">
          {formatDateTime(segment.actualDepartureAt ?? segment.plannedDepartureAt)}
          <Sub>{segment.actualDepartureAt ? "Actual" : "Planned"}</Sub>
        </Item>
        <Item label="Arrival">
          {formatDateTime(segment.actualArrivalAt ?? segment.plannedArrivalAt)}
          <Sub>{segment.actualArrivalAt ? "Actual" : "Planned"}</Sub>
        </Item>
        <Item label="Transport mode">{humanize(segment.transportMode)}</Item>
        {overview ? (
          <Item label="Horse welfare">
            <span className={cn(WELFARE_TONE[welfareTone(overview.horseHealthSummary)])}>{welfareText(overview.horseHealthSummary)}</span>
          </Item>
        ) : null}
        {segment.note ? (
          <div className="min-w-0 rounded-lg bg-[#faf9f5] px-3 py-2.5 sm:col-span-2 xl:col-span-4">
            <dt className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">Note</dt>
            <dd className="mt-1 text-sm text-gray-800">{segment.note}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}
