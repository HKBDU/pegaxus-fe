import apiClient from "@/lib/axios"
import { mockGetPriceList, priceListMocksEnabled } from "@/features/price-list/mocks/details"
import { priceListDetailSchema } from "@/features/price-list/schemas"
import { call } from "@/features/price-list/services/request"
import type { PriceListDetail } from "@/features/price-list/types"

/** #2 GET /price-lists/{priceListId}: the header and all its lines. */
export async function getPriceList(priceListId: string, signal?: AbortSignal): Promise<PriceListDetail> {
  if (priceListMocksEnabled) return mockGetPriceList(priceListId)
  const value = await call<unknown>(apiClient.get(`price-lists/${encodeURIComponent(priceListId)}`, { signal }))
  return priceListDetailSchema.parse(value)
}
