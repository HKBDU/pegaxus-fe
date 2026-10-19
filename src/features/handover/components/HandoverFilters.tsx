import { Search } from "lucide-react"
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter"
import { Input } from "@/shared/components/ui/input"
import { STATUS_OPTIONS, TYPE_OPTIONS } from "../constants"

interface Props {
  search: string
  handoverType: string
  status: string
  onSearchChange: (value: string) => void
  onTypeChange: (value: string) => void
  onStatusChange: (value: string) => void
}

const typeOptions = [{ value: "ALL", label: "All types" }, ...TYPE_OPTIONS]
const statusOptions = [{ value: "ALL", label: "All statuses" }, ...STATUS_OPTIONS]

/** Search box plus the two filters of the design. The search runs on the loaded records, the filters go to HO1. */
export function HandoverFilters({ search, handoverType, status, onSearchChange, onTypeChange, onStatusChange }: Props) {
  return (
    <div role="group" aria-label="Handover filters" className="@container min-w-0 p-1">
      <div className="grid min-w-0 grid-cols-2 items-start gap-2 @min-[40rem]:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">
        <div className="relative col-span-2 min-w-0 @min-[40rem]:col-span-1">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Search handover records"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by code or party name..."
            className="h-10 rounded-[2px] border-slate-300 bg-white pl-8 text-base font-normal shadow-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/20 sm:h-8 sm:text-xs"
          />
        </div>
        <div className="min-w-0 [&>button]:h-10 [&>button]:w-full sm:[&>button]:h-8">
          <DataTableRadioFilter title="All types" ariaLabel="Handover type" value={handoverType} options={typeOptions} hideTitleWhenFiltered onValueChange={onTypeChange} />
        </div>
        <div className="min-w-0 [&>button]:h-10 [&>button]:w-full sm:[&>button]:h-8">
          <DataTableRadioFilter title="All statuses" ariaLabel="Handover status" value={status} options={statusOptions} hideTitleWhenFiltered onValueChange={onStatusChange} />
        </div>
      </div>
    </div>
  )
}
