import { useState } from "react"
import { TriangleAlert } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { VehicleFormSkeleton } from "@/features/fleet/components/FleetSkeletons"
import { VehicleForm } from "@/features/fleet/components/VehicleForm"
import { VehicleStatusDialog } from "@/features/fleet/components/VehicleStatusDialog"
import { VEHICLE_LIST_PATH, vehicleEditPath } from "@/features/fleet/constants/fleet.constants"
import { useVehicle } from "@/features/fleet/hooks"
import type { VehicleWarning } from "@/features/fleet/types"
import { formatFleetDateTime } from "@/features/fleet/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"

const WARNING_TEXT: Record<VehicleWarning, string> = {
  REGISTRATION_EXPIRED: "Inspection certificate has expired.",
  REGISTRATION_EXPIRING_SOON: "Inspection certificate expires within 7 days.",
  INSURANCE_EXPIRED: "Insurance policy has expired.",
  INSURANCE_EXPIRING_SOON: "Insurance policy expires within 7 days.",
}

/** SCR-F3-024 (UC-43 step 5): read-only vehicle information plus the route segments the vehicle is booked on. */
export default function VehicleDetailPage() {
  const { vehicleId } = useParams()
  const vehicleQuery = useVehicle(vehicleId)
  const [statusOpen, setStatusOpen] = useState(false)
  const vehicle = vehicleQuery.data

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[880px]">
        <PageHeader title="VEHICLE DETAILS" backHref={VEHICLE_LIST_PATH} backLabel="RETURN TO VEHICLES LIST" />

        {vehicleQuery.isLoading ? <VehicleFormSkeleton /> : null}
        {vehicleQuery.isError ? <ErrorState message="Unable to load this vehicle." onRetry={() => void vehicleQuery.refetch()} /> : null}

        {vehicle ? (
          <>
            {vehicle.warnings.length ? (
              <ul role="alert" className="m-0 mt-4 grid list-none gap-1 border-l-2 border-red-600 bg-red-50 px-4 py-3 p-0 text-xs text-red-700">
                {vehicle.warnings.map((warning) => (
                  <li key={warning} className="flex items-center gap-2">
                    <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                    {WARNING_TEXT[warning]}
                  </li>
                ))}
              </ul>
            ) : null}

            <VehicleForm
              mode="view"
              vehicle={vehicle}
              cancelHref={VEHICLE_LIST_PATH}
              viewActions={
                <>
                  <Button type="button" variant="outline" onClick={() => setStatusOpen(true)} className="h-10 rounded-[2px] border-0 bg-[#e9e6de] px-5 font-heading text-xs font-semibold uppercase tracking-[0.06em] text-slate-900 shadow-none hover:bg-[#dedbd2]">
                    Update status
                  </Button>
                  <Button asChild className="h-10 rounded-[2px] bg-[#ef8f00] px-6 font-heading text-xs font-semibold uppercase tracking-[0.06em] text-slate-950 hover:bg-[#db8300]">
                    <Link to={vehicleEditPath(vehicle.vehicleId)}>Edit vehicle</Link>
                  </Button>
                </>
              }
            />

            <section className="booking-panel mt-4 border bg-white p-6 sm:p-8">
              <h2 className="m-0! font-heading text-lg! font-bold! tracking-[0.01em]! text-black! uppercase">Upcoming assignments</h2>
              {vehicle.upcomingAssignments.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">This vehicle has no upcoming route assignments.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-[#e9e6de] font-heading text-[10px] uppercase tracking-[0.06em] text-gray-600">
                        {["Transport plan", "Route plan", "Seq.", "From", "To", "Departure", "Arrival"].map((head) => (
                          <th key={head} className="px-2.5 py-2 font-medium">{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vehicle.upcomingAssignments.map((assignment) => (
                        <tr key={assignment.routePlanRouteId} className="border-b border-slate-200">
                          <td className="px-2.5 py-2 font-semibold">{assignment.planCode}</td>
                          <td className="px-2.5 py-2">{assignment.routePlanCode}</td>
                          <td className="px-2.5 py-2">{assignment.sequenceNo}</td>
                          <td className="px-2.5 py-2">{assignment.fromLocationName}</td>
                          <td className="px-2.5 py-2">{assignment.toLocationName}</td>
                          <td className="px-2.5 py-2">{formatFleetDateTime(assignment.plannedDepartureAt)}</td>
                          <td className="px-2.5 py-2">{formatFleetDateTime(assignment.plannedArrivalAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <VehicleStatusDialog
              vehicle={statusOpen ? vehicle : null}
              onOpenChange={setStatusOpen}
              onChanged={() => void vehicleQuery.refetch()}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
