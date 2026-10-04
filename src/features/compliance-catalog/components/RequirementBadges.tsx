import { cn } from "@/lib/utils"
import type { RequirementStatus } from "@/features/compliance-catalog/dossier-types"
import type { ComplianceCategory } from "@/features/compliance-catalog/types"
import { getComplianceCategoryLabel } from "@/features/compliance-catalog/utils"
import { Badge } from "@/shared/components/ui/badge"

const baseClass = "inline-flex h-5 w-fit items-center rounded-full border px-2 py-0 text-[0.65rem] font-medium leading-none"

const categoryStyles: Record<ComplianceCategory, string> = {
  QUARANTINE: "border-rose-200 bg-rose-50 text-rose-700",
  CUSTOMS: "border-amber-200 bg-amber-50 text-amber-700",
  TRANSPORT: "border-sky-200 bg-sky-50 text-sky-700",
  HORSE_HEALTH: "border-emerald-200 bg-emerald-50 text-emerald-700",
  HORSE_IDENTITY: "border-violet-200 bg-violet-50 text-violet-700",
  OTHER: "border-slate-200 bg-slate-50 text-slate-600",
}

export function CategoryBadge({ category }: { category: ComplianceCategory | null }) {
  if (!category) return <span className="text-slate-400">—</span>
  return <Badge variant="outline" className={cn(baseClass, categoryStyles[category])}>{getComplianceCategoryLabel(category)}</Badge>
}

export function ScopeBadge({ scope }: { scope: "HORSE" | "TRIP" }) {
  return (
    <Badge variant="outline" className={cn(baseClass, scope === "HORSE" ? "border-sky-200 bg-sky-50 text-sky-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
      {scope === "HORSE" ? "Per horse" : "Per trip"}
    </Badge>
  )
}

export function MandatoryBadge({ mandatory }: { mandatory: boolean }) {
  return (
    <Badge variant="outline" className={cn(baseClass, mandatory ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-100 text-slate-600")}>
      {mandatory ? "Yes" : "No"}
    </Badge>
  )
}

const requirementStatusStyles: Record<RequirementStatus, string> = {
  PENDING: "border-slate-300 bg-slate-100 text-slate-600",
  REQUESTED: "border-amber-300 bg-amber-50 text-amber-700",
  PROVIDED: "border-sky-300 bg-sky-50 text-sky-700",
  SATISFIED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-300 bg-red-50 text-red-700",
  WAIVED: "border-dashed border-slate-300 bg-white text-slate-500",
}

const requirementStatusLabels: Record<RequirementStatus, string> = {
  PENDING: "Pending upload",
  REQUESTED: "Requested",
  PROVIDED: "Awaiting review",
  SATISFIED: "Satisfied",
  REJECTED: "Rejected",
  WAIVED: "Waived",
}

export const getRequirementStatusLabel = (status: RequirementStatus) => requirementStatusLabels[status]

export function RequirementStatusBadge({ status }: { status: RequirementStatus }) {
  return <Badge variant="outline" className={cn(baseClass, requirementStatusStyles[status])}>{requirementStatusLabels[status]}</Badge>
}

export const REQUIREMENT_STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  ...(Object.keys(requirementStatusLabels) as RequirementStatus[]).map((status) => ({ value: status, label: requirementStatusLabels[status] })),
]
