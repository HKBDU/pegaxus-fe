import { useEffect, useState, type ReactNode } from "react"
import { Plus, Search, X } from "lucide-react"

import { BOOKING_STATUSES, type BookingAudience, type BookingSort, type BookingStatus } from "@/features/booking/types"
import { getBookingStatusLabel } from "@/features/booking/utils"
import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge"
import { useDebounce } from "@/shared/hooks"
import { Button } from "@/shared/components/ui/button"
import { DataTableRadioFilter, type DataTableRadioOption } from "@/shared/components/ui/data-table-radio-filter"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"

type StatusFilter = BookingStatus | "ALL"

function getStatusOptions(audience: BookingAudience): DataTableRadioOption[] {
  return [
    { value: "ALL", label: "All statuses" },
    ...BOOKING_STATUSES.map((status) => ({ value: status, label: getBookingStatusLabel(status, audience) })),
  ]
}

interface BookingFiltersProps {
  audience?: BookingAudience
  search: string
  status: StatusFilter
  sortBy: BookingSort
  onSearchChange: (value: string) => void
  onStatusChange: (value: StatusFilter) => void
  onSortChange: (value: BookingSort) => void
  onCreate?: () => void
  viewOptions?: ReactNode
}

export function BookingFilters({
  audience = "customer",
  search,
  status,
  sortBy,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onCreate,
  viewOptions,
}: BookingFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search)
  const debouncedSearch = useDebounce(localSearch, 300)

  useEffect(() => onSearchChange(debouncedSearch), [debouncedSearch, onSearchChange])

  return (
    <div role="toolbar" className="grid grid-cols-3 gap-2 lg:grid-cols-[minmax(17rem,1fr)_10rem_9.5rem_auto]">
      <div className="relative col-span-3 lg:col-span-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={localSearch}
          onChange={(event) => setLocalSearch(event.target.value)}
          aria-label="Search bookings"
          placeholder="Search request, customer or route"
          spellCheck={false}
          className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 pr-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
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
        options={getStatusOptions(audience)}
        onValueChange={(value) => onStatusChange(value as StatusFilter)}
        renderOption={(option) => option.value === "ALL"
          ? <span>{option.label}</span>
          : <BookingStatusBadge status={option.value as BookingStatus} audience={audience} />}
      />

      <Select value={sortBy} onValueChange={(value) => onSortChange(value as BookingSort)}>
        <SelectTrigger className="h-8 w-full data-[size=default]:h-8 rounded-[2px] border-slate-300 bg-white text-xs shadow-none focus:border-amber-500 focus:ring-amber-500/20">
          <SelectValue aria-label="Booking sort order" />
        </SelectTrigger>
        <SelectContent position="popper" align="start" sideOffset={2} className="rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md">
          <SelectItem value="createdAt:desc" className="h-7 rounded-[2px] text-xs">Newest</SelectItem>
          <SelectItem value="createdAt:asc" className="h-7 rounded-[2px] text-xs">Oldest</SelectItem>
          <SelectItem value="requestedDepartureDate:asc" className="h-7 rounded-[2px] text-xs">Departure date</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center justify-end gap-1.5 max-lg:[&_button]:w-full">
        {viewOptions}
        {/* Below lg the "New request" button lives next to the page title instead. */}
        {onCreate ? (
          <div className="hidden lg:block">
            <Button type="button" size="sm" className="h-8 rounded-[2px] bg-[#ef8f00] px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]" onClick={onCreate}>
              <Plus className="size-3.5" />
              New request
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
