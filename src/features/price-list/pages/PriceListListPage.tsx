import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { EmptyState, ErrorState, LoadingState, TablePagination } from "@/shared/components/common"
import type { PaginationMeta } from "@/shared/types"
import { getPriceListErrorMessage } from "../errors"
import { priceListSortOptions, type PriceListSortBy } from "../list.schemas"
import { usePriceLists } from "../hooks/usePriceLists"
import { PriceListFilters } from "../components/PriceListFilters"
import { PriceListTable } from "../components/PriceListTable"
import { priceListDetail } from "@/app/route-config"
import { useDebounce } from "@/shared/hooks/useDebounce"

function parseBoolean(value: string | null) { return value === null ? undefined : value === "true" }

export default function PriceListListPage() {
  const location = useLocation(); const navigate = useNavigate()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const search = params.get("search") ?? ""
  const isActive = parseBoolean(params.get("isActive"))
  const sortBy = (priceListSortOptions.includes((params.get("sortBy") ?? "createdAt:desc") as PriceListSortBy) ? params.get("sortBy") : "createdAt:desc") as PriceListSortBy
  const pageIndex = Math.max(1, Number(params.get("pageIndex") ?? 1) || 1)
  const pageSize = Math.max(1, Number(params.get("pageSize") ?? 10) || 10)
  const [searchInput, setSearchInput] = useState(search)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const debouncedSearch = useDebounce(searchInput, 300)
  useEffect(() => setSearchInput(search), [search])
  useEffect(() => {
    if (debouncedSearch !== search) updateSearch(debouncedSearch)
  // URL is the source of truth; debounce only delays writing the user's input.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])
  const query = usePriceLists({ search, isActive, sortBy, pageIndex, pageSize })
  function updateSearch(value: string) {
    const next = new URLSearchParams(location.search)
    if (value) next.set("search", value); else next.delete("search")
    next.delete("pageIndex")
    navigate({ search: next.toString() ? `?${next}` : "" })
  }
  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(location.search)
    Object.entries(changes).forEach(([key, value]) => value === undefined ? next.delete(key) : next.set(key, value))
    navigate({ search: next.toString() ? `?${next}` : "" })
  }
  const meta: PaginationMeta = { currentPage: query.data?.pageIndex ?? pageIndex, itemsPerPage: query.data?.pageSize ?? pageSize, totalItems: query.data?.totalItems ?? 0, totalPages: query.data?.totalPages ?? 1, hasPreviousPage: pageIndex > 1, hasNextPage: pageIndex < (query.data?.totalPages ?? 1) }

  return <main className="space-y-5 p-4 md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Logistics</p><h1 className="text-2xl font-semibold">Price Lists</h1></div><Button onClick={() => setIsCreateOpen(true)}>Create price list</Button></div>
    <PriceListFilters search={searchInput} isActive={isActive} sortBy={sortBy} onSearchChange={setSearchInput} onStatusChange={(value) => update({ isActive: value === "all" ? undefined : value, pageIndex: undefined })} onSortChange={(value) => update({ sortBy: value, pageIndex: undefined })} />
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={getPriceListErrorMessage(query.error)} onRetry={() => void query.refetch()} /> : query.data?.items.length ? <PriceListTable items={query.data.items} onView={(item) => navigate(priceListDetail(item.priceListId), { state: { from: `${location.pathname}${location.search}` } })} onClone={(item) => toast.info(`Clone integration pending for “${item.name}”`)} onActivate={(item) => toast.info(`Activate integration pending for “${item.name}”`)} /> : <EmptyState message="No price lists found" />}
    {!query.isError && query.data ? <TablePagination meta={meta} onPageChange={(page) => update({ pageIndex: String(page) })} onPageSizeChange={(size) => update({ pageSize: String(size), pageIndex: undefined })} pageSizeAriaLabel="Price lists per page" /> : null}
    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}><DialogContent><DialogHeader><DialogTitle>Create price list</DialogTitle><DialogDescription>Price list form integration is pending. The create dialog is ready for PriceListFormDialog.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </main>
}
