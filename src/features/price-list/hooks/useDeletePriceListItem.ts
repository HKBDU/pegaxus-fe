import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deletePriceListItem } from "../services/item-delete"

export function useDeletePriceListItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ priceListId, itemId }: { priceListId: string; itemId: string }) => deletePriceListItem(priceListId, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["price-lists"] }),
  })
}
