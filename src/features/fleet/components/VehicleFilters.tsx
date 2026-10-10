import { useEffect, useState, type ReactNode } from "react"
import { FilterX, Search, X } from "lucide-react"

import {
  CAPACITY_FILTER_OPTIONS,
  DEFAULT_VEHICLE_SORT,
  TRANSPORT_MODE_SHORT,
  VEHICLE_STATUS_LABEL,
  VEHICLE_TYPE_OPTIONS,
} from "@/features/fleet/constants/fleet.constants"
import { TRANSPORT_MODES, VEHICLE_STATUSES, type TransportMode, type VehicleListParams, type VehicleStatus } from "@/features/fleet/types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { useDebounce } from "@/shared/hooks"

const labelClass = "font-heading text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] text-[#181818]"
const controlClass = "h-9 w-full rounded-[2px] border-0 bg-[#f3f3f3] px-2.5 text-xs font-normal text-[#181818] shadow-none focus-visible:ring-2 focus-visible:ring-primary/40"

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  allLabel: string
  options: { value: string; label: string }[]
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <span className={labelClass}>{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className={`${controlClass} justify-between`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72 rounded-[2px]">
          <SelectItem value="ALL" className="text-xs">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface VehicleFiltersProps {
  filters: VehicleListParams
  onSearchChange: (value: string) => void
  onPatch: (patch: Partial<VehicleListParams>) => void
  onReset: () => void
  /** Extra nodes after the reset button. */
  trailing?: ReactNode
}

/** SCR-F3-023 filter panel: search + mode + status + vehicle type + capacity (VH1 query). */
export function VehicleFilters({ filters, onSearchChange, onPatch, onReset, trailing }: VehicleFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)
  const debouncedSearch = useDebounce(localSearch, 300)
  const hasActiveFilters =
    Boolean(localSearch) ||
    filters.transportMode !== "ALL" ||
    filters.status !== "ALL" ||
    filters.vehicleType !== "ALL" ||
    filters.minCapacity !== "ALL" ||
    filters.sortBy !== DEFAULT_VEHICLE_SORT

  useEffect(() => onSearchChange(debouncedSearch), [debouncedSearch, onSearchChange])

  return (
    <div role="toolbar" aria-label="Vehicle filters" className="booking-panel grid gap-3 border bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1.4fr)_repeat(4,minmax(0,1fr))_auto]">
      <div className="grid min-w-0 gap-1 sm:col-span-2 lg:col-span-1">
        <span className={labelClass}>Search</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            aria-label="Search vehicles"
            placeholder="Search vehicle code, plate, name..."
            spellCheck={false}
            className={`${controlClass} pl-8 pr-8 placeholder:text-xs placeholder:text-[#8a8780]`}
          />
          {localSearch ? (
            <button type="button" aria-label="Clear search" onClick={() => setLocalSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <FilterSelect
        label="Mode"
        value={filters.transportMode}
        allLabel="All Modes"
        options={TRANSPORT_MODES.map((mode) => ({ value: mode, label: TRANSPORT_MODE_SHORT[mode] }))}
        onChange={(value) => onPatch({ transportMode: value as TransportMode | "ALL" })}
      />
      <FilterSelect
        label="Status"
        value={filters.status}
        allLabel="All Statuses"
        options={VEHICLE_STATUSES.map((status) => ({ value: status, label: VEHICLE_STATUS_LABEL[status] }))}
        onChange={(value) => onPatch({ status: value as VehicleStatus | "ALL" })}
      />
      <FilterSelect
        label="Vehicle type"
        value={filters.vehicleType}
        allLabel="All Types"
        options={VEHICLE_TYPE_OPTIONS.map((type) => ({ value: type, label: type }))}
        onChange={(value) => onPatch({ vehicleType: value })}
      />
      <FilterSelect
        label="Capacity"
        value={String(filters.minCapacity)}
        allLabel="Any Capacity"
        options={CAPACITY_FILTER_OPTIONS.filter((option) => option.value !== "ALL")}
        onChange={(value) => onPatch({ minCapacity: value === "ALL" ? "ALL" : Number(value) })}
      />

      <div className="flex items-end gap-1.5">
        <Button
          type="button"
          variant="outline"
          aria-label="Reset filters"
          title="Reset filters"
          disabled={!hasActiveFilters}
          className="size-9 rounded-[2px] border-0 bg-[#e9e6de] p-0 shadow-none hover:bg-[#dedbd2]"
          onClick={() => {
            setLocalSearch("")
            onReset()
          }}
        >
          <FilterX className="size-4 text-slate-700" />
        </Button>
        {trailing}
      </div>
    </div>
  )
}
