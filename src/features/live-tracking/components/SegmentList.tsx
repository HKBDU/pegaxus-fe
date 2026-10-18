import { CalendarClock, Route, Truck, Warehouse } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { formatDateTime, formatKm, humanize } from "../lib/format"
import type { SegmentDetail } from "../types"
import { StatusBadge } from "./StatusBadge"

const DOT: Record<string, string> = { COMPLETED: "bg-emerald-600", IN_TRANSIT: "bg-primary", PLANNED: "bg-slate-500" }
const STRIPE: Record<string, string> = { COMPLETED: "border-t-emerald-500", IN_TRANSIT: "border-t-primary", PLANNED: "border-t-slate-300" }

interface SegmentListProps {
  segments: SegmentDetail[]
  selectedId: string | undefined
  onSelect: (routePlanRouteId: string) => void
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span aria-hidden="true" className="mt-0.5 text-gray-400 [&>svg]:size-3.5">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-[0.06em] text-gray-500">{label}</dt>
        <dd className="truncate text-xs font-semibold text-gray-800" title={value}>
          {value}
        </dd>
      </div>
    </div>
  )
}

/** "Route Segments": every leg of the journey as a card; picking one shows its details below. */
export function SegmentList({ segments, selectedId, onSelect }: SegmentListProps) {
  return (
    <section aria-label="Route segments" className="grid gap-3">
      <header className="flex items-baseline justify-between">
        <h2 className="font-heading text-sm! leading-5! font-medium uppercase tracking-[0.06em]">Route Segments</h2>
        <span className="text-xs text-gray-500">
          {segments.length} {segments.length === 1 ? "segment" : "segments"} · select one for details
        </span>
      </header>
      {segments.length === 0 ? <p className="text-sm text-gray-500">This transport has no segments yet.</p> : null}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {segments.map((segment) => {
          const selected = segment.routePlanRouteId === selectedId
          return (
            <li key={segment.routePlanRouteId}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(segment.routePlanRouteId)}
                className={cn(
                  "h-full w-full rounded-lg border border-t-4 bg-white p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  STRIPE[segment.status] ?? "border-t-slate-300",
                  selected ? "border-primary ring-2 ring-primary/30" : "border-[#e5e2d9]",
                )}
              >
                <span className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white", DOT[segment.status] ?? "bg-slate-500")}
                  >
                    {segment.displayOrder}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900" title={segment.fromLocation.locationName}>
                      {segment.fromLocation.locationName}
                    </span>
                    <span className="block truncate text-xs text-gray-500" title={segment.toLocation.locationName}>
                      → {segment.toLocation.locationName}
                    </span>
                  </span>
                  <StatusBadge status={segment.status} />
                </span>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-dashed border-[#e5e2d9] pt-3">
                  <Fact icon={<Route />} label="Distance" value={formatKm(segment.distanceKm)} />
                  <Fact icon={<CalendarClock />} label="Planned arrival" value={formatDateTime(segment.plannedArrivalAt)} />
                  <Fact icon={<Warehouse />} label="Stop type" value={humanize(segment.toLocation.locationType)} />
                  <Fact icon={<Truck />} label="Provider" value={segment.provider?.providerName ?? (segment.isOutsourced ? "Outsourced" : "In-house")} />
                </dl>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
