import { useEffect, useState, type ReactNode } from "react"
import { Search, X } from "lucide-react"

import { INCIDENT_CATEGORY_OPTIONS, INCIDENT_SEVERITY_OPTIONS } from "@/shared/constants/incident"
import { SeverityBadge } from "@/shared/components/incident"
import { DataTableRadioFilter, type DataTableRadioOption } from "@/shared/components/ui/data-table-radio-filter"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { FilterToolbar } from "@/shared/components/ui/filter-toolbar"
import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import { useDebounce } from "@/shared/hooks"
import type { IncidentSeverity } from "@/shared/types/incident"

import { DEFAULT_SORT, SORT_OPTIONS, STATUS_FILTER_OPTIONS } from "../constants"
import type { IncidentListParams, IncidentSort } from "../types"

const CATEGORY_OPTIONS: DataTableRadioOption[] = [
  { value: "", label: "All categories" },
  ...Object.values(INCIDENT_CATEGORY_OPTIONS).map(({ value, label }) => ({ value, label })),
]

const SEVERITY_OPTIONS: DataTableRadioOption[] = [
  { value: "", label: "All severities" },
  ...Object.values(INCIDENT_SEVERITY_OPTIONS).map(({ value, label }) => ({ value, label })),
]

const fieldLabel = "font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500"
const datePickerClass = "h-8 w-full rounded-[2px] border-slate-300 bg-white px-2.5 font-sans text-xs font-normal shadow-none"

interface IncidentFiltersProps {
  params: IncidentListParams
  onChange: (patch: Partial<IncidentListParams>) => void
  viewOptions?: ReactNode
}

/** Toolbar of the list. Same controls and sizes as the Transport Request filters, plus the incident-specific ones. */
export function IncidentFilters({ params, onChange, viewOptions }: IncidentFiltersProps) {
  const [localSearch, setLocalSearch] = useState(params.search)
  const debouncedSearch = useDebounce(localSearch, 300)

  useEffect(() => {
    onChange({ search: debouncedSearch })
  }, [debouncedSearch, onChange])

  return (
    <FilterToolbar label="Incident filters"
      activeCount={[Boolean(localSearch), Boolean(params.category), Boolean(params.severity), Boolean(params.status), Boolean(params.occurredFrom), Boolean(params.occurredTo), params.emergencySettlementRequired === true, params.sortBy !== DEFAULT_SORT].filter(Boolean).length}
      onClear={() => { setLocalSearch(""); onChange({ search: "", category: "", severity: "", status: "", occurredFrom: "", occurredTo: "", emergencySettlementRequired: undefined, sortBy: DEFAULT_SORT }) }}
      search={<div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            aria-label="Search incidents"
            placeholder="Search code, title, transport or reporter"
            maxLength={200}
            spellCheck={false}
            className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 pr-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
          />
          {localSearch ? (
            <button type="button" aria-label="Clear search" onClick={() => setLocalSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>}
      sort={<DataTableRadioFilter
          title="Sort"
          defaultValue={DEFAULT_SORT}
          value={params.sortBy}
          options={SORT_OPTIONS}
          onValueChange={(sortBy) => onChange({ sortBy: sortBy as IncidentSort })}
        />}
      actions={viewOptions}
    >
      <DataTableRadioFilter title="Category" defaultValue="" value={params.category} options={CATEGORY_OPTIONS} onValueChange={(category) => onChange({ category })} />
        <DataTableRadioFilter
          title="Severity"
          defaultValue=""
          value={params.severity}
          options={SEVERITY_OPTIONS}
          onValueChange={(severity) => onChange({ severity })}
          renderOption={(option) => (option.value ? <SeverityBadge severity={option.value as IncidentSeverity} /> : <span>{option.label}</span>)}
        />
        <DataTableRadioFilter title="Status" defaultValue="" value={params.status} options={STATUS_FILTER_OPTIONS} onValueChange={(status) => onChange({ status })} />
      <label className="flex min-h-8 cursor-pointer items-center gap-2">
          <Switch
            checked={params.emergencySettlementRequired === true}
            onCheckedChange={(checked) => onChange({ emergencySettlementRequired: checked ? true : undefined })}
            aria-label="Show only incidents that require settlement"
          />
          <span className="text-xs text-slate-700">Settlement required — show only</span>
        </label>
        <div className="grid gap-1">
          <span className={fieldLabel}>Occurred from</span>
          <DatePicker aria-label="Occurred from" value={params.occurredFrom} maxDate={params.occurredTo || undefined} onChange={(occurredFrom) => onChange({ occurredFrom })} placeholder="From" displayFormat="dd MMM yyyy" className={datePickerClass} />
        </div>
        <div className="grid gap-1">
          <span className={fieldLabel}>Occurred to</span>
          <DatePicker aria-label="Occurred to" value={params.occurredTo} minDate={params.occurredFrom || undefined} onChange={(occurredTo) => onChange({ occurredTo })} placeholder="To" displayFormat="dd MMM yyyy" className={datePickerClass} />
        </div>
    </FilterToolbar>
  )
}
