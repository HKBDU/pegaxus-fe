import { useCallback, useState } from "react"
import { Plus } from "lucide-react"
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
import { Button } from "@/shared/components/ui/button"

const initialParams: VehicleListParams = {
  pageIndex: 1,
  pageSize: 8,
  search: "",
  transportMode: "ALL",
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
      <div className="booking-page-enter mx-auto w-full max-w-[1280px]">
        <div className="mb-6">
          <PageHeader
            title="SPECIALIZED VEHICLES"
            backHref={isManager ? "/admin" : "/"}
            backLabel="RETURN TO FLEET OVERVIEW"
            action={
              <Button
                type="button"
                size="sm"
                className="h-10 shrink-0 rounded-[2px] bg-[#ef8f00] px-4 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]"
                onClick={() => navigate(`${VEHICLE_LIST_PATH}/new`)}
              >
                <Plus className="size-4" />
                Add new vehicle
              </Button>
            }
          />
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
            onReset={() => setParams(initialParams)}
            onPageChange={(pageIndex) => setParams((current) => ({ ...current, pageIndex }))}
          />
        ) : null}
      </div>
    </div>
  )
}
