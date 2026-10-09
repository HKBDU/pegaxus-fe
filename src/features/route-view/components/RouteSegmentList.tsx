import { formatBookingDate } from "@/features/booking/utils"
import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import { Field, Section } from "@/features/transport-plan/components/ApprovedBookingDetails"
import { EmptyState } from "@/shared/components/common"
import { distanceLabel, durationLabel } from "../display"
import type { RouteSegment } from "../types"

export function RouteSegmentList({ segments }: { segments: RouteSegment[] }) {
  if (!segments.length) return <EmptyState message="No segments are available for this route plan." />
  const ordered = [...segments].sort((a, b) => a.sequenceNo - b.sequenceNo)
  return <section aria-label="Segment timeline" className="space-y-4">
    <h2 className="font-heading text-lg uppercase">Segment Timeline</h2>
    <ol className="ml-2 space-y-5 border-l-2 border-slate-200 pl-5 sm:pl-7">
      {ordered.map((segment) => <li key={segment.routePlanRouteId} data-assignment={segment.isOutsourced ? "outsourced" : "internal"} className="relative">
        <span aria-hidden="true" className="absolute top-2 -left-[27px] size-3 rounded-full border-2 border-white bg-primary sm:-left-[35px]" />
        <p className="mb-2 text-xs font-medium text-slate-500">{segment.fromLocation.locationName}</p>
        <Section title={`Segment ${String(segment.sequenceNo).padStart(2, "0")}`}>
          <div className="flex flex-wrap gap-2"><ApprovedBookingBadge value={segment.route.transportMode} /><ApprovedBookingBadge value={segment.isOutsourced ? "OUTSOURCED" : "INTERNAL"} /><ApprovedBookingBadge value={segment.status} /><ApprovedBookingBadge value={segment.routeType} /></div>
          <p className="break-words text-sm font-semibold">{segment.fromLocation.locationName} → {segment.toLocation.locationName}</p>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Planned departure">{formatBookingDate(segment.plannedDepartureAt, true)}</Field>
            <Field label="Planned arrival">{formatBookingDate(segment.plannedArrivalAt, true)}</Field>
            <Field label="Distance">{distanceLabel(segment.route.distanceKm)}</Field>
            <Field label="Duration">{durationLabel(segment.route.estimatedDurationMinutes)}</Field>
            {segment.actualDepartureAt && <Field label="Actual departure">{formatBookingDate(segment.actualDepartureAt, true)}</Field>}
            {segment.actualArrivalAt && <Field label="Actual arrival">{formatBookingDate(segment.actualArrivalAt, true)}</Field>}
            {segment.dwellAfterMinutes != null && <Field label="Dwell after segment">{`${segment.dwellAfterMinutes} min`}</Field>}
            {segment.isOutsourced ? <Field label="Provider">{segment.outsourcing?.provider.providerName ?? "Provider information unavailable"}</Field> : <>
              <Field label="Vehicles">{segment.vehicles.length ? <ul className="space-y-1">{segment.vehicles.map((vehicle) => <li key={vehicle.vehicleId}>{vehicle.vehicleName} · {vehicle.licensePlate || vehicle.vehicleCode} · {vehicle.capacityHorses} horses</li>)}</ul> : "Not assigned"}</Field>
              <Field label="Driver">{segment.driver?.fullName ?? "Not assigned"}</Field><Field label="Escort">{segment.escort?.fullName ?? "Not assigned"}</Field>
            </>}
          </dl>
          {segment.note && <div className="border-t pt-3"><p className="mb-1 text-xs text-slate-500">Notes</p><p className="whitespace-pre-wrap break-words text-sm">{segment.note}</p></div>}
        </Section>
      </li>)}
    </ol>
    <p className="pl-7 text-xs font-medium text-slate-500">Destination · {ordered.at(-1)?.toLocation.locationName}</p>
  </section>
}
