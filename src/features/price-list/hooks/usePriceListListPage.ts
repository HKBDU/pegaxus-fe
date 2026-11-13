import { useSearchParams, useLocation, useNavigate } from "react-router-dom"

import { priceListDetail } from "@/app/route-config"
import { getPriceListErrorMessage } from "@/features/price-list/errors"
import { usePriceLists } from "@/features/price-list/hooks/usePriceLists"
import {
  priceListSortOptions,
  type PriceListSortBy,
  type PriceListSummary,
} from "@/features/price-list/list.schemas"
import { useDebounce } from "@/shared/hooks/useDebounce"
import type { PaginationMeta } from "@/shared/types"

const DEFAULT_SORT: PriceListSortBy = "createdAt:desc"
const DEFAULT_PAGE_SIZE = 10
export const PRICE_LIST_PAGE_SIZE_MAX = 100

function toSortBy(value: string | null): PriceListSortBy {
  return priceListSortOptions.find((option) => option === value) ?? DEFAULT_SORT
}

/** Whole number inside [min, max]; anything else falls back. */
function toBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  const number = Number(value)
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback
}

/**
 * Everything the price list page decides (UC-78 step 1): filters kept in the URL, the query, paging and where "View" goes.
 * The page only draws what this returns.
 */
export function usePriceListListPage() {
  const [url, setUrl] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const search = url.get("search") ?? ""
  const isActive = url.has("isActive") ? url.get("isActive") === "true" : undefined
  const sortBy = toSortBy(url.get("sortBy"))
  const pageIndex = toBoundedInt(url.get("pageIndex"), 1, 1, Number.MAX_SAFE_INTEGER)
  const pageSize = toBoundedInt(url.get("pageSize"), DEFAULT_PAGE_SIZE, 1, PRICE_LIST_PAGE_SIZE_MAX)

  // The input follows the URL at once; only the request waits for the typing to stop.
  const debouncedSearch = useDebounce(search, 300)
  const query = usePriceLists({ search: debouncedSearch, isActive, sortBy, pageIndex, pageSize })

  /** Writes filters to the URL. Any change except paging itself goes back to page 1. */
  function change(patch: Record<string, string | undefined>) {
    setUrl(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value === "") next.delete(key)
          else next.set(key, value)
        }
        if (!("pageIndex" in patch)) next.delete("pageIndex")
        return next
      },
      { replace: true },
    )
  }

  const data = query.data
  const meta: PaginationMeta = {
    currentPage: data?.pageIndex ?? pageIndex,
    itemsPerPage: data?.pageSize ?? pageSize,
    totalItems: data?.totalItems ?? 0,
    totalPages: data?.totalPages ?? 1,
    hasPreviousPage: (data?.pageIndex ?? pageIndex) > 1,
    hasNextPage: (data?.pageIndex ?? pageIndex) < (data?.totalPages ?? 1),
  }

  return {
    items: data?.items ?? [],
    meta,
    search,
    isActive,
    sortBy,
    isFiltered: Boolean(search) || isActive !== undefined,
    isLoading: query.isPending,
    isError: query.isError,
    errorMessage: getPriceListErrorMessage(query.error),
    retry: () => void query.refetch(),
    setSearch: (value: string) => change({ search: value }),
    // "all" removes the filter; "true" and "false" are the two states of `isActive`.
    setStatus: (value: string) => change({ isActive: value === "all" ? undefined : value }),
    setSort: (value: PriceListSortBy) => change({ sortBy: value === DEFAULT_SORT ? undefined : value }),
    setPage: (page: number) => change({ pageIndex: String(page) }),
    setPageSize: (size: number) => change({ pageSize: String(Math.min(size, PRICE_LIST_PAGE_SIZE_MAX)) }),
    /** Opens the detail page and tells it where to come back to, filters included. */
    view: (item: Pick<PriceListSummary, "priceListId">) =>
      navigate(priceListDetail(item.priceListId), { state: { from: `${location.pathname}${location.search}` } }),
  }
}
