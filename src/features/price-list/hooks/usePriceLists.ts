import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getPriceLists } from "../services/list"
import type { PriceListQueryParams } from "../list.schemas"

export function usePriceLists(params: PriceListQueryParams) {
  return useQuery({
    queryKey: ["price-lists", "list", params],
    queryFn: ({ signal }) => getPriceLists(params, signal),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: false,
  })
}
