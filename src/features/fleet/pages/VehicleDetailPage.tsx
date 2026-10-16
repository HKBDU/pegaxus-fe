import { useState } from "react"
import { TriangleAlert } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { cn } from "@/lib/utils"
import {
  actionButtonClass,
  CardTitle,
  columnHeadClass,
  FieldLabel,
  InfoCard,
  InfoRow,
  outlineButtonClass,
  PAGE_SHELL_CLASS,
  PAGE_WIDTH_CLASS,
  panelClass,
  primaryButtonClass,
  SummaryCell,
} from "@/features/fleet/components/DetailParts"
import { VehicleFormSkeleton } from "@/features/fleet/components/FleetSkeletons"
import { CapacityChip, ExpiryLine, VehicleModeBadge, VehicleStatusBadge } from "@/features/fleet/components/VehicleBadges"
import { VehicleStatusDialog } from "@/features/fleet/components/VehicleStatusDialog"
import { VEHICLE_LIST_PATH, vehicleEditPath } from "@/features/fleet/constants/fleet.constants"
import { useVehicle } from "@/features/fleet/hooks"
import type { VehicleWarning } from "@/features/fleet/types"
import { formatFleetDate, formatFleetDateTime, parseEquipment } from "@/features/fleet/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"

const WARNING_TEXT: Record<VehicleWarning, string> = {
  REGISTRATION_EXPIRED: "Inspection certificate has expired.",
  REGISTRATION_EXPIRING_SOON: "Inspection certificate expires within 7 days.",
  INSURANCE_EXPIRED: "Insurance policy has expired.",
  INSURANCE_EXPIRING_SOON: "Insurance policy expires within 7 days.",
}

