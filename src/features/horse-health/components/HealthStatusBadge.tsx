import { AlertCircle, CircleCheck, CircleDot, TriangleAlert } from "lucide-react"

import { HEALTH_STATUS_LABELS, HEALTH_STATUS_TONES } from "../constants"
import type { HealthStatus } from "../types"

const icons = { success: CircleCheck, warning: TriangleAlert, orange: AlertCircle, danger: AlertCircle }
const classes = { success: "border-emerald-200 bg-emerald-50 text-emerald-700", warning: "border-amber-200 bg-amber-50 text-amber-800", orange: "border-orange-200 bg-orange-50 text-orange-800", danger: "border-red-200 bg-red-50 text-red-700" }

export function HealthStatusBadge({ status }: { status: HealthStatus | null }) {
  if (!status) return <span className="inline-flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600"><CircleDot className="size-3.5" />No health data</span>
  const tone = HEALTH_STATUS_TONES[status]
  const Icon = icons[tone]
  return <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-xs font-semibold ${classes[tone]}`}><Icon className="size-3.5" />{HEALTH_STATUS_LABELS[status]}</span>
}
