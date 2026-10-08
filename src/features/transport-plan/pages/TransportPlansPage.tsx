import { useCallback, useState } from "react"
import { ROLE_ROUTES } from "@/app/route-config"
import { PageHeader } from "@/shared/components/PageHeader"
import { ErrorState } from "@/shared/components/common"
import { useDebounce } from "@/shared/hooks"
import { TransportPlanFilters } from "../components/TransportPlanFilters"
import { TransportPlansTable } from "../components/TransportPlansTable"
import { changeTransportPlanFilters, initialTransportPlanParams } from "../transport-plan.constants"
import { useTransportPlans } from "../hooks/useTransportPlans"
import { getTransportPlanError } from "../transport-plan.services"
import type { TransportPlansQueryParams } from "../transport-plan.types"

export default function TransportPlansPage() {
  const [params, setParams] = useState(initialTransportPlanParams)
  const search = useDebounce(params.search, 300)
  const isSearchPending = search !== params.search
  const query = useTransportPlans({ ...params, search }, !isSearchPending)
  const changeFilters = useCallback((patch: Partial<Omit<TransportPlansQueryParams, "pageIndex">>) => {
    setParams((current) => changeTransportPlanFilters(current, patch))
  }, [])
  const error = query.isError && !isSearchPending ? getTransportPlanError(query.error, "list") : null
  const meta = query.data?.meta ?? { currentPage: params.pageIndex, itemsPerPage: params.pageSize, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false }
  return <div className="booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
    <div className="booking-page-enter mx-auto w-full min-w-0 max-w-[1152px] space-y-5">
      <div><PageHeader title="Transport Plans" backHref={ROLE_ROUTES.managerHome} showBack={false} /><p className="text-xs text-slate-500 sm:text-sm">View and track transport plans.</p></div>
      <TransportPlanFilters params={params} onChange={changeFilters} />
      {error ? <ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /> :
        <TransportPlansTable plans={query.data?.data ?? []} params={params} meta={meta} isLoading={query.isFetching || query.isPending || isSearchPending}
          onChange={changeFilters} onPageChange={(pageIndex) => {
            if (!isSearchPending && !query.isFetching) setParams((current) => ({ ...current, pageIndex }))
          }} />}
    </div>
  </div>
}
