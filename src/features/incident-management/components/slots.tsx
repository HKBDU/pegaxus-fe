import { HeartPulse, Receipt, Truck } from "lucide-react"

import { cn } from "@/lib/utils"
import { EMERGENCY_COST_CATEGORY_LABELS, HORSE_INCIDENT_TYPE_LABELS, VEHICLE_INCIDENT_TYPE_LABELS } from "@/shared/constants/incident"
import { CostStatusBadge, VndText } from "@/shared/components/incident"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"

import type { Incident, IncidentLike } from "../types"
import { EMPTY, formatDateTime, titleCase } from "../utils"
import { IncidentPhotoGrid } from "./IncidentPhotoGrid"
import { FieldGrid, Flag, InfoRow, Panel, StatTile, TextBlock } from "./ui"

/**
 * Mounting points of SCR-F5-002 for the parts other people own. These are read-only stand-ins that render straight from IN8
 * so the page is complete today; when Khuyên's (`VehicleDetailSection`, `HorseDetailsSection`) and Duong's
 * (`EmergencyCostSection`, `IncidentResponseActions`) components reach `dev`, swap the export in this file only.
 */

const labelOf = (table: Record<string, string>, value: string) => table[value] ?? titleCase(value)

export function VehicleDetailSection({ incident }: { incident: IncidentLike }) {
  const detail = incident.vehicleDetail
  if (!detail) return null
  const scenePhotos = incident.photos.filter((photo) => photo.horseHealthIncidentDetailId === null)
  const safe = detail.driverSafetyStatus === "SAFE"
  return (
    <Panel title="Vehicle incident details" icon={Truck}>
      <div className="mb-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-[2px] border border-[#e5e2d9] bg-[#faf9f6] px-3 py-2.5">
        <span className="rounded-[2px] border-2 border-slate-900 bg-white px-2 py-0.5 font-heading text-base font-bold tracking-wider text-slate-900">{detail.vehicle.licensePlate}</span>
        <span className="min-w-0 text-sm font-semibold text-slate-800">{detail.vehicle.vehicleName ?? detail.vehicle.vehicleCode}</span>
        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">{labelOf(VEHICLE_INCIDENT_TYPE_LABELS, detail.incidentType)}</span>
      </div>
      <FieldGrid>
        <InfoRow label="Vehicle operable"><Flag value={detail.vehicleOperable} warnWhen="no" /></InfoRow>
        <InfoRow label="Repair required"><Flag value={detail.repairRequired} warnWhen="yes" /></InfoRow>
        <InfoRow label="Towing required"><Flag value={detail.towingRequired} warnWhen="yes" /></InfoRow>
        <InfoRow label="Replacement vehicle"><Flag value={detail.replacementVehicleRequired} warnWhen="yes" /></InfoRow>
        <InfoRow label="Est. repair time">{detail.estimatedRepairHours === null ? EMPTY : `${detail.estimatedRepairHours} h`}</InfoRow>
        <InfoRow label="Driver safety">
          <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", safe ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-800")}>
            {titleCase(detail.driverSafetyStatus)}
          </span>
        </InfoRow>
      </FieldGrid>
      <dl className="m-0 mt-3.5 grid gap-3 md:grid-cols-2">
        <TextBlock label="Vehicle condition">{detail.vehicleCondition}</TextBlock>
        <TextBlock label="Damage description">{detail.damageDescription}</TextBlock>
        <TextBlock label="Cargo condition">{detail.cargoConditionNote}</TextBlock>
        <TextBlock label="Repair note">{detail.repairNote}</TextBlock>
      </dl>
      <div className="mt-3.5 empty:hidden">
        <IncidentPhotoGrid photos={scenePhotos} label="Scene photos" />
      </div>
    </Panel>
  )
}

