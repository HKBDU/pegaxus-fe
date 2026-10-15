import { Plane, Ship, Truck } from "lucide-react"

import { cn } from "@/lib/utils"
import { PROVIDER_MODE_LABEL, PROVIDER_STATUS_LABEL } from "@/features/fleet/constants/fleet.constants"
import type { ProviderStatus, TransportMode } from "@/features/fleet/types"

const statusStyles: Record<ProviderStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-slate-200 text-slate-600",
  SUSPENDED: "bg-red-100 text-red-600",
}

export function ProviderStatusBadge({ status }: { status: ProviderStatus }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-[3px] px-2 text-[10px] font-bold uppercase leading-none tracking-[0.04em]", statusStyles[status])}>
      {PROVIDER_STATUS_LABEL[status]}
    </span>
  )
}

const modeStyles: Record<TransportMode, { className: string; Icon: typeof Truck }> = {
  AIR: { className: "bg-sky-100 text-sky-700", Icon: Plane },
  ROAD: { className: "bg-amber-100 text-amber-700", Icon: Truck },
  SEA: { className: "bg-violet-100 text-violet-700", Icon: Ship },
}

export function ProviderModeBadge({ mode }: { mode: TransportMode }) {
  const { className, Icon } = modeStyles[mode]
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-medium leading-none", className)}>
      <Icon className="size-3" aria-hidden="true" />
      {PROVIDER_MODE_LABEL[mode]}
    </span>
  )
}
