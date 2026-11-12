import { AlertCircle, CircleCheck, CircleDot, TriangleAlert } from "lucide-react"

import { HEALTH_STATUS_LABELS, HEALTH_STATUS_TONES } from "../constants"
import type { HealthStatus } from "../types"

const icons = { success: CircleCheck, warning: TriangleAlert, orange: AlertCircle, danger: AlertCircle }
const classes = { success: "border-emerald-200 bg-emerald-50 text-emerald-700", warning: "border-amber-200 bg-amber-50 text-amber-800", orange: "border-orange-200 bg-orange-50 text-orange-800", danger: "border-red-200 bg-red-50 text-red-700" }
// Same size as the web's status badges (10px label, 2px radius).
const base = "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xs border px-1.5 py-0.5 text-[10px] font-medium"

export function HealthStatusBadge({ status }: { status: HealthStatus | null }) {
  if (!status) return <span className={`${base} border-slate-200 bg-slate-50 text-slate-600`}><CircleDot className="size-3" aria-hidden="true" />No health data</span>
  const tone = HEALTH_STATUS_TONES[status]
  const Icon = icons[tone]
  return <span className={`${base} ${classes[tone]}`}><Icon className="size-3" aria-hidden="true" />{HEALTH_STATUS_LABELS[status]}</span>
}
