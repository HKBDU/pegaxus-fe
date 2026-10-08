import { RotateCcw, Search } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter"
import { depositOptions, initialApprovedBookingParams, planningOptions, scopeOptions, sortOptions } from "../constants"
import { approvedBookingSortSchema, depositStatusSchema, routePlanningStatusSchema, transportScopeSchema } from "../schemas"
import type { ApprovedBookingsQueryParams } from "../types"

interface Props {
  params: ApprovedBookingsQueryParams
  onChange: (patch: Partial<Omit<ApprovedBookingsQueryParams, "pageIndex">>) => void
  onReset: () => void
}

export function ApprovedBookingFilters({ params, onChange, onReset }: Props) {
  return <div className="flex flex-col gap-2.5" aria-label="Approved booking filters">
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_160px_160px_190px]">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-slate-400" />
        <Input aria-label="Search approved bookings" value={params.search ?? ""} onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Search booking code or customer..." className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 text-xs shadow-none" />
      </div>
      <DataTableRadioFilter title="Transport scope" value={params.transportScope ?? "ALL"} options={scopeOptions}
        onValueChange={(value) => onChange({ transportScope: value === "ALL" ? undefined : transportScopeSchema.parse(value) })} />
      <DataTableRadioFilter title="Deposit" value={params.depositStatus ?? "ALL"} options={depositOptions}
        onValueChange={(value) => onChange({ depositStatus: value === "ALL" ? undefined : depositStatusSchema.parse(value) })} />
      <DataTableRadioFilter title="Route planning" value={params.routePlanningStatus ?? "ALL"} options={planningOptions}
        onValueChange={(value) => onChange({ routePlanningStatus: value === "ALL" ? undefined : routePlanningStatusSchema.parse(value) })} />
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500">Departure</span>
      <div className="w-40 grow sm:grow-0">
        <DatePicker aria-label="Departure from" placeholder="From date" value={params.departureFrom} maxDate={params.departureTo}
          onChange={(value) => onChange({ departureFrom: value || undefined })} className="h-8 rounded-[2px] border-slate-300 bg-white px-2.5 text-xs shadow-none" />
      </div>
      <span aria-hidden="true" className="text-slate-400">–</span>
      <div className="w-40 grow sm:grow-0">
        <DatePicker aria-label="Departure to" placeholder="To date" value={params.departureTo} minDate={params.departureFrom}
          onChange={(value) => onChange({ departureTo: value || undefined })} className="h-8 rounded-[2px] border-slate-300 bg-white px-2.5 text-xs shadow-none" />
      </div>
      <div className="w-52 sm:ml-auto">
        <DataTableRadioFilter title="Departure: earliest" ariaLabel="Sort approved bookings" hideTitleWhenFiltered
          value={params.sortBy} defaultValue={initialApprovedBookingParams.sortBy} options={sortOptions}
          onValueChange={(value) => onChange({ sortBy: approvedBookingSortSchema.parse(value) })} />
      </div>
      <Button type="button" variant="outline" size="sm" className="h-8 rounded-[2px] bg-white text-xs" onClick={onReset}>
        <RotateCcw className="size-3.5" /> Reset
      </Button>
    </div>
  </div>
}
