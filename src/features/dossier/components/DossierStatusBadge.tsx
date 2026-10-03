import { cn } from "@/lib/utils"
import type { DossierStatus } from "@/features/dossier/types"
import { getDossierStatusLabel } from "@/features/dossier/utils"

const statusStyles: Record<DossierStatus, string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  IN_PREPARATION: "bg-slate-900 text-white",
  READY_FOR_SUBMISSION: "bg-[#ef8f00] text-white",
  SUBMITTED: "bg-sky-700 text-white",
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-700 text-white",
  REJECTED: "bg-red-700 text-white",
  CLOSED: "bg-slate-400 text-white",
}

export function DossierStatusBadge({ status, className }: { status: DossierStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center whitespace-nowrap rounded-[2px] px-2 py-1 font-heading text-[0.62rem] font-semibold uppercase leading-none tracking-[0.06em]",
        statusStyles[status],
        className,
      )}
    >
      {getDossierStatusLabel(status)}
    </span>
  )
}
