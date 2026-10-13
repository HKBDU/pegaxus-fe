import { Search } from "lucide-react"
import { Input } from "@/shared/components/ui/input"
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter"
import { routePlanStatusSchema } from "../schemas"
import { routeStatusOptions, transportPlanSortOptions, transportPlanStatusOptions } from "../constants"
import { transportPlanSortSchema, transportPlanStatusSchema } from "../schemas"
import type { TransportPlansQueryParams } from "../types"

export function TransportPlanFilters({ params, onChange }: {
  params: TransportPlansQueryParams
  onChange: (patch: Partial<Omit<TransportPlansQueryParams, "pageIndex">>) => void
}) {
  return <div role="group" aria-label="Transport plan filters" className="w-full min-w-0 overflow-x-auto p-1">
    <div className="flex min-w-max items-center gap-2">
      <div className="relative min-w-52 flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input aria-label="Search transport plans" value={params.search ?? ""} onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Search plans / bookings / customers..." className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 font-sans text-xs font-normal shadow-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/20 motion-reduce:transition-none" />
      </div>
      <div className="w-36 shrink-0 [&>button]:w-full">
        <DataTableRadioFilter title="Plan status" value={params.status ?? "ALL"} options={transportPlanStatusOptions}
          onValueChange={(value) => onChange({ status: value === "ALL" ? undefined : transportPlanStatusSchema.parse(value) })} />
      </div>
      <div className="w-36 shrink-0 [&>button]:w-full">
        <DataTableRadioFilter title="Route status" value={params.routePlanStatus ?? "ALL"} options={routeStatusOptions}
          onValueChange={(value) => onChange({ routePlanStatus: value === "ALL" ? undefined : routePlanStatusSchema.parse(value) })} />
      </div>
      <div className="w-40 shrink-0 [&>button]:w-full">
        <DataTableRadioFilter title="Newest created" ariaLabel="Sort transport plans" hideTitleWhenFiltered defaultValue="createdAt:desc"
          value={params.sortBy} options={transportPlanSortOptions} onValueChange={(value) => onChange({ sortBy: transportPlanSortSchema.parse(value) })} />
      </div>
    </div>
  </div>
}
