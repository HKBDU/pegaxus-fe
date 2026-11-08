import { useSearchParams } from "react-router-dom";
import type { PaginationMeta } from "@/shared/types";
import type { TransportArchiveQuery } from "../types";
import { useTransportArchive } from "./useTransportArchive";

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_MAX = 100;

/** Whole number inside [min, max]; anything else (missing, NaN, out of range) falls back. */
function toBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  const number = Number(value);
  return value !== null && Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

/**
 * Everything the transport archive page decides: the filters kept in the URL, the query and paging.
 * The page and the table only draw what this returns.
 */
export function useTransportArchivePage() {
  const [url, setUrl] = useSearchParams();

  const params: TransportArchiveQuery = {
    search: url.get("search") ?? undefined,
    completedFrom: url.get("completedFrom") ?? undefined,
    completedTo: url.get("completedTo") ?? undefined,
    originCountry: url.get("originCountry") ?? undefined,
    destinationCountry: url.get("destinationCountry") ?? undefined,
    pageIndex: toBoundedInt(url.get("pageIndex"), 1, 1, Number.MAX_SAFE_INTEGER),
    pageSize: toBoundedInt(url.get("pageSize"), DEFAULT_PAGE_SIZE, 1, PAGE_SIZE_MAX),
  };

  const query = useTransportArchive(params);

  /** Writes filters to the URL. Any change except paging itself goes back to page 1. */
  function change(patch: Partial<TransportArchiveQuery>) {
    setUrl(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(patch).forEach(([key, value]) =>
          value === undefined || value === "" ? next.delete(key) : next.set(key, String(value)),
        );
        if (!Object.hasOwn(patch, "pageIndex")) next.set("pageIndex", "1");
        return next;
      },
      { replace: true },
    );
  }

  const meta: PaginationMeta = query.data?.meta ?? {
    totalItems: 0,
    totalPages: 0,
    itemsPerPage: params.pageSize,
    currentPage: params.pageIndex,
    hasPreviousPage: false,
    hasNextPage: false,
  };

  return {
    params,
    items: query.data?.items ?? [],
    meta,
    isLoading: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    isFiltered: Boolean(
      params.search || params.completedFrom || params.completedTo || params.originCountry || params.destinationCountry,
    ),
    setFilters: change,
    setPage: (pageIndex: number) => change({ pageIndex }),
    setPageSize: (pageSize: number) => change({ pageSize: Math.min(pageSize, PAGE_SIZE_MAX) }),
  };
}
