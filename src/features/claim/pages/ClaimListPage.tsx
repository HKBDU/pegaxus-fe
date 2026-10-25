import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { claimDetail, ROLE_ROUTES } from "@/app/route-config"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { ClaimFilters } from "@/features/claim/components/ClaimFilters"
import { ClaimResolutionDialog } from "@/features/claim/components/ClaimResolutionDialog"
import { ClaimTable } from "@/features/claim/components/ClaimTable"
import { getClaimErrorMessage } from "@/features/claim/errors"
import { useClaims } from "@/features/claim/hooks"
import { claimFilterSchema } from "@/features/claim/schemas"
import type { ClaimQueryParams } from "@/features/claim/types"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { useDebounce } from "@/shared/hooks"

const FILTER_KEYS = ["claimType", "status", "submittedFrom", "submittedTo", "search"] as const
const DEFAULT_PAGE_SIZE = 10

/**
 * screen §10A + §10B (Logistics Manager). The detail is a modal over the list: the route `/admin/claims/:claimId`
 * (also the target of the "new claim" notification) opens the list with that claim's modal.
 */
export default function ClaimListPage() {
  const principal = useAuthStore((state) => state.principal)
  const { claimId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [url, setUrl] = useSearchParams()

  const parsed = claimFilterSchema.parse({
    ...Object.fromEntries(["claimType", "status", "submittedFrom", "submittedTo", "search", "sortBy", "pageIndex", "pageSize"].flatMap((key) => (url.get(key) ? [[key, url.get(key)]] : []))),
    pageSize: url.get("pageSize") ?? DEFAULT_PAGE_SIZE,
  })
  const params: ClaimQueryParams = {
    ...parsed,
    submittedFrom: url.get("submittedFrom") ?? undefined,
    submittedTo: url.get("submittedTo") ?? undefined,
  }
  const search = url.get("search") ?? ""
  const debounced = useDebounce(search, 300)
  const waiting = search !== debounced
  const allowed = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const query = useClaims({ ...params, search: debounced }, allowed && !waiting)

  const change = (patch: Partial<ClaimQueryParams>) =>
    setUrl(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value === "") next.delete(key)
          else next.set(key, String(value))
        }
        if (!Object.hasOwn(patch, "pageIndex")) next.set("pageIndex", "1")
        return next
      },
      { replace: true },
    )

  const meta = query.data
    ? { currentPage: query.data.pageIndex, itemsPerPage: query.data.pageSize, totalItems: query.data.totalItems, totalPages: query.data.totalPages, hasPreviousPage: query.data.pageIndex > 1, hasNextPage: query.data.pageIndex < query.data.totalPages }
    : { currentPage: params.pageIndex, itemsPerPage: params.pageSize, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false }

  if (!allowed) return <ErrorState message="Only Logistics Managers can access claims." />

  return (
    <div className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full min-w-0 max-w-[1152px] space-y-5">
        <div>
          <PageHeader title="Claims" backHref={ROLE_ROUTES.managerHome} backLabel="Return to dashboard" showBack={false} />
          <p className="text-xs text-slate-500 sm:text-sm">Review customer claims, compare them with the delivery record and decide the outcome.</p>
        </div>
        <ClaimFilters params={params} search={search} onSearchChange={(value) => change({ search: value })} onChange={change} />
        {query.isError && !waiting ? (
          <ErrorState message={getClaimErrorMessage(query.error, "Unable to load the claims.")} onRetry={() => void query.refetch()} />
        ) : (
          <ClaimTable
            items={query.data?.items ?? []}
            meta={meta}
            isLoading={query.isPending || waiting}
            filtered={FILTER_KEYS.some((key) => Boolean(url.get(key)))}
            search={location.search}
            onOpen={(id) => navigate({ pathname: claimDetail(id), search: location.search })}
            onPageChange={(pageIndex) => {
              if (!query.isFetching && !waiting) change({ pageIndex })
            }}
            onPageSizeChange={(pageSize) => change({ pageSize })}
          />
        )}
      </div>
      {claimId ? <ClaimResolutionDialog claimId={claimId} onClose={() => navigate({ pathname: ROLE_ROUTES.claims, search: location.search })} /> : null}
    </div>
  )
}
