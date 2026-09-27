import { RotateCcw, Search } from "lucide-react"

import { PROFILE_ROLES } from "@/app/route-config"
import { ACCOUNT_TYPE_LABELS, EMAIL_VERIFICATION_LABELS } from "@/features/profile/constants/profile.constants"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter"
import { formatAccountLabel, type AccountFilters } from "../mock-data"

interface UserAccountFiltersProps {
  filters: AccountFilters
  onChange: (filters: AccountFilters) => void
  onReset: () => void
}

export function UserAccountFilters({ filters, onChange, onReset }: UserAccountFiltersProps) {
  const controls = [
    { key: "role", title: "Role", options: [{ value: "ALL", label: "All Roles" }, ...(PROFILE_ROLES.anyRole ?? []).map((value) => ({ value, label: formatAccountLabel(value) }))] },
    { key: "accountType", title: "Account Type", options: [{ value: "ALL", label: "All Types" }, ...Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }))] },
    { key: "verification", title: "Verified", options: [{ value: "ALL", label: "All" }, ...Object.entries(EMAIL_VERIFICATION_LABELS).map(([value, label]) => ({ value, label }))] },
    { key: "status", title: "Status", options: [{ value: "ALL", label: "All" }, ...["ACTIVE", "INACTIVE", "SUSPENDED"].map((value) => ({ value, label: formatAccountLabel(value) }))] },
  ] as const

  return (
    <div role="toolbar" aria-label="User account filters" className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-[minmax(16rem,1fr)_repeat(4,minmax(0,8.5rem))_auto]">
      <div className="relative col-span-2 sm:col-span-4 xl:col-span-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          aria-label="Search user accounts by name, email or employee ID"
          placeholder="Search by name, email or employee ID..."
          spellCheck={false}
          className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
      </div>
      {controls.map(({ key, title, options }) => (
        <DataTableRadioFilter key={key} title={title} value={filters[key]} options={[...options]} onValueChange={(value) => onChange({ ...filters, [key]: value })} />
      ))}
      <Button type="button" variant="outline" size="sm" onClick={onReset} className="h-8 rounded-[2px] border-slate-300 bg-white px-2.5 font-sans text-xs font-normal normal-case tracking-normal shadow-none">
        <RotateCcw className="size-3.5" /> Reset
      </Button>
    </div>
  )
}
