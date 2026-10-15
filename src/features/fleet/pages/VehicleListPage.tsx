import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"

import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { FleetListSkeleton } from "@/features/fleet/components/FleetSkeletons"
import { VehicleTable } from "@/features/fleet/components/VehicleTable"
import { DEFAULT_VEHICLE_SORT, VEHICLE_LIST_PATH } from "@/features/fleet/constants/fleet.constants"
import { useVehicles } from "@/features/fleet/hooks"
import type { VehicleListParams } from "@/features/fleet/types"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"

const initialParams: VehicleListParams = {
  pageIndex: 1,
  pageSize: 10,
  search: "",
  // Internal fleet is road-only (task doc, UC-43): the list is always filtered to ROAD.
  transportMode: "ROAD",
  status: "ALL",
  vehicleType: "ALL",
  minCapacity: "ALL",
  sortBy: DEFAULT_VEHICLE_SORT,
}

/** SCR-F3-023 (UC-43). Logistics Manager and Fleet & Route Coordinator share the same list and actions. */
export default function VehicleListPage() {
  const navigate = useNavigate()
  const principal = useAuthStore((state) => state.principal)
  const isManager = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const [params, setParams] = useState(initialParams)
  const vehiclesQuery = useVehicles(params)

  const handleSearchChange = useCallback((search: string) => {
    setParams((current) => (current.search === search ? current : { ...current, search, pageIndex: 1 }))
  }, [])
  const patchFilters = useCallback((patch: Partial<VehicleListParams>) => {
    setParams((current) => ({ ...current, ...patch, pageIndex: 1 }))
  }, [])

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-6">
          <PageHeader title="SPECIALIZED VEHICLES" backHref={isManager ? "/admin" : "/"} backLabel="RETURN TO FLEET OVERVIEW" />
        </div>

        {vehiclesQuery.isLoading && !vehiclesQuery.data ? <FleetListSkeleton columns={9} /> : null}
        {vehiclesQuery.isError ? <ErrorState message="Unable to load vehicles." onRetry={() => void vehiclesQuery.refetch()} /> : null}
        {vehiclesQuery.data ? (
          <VehicleTable
            vehicles={vehiclesQuery.data.data}
            filters={params}
            meta={vehiclesQuery.data.meta}
            isLoading={vehiclesQuery.isFetching}
            onSearchChange={handleSearchChange}
            onPatch={patchFilters}
            onPageChange={(pageIndex) => setParams((current) => ({ ...current, pageIndex }))}
            onPageSizeChange={(pageSize) => setParams((current) => ({ ...current, pageSize, pageIndex: 1 }))}
            onAdd={() => navigate(`${VEHICLE_LIST_PATH}/new`)}
          />
        ) : null}
      </div>
    </div>
  )
}
