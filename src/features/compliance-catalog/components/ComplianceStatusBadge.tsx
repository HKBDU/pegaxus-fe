import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ComplianceStatus } from "@/features/compliance-catalog/types"
import { getComplianceStatusLabel } from "@/features/compliance-catalog/utils"
import { Badge } from "@/shared/components/ui/badge"

const statusStyles: Record<ComplianceStatus, string> = {
  ACTIVE: "border-emerald-300 bg-emerald-50 text-emerald-700",
  INACTIVE: "border-slate-300 bg-slate-100 text-slate-600",
}

export function ComplianceStatusBadge({ status, className }: { status: ComplianceStatus; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1 rounded-full border px-1.5 py-0 text-[0.65rem] font-medium leading-none",
        statusStyles[status],
        className,
      )}
    >
      <Circle className="size-1! fill-current" aria-hidden="true" />
      {getComplianceStatusLabel(status)}
    </Badge>
  )
}
