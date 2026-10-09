import { Search } from "lucide-react"
import { Input } from "@/shared/components/ui/input"
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter"
import { routePlanStatusSchema } from "../schemas"
import { routeStatusOptions, transportPlanSortOptions, transportPlanStatusOptions } from "../transport-plan.constants"
import { transportPlanSortSchema, transportPlanStatusSchema } from "../transport-plan.schemas"
import type { TransportPlansQueryParams } from "../transport-plan.types"

export function TransportPlanFilters({ params, onChange }: {
  params: TransportPlansQueryParams
  onChange: (patch: Partial<Omit<TransportPlansQueryParams, "pageIndex">>) => void
}) {
  return <div role="group" aria-label="Transport plan filters" tabIndex={0}
    className="w-full min-w-0 overflow-x-auto pb-1 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30">
    <div className="flex min-w-[760px] flex-nowrap items-center gap-2">
      <div className="relative min-w-[240px] flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-slate-400" />
        <Input aria-label="Search transport plans" value={params.search ?? ""} onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Search plans / bookings / customers..." className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 text-xs shadow-none" />
      </div>
      <div className="w-[148px] shrink-0 [&>button]:w-full">
        <DataTableRadioFilter title="Plan status" value={params.status ?? "ALL"} options={transportPlanStatusOptions}
          onValueChange={(value) => onChange({ status: value === "ALL" ? undefined : transportPlanStatusSchema.parse(value) })} />
      </div>
      <div className="w-[176px] shrink-0 [&>button]:w-full">
        <DataTableRadioFilter title="Route status" value={params.routePlanStatus ?? "ALL"} options={routeStatusOptions}
          onValueChange={(value) => onChange({ routePlanStatus: value === "ALL" ? undefined : routePlanStatusSchema.parse(value) })} />
      </div>
      <div className="w-[172px] shrink-0 [&>button]:w-full">
        <DataTableRadioFilter title="Newest created" ariaLabel="Sort transport plans" hideTitleWhenFiltered defaultValue="createdAt:desc"
          value={params.sortBy} options={transportPlanSortOptions} onValueChange={(value) => onChange({ sortBy: transportPlanSortSchema.parse(value) })} />
      </div>
    </div>
  </div>
}