export function HorseDetailsSection({ incident }: { incident: IncidentLike }) {
  if (!incident.horseDetails.length) return null
  return (
    <Panel title="Horse health incident details" icon={HeartPulse}>
      <div className="grid gap-3.5">
        {incident.horseDetails.map((detail) => (
          <article key={detail.horseHealthIncidentDetailId} className="border border-[#e5e2d9] bg-[#faf9f6] p-3 sm:p-3.5">
            <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="m-0 font-heading text-lg font-bold leading-6 text-slate-900">{detail.horse.horseName}</h3>
              {detail.horse.microchipNumber ? (
                <span className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600">Microchip {detail.horse.microchipNumber}</span>
              ) : null}
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">{labelOf(HORSE_INCIDENT_TYPE_LABELS, detail.incidentType)}</span>
            </header>

            <div className="mb-3.5 grid grid-cols-3 gap-2">
              <StatTile label="Temperature" value={detail.bodyTemperatureCelsius} unit="°C" />
              <StatTile label="Heart rate" value={detail.heartRateBpm} unit="bpm" />
              <StatTile label="Respiration" value={detail.respiratoryRateBpm} unit="bpm" />
            </div>

            <FieldGrid>
              <InfoRow label="Vet required"><Flag value={detail.veterinarianRequired} warnWhen="yes" /></InfoRow>
              <InfoRow label="Vet contacted">{formatDateTime(detail.veterinarianContactedAt)}</InfoRow>
              <InfoRow label="Isolation required"><Flag value={detail.isolationRequired} warnWhen="yes" /></InfoRow>
              <InfoRow label="Transportable"><Flag value={detail.horseTransportable} warnWhen="no" /></InfoRow>
            </FieldGrid>

            <dl className="m-0 mt-3.5 grid gap-3 md:grid-cols-2">
              <TextBlock label="Condition">{detail.conditionDescription}</TextBlock>
              <TextBlock label="Symptoms">{detail.symptoms}</TextBlock>
              <TextBlock label="First aid provided">{detail.firstAidProvided}</TextBlock>
              <TextBlock label="Veterinarian instruction">{detail.veterinarianInstruction}</TextBlock>
              <TextBlock label="Medication given">{detail.medicationGiven}</TextBlock>
              <TextBlock label="Outcome note">{detail.outcomeNote}</TextBlock>
            </dl>
            <div className="mt-3.5 empty:hidden">
              <IncidentPhotoGrid photos={incident.photos.filter((photo) => photo.horseHealthIncidentDetailId === detail.horseHealthIncidentDetailId)} label="Horse condition photos" />
            </div>
          </article>
        ))}
      </div>
    </Panel>
  )
}

const headClass = "h-10 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
const cellClass = "px-2.5 py-1.5 text-xs"

export function EmergencyCostSection({ incident }: { incident: Incident }) {
  const { costRequests, costSummary } = incident
  return (
    <Panel title="Emergency cost requests" icon={Receipt} id="emergency-costs">
      {costRequests.length ? (
        <>
          <ul className="m-0 grid list-none gap-2 p-0 md:hidden">
            {costRequests.map((request) => (
              <li key={request.emergencyCostRequestId} className="border border-[#e5e2d9] bg-[#faf9f6] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading text-sm font-bold text-slate-900">{request.requestCode}</span>
                  <CostStatusBadge status={request.status} />
                </div>
                <p className="m-0 mt-0.5 text-xs text-slate-600">{labelOf(EMERGENCY_COST_CATEGORY_LABELS, request.category)} · {request.requestedBy.fullName}</p>
                <dl className="m-0 mt-2 grid grid-cols-2 gap-2">
                  <InfoRow label="Requested"><VndText amount={request.requestedAmount} /></InfoRow>
                  <InfoRow label="Approved">{request.approvedAmount === null ? EMPTY : <VndText amount={request.approvedAmount} />}</InfoRow>
                </dl>
                {request.decision?.decisionReason ?? request.cancellationReason ? (
                  <p className="m-0 mt-3 border-l-[3px] border-amber-400 bg-white px-2.5 py-1.5 text-xs leading-5 text-slate-700">{request.decision?.decisionReason ?? request.cancellationReason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        <div className="hidden overflow-x-auto border border-slate-200 md:block">
          <Table>
            <TableHeader className="bg-[#e9e6de] [&_tr]:border-b-0">
              <TableRow className="hover:bg-transparent">
                {["Request", "Category", "Requested by", "Requested", "Status", "Approved", "Decision note"].map((title) => (
                  <TableHead key={title} className={headClass}>{title}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {costRequests.map((request, index) => (
                <TableRow key={request.emergencyCostRequestId} className={index % 2 ? "bg-[#f7f6f3]" : "bg-white"}>
                  <TableCell className={`${cellClass} font-semibold text-slate-900`}>{request.requestCode}</TableCell>
                  <TableCell className={cellClass}>{labelOf(EMERGENCY_COST_CATEGORY_LABELS, request.category)}</TableCell>
                  <TableCell className={cellClass}>{request.requestedBy.fullName}</TableCell>
                  <TableCell className={cellClass}><VndText amount={request.requestedAmount} /></TableCell>
                  <TableCell className={cellClass}><CostStatusBadge status={request.status} /></TableCell>
                  <TableCell className={cellClass}>{request.approvedAmount === null ? EMPTY : <VndText amount={request.approvedAmount} />}</TableCell>
                  <TableCell className={`${cellClass} max-w-56 truncate`}>{request.decision?.decisionReason ?? request.cancellationReason ?? EMPTY}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      ) : (
        <p className="m-0 text-xs text-gray-500">No emergency cost requests for this incident.</p>
      )}
      <FieldGrid className="mt-3 border-t border-[#eceae3] pt-3">
        <InfoRow label="Requested total"><VndText amount={costSummary.requestedTotal} /></InfoRow>
        <InfoRow label="Approved total"><VndText amount={costSummary.approvedTotal} /></InfoRow>
        <InfoRow label="Pending">{costSummary.pendingCount}</InfoRow>
      </FieldGrid>
    </Panel>
  )
}

/** Buttons of Duong's flows (cost request, route decision, cost decision) and Khuyen's "raise severity". Rendered by their features. */
export function IncidentResponseActions(_props: { incident: Incident }) {
  return null
}
