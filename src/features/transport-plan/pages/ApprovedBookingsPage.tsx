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

export default function ApprovedBookingsPage() {
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

  return <div className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
    <div className="booking-page-enter mx-auto w-full min-w-0 max-w-[1152px] space-y-5">
      <Flow3MockIndicator />
      <div><PageHeader title="Approved Bookings" backHref={ROLE_ROUTES.managerHome} showBack={false} />
        <p className="text-xs text-slate-500 sm:text-sm">Approved transport requests ready for transport and route planning.</p></div>
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
