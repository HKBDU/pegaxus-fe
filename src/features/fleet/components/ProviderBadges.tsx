import { Circle, Plane, Ship, Truck } from "lucide-react"

import { cn } from "@/lib/utils"
import { PROVIDER_MODE_LABEL, PROVIDER_STATUS_LABEL } from "@/features/fleet/constants/fleet.constants"
import type { ProviderStatus, TransportMode } from "@/features/fleet/types"
import { Badge } from "@/shared/components/ui/badge"

/** Same badge shape and palette as the transport request status badge. */
const statusStyles: Record<ProviderStatus, string> = {
  ACTIVE: "border-emerald-300 bg-emerald-50 text-emerald-700",
  INACTIVE: "border-slate-300 bg-slate-100 text-slate-600",
  SUSPENDED: "border-red-300 bg-red-50 text-red-700",
}

export function ProviderStatusBadge({ status }: { status: ProviderStatus }) {
  return (
    <Badge variant="outline" className={cn("inline-flex h-5 w-fit items-center gap-1 rounded-full border px-1.5 py-0 text-[0.65rem] font-medium leading-none", statusStyles[status])}>
      <Circle className="size-1! fill-current" aria-hidden="true" />
      {PROVIDER_STATUS_LABEL[status]}
    </Badge>
  )
}

const modeStyles: Record<TransportMode, { className: string; Icon: typeof Truck }> = {
  AIR: { className: "border-sky-300 bg-sky-50 text-sky-700", Icon: Plane },
  ROAD: { className: "border-amber-300 bg-amber-50 text-amber-700", Icon: Truck },
  SEA: { className: "border-violet-300 bg-violet-50 text-violet-700", Icon: Ship },
}

export function ProviderModeBadge({ mode }: { mode: TransportMode }) {
  const { className, Icon } = modeStyles[mode]
  return (
    <Badge variant="outline" className={cn("inline-flex h-5 w-fit items-center gap-1 rounded-full border px-1.5 py-0 text-[0.65rem] font-medium leading-none", className)}>
      <Icon className="size-3" aria-hidden="true" />
      {PROVIDER_MODE_LABEL[mode]}
    </Badge>
  )
}
