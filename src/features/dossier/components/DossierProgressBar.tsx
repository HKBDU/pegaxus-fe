import { cn } from "@/lib/utils"

function barColor(percent: number) {
  if (percent >= 100) return "bg-emerald-600"
  if (percent >= 75) return "bg-[#ef8f00]"
  if (percent >= 35) return "bg-amber-700"
  return "bg-red-600"
}

/** Completion of the mandatory requirements, shown as a thin bar and a percentage. */
export function DossierProgressBar({ percent, className }: { percent: number; className?: string }) {
  const value = Math.max(0, Math.min(100, percent))
  return (
    <div className={cn("flex min-w-28 items-center gap-2", className)}>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} className="h-1.5 flex-1 overflow-hidden bg-slate-200">
        <div className={cn("h-full", barColor(value))} style={{ width: `${value}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[0.7rem] font-medium text-slate-600">{Math.round(value)}%</span>
    </div>
  )
}
