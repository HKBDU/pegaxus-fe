import { useQuery } from "@tanstack/react-query"
import { getPriceList } from "@/features/price-list/services/detail"
import { isPriceListId } from "@/features/price-list/utils"

/** Every price-list query starts with this key, so one invalidate refreshes lists and details alike. */
export const PRICE_LISTS_KEY = ["price-lists"] as const

export const priceListDetailKey = (priceListId: string | undefined) => ["price-lists", "detail", priceListId] as const

export function usePriceList(priceListId: string | undefined) {
  return useQuery({
    queryKey: priceListDetailKey(priceListId),
    queryFn: ({ signal }) => getPriceList(priceListId ?? "", signal),
    // A malformed id is never sent to the BE: the page shows "not found" for it.
    enabled: isPriceListId(priceListId),
    // `updatedAt` goes back as `lastUpdatedAt` on every write, so a stale copy would only produce a 409.
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  })
}
