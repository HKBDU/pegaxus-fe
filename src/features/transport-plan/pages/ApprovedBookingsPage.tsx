import { useCallback, useState } from "react"
import { ROLE_ROUTES } from "@/app/route-config"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { useDebounce } from "@/shared/hooks"
import { ApprovedBookingFilters } from "../components/ApprovedBookingFilters"
import { ApprovedBookingsTable } from "../components/ApprovedBookingsTable"
import { changeApprovedBookingFilters, initialApprovedBookingParams } from "../constants"
import { useApprovedBookings } from "../hooks/useApprovedBookings"
import { getApprovedBookingError } from "../services"
import type { ApprovedBookingsQueryParams } from "../types"
import { Flow3MockIndicator } from "../components/Flow3MockIndicator"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { getWorkspaceRole } from "../workspace-role"
import { workspaceLabels } from "../constants"

export default function ApprovedBookingsPage() {
  const principal = useAuthStore(state => state.principal)
  const role = getWorkspaceRole(principal)
  const subtitle = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }) ? "Transport planning and operations overview." :
    canAccess(principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] }) ? "Transports assigned for route planning." : "Transports assigned for legal preparation."
  const [params, setParams] = useState(initialApprovedBookingParams)
  const search = useDebounce(params.search, 300)
  const isSearchPending = search !== params.search
  const query = useApprovedBookings({ ...params, search }, !isSearchPending)
  const changeFilters = useCallback((patch: Partial<Omit<ApprovedBookingsQueryParams, "pageIndex">>) => {
    setParams((current) => changeApprovedBookingFilters(current, patch))
  }, [])
  const error = query.isError && !isSearchPending ? getApprovedBookingError(query.error, "list") : null
  const meta = query.data?.meta ?? {
    currentPage: params.pageIndex, itemsPerPage: params.pageSize, totalItems: 0, totalPages: 0,
    hasPreviousPage: false, hasNextPage: false,
  }
  const filters = <ApprovedBookingFilters params={params} onChange={changeFilters} />

  return <div className="flow3-ui booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-4 py-4 font-sans sm:px-6 lg:py-6">
    <div className="mx-auto w-full min-w-0 max-w-[1152px] space-y-4">
      <Flow3MockIndicator />
      <div className="space-y-1 border-b border-slate-200 pb-4"><PageHeader className="[&_h1]:text-2xl [&_h1]:leading-tight sm:[&_h1]:text-3xl" title={role ? workspaceLabels[role].list : "Transports"} backHref={ROLE_ROUTES.managerHome} showBack={false} />
        <p className="text-xs text-slate-500 sm:text-sm">{subtitle}</p></div>
      {error ? <>{filters}<ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /></> :
        <ApprovedBookingsTable bookings={query.data?.data ?? []} params={params} meta={meta} isLoading={query.isFetching || isSearchPending}
          filters={filters}
          onChange={changeFilters} onPageChange={(pageIndex) => {
            // Do not carry a page selected for the old search into the new search.
            if (!isSearchPending && !query.isFetching) setParams((current) => ({ ...current, pageIndex }))
          }} />}
    </div>
  </div>
}
