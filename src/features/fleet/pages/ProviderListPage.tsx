import { useCallback, useState } from "react"

import { FleetListSkeleton } from "@/features/fleet/components/FleetSkeletons"
import { ProviderFormDialog } from "@/features/fleet/components/ProviderFormDialog"
import { ProviderStatCards, ProviderTable } from "@/features/fleet/components/ProviderTable"
import { useProviderCounts, useProviders } from "@/features/fleet/hooks"
import type { ProviderListParams } from "@/features/fleet/types"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"

const initialParams: ProviderListParams = {
  pageIndex: 1,
  pageSize: 10,
  search: "",
  supportedMode: "ALL",
  status: "ALL",
  sortBy: "providerName:asc",
}

/** SCR-F3-020 (UC-41). Logistics Manager only: the provider master is read by coordinators through the route builder, not this page. */
export default function ProviderListPage() {
  const [params, setParams] = useState(initialParams)
  const [createOpen, setCreateOpen] = useState(false)
  const providersQuery = useProviders(params)
  const countsQuery = useProviderCounts()

  const handleSearchChange = useCallback((search: string) => {
    setParams((current) => (current.search === search ? current : { ...current, search, pageIndex: 1 }))
  }, [])
  const patchFilters = useCallback((patch: Partial<ProviderListParams>) => {
    setParams((current) => ({ ...current, ...patch, pageIndex: 1 }))
  }, [])

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto grid w-full max-w-[1152px] gap-5">
        <div>
          <PageHeader title="TRANSPORT PROVIDERS" backHref="/admin" backLabel="RETURN TO FLEET OVERVIEW" />
          <p className="m-0 text-sm text-slate-500">Manage third-party animal transport partners across Europe.</p>
        </div>

        <ProviderStatCards counts={countsQuery.data} />

        {providersQuery.isLoading && !providersQuery.data ? <FleetListSkeleton columns={7} /> : null}
        {providersQuery.isError ? <ErrorState message="Unable to load transport providers." onRetry={() => void providersQuery.refetch()} /> : null}
        {providersQuery.data ? (
          <ProviderTable
            providers={providersQuery.data.data}
            filters={params}
            meta={providersQuery.data.meta}
            isLoading={providersQuery.isFetching}
            onSearchChange={handleSearchChange}
            onPatch={patchFilters}
            onPageChange={(pageIndex) => setParams((current) => ({ ...current, pageIndex }))}
            onPageSizeChange={(pageSize) => setParams((current) => ({ ...current, pageSize, pageIndex: 1 }))}
            onAdd={() => setCreateOpen(true)}
          />
        ) : null}
      </div>

      <ProviderFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
