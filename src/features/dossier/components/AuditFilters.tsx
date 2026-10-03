import { useEffect, useState } from "react"
import { FilterX, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { AUDIT_ACTION_TYPES, type AuditActionType, type AuditParams } from "@/features/dossier/types"
import { humanizeAction } from "@/features/dossier/utils"
import { useDebounce } from "@/shared/hooks"
import { Button } from "@/shared/components/ui/button"
import { DataTableRadioFilter, type DataTableRadioOption } from "@/shared/components/ui/data-table-radio-filter"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Input } from "@/shared/components/ui/input"

const ACTION_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All actions" },
  ...AUDIT_ACTION_TYPES.map((action) => ({ value: action, label: humanizeAction(action) })),
]

const dateClass = "h-8 rounded-[2px] border-slate-300 bg-white px-2.5 text-xs shadow-none data-[empty=true]:text-slate-400"

interface AuditFiltersProps {
  filters: AuditParams
  onSearchChange: (value: string) => void
  onActionChange: (value: AuditActionType | "ALL") => void
  onRangeChange: (range: { from: string; to: string }) => void
  onReset: () => void
}

/** Filters of K3: actor/note search, action type and the occurredAt range. */
export function AuditFilters({ filters, onSearchChange, onActionChange, onRangeChange, onReset }: AuditFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)
  const debouncedSearch = useDebounce(localSearch, 300)
  const hasActiveFilters = Boolean(localSearch) || filters.actionType !== "ALL" || Boolean(filters.from) || Boolean(filters.to)

  useEffect(() => onSearchChange(debouncedSearch), [debouncedSearch, onSearchChange])

  return (
    <div role="toolbar" className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(15rem,1fr)_11rem_9.5rem_9.5rem_auto]">
      <div className="relative col-span-2 lg:col-span-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={localSearch}
          onChange={(event) => setLocalSearch(event.target.value)}
          aria-label="Search audit history"
          placeholder="Search by actor name or details..."
          spellCheck={false}
          className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 pr-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
        {localSearch ? (
          <button type="button" aria-label="Clear search" onClick={() => setLocalSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <DataTableRadioFilter title="Action type" value={filters.actionType} options={ACTION_OPTIONS} onValueChange={(value) => onActionChange(value as AuditActionType | "ALL")} />
      <DatePicker value={filters.from} maxDate={filters.to || undefined} onChange={(from) => onRangeChange({ from, to: filters.to })} placeholder="From date" displayFormat="dd MMM yyyy" aria-label="From date" className={cn(dateClass)} />
      <DatePicker value={filters.to} minDate={filters.from || undefined} onChange={(to) => onRangeChange({ from: filters.from, to })} placeholder="To date" displayFormat="dd MMM yyyy" aria-label="To date" className={cn(dateClass)} />

      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Reset filters"
          disabled={!hasActiveFilters}
          className="size-8 rounded-[2px] border-slate-300 bg-white p-0 shadow-none"
          onClick={() => {
            setLocalSearch("")
            onReset()
          }}
        >
          <FilterX className="size-3.5 text-slate-600" />
        </Button>
      </div>
    </div>
  )
}
