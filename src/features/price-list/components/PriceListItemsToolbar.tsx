import type { ReactNode } from "react"
import { Plus, Search, X } from "lucide-react"
import {
  PRICE_LIST_ITEM_TYPE_LABELS,
  PRICE_LIST_ITEM_TYPES,
  PRICE_LIST_TIER_LABELS,
  PRICE_LIST_TIERS,
  ALL_TIERS_LABEL,
} from "@/features/price-list/constants"
import type { PriceListTierFilter, PriceListTypeFilter } from "@/features/price-list/utils"
import { Button } from "@/shared/components/ui/button"
import { DataTableRadioFilter, type DataTableRadioOption } from "@/shared/components/ui/data-table-radio-filter"
import { Input } from "@/shared/components/ui/input"

const TIER_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All tiers" },
  ...PRICE_LIST_TIERS.map((tier) => ({ value: tier, label: PRICE_LIST_TIER_LABELS[tier] })),
  { value: "NONE", label: `${ALL_TIERS_LABEL} (no tier)` },
]

const TYPE_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All types" },
  ...PRICE_LIST_ITEM_TYPES.map((type) => ({ value: type, label: PRICE_LIST_ITEM_TYPE_LABELS[type] })),
]

interface PriceListItemsToolbarProps {
  search: string
  tier: PriceListTierFilter
  type: PriceListTypeFilter
  onSearchChange: (value: string) => void
  onTierChange: (value: PriceListTierFilter) => void
  onTypeChange: (value: PriceListTypeFilter) => void
  /** The "View" column picker, built by the table. */
  viewOptions?: ReactNode
  /** Shown only while the list can still gain lines. */
  onAdd?: () => void
}

/** Same toolbar as the transport request list: search on the left, filters in the middle, view options and the main action on the right. */
export function PriceListItemsToolbar({ search, tier, type, onSearchChange, onTierChange, onTypeChange, viewOptions, onAdd }: PriceListItemsToolbarProps) {
  return (
    <div role="toolbar" className="grid grid-cols-3 gap-2 lg:grid-cols-[minmax(17rem,1fr)_10rem_10rem_auto]">
      <div className="relative col-span-3 lg:col-span-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search price lines"
          placeholder="Search code or name"
          spellCheck={false}
          className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 pr-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
        {search ? (
          <button type="button" aria-label="Clear search" onClick={() => onSearchChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <DataTableRadioFilter title="Tier" value={tier} options={TIER_OPTIONS} onValueChange={(value) => onTierChange(value as PriceListTierFilter)} />
      <DataTableRadioFilter title="Type" value={type} options={TYPE_OPTIONS} onValueChange={(value) => onTypeChange(value as PriceListTypeFilter)} />

      <div className="flex items-center justify-end gap-1.5 max-lg:[&_button]:w-full">
        {viewOptions}
        {onAdd ? (
          <Button type="button" size="sm" className="h-8 rounded-[2px] bg-[#ef8f00] px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]" onClick={onAdd}>
            <Plus className="size-3.5" />
            Add price line
          </Button>
        ) : null}
      </div>
    </div>
  )
}
