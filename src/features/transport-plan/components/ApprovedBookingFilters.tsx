import { Search } from "lucide-react"
import { Input } from "@/shared/components/ui/input"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter"
import { depositOptions, initialApprovedBookingParams, planningOptions, scopeOptions, sortOptions } from "../constants"
import { approvedBookingSortSchema, depositStatusSchema, routePlanningStatusSchema, transportScopeSchema } from "../schemas"
import type { ApprovedBookingsQueryParams } from "../types"

interface Props {
  params: ApprovedBookingsQueryParams
  onChange: (patch: Partial<Omit<ApprovedBookingsQueryParams, "pageIndex">>) => void
}

export function ApprovedBookingFilters({ params, onChange }: Props) {
  return <div role="group" aria-label="Approved booking filters" tabIndex={0}
    className="w-full min-w-0 overflow-x-auto pb-1 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30">
    <div className="flex min-w-[1216px] flex-nowrap items-center gap-2">
      <div className="relative min-w-[240px] flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-slate-400" />
        <Input aria-label="Search approved bookings" value={params.search ?? ""} onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Search booking code or customer..." className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 text-xs shadow-none" />
      </div>
      <div className="w-[148px] shrink-0 [&>button]:w-full">
        <DataTableRadioFilter title="Transport scope" value={params.transportScope ?? "ALL"} options={scopeOptions}
        onValueChange={(value) => onChange({ transportScope: value === "ALL" ? undefined : transportScopeSchema.parse(value) })} />
      </div>
      <div className="w-[128px] shrink-0 [&>button]:w-full">
        <DataTableRadioFilter title="Deposit" value={params.depositStatus ?? "ALL"} options={depositOptions}
        onValueChange={(value) => onChange({ depositStatus: value === "ALL" ? undefined : depositStatusSchema.parse(value) })} />
      </div>
      <div className="w-[176px] shrink-0 [&>button]:w-full">
        <DataTableRadioFilter title="Route planning" value={params.routePlanningStatus ?? "ALL"} options={planningOptions}
        onValueChange={(value) => onChange({ routePlanningStatus: value === "ALL" ? undefined : routePlanningStatusSchema.parse(value) })} />
      </div>
      <div className="w-[140px] shrink-0">
        <DatePicker aria-label="Departure from" placeholder="From date" value={params.departureFrom} maxDate={params.departureTo}
          onChange={(value) => onChange({ departureFrom: value || undefined })} className="h-8 rounded-[2px] border-slate-300 bg-white px-2.5 text-xs shadow-none" />
      </div>
      <div className="w-[140px] shrink-0">
        <DatePicker aria-label="Departure to" placeholder="To date" value={params.departureTo} minDate={params.departureFrom}
          onChange={(value) => onChange({ departureTo: value || undefined })} className="h-8 rounded-[2px] border-slate-300 bg-white px-2.5 text-xs shadow-none" />
      </div>
      <div className="w-[188px] shrink-0 [&>button]:w-full">
        <DataTableRadioFilter title="Departure: earliest" ariaLabel="Sort approved bookings" hideTitleWhenFiltered
          value={params.sortBy} defaultValue={initialApprovedBookingParams.sortBy} options={sortOptions}
          onValueChange={(value) => onChange({ sortBy: approvedBookingSortSchema.parse(value) })} />
      </div>
    </div>
  </div>
}
