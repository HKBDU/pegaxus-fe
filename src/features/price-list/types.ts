import type { PriceListItemType, PriceListTier, PriceListUnit } from "@/features/price-list/constants"

export interface ApiFieldError {
  field: string
  message: string
}

/** One price line. `updatedAt` is the raw string of the BE: it goes back as `lastUpdatedAt` and must keep its microseconds (A-01). */
export interface PriceListItem {
  priceListItemId: string
  priceListId: string
  itemCode: string
  itemName: string
  itemType: PriceListItemType
  unit: PriceListUnit
  unitPrice: number
  vehicleTier: PriceListTier | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** GET /price-lists/{id}: the header and all its lines, already sorted by `sortOrder` then `itemCode`. */
export interface PriceListDetail {
  priceListId: string
  name: string
  currency: string
  /** Percent, may have decimals (`20`, `37.5`). */
  taxRate: number
  depositRate: number
  isActive: boolean
  createdAt: string
  /** Raw string, sent back by the header form as `lastUpdatedAt` (A-01). */
  updatedAt: string
  /** `null` for the seeded list: shown as "System". */
  createdByAccountId: string | null
  updatedByAccountId: string | null
  items: PriceListItem[]
}

/** POST /price-lists/{id}/items. `null` means "all tiers" and "put it last". */
export interface CreatePriceListItemPayload {
  itemCode: string
  itemName: string
  itemType: PriceListItemType
  unit: PriceListUnit
  unitPrice: number
  vehicleTier: PriceListTier | null
  sortOrder: number | null
}

/** PUT /price-lists/{id}/items/{itemId}. The code never changes; `lastUpdatedAt` is the `updatedAt` of the LINE (A-02). */
export interface UpdatePriceListItemPayload {
  itemName: string
  itemType: PriceListItemType
  unit: PriceListUnit
  unitPrice: number
  vehicleTier: PriceListTier | null
  sortOrder: number | null
  lastUpdatedAt: string
}

export type PriceListItemFormMode = "create" | "edit"

export interface PriceListItemFormDialogProps {
  priceListId: string
  /** An active list is locked: only name, price and tier of an existing line can change. */
  isActive: boolean
  /** Absent = add a line; present = edit this line. */
  item?: PriceListItem
  /** Currency of the list, shown next to the price. */
  currency?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (item: PriceListItem) => void
}
