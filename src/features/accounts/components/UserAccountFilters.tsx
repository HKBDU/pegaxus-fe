import { RotateCcw, Search } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter"
import { employeeRoles, formatAccountLabel, initialEmployeeParams } from "../constants"
import type { EmployeeListParams } from "../types"

interface UserAccountFiltersProps {
  filters: EmployeeListParams
  onChange: (filters: EmployeeListParams) => void
  viewOptions: ReactNode
}

export function UserAccountFilters({ filters, onChange, viewOptions }: UserAccountFiltersProps) {
  const controls = [
    { key: "role", title: "Role", options: [{ value: "ALL", label: "All Roles" }, ...employeeRoles.map((value) => ({ value, label: formatAccountLabel(value) }))] },
    { key: "accountStatus", title: "Account Status", options: [{ value: "ALL", label: "All" }, ...["ACTIVE", "INACTIVE"].map((value) => ({ value, label: formatAccountLabel(value) }))] },
    { key: "workingStatus", title: "Working Status", options: [{ value: "ALL", label: "All" }, ...["ACTIVE", "INACTIVE"].map((value) => ({ value, label: formatAccountLabel(value) }))] },
  ] as const

  return (
    <div role="toolbar" aria-label="User account filters" className="grid grid-cols-2 items-center gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(12rem,1.8fr)_repeat(3,minmax(0,1fr))_auto_auto]">
      <div className="relative col-span-2 min-w-0 sm:col-span-3 lg:col-span-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value, pageIndex: 1 })}
          aria-label="Search user accounts by name, email or employee ID"
          placeholder="Search name, email, phone or employee code..."
          spellCheck={false}
          className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
      </div>
      {controls.map(({ key, title, options }) => (
        <DataTableRadioFilter key={key} title={title} value={filters[key]} options={[...options]} onValueChange={(value) => onChange({ ...filters, [key]: value, pageIndex: 1 })} />
      ))}
      {viewOptions}
    </div>
  )
}
