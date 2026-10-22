import { useCallback, useState } from "react"

import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import type { PaginationMeta } from "@/shared/types"

import { IncidentKpiCards } from "../components/IncidentKpiCards"
import { IncidentTable } from "../components/IncidentTable"
import { DEFAULT_SORT, OPEN_STATUSES } from "../constants"
import { useIncidentList } from "../hooks/useIncidents"
import type { IncidentListParams } from "../types"

const initialParams: IncidentListParams = {
  status: OPEN_STATUSES,
  category: "",
  severity: "",
  occurredFrom: "",
  occurredTo: "",
  search: "",
  pageIndex: 1,
  pageSize: 20,
  sortBy: DEFAULT_SORT,
}

/** SCR-F5-001 (UC-57): every incident the viewer may see, newest and most severe first. LM, RC and TS. */
export default function IncidentListPage() {
  const [params, setParams] = useState(initialParams)
  const query = useIncidentList(params)

  // Any filter change goes back to page 1; the search box reports the same value again on mount, which must not reset the page.
  const handleFilterChange = useCallback((patch: Partial<IncidentListParams>) => {
    setParams((current) => {
      const changed = (Object.keys(patch) as Array<keyof IncidentListParams>).some((key) => current[key] !== patch[key])
      return changed ? { ...current, ...patch, pageIndex: 1 } : current
    })
  }, [])

  const data = query.data
  const meta: PaginationMeta = {
    totalItems: data?.totalItems ?? 0,
    totalPages: data?.totalPages ?? 1,
    itemsPerPage: params.pageSize,
    currentPage: params.pageIndex,
    hasPreviousPage: params.pageIndex > 1,
    hasNextPage: params.pageIndex < (data?.totalPages ?? 1),
  }

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-6">
          <PageHeader title="INCIDENTS" backHref="/admin" backLabel="BACK TO DASHBOARD" />
          <p className="m-0 max-w-2xl text-xs leading-5 text-gray-600">
            Monitor road incidents, emergency costs and settlements across every active transport.
          </p>
        </div>

        <div className="mb-4">
          <IncidentKpiCards />
        </div>

        {query.isError ? <ErrorState message="Unable to load incidents." onRetry={() => void query.refetch()} /> : null}
        {!query.isError ? (
          <IncidentTable
            items={data?.items ?? []}
            params={params}
            meta={meta}
            isLoading={query.isLoading}
            onFilterChange={handleFilterChange}
            onPageChange={(pageIndex) => setParams((current) => ({ ...current, pageIndex }))}
            onPageSizeChange={(pageSize) => setParams((current) => ({ ...current, pageSize, pageIndex: 1 }))}
          />
        ) : null}
      </div>
    </div>
  )
}
