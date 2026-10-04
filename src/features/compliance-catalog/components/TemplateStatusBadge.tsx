import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"
import type { TemplateStatus } from "@/features/compliance-catalog/template-types"
import { getTemplateStatusLabel } from "@/features/compliance-catalog/template-utils"
import { Badge } from "@/shared/components/ui/badge"

const statusStyles: Record<TemplateStatus, string> = {
  ACTIVE: "border-emerald-300 bg-emerald-50 text-emerald-700",
  DRAFT: "border-amber-300 bg-amber-50 text-amber-700",
  INACTIVE: "border-red-300 bg-red-50 text-red-700",
}

export function TemplateStatusBadge({ status, className }: { status: TemplateStatus; className?: string }) {
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
      {getTemplateStatusLabel(status)}
    </Badge>
  )
}
