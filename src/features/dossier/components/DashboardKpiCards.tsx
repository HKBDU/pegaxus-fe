import { CircleCheck, FolderOpen, Send, TriangleAlert, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { DashboardKpi } from "@/features/dossier/types"
import { Skeleton } from "@/shared/components/ui/skeleton"

interface CardSpec {
  key: keyof DashboardKpi
  label: string
  hint: string
  icon: LucideIcon
  frame: string
  value: string
  iconClass: string
}

const CARDS: CardSpec[] = [
  { key: "totalActive", label: "Total active", hint: "In transit & preparation", icon: FolderOpen, frame: "border-slate-200 border-l-slate-400", value: "text-slate-900", iconClass: "text-slate-700" },
  { key: "readyForDeparture", label: "Ready", hint: "Awaiting submission/clearance", icon: CircleCheck, frame: "border-amber-300 border-l-[#ef8f00]", value: "text-slate-900", iconClass: "text-[#ef8f00]" },
  { key: "actionRequired", label: "Action required", hint: "Documents pending update", icon: TriangleAlert, frame: "border-amber-200 border-l-amber-700", value: "text-amber-800", iconClass: "text-amber-700" },
  { key: "submittedToAuthorities", label: "Submitted", hint: "With the authorities", icon: Send, frame: "border-sky-200 border-l-sky-600", value: "text-sky-800", iconClass: "text-sky-600" },
  { key: "urgentRisk", label: "Urgent risk", hint: "Departing within 7 days, not complete", icon: TriangleAlert, frame: "border-red-300 border-l-red-600", value: "text-red-700", iconClass: "text-red-600" },
]

/** The five K1 counters. Every card keeps the same size so the row does not jump while loading. */
export function DashboardKpiCards({ kpi, isLoading }: { kpi?: DashboardKpi; isLoading: boolean }) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-5">
      {CARDS.map(({ key, label, hint, icon: Icon, frame, value, iconClass }) => (
        <li key={key} className={cn("booking-panel min-h-28 border border-l-4 bg-white p-4", frame)}>
          <div className="flex items-start justify-between gap-2">
            <p className="m-0 font-heading text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
            <Icon className={cn("size-4 shrink-0", iconClass)} aria-hidden="true" />
          </div>
          {isLoading && !kpi ? (
            <Skeleton className="mt-2 h-9 w-14 rounded-none bg-slate-100" />
          ) : (
            <p className={cn("m-0 mt-1 text-4xl font-bold leading-10", value)}>{String(kpi?.[key] ?? 0).padStart(2, "0")}</p>
          )}
          <p className="m-0 mt-1 text-xs text-slate-500">{hint}</p>
        </li>
      ))}
    </ul>
  )
}
