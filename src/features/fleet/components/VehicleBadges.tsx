import { Plane, Ship, TriangleAlert, Truck } from "lucide-react"

import { cn } from "@/lib/utils"
import { TRANSPORT_MODE_SHORT, VEHICLE_STATUS_LABEL } from "@/features/fleet/constants/fleet.constants"
import type { ExpiryStatus, TransportMode, VehicleStatus } from "@/features/fleet/types"
import { formatFleetDate } from "@/features/fleet/utils"

const statusStyles: Record<VehicleStatus, string> = {
  AVAILABLE: "bg-[#0b0b0b] text-white",
  IN_USE: "bg-[#ef8f00] text-white",
  MAINTENANCE: "bg-[#f1e4d3] text-[#8a6a3f]",
  ASSIGNED: "bg-slate-600 text-white",
  INACTIVE: "bg-slate-300 text-slate-700",
}

export function VehicleStatusBadge({ status, className }: { status: VehicleStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-[2px] px-2 font-heading text-[10px] font-semibold uppercase leading-none tracking-[0.06em]",
        statusStyles[status],
        className,
      )}
    >
      {VEHICLE_STATUS_LABEL[status]}
    </span>
  )
}

const modeIcons = { ROAD: Truck, AIR: Plane, SEA: Ship } as const

export function VehicleModeBadge({ mode }: { mode: TransportMode }) {
  const Icon = modeIcons[mode]
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-[2px] bg-[#0b0b0b] px-1.5 font-heading text-[10px] font-semibold uppercase leading-none tracking-[0.06em] text-white">
      <Icon className="size-3" aria-hidden="true" />
      {TRANSPORT_MODE_SHORT[mode]}
    </span>
  )
}

export function CapacityChip({ capacity }: { capacity: number }) {
  return (
    <span className="inline-flex h-5 items-center rounded-[2px] bg-[#fbe6c7] px-2 font-heading text-[10px] font-semibold uppercase leading-none tracking-[0.04em] text-[#8a5a00]">
      {capacity} {capacity === 1 ? "HORSE" : "HORSES"}
    </span>
  )
}

/** One "Insp:" / "Ins:" line of the Inspection & Insurance column; the expiry state comes from the BE. */
export function ExpiryLine({
  label,
  status,
  date,
  shortDate,
}: {
  label: "INSP" | "INS"
  status: ExpiryStatus
  date: string | null
  shortDate: string
}) {
  if (status === "EXPIRED" || status === "EXPIRING_SOON") {
    const expired = status === "EXPIRED"
    return (
      <span
        className={cn(
          "inline-flex h-5 w-fit items-center gap-1 rounded-[2px] px-1.5 font-heading text-[10px] font-semibold uppercase leading-none tracking-[0.04em]",
          expired ? "bg-red-700 text-white" : "bg-amber-100 text-amber-800",
        )}
      >
        <TriangleAlert className="size-3" aria-hidden="true" />
        {expired ? `EXPIRED ${label}` : `${label} EXPIRING`} ({formatFleetDate(date)})
      </span>
    )
  }
  return (
    <span className="text-slate-600">
      {label === "INSP" ? "Insp" : "Ins"}: {shortDate}
    </span>
  )
}
