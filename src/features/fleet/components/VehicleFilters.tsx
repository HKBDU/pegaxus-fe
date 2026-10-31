import { useEffect, useState, type ReactNode } from "react"
import { Search, X } from "lucide-react"

import {
  CAPACITY_FILTER_OPTIONS,
  DEFAULT_VEHICLE_SORT,
  VEHICLE_SORT_OPTIONS,
  VEHICLE_STATUS_LABEL,
  VEHICLE_TYPE_OPTIONS,
  VEHICLE_COUNTRY_OPTIONS,
} from "@/features/fleet/constants/fleet.constants"
import { VEHICLE_STATUSES, type VehicleListParams, type VehicleSort, type VehicleStatus } from "@/features/fleet/types"
import { DataTableRadioFilter, type DataTableRadioOption } from "@/shared/components/ui/data-table-radio-filter"
import { FilterToolbar } from "@/shared/components/ui/filter-toolbar"
import { Input } from "@/shared/components/ui/input"
import { useDebounce } from "@/shared/hooks"

const STATUS_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All statuses" },
  ...VEHICLE_STATUSES.map((status) => ({ value: status, label: VEHICLE_STATUS_LABEL[status] })),
]
const TYPE_OPTIONS: DataTableRadioOption[] = [{ value: "ALL", label: "All types" }, ...VEHICLE_TYPE_OPTIONS.map((type) => ({ value: type, label: type }))]
const CAPACITY_OPTIONS: DataTableRadioOption[] = CAPACITY_FILTER_OPTIONS.map((option) => (option.value === "ALL" ? { ...option, label: "Any capacity" } : option))
const SORT_OPTIONS: DataTableRadioOption[] = VEHICLE_SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label.charAt(0) + option.label.slice(1).toLowerCase() }))
const COUNTRY_OPTIONS: DataTableRadioOption[] = VEHICLE_COUNTRY_OPTIONS.map((country) => ({ value: country, label: country === "ALL" ? "All countries" : country }))

interface VehicleFiltersProps {
  filters: VehicleListParams
  onSearchChange: (value: string) => void
  onPatch: (patch: Partial<VehicleListParams>) => void
  /** View-options menu and the "new vehicle" button, shown at the end of the toolbar. */
  trailing?: ReactNode
}

/** SCR-F3-023 toolbar: search + status + type + capacity + sort (VH1 query), built like the transport request toolbar. Mode is fixed to ROAD. */
export function VehicleFilters({ filters, onSearchChange, onPatch, trailing }: VehicleFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)
  const debouncedSearch = useDebounce(localSearch, 300)

  useEffect(() => onSearchChange(debouncedSearch), [debouncedSearch, onSearchChange])

  return (
    <FilterToolbar label="Vehicle filters"
      activeCount={[Boolean(localSearch), filters.status !== "ALL", filters.vehicleType !== "ALL", filters.minCapacity !== "ALL", Boolean(filters.country), filters.sortBy !== DEFAULT_VEHICLE_SORT].filter(Boolean).length}
      onClear={() => { setLocalSearch(""); onPatch({ search: "", status: "ALL", vehicleType: "ALL", minCapacity: "ALL", country: undefined, sortBy: DEFAULT_VEHICLE_SORT }) }}
      search={<div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={localSearch}
          onChange={(event) => setLocalSearch(event.target.value)}
          aria-label="Search vehicles"
          placeholder="Search code, plate or name"
          spellCheck={false}
          className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 pr-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
        {localSearch ? (
          <button type="button" aria-label="Clear search" onClick={() => setLocalSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>}
      sort={<DataTableRadioFilter title="Sort" value={filters.sortBy} defaultValue={DEFAULT_VEHICLE_SORT} options={SORT_OPTIONS} onValueChange={(value) => onPatch({ sortBy: value as VehicleSort })} />}
      actions={trailing}
    >
      <DataTableRadioFilter title="Status" value={filters.status} options={STATUS_OPTIONS} onValueChange={(value) => onPatch({ status: value as VehicleStatus | "ALL" })} />
      <DataTableRadioFilter title="Type" value={filters.vehicleType} options={TYPE_OPTIONS} onValueChange={(value) => onPatch({ vehicleType: value })} />
      <DataTableRadioFilter
        title="Capacity"
        value={String(filters.minCapacity)}
        options={CAPACITY_OPTIONS}
        onValueChange={(value) => onPatch({ minCapacity: value === "ALL" ? "ALL" : Number(value) })}
      />

      <DataTableRadioFilter title="Country" value={filters.country ?? "ALL"} options={COUNTRY_OPTIONS} onValueChange={(value) => onPatch({ country: value === "ALL" ? undefined : value })} />
    </FilterToolbar>
  )
}
