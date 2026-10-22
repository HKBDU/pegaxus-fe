import { EMERGENCY_COST_CATEGORY_LABELS, HORSE_INCIDENT_TYPE_LABELS, VEHICLE_INCIDENT_TYPE_LABELS } from "@/shared/constants/incident"
import { CostStatusBadge, VndText } from "@/shared/components/incident"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"

import type { Incident, IncidentLike } from "../types"
import { EMPTY, formatDateTime, titleCase, yesNo } from "../utils"
import { IncidentPhotoGrid } from "./IncidentPhotoGrid"
import { InfoRow, Panel, TextBlock, fieldLabelClass } from "./ui"

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
  return (
    <Panel title="Vehicle incident details">
      <dl className="m-0 grid gap-x-8 gap-y-1.5 md:grid-cols-2">
        <InfoRow label="License plate">{detail.vehicle.licensePlate}</InfoRow>
        <InfoRow label="Vehicle">{detail.vehicle.vehicleName ?? detail.vehicle.vehicleCode}</InfoRow>
        <InfoRow label="Incident type">{labelOf(VEHICLE_INCIDENT_TYPE_LABELS, detail.incidentType)}</InfoRow>
        <InfoRow label="Vehicle operable">{yesNo(detail.vehicleOperable)}</InfoRow>
        <InfoRow label="Repair required">{yesNo(detail.repairRequired)}</InfoRow>
        <InfoRow label="Towing required">{yesNo(detail.towingRequired)}</InfoRow>
        <InfoRow label="Replacement vehicle">{yesNo(detail.replacementVehicleRequired)}</InfoRow>
        <InfoRow label="Est. repair hours">{detail.estimatedRepairHours === null ? EMPTY : `${detail.estimatedRepairHours} h`}</InfoRow>
        <InfoRow label="Driver safety">{titleCase(detail.driverSafetyStatus)}</InfoRow>
        <div className="grid gap-2 md:col-span-2">
          <TextBlock label="Vehicle condition">{detail.vehicleCondition}</TextBlock>
          <TextBlock label="Damage description">{detail.damageDescription}</TextBlock>
          <TextBlock label="Cargo condition">{detail.cargoConditionNote}</TextBlock>
          <TextBlock label="Repair note">{detail.repairNote}</TextBlock>
          <IncidentPhotoGrid photos={scenePhotos} label="Scene photos" />
        </div>
      </dl>
    </Panel>
  )
}

export function HorseDetailsSection({ incident }: { incident: IncidentLike }) {
  if (!incident.horseDetails.length) return null
  return (
    <Panel title="Horse health incident details">
      <div className="grid gap-3">
        {incident.horseDetails.map((detail) => (
          <article key={detail.horseHealthIncidentDetailId} className="border border-slate-200 bg-[#faf9f6] px-3 py-2.5">
            <h3 className="m-0 mb-1.5 text-sm font-semibold text-gray-900">
              {detail.horse.horseName}
              {detail.horse.microchipNumber ? <span className="ml-2 text-[11px] font-normal text-gray-500">Microchip {detail.horse.microchipNumber}</span> : null}
            </h3>
            <dl className="m-0 grid gap-x-8 gap-y-1.5 md:grid-cols-2">
              <InfoRow label="Incident type">{labelOf(HORSE_INCIDENT_TYPE_LABELS, detail.incidentType)}</InfoRow>
              <InfoRow label="Vet required">{yesNo(detail.veterinarianRequired)}</InfoRow>
              <InfoRow label="Vet contacted">{formatDateTime(detail.veterinarianContactedAt)}</InfoRow>
              <InfoRow label="Isolation required">{yesNo(detail.isolationRequired)}</InfoRow>
              <InfoRow label="Temperature">{detail.bodyTemperatureCelsius === null ? EMPTY : `${detail.bodyTemperatureCelsius} °C`}</InfoRow>
              <InfoRow label="Heart / respiration">{`${detail.heartRateBpm ?? EMPTY} / ${detail.respiratoryRateBpm ?? EMPTY} bpm`}</InfoRow>
              <InfoRow label="Transportable">{detail.horseTransportable === null ? EMPTY : yesNo(detail.horseTransportable)}</InfoRow>
              <div className="grid gap-2 md:col-span-2">
                <TextBlock label="Condition">{detail.conditionDescription}</TextBlock>
                <TextBlock label="Symptoms">{detail.symptoms}</TextBlock>
                <TextBlock label="First aid provided">{detail.firstAidProvided}</TextBlock>
                <TextBlock label="Veterinarian instruction">{detail.veterinarianInstruction}</TextBlock>
                <TextBlock label="Medication given">{detail.medicationGiven}</TextBlock>
                <TextBlock label="Outcome note">{detail.outcomeNote}</TextBlock>
                <IncidentPhotoGrid photos={incident.photos.filter((photo) => photo.horseHealthIncidentDetailId === detail.horseHealthIncidentDetailId)} label="Horse condition photos" />
              </div>
            </dl>
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
    <Panel title="Emergency cost requests" id="emergency-costs">
      {costRequests.length ? (
        <div className="overflow-x-auto border border-slate-200">
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
      ) : (
        <p className="m-0 text-xs text-gray-500">No emergency cost requests for this incident.</p>
      )}
      <dl className="m-0 mt-2.5 flex flex-wrap gap-x-8 gap-y-1">
        <div><dt className={fieldLabelClass}>Requested total</dt><dd className="m-0 text-xs font-semibold text-gray-900"><VndText amount={costSummary.requestedTotal} /></dd></div>
        <div><dt className={fieldLabelClass}>Approved total</dt><dd className="m-0 text-xs font-semibold text-gray-900"><VndText amount={costSummary.approvedTotal} /></dd></div>
        <div><dt className={fieldLabelClass}>Pending</dt><dd className="m-0 text-xs font-semibold text-gray-900">{costSummary.pendingCount}</dd></div>
      </dl>
    </Panel>
  )
}

/** Buttons of Duong's flows (cost request, route decision, cost decision) and Khuyen's "raise severity". Rendered by their features. */
export function IncidentResponseActions(_props: { incident: Incident }) {
  return null
}
