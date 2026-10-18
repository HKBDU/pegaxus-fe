import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/lib/utils"
import { statusLabel } from "../utils"

/** Same pill as the Transport Plan status badges (colour tones, size, sentence-case label). */
const TONE: Record<string, string> = {
  PLANNED: "border-slate-200 bg-slate-100 text-slate-600",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("h-5 rounded-full px-2 py-0 text-[10px] leading-none font-medium whitespace-nowrap", TONE[status] ?? "border-slate-200 bg-slate-50 text-slate-600", className)}>
      {statusLabel(status)}
    </Badge>
  )
}
