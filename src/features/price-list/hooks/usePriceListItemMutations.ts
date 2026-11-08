import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PRICE_LISTS_KEY } from "@/features/price-list/hooks/usePriceListDetail"
import { createPriceListItem, updatePriceListItem } from "@/features/price-list/services/item"
import type { CreatePriceListItemPayload, UpdatePriceListItemPayload } from "@/features/price-list/types"

/** After any change to a line the detail is reloaded, never patched by hand: it is not known whether the list's `updatedAt` moved too (A-02). */
function useRefreshPriceLists() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: PRICE_LISTS_KEY })
}

export function useCreatePriceListItem(priceListId: string) {
  const refresh = useRefreshPriceLists()
  return useMutation({
    mutationFn: (payload: CreatePriceListItemPayload) => createPriceListItem(priceListId, payload),
    onSuccess: () => void refresh(),
  })
}

export function useUpdatePriceListItem(priceListId: string) {
  const refresh = useRefreshPriceLists()
  return useMutation({
    mutationFn: ({ priceListItemId, payload }: { priceListItemId: string; payload: UpdatePriceListItemPayload }) =>
      updatePriceListItem(priceListId, priceListItemId, payload),
    onSuccess: () => void refresh(),
  })
}

/** For the "reload" button of a 409 and for errors that mean the list changed under the user's feet. */
export function useReloadPriceLists() {
  return useRefreshPriceLists()
}
