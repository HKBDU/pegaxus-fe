import { useEffect, useState, type ReactNode } from "react"
import { Search, X } from "lucide-react"

import { OngoingTransportStatusBadge } from "@/features/ongoing-transport/components/OngoingTransportStatusBadge"
import { useDebounce } from "@/shared/hooks"
import { DataTableRadioFilter, type DataTableRadioOption } from "@/shared/components/ui/data-table-radio-filter"
import { Input } from "@/shared/components/ui/input"

export type AssignedStatusFilter = "ALL" | "READY" | "IN_TRANSIT" | "COMPLETED"
export type AssignedSort = "departureAt:asc" | "departureAt:desc" | "transportCode:asc"

/** Soonest departure first is the default order: selectable, but not shown as an active filter badge. */
export const DEFAULT_ASSIGNED_SORT: AssignedSort = "departureAt:asc"

const SORT_OPTIONS: DataTableRadioOption[] = [
  { value: "departureAt:asc", label: "Departure (soonest)" },
  { value: "departureAt:desc", label: "Departure (latest)" },
  { value: "transportCode:asc", label: "Transport code" },
]

const STATUS_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All statuses" },
  { value: "READY", label: "Ready" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "COMPLETED", label: "Completed" },
]

interface AssignedTransportFiltersProps {
  search: string
  status: AssignedStatusFilter
  sortBy: AssignedSort
  onSearchChange: (value: string) => void
  onStatusChange: (value: AssignedStatusFilter) => void
  onSortChange: (value: AssignedSort) => void
  viewOptions?: ReactNode
}

/** Same toolbar as the booking list: search, status, sort and the column picker. */
export function AssignedTransportFilters({
  search,
  status,
  sortBy,
  onSearchChange,
  onStatusChange,
  onSortChange,
  viewOptions,
}: AssignedTransportFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search)
  const debouncedSearch = useDebounce(localSearch, 300)

  useEffect(() => onSearchChange(debouncedSearch), [debouncedSearch, onSearchChange])

  return (
    <div role="toolbar" className="grid grid-cols-3 gap-2 lg:grid-cols-[minmax(17rem,1fr)_10rem_11rem_auto]">
      <div className="relative col-span-3 lg:col-span-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={localSearch}
          onChange={(event) => setLocalSearch(event.target.value)}
          aria-label="Search assigned transports"
          placeholder="Search transport, booking or route"
          spellCheck={false}
          className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 pr-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400"
        />
        {localSearch ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setLocalSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <DataTableRadioFilter
        title="Status"
        value={status}
        options={STATUS_OPTIONS}
        onValueChange={(value) => onStatusChange(value as AssignedStatusFilter)}
        renderOption={(option) => option.value === "ALL"
          ? <span>{option.label}</span>
          : <OngoingTransportStatusBadge status={option.value as Exclude<AssignedStatusFilter, "ALL">} />}
      />

      <DataTableRadioFilter
        title="Sort"
        value={sortBy}
        defaultValue={DEFAULT_ASSIGNED_SORT}
        options={SORT_OPTIONS}
        onValueChange={(value) => onSortChange(value as AssignedSort)}
      />

      <div className="flex items-center justify-end gap-1.5 max-lg:[&_button]:w-full">{viewOptions}</div>
    </div>
  )
}
