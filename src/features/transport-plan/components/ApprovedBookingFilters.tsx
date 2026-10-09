import { Search } from "lucide-react"
import { Input } from "@/shared/components/ui/input"
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter"
import { routeStatusOptions } from "../constants"
import { transportPlanStatusOptions } from "../transport-plan.constants"
import { routePlanStatusSchema, transportPlanStatusSchema } from "../schemas"
import { DepartureDateRangeFilter } from "./DepartureDateRangeFilter"
import type { ApprovedBookingsQueryParams } from "../types"

interface Props {
  params: ApprovedBookingsQueryParams
  onChange: (patch: Partial<Omit<ApprovedBookingsQueryParams, "pageIndex">>) => void
}

export function ApprovedBookingFilters({ params, onChange }: Props) {
  return <div role="group" aria-label="Approved booking filters" className="rounded-md border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full min-w-0 sm:min-w-[240px] sm:flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-slate-400" />
        <Input aria-label="Search approved bookings" value={params.search ?? ""} onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Search booking code or customer..." className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 text-xs shadow-none" />
      </div>
      <div className="w-full sm:w-[172px] [&>button]:w-full">
        <DataTableRadioFilter title="Plan status" value={params.transportPlanStatus ?? "ALL"} options={transportPlanStatusOptions}
          onValueChange={(value) => onChange({ transportPlanStatus: value === "ALL" ? undefined : transportPlanStatusSchema.parse(value) })} />
      </div>
      <div className="w-full sm:w-[176px] [&>button]:w-full">
        <DataTableRadioFilter title="Route status" value={params.routePlanStatus ?? "ALL"} options={routeStatusOptions}
          onValueChange={(value) => onChange({ routePlanStatus: value === "ALL" ? undefined : routePlanStatusSchema.parse(value) })} />
      </div>
      <DepartureDateRangeFilter from={params.departureFrom} to={params.departureTo} onChange={onChange} />
    </div>
    <p className="mt-2 text-[11px] text-slate-500">Departure: {params.sortBy === "requestedDepartureDate:asc" ? "Earliest first" : params.sortBy === "requestedDepartureDate:desc" ? "Latest first" : "Sorted by table column"}</p>
  </div>
}
