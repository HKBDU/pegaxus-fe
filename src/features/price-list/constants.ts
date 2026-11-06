// Enum values are the BE ones (business/price-list.md, A-05). The BE only accepts these strings, never numbers.
export const PRICE_LIST_ITEM_TYPES = ["TRANSPORT_FEE", "HORSE_SERVICE_FEE", "HANDLING_FEE", "COMPLIANCE_FEE", "EMERGENCY_COST", "OTHER"] as const
export const PRICE_LIST_UNITS = ["TRIP", "HORSE", "HORSE_DAY"] as const
export const PRICE_LIST_TIERS = ["S", "M", "L"] as const

export type PriceListItemType = (typeof PRICE_LIST_ITEM_TYPES)[number]
export type PriceListUnit = (typeof PRICE_LIST_UNITS)[number]
export type PriceListTier = (typeof PRICE_LIST_TIERS)[number]

export const PRICE_LIST_ITEM_TYPE_LABELS: Record<PriceListItemType, string> = {
  TRANSPORT_FEE: "Transport fee",
  HORSE_SERVICE_FEE: "Horse service fee",
  HANDLING_FEE: "Handling fee",
  COMPLIANCE_FEE: "Compliance fee",
  EMERGENCY_COST: "Emergency cost",
  OTHER: "Other",
}

export const PRICE_LIST_UNIT_LABELS: Record<PriceListUnit, string> = {
  TRIP: "Per trip",
  HORSE: "Per horse",
  HORSE_DAY: "Per horse per day",
}

/** How the invoice quantity is worked out from the unit (business/price-list.md, rule 7). */
export const PRICE_LIST_UNIT_HINTS: Record<PriceListUnit, string> = {
  TRIP: "Quantity is always 1.",
  HORSE: "Quantity equals the number of horses.",
  HORSE_DAY: "Quantity equals the number of horses multiplied by the number of days.",
}

export const PRICE_LIST_TIER_LABELS: Record<PriceListTier, string> = {
  S: "S (1–3 horses)",
  M: "M (4–6 horses)",
  L: "L (7–9 horses)",
}

/** The `vehicleTier` select cannot hold an empty value, so "no tier" is this sentinel in the form and `null` in the request. */
export const ALL_TIERS_VALUE = "ALL"
export const ALL_TIERS_LABEL = "All tiers"

export const PRICE_LIST_ITEM_LIMITS = {
  itemCodePattern: /^[A-Z0-9_]{1,50}$/,
  itemCodeMax: 50,
  itemNameMax: 200,
  unitPriceMin: 1,
  unitPriceMax: 10_000_000_000,
  sortOrderMin: 0,
  sortOrderMax: 1_000_000,
} as const

/** Contract codes the detail page and the item form can meet (3.5 of the task doc). `PRICE_LIST_TIER_MISSING` prefers the BE text. */
export const PRICE_LIST_ERROR_MESSAGES: Record<string, string> = {
  PRICE_LIST_NOT_FOUND: "This price list no longer exists.",
  PRICE_LIST_ITEM_NOT_FOUND: "This price line no longer exists.",
  PRICE_LIST_ITEM_MODIFIED: "This price line was changed by someone else. Reload and try again.",
  DUPLICATE_ITEM_CODE: "This item code already exists in this price list.",
  ACTIVE_PRICELIST_LOCKED: "The active price list is locked. Clone it, edit the copy, then activate.",
  PRICE_LIST_TIER_MISSING: "The active price list must keep at least one price line for each tier S, M and L.",
  TOO_MANY_REQUESTS: "Too many requests. Try again in a few seconds.",
}

export const PRICE_LIST_NOT_FOUND = "PRICE_LIST_NOT_FOUND"
export const PRICE_LIST_ITEM_NOT_FOUND = "PRICE_LIST_ITEM_NOT_FOUND"
export const PRICE_LIST_ITEM_MODIFIED = "PRICE_LIST_ITEM_MODIFIED"
export const DUPLICATE_ITEM_CODE = "DUPLICATE_ITEM_CODE"
export const ACTIVE_PRICELIST_LOCKED = "ACTIVE_PRICELIST_LOCKED"
export const PRICE_LIST_TIER_MISSING = "PRICE_LIST_TIER_MISSING"
export const VALIDATION_ERROR = "VALIDATION_ERROR"
