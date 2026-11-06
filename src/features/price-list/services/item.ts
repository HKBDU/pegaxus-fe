import apiClient from "@/lib/axios"
import { mockCreatePriceListItem, mockListPriceListItems, mockUpdatePriceListItem, priceListMocksEnabled } from "@/features/price-list/mocks/details"
import { priceListItemListSchema, priceListItemSchema } from "@/features/price-list/schemas"
import { call } from "@/features/price-list/services/request"
import type { CreatePriceListItemPayload, PriceListItem, UpdatePriceListItemPayload } from "@/features/price-list/types"

const enc = encodeURIComponent

/** #7 GET /price-lists/{id}/items. The detail page already carries `items[]`, so no screen calls this today. */
export async function listPriceListItems(priceListId: string, signal?: AbortSignal): Promise<PriceListItem[]> {
  if (priceListMocksEnabled) return mockListPriceListItems(priceListId)
  const value = await call<unknown>(apiClient.get(`price-lists/${enc(priceListId)}/items`, { signal }))
  return priceListItemListSchema.parse(value)
}

/** #8 POST /price-lists/{id}/items: refused with 422 ACTIVE_PRICELIST_LOCKED on the active list. */
export async function createPriceListItem(priceListId: string, payload: CreatePriceListItemPayload): Promise<PriceListItem> {
  if (priceListMocksEnabled) return mockCreatePriceListItem(priceListId, payload)
  const value = await call<unknown>(apiClient.post(`price-lists/${enc(priceListId)}/items`, payload))
  return priceListItemSchema.parse(value)
}

/** #9 PUT /price-lists/{id}/items/{itemId}: `payload.lastUpdatedAt` is the raw `updatedAt` of the line (A-01, A-02). */
export async function updatePriceListItem(priceListId: string, priceListItemId: string, payload: UpdatePriceListItemPayload): Promise<PriceListItem> {
  if (priceListMocksEnabled) return mockUpdatePriceListItem(priceListId, priceListItemId, payload)
  const value = await call<unknown>(apiClient.put(`price-lists/${enc(priceListId)}/items/${enc(priceListItemId)}`, payload))
  return priceListItemSchema.parse(value)
}
