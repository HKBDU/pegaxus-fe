import { cn } from "@/lib/utils"
import { humanize } from "../lib/format"

const TONE: Record<string, string> = {
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  IN_TRANSIT: "border-orange-200 bg-orange-50 text-orange-700",
  PLANNED: "border-slate-200 bg-slate-100 text-slate-600",
  READY: "border-amber-200 bg-amber-50 text-amber-700",
}

/** Status of a leg or of the transport (`PLANNED`, `IN_TRANSIT`, `COMPLETED`, `READY`). */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-heading text-[10px] font-medium uppercase tracking-[0.08em] whitespace-nowrap",
        TONE[status] ?? "border-slate-200 bg-slate-100 text-slate-600",
        className,
      )}
    >
      {humanize(status)}
    </span>
  )
}
