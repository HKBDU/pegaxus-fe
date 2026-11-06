import { PRICE_LIST_TIERS, type PriceListItemType, type PriceListTier } from "@/features/price-list/constants"
import type { PriceListItem } from "@/features/price-list/types"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isPriceListId = (value: string | undefined): value is string => Boolean(value && UUID.test(value))

/** 20 -> "20%", 37.5 -> "37.5%", 12.345 -> "12.35%". The BE sends `20.00`, which JSON already turns into 20. */
export function formatRate(rate: number) {
  return `${Number(rate.toFixed(2))}%`
}

/** Whole amounts only, with thousand separators: 1600 -> "1,600". */
export function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)
}

/**
 * Which of the three tiers have a line of their own. Only a hint for the manager (A-10):
 * the BE decides at activation whether the list is complete.
 */
export function getTierCoverage(items: readonly Pick<PriceListItem, "vehicleTier">[]): Record<PriceListTier, boolean> {
  return Object.fromEntries(PRICE_LIST_TIERS.map((tier) => [tier, items.some((item) => item.vehicleTier === tier)])) as Record<PriceListTier, boolean>
}

export function getMissingTiers(items: readonly Pick<PriceListItem, "vehicleTier">[]) {
  const coverage = getTierCoverage(items)
  return PRICE_LIST_TIERS.filter((tier) => !coverage[tier])
}

/** The seeded list has no creator; a real account id is not shown because there is no API to resolve its name. */
export function getCreatedByLabel(createdByAccountId: string | null) {
  return createdByAccountId === null ? "System" : null
}

/** "NONE" is the lines that apply to every tier (`vehicleTier = null`). */
export type PriceListTierFilter = "ALL" | "NONE" | PriceListTier
export type PriceListTypeFilter = "ALL" | PriceListItemType

export interface PriceListItemFilters {
  search: string
  tier: PriceListTierFilter
  type: PriceListTypeFilter
}

/** Filters the lines on screen only. The order the BE sent (`sortOrder`, then `itemCode`) is kept. */
export function filterPriceListItems(items: readonly PriceListItem[], { search, tier, type }: PriceListItemFilters) {
  const text = search.trim().toLowerCase()
  return items.filter((item) => {
    if (text && !item.itemCode.toLowerCase().includes(text) && !item.itemName.toLowerCase().includes(text)) return false
    if (tier === "NONE" ? item.vehicleTier !== null : tier !== "ALL" && item.vehicleTier !== tier) return false
    return type === "ALL" || item.itemType === type
  })
}
