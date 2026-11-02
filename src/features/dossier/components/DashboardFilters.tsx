import { useEffect, useState, type ReactNode } from "react"
import { Search, X } from "lucide-react"

import { DOSSIER_STATUSES, type DashboardParams, type DashboardSort, type DossierRisk, type DossierRouteType, type DossierStatus } from "@/features/dossier/types"
import { getDossierStatusLabel } from "@/features/dossier/utils"
import { useDebounce } from "@/shared/hooks"
import { FilterToolbar } from "@/shared/components/ui/filter-toolbar"
import { DataTableRadioFilter, type DataTableRadioOption } from "@/shared/components/ui/data-table-radio-filter"
import { Input } from "@/shared/components/ui/input"

/** Soonest departure first is the default order, so it is not shown as an active filter. */
export const DEFAULT_DASHBOARD_SORT: DashboardSort = "requestedDepartureDate:asc"

const ROUTE_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All routes" },
  { value: "DOMESTIC", label: "Domestic" },
  { value: "CROSS_BORDER", label: "Cross-border" },
]

const STATUS_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All statuses" },
  ...DOSSIER_STATUSES.map((status) => ({ value: status, label: getDossierStatusLabel(status) })),
]

const RISK_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All risk levels" },
  { value: "URGENT_RISK", label: "Urgent risk" },
  { value: "NORMAL", label: "Normal" },
]

const SORT_OPTIONS: DataTableRadioOption[] = [
  { value: "requestedDepartureDate:asc", label: "Departure: soonest" },
  { value: "requestedDepartureDate:desc", label: "Departure: latest" },
  { value: "progressPercent:asc", label: "Progress: lowest" },
  { value: "progressPercent:desc", label: "Progress: highest" },
]

interface DashboardFiltersProps {
  filters: DashboardParams
  onSearchChange: (value: string) => void
  onRouteChange: (value: DossierRouteType | "ALL") => void
  onStatusChange: (value: DossierStatus | "ALL") => void
  onRiskChange: (value: DossierRisk | "ALL") => void
  onSortChange: (value: DashboardSort) => void
  onReset: () => void
  viewOptions?: ReactNode
}

export function DashboardFilters({ filters, onSearchChange, onRouteChange, onStatusChange, onRiskChange, onSortChange, onReset, viewOptions }: DashboardFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)
  const debouncedSearch = useDebounce(localSearch, 300)
  const activeCount = [Boolean(localSearch), filters.routeType !== "ALL", filters.status !== "ALL", filters.risk !== "ALL", filters.sortBy !== DEFAULT_DASHBOARD_SORT].filter(Boolean).length

  useEffect(() => onSearchChange(debouncedSearch), [debouncedSearch, onSearchChange])

  return (
    <FilterToolbar
      label="Dossier filters"
      activeCount={activeCount}
      onClear={() => { setLocalSearch(""); onReset() }}
      search={<div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={localSearch}
          onChange={(event) => setLocalSearch(event.target.value)}
          aria-label="Search dossiers"
          placeholder="Search by dossier code, booking, client..."
          spellCheck={false}
          className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 pr-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
        {localSearch ? (
          <button type="button" aria-label="Clear search" onClick={() => setLocalSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>}
      sort={<DataTableRadioFilter title="Sort" value={filters.sortBy} defaultValue={DEFAULT_DASHBOARD_SORT} options={SORT_OPTIONS} onValueChange={(value) => onSortChange(value as DashboardSort)} />}
      actions={viewOptions}
    >
      <DataTableRadioFilter title="Route" value={filters.routeType} options={ROUTE_OPTIONS} onValueChange={(value) => onRouteChange(value as DossierRouteType | "ALL")} />
      <DataTableRadioFilter title="Status" value={filters.status} options={STATUS_OPTIONS} onValueChange={(value) => onStatusChange(value as DossierStatus | "ALL")} />
      <DataTableRadioFilter title="Risk level" value={filters.risk} options={RISK_OPTIONS} onValueChange={(value) => onRiskChange(value as DossierRisk | "ALL")} />
    </FilterToolbar>
  )
}
