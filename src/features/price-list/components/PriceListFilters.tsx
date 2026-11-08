import type { ReactNode } from "react"
import { Plus, Search, X } from "lucide-react"

import { priceListSortOptions, type PriceListSortBy } from "@/features/price-list/list.schemas"
import { Button } from "@/shared/components/ui/button"
import { DataTableRadioFilter, type DataTableRadioOption } from "@/shared/components/ui/data-table-radio-filter"
import { Input } from "@/shared/components/ui/input"

const SORT_LABELS: Record<PriceListSortBy, string> = {
  "createdAt:desc": "Newest first",
  "createdAt:asc": "Oldest first",
  "updatedAt:desc": "Recently updated",
  "updatedAt:asc": "Least recently updated",
  "name:asc": "Name (A–Z)",
  "name:desc": "Name (Z–A)",
}

const SORT_OPTIONS: DataTableRadioOption[] = priceListSortOptions.map((value) => ({ value, label: SORT_LABELS[value] }))

const STATUS_OPTIONS: DataTableRadioOption[] = [
  { value: "all", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
]

interface PriceListFiltersProps {
  search: string
  isActive?: boolean
  sortBy: PriceListSortBy
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSortChange: (value: PriceListSortBy) => void
  /** The "View" column picker, built by the table. */
  viewOptions?: ReactNode
  onCreate?: () => void
}

/** Same toolbar layout as the transport request and invoice lists: search, filters, then view options and the main action. */
export function PriceListFilters({ search, isActive, sortBy, onSearchChange, onStatusChange, onSortChange, viewOptions, onCreate }: PriceListFiltersProps) {
  return (
    <div role="toolbar" aria-label="Price list filters" className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(17rem,1fr)_10rem_11rem_auto]">
      <div className="relative col-span-2 lg:col-span-1">
        <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search price lists by name"
          placeholder="Search by name"
          spellCheck={false}
          className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 pr-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
        {search ? (
          <button type="button" aria-label="Clear search" onClick={() => onSearchChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>

      <DataTableRadioFilter
        title="All statuses"
        ariaLabel="Price list status"
        hideTitleWhenFiltered
        defaultValue="all"
        value={isActive === undefined ? "all" : String(isActive)}
        options={STATUS_OPTIONS}
        onValueChange={onStatusChange}
      />
      <DataTableRadioFilter
        title="Newest first"
        ariaLabel="Sort price lists"
        hideTitleWhenFiltered
        defaultValue="createdAt:desc"
        value={sortBy}
        options={SORT_OPTIONS}
        onValueChange={(value) => onSortChange(value as PriceListSortBy)}
      />

      <div className="col-span-2 flex items-center justify-end gap-1.5 lg:col-span-1 max-lg:[&_button]:w-full">
        {viewOptions}
        {onCreate ? (
          <Button type="button" size="sm" className="h-8 rounded-[2px] bg-[#ef8f00] px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]" onClick={onCreate}>
            <Plus aria-hidden="true" className="size-3.5" />
            Create price list
          </Button>
        ) : null}
      </div>
    </div>
  )
}
