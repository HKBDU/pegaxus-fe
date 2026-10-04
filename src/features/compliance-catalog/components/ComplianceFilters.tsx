import { useEffect, useState, type ReactNode } from "react"
import { FilterX, Search, X } from "lucide-react"

import { COMPLIANCE_COUNTRIES } from "@/features/compliance-catalog/constants/countries"
import { ComplianceStatusBadge } from "@/features/compliance-catalog/components/ComplianceStatusBadge"
import {
  COMPLIANCE_CATEGORIES,
  COMPLIANCE_STATUSES,
  type ComplianceCategory,
  type ComplianceRequirementListParams,
  type ComplianceSort,
  type ComplianceStatus,
} from "@/features/compliance-catalog/types"
import { getComplianceCategoryLabel } from "@/features/compliance-catalog/utils"
import { useDebounce } from "@/shared/hooks"
import { Button } from "@/shared/components/ui/button"
import { DataTableRadioFilter, type DataTableRadioOption } from "@/shared/components/ui/data-table-radio-filter"
import { Input } from "@/shared/components/ui/input"

/** Latest change first is the default order: selectable, but not shown as an active filter badge. */
export const DEFAULT_COMPLIANCE_SORT: ComplianceSort = "updatedAt:desc"

const SORT_OPTIONS: DataTableRadioOption[] = [
  { value: "updatedAt:desc", label: "Last updated" },
  { value: "updatedAt:asc", label: "Oldest updated" },
  { value: "requirementCode:asc", label: "Code A-Z" },
]

export const COUNTRY_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All countries" },
  ...COMPLIANCE_COUNTRIES.map((country) => ({ value: country.code, label: `${country.name} (${country.code})` })),
]

const CATEGORY_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All categories" },
  ...COMPLIANCE_CATEGORIES.map((category) => ({ value: category, label: getComplianceCategoryLabel(category) })),
]

const STATUS_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All statuses" },
  ...COMPLIANCE_STATUSES.map((status) => ({ value: status, label: status === "ACTIVE" ? "Active" : "Inactive" })),
]

interface ComplianceFiltersProps {
  filters: ComplianceRequirementListParams
  onSearchChange: (value: string) => void
  onCountryChange: (value: string) => void
  onCategoryChange: (value: ComplianceCategory | "ALL") => void
  onStatusChange: (value: ComplianceStatus | "ALL") => void
  onSortChange: (value: ComplianceSort) => void
  onReset: () => void
  viewOptions?: ReactNode
}

export function ComplianceFilters({
  filters,
  onSearchChange,
  onCountryChange,
  onCategoryChange,
  onStatusChange,
  onSortChange,
  onReset,
  viewOptions,
}: ComplianceFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)
  const debouncedSearch = useDebounce(localSearch, 300)
  const hasActiveFilters =
    Boolean(localSearch) || filters.country !== "ALL" || filters.category !== "ALL" || filters.status !== "ALL" || filters.sortBy !== DEFAULT_COMPLIANCE_SORT

  useEffect(() => onSearchChange(debouncedSearch), [debouncedSearch, onSearchChange])

  return (
    <div role="toolbar" className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(15rem,1fr)_9.5rem_9.5rem_9rem_9.5rem_auto]">
      <div className="relative col-span-2 lg:col-span-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={localSearch}
          onChange={(event) => setLocalSearch(event.target.value)}
          aria-label="Search compliance requirements"
          placeholder="Search by code or name..."
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

      <DataTableRadioFilter title="Country" value={filters.country} options={COUNTRY_OPTIONS} onValueChange={onCountryChange} />

      <DataTableRadioFilter
        title="Category"
        value={filters.category}
        options={CATEGORY_OPTIONS}
        onValueChange={(value) => onCategoryChange(value as ComplianceCategory | "ALL")}
      />

      <DataTableRadioFilter
        title="Status"
        value={filters.status}
        options={STATUS_OPTIONS}
        onValueChange={(value) => onStatusChange(value as ComplianceStatus | "ALL")}
        renderOption={(option) => option.value === "ALL"
          ? <span>{option.label}</span>
          : <ComplianceStatusBadge status={option.value as ComplianceStatus} />}
      />

      <DataTableRadioFilter
        title="Sort"
        value={filters.sortBy}
        defaultValue={DEFAULT_COMPLIANCE_SORT}
        options={SORT_OPTIONS}
        onValueChange={(value) => onSortChange(value as ComplianceSort)}
      />

      <div className="flex items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Reset filters"
          title="Reset filters"
          disabled={!hasActiveFilters}
          className="size-8 rounded-[2px] border-slate-300 bg-white p-0 shadow-none"
          onClick={() => {
            setLocalSearch("")
            onReset()
          }}
        >
          <FilterX className="size-3.5 text-slate-600" />
        </Button>
        {viewOptions}
      </div>
    </div>
  )
}
