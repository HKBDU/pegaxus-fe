import { Circle, Plane, Ship, TriangleAlert, Truck } from "lucide-react"

import { cn } from "@/lib/utils"
import { TRANSPORT_MODE_SHORT, VEHICLE_STATUS_LABEL } from "@/features/fleet/constants/fleet.constants"
import type { ExpiryStatus, TransportMode, VehicleStatus } from "@/features/fleet/types"
import { formatFleetDate } from "@/features/fleet/utils"
import { Badge } from "@/shared/components/ui/badge"

const badgeClass = "inline-flex h-5 w-fit items-center gap-1 rounded-full border px-1.5 py-0 text-[0.65rem] font-medium leading-none"

/** Same badge shape as the transport request status badge. */
const statusStyles: Record<VehicleStatus, string> = {
  AVAILABLE: "border-emerald-300 bg-emerald-50 text-emerald-700",
  IN_USE: "border-amber-300 bg-amber-50 text-amber-700",
  ASSIGNED: "border-sky-300 bg-sky-50 text-sky-700",
  MAINTENANCE: "border-violet-300 bg-violet-50 text-violet-700",
  INACTIVE: "border-slate-300 bg-slate-100 text-slate-600",
}

export function VehicleStatusBadge({ status, className }: { status: VehicleStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(badgeClass, statusStyles[status], className)}>
      <Circle className="size-1! fill-current" aria-hidden="true" />
      {VEHICLE_STATUS_LABEL[status]}
    </Badge>
  )
}

const modeIcons = { ROAD: Truck, AIR: Plane, SEA: Ship } as const

export function VehicleModeBadge({ mode }: { mode: TransportMode }) {
  const Icon = modeIcons[mode]
  return (
    <Badge variant="outline" className={cn(badgeClass, "border-slate-300 bg-slate-50 text-slate-700")}>
      <Icon className="size-3" aria-hidden="true" />
      {TRANSPORT_MODE_SHORT[mode]}
    </Badge>
  )
}

export function CapacityChip({ capacity }: { capacity: number }) {
  return (
    <Badge variant="outline" className={cn(badgeClass, "border-amber-300 bg-amber-50 text-amber-700")}>
      {capacity} {capacity === 1 ? "horse" : "horses"}
    </Badge>
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
      <Badge variant="outline" className={cn(badgeClass, expired ? "border-red-300 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-700")}>
        <TriangleAlert className="size-3" aria-hidden="true" />
        {expired ? `Expired ${label.toLowerCase()}` : `${label.toLowerCase()} expiring`} ({formatFleetDate(date)})
      </Badge>
    )
  }
  return (
    <span className="text-slate-600">
      {label === "INSP" ? "Insp" : "Ins"}: {shortDate}
    </span>
  )
}
