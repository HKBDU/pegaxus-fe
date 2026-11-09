import { Check, TriangleAlert } from "lucide-react"
import { PRICE_LIST_TIERS } from "@/features/price-list/constants"
import type { PriceListItem } from "@/features/price-list/types"
import { getTierCoverage } from "@/features/price-list/utils"
import { cn } from "@/lib/utils"

interface PriceListTierCoverageProps {
  items: readonly Pick<PriceListItem, "vehicleTier">[]
}

/**
 * Which of the tiers S, M and L already have a line. A hint only (A-10): the BE decides at activation,
 * so a green row here never promises that activation will succeed.
 */
export function PriceListTierCoverage({ items }: PriceListTierCoverageProps) {
  const coverage = getTierCoverage(items)
  return (
    <div aria-label="Tier coverage" className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
      <span className="font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">Tier coverage</span>
      {PRICE_LIST_TIERS.map((tier) => (
        <span
          key={tier}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 font-medium",
            coverage[tier] ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-800",
          )}
        >
          {coverage[tier] ? <Check aria-hidden="true" className="size-3" /> : <TriangleAlert aria-hidden="true" className="size-3" />}
          {tier}
          {coverage[tier] ? null : <span className="font-normal">Missing: required to activate</span>}
        </span>
      ))}
    </div>
  )
}