/** SCR-F3-024 (UC-43 step 5): read-only vehicle details, laid out like the booking details page, plus the route segments the vehicle is booked on. */
export default function VehicleDetailPage() {
  const { vehicleId } = useParams()
  const vehicleQuery = useVehicle(vehicleId)
  const [statusOpen, setStatusOpen] = useState(false)
  const vehicle = vehicleQuery.data
  const equipment = parseEquipment(vehicle?.specialEquipment)

  return (
    <div className={PAGE_SHELL_CLASS}>
      <div className={PAGE_WIDTH_CLASS}>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader title="VEHICLE DETAILS" backHref={VEHICLE_LIST_PATH} backLabel="RETURN TO VEHICLES LIST" />
          {vehicle ? (
            <div className="flex w-full flex-row flex-nowrap items-center gap-2 sm:w-auto sm:shrink-0 sm:pb-0.5 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:px-2 sm:[&>*]:flex-none sm:[&>*]:px-4">
              <button type="button" className={cn(actionButtonClass, outlineButtonClass)} onClick={() => setStatusOpen(true)}>
                Update status
              </button>
              <Link to={vehicleEditPath(vehicle.vehicleId)} className={cn(actionButtonClass, primaryButtonClass)}>
                Edit vehicle
              </Link>
            </div>
          ) : null}
        </div>

        {vehicleQuery.isLoading ? <VehicleFormSkeleton /> : null}
        {vehicleQuery.isError ? <ErrorState message="Unable to load this vehicle." onRetry={() => void vehicleQuery.refetch()} /> : null}

        {vehicle ? (
          <div className="booking-stagger space-y-2.5">
            {vehicle.warnings.length ? (
              <ul role="alert" className="m-0 grid list-none gap-1 border border-red-200 border-l-2 border-l-red-600 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                {vehicle.warnings.map((warning) => (
                  <li key={warning} className="flex items-center gap-2">
                    <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                    {WARNING_TEXT[warning]}
                  </li>
                ))}
              </ul>
            ) : null}

            <dl className={cn(panelClass, "grid grid-cols-2 gap-x-4 px-4 lg:grid-cols-4 lg:gap-x-0 lg:pr-0")}>
              <SummaryCell first label="Vehicle code">
                <span className="text-lg leading-5 font-semibold text-gray-900">{vehicle.vehicleCode}</span>
              </SummaryCell>
              <SummaryCell label="Status">
                <VehicleStatusBadge status={vehicle.status} />
              </SummaryCell>
              <SummaryCell label="Created date">{formatFleetDateTime(vehicle.createdAt)}</SummaryCell>
              <SummaryCell label="Last updated">{formatFleetDateTime(vehicle.updatedAt)}</SummaryCell>
            </dl>

            <div className="grid gap-2.5 lg:grid-cols-2">
              <InfoCard title="Basic information">
                <InfoRow label="Vehicle name" value={vehicle.vehicleName} />
                <InfoRow label="License plate" value={vehicle.licensePlate} />
                <InfoRow label="Transport mode" value={<VehicleModeBadge mode={vehicle.transportMode} />} />
                <InfoRow label="Internal system ref" value={<span className="break-all">{vehicle.vehicleId}</span>} />
              </InfoCard>

              <InfoCard title="Specifications & technical">
                <InfoRow label="Vehicle type" value={vehicle.vehicleType} />
                <InfoRow label="Manufacturer" value={vehicle.manufacturer} />
                <InfoRow label="Series / model" value={vehicle.model} />
                <InfoRow label="Capacity" value={<CapacityChip capacity={vehicle.capacityHorses} />} />
              </InfoCard>
            </div>

            <div className="grid gap-2.5 lg:grid-cols-2">
              <InfoCard title="Inspection & insurance">
                <InfoRow label="Inspection certificate" value={vehicle.registrationNumber} />
                <InfoRow
                  label="Inspection expiry"
                  value={<ExpiryLine label="INSP" status={vehicle.registrationStatus} date={vehicle.registrationExpiryDate} shortDate={formatFleetDate(vehicle.registrationExpiryDate)} />}
                />
                <InfoRow label="Insurance policy" value={vehicle.insuranceNumber} />
                <InfoRow
                  label="Insurance expiry"
                  value={<ExpiryLine label="INS" status={vehicle.insuranceStatus} date={vehicle.insuranceExpiryDate} shortDate={formatFleetDate(vehicle.insuranceExpiryDate)} />}
                />
              </InfoCard>

              <section className={cn(panelClass, "p-4")}>
                <CardTitle>Specialized equipment</CardTitle>
                <div className="mt-3 space-y-2">
                  {equipment.tags.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {equipment.tags.map((tag) => (
                        <span key={tag} className="inline-flex h-6 items-center rounded-[2px] border border-amber-300 bg-amber-50 px-2 text-[11px] font-medium text-slate-900">
                          {tag.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <dl>
                    <FieldLabel>Custom equipment notes</FieldLabel>
                    <dd className="mt-1 whitespace-pre-wrap text-xs leading-[18px] text-gray-700">{equipment.notes || (equipment.tags.length ? "—" : "No special equipment recorded.")}</dd>
                  </dl>
                </div>
              </section>
            </div>

            <section className={cn(panelClass, "p-4")}>
              <CardTitle>Upcoming assignments</CardTitle>
              <div className="mt-2.5 overflow-x-auto border border-[#e5e2d9]">
                <Table className="min-w-[760px]">
                  <TableHeader className="bg-[#f2efe8] [&_tr]:border-b-0">
                    <TableRow className="border-b-0 hover:bg-transparent">
                      {["Transport plan", "Route plan", "Seq.", "From", "To", "Departure", "Arrival"].map((head) => (
                        <TableHead key={head} className={columnHeadClass}>{head}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicle.upcomingAssignments.length ? (
                      vehicle.upcomingAssignments.map((assignment, index) => (
                        <TableRow key={assignment.routePlanRouteId} className={cn("booking-table-row h-11 border-slate-200 hover:bg-amber-50/60", index % 2 === 0 ? "bg-white" : "bg-[#f7f6f3]")}>
                          <TableCell className="px-2.5 py-1.5 text-xs font-semibold text-gray-900">{assignment.planCode}</TableCell>
                          <TableCell className="px-2.5 py-1.5 text-xs text-gray-700">{assignment.routePlanCode}</TableCell>
                          <TableCell className="px-2.5 py-1.5 text-xs text-gray-700">{assignment.sequenceNo}</TableCell>
                          <TableCell className="px-2.5 py-1.5 text-xs text-gray-700">{assignment.fromLocationName}</TableCell>
                          <TableCell className="px-2.5 py-1.5 text-xs text-gray-700">{assignment.toLocationName}</TableCell>
                          <TableCell className="px-2.5 py-1.5 text-xs text-gray-700">{formatFleetDateTime(assignment.plannedDepartureAt)}</TableCell>
                          <TableCell className="px-2.5 py-1.5 text-xs text-gray-700">{formatFleetDateTime(assignment.plannedArrivalAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="h-10 hover:bg-transparent">
                        <TableCell colSpan={7} className="px-4 py-0 text-center text-[13px] text-gray-500">
                          This vehicle has no upcoming route assignments.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        ) : null}
      </div>

      <VehicleStatusDialog vehicle={statusOpen ? (vehicle ?? null) : null} onOpenChange={setStatusOpen} onChanged={() => void vehicleQuery.refetch()} />
    </div>
  )
}
