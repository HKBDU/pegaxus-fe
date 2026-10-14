import { formatBookingDate } from "@/features/booking/utils"
import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import { Field, Section } from "@/features/transport-plan/components/ApprovedBookingDetails"
import { EmptyState } from "@/shared/components/common"
import { distanceLabel, durationLabel } from "../display"
import type { RouteSegment } from "../types"
import type { SegmentImpact } from "../route-comparison"
import { Badge } from "@/shared/components/ui/badge"
import { OutsourceSegmentDialog } from "@/features/route-plan/components/OutsourceSegmentDialog"

export function RouteSegmentList({ segments, review, routePlanId, canManageOutsource }: { segments: RouteSegment[]; review?: { title: string; impact: (segment: RouteSegment) => SegmentImpact }; routePlanId?: string; canManageOutsource?: boolean }) {
  if (!segments.length) return <EmptyState message="No segments are available for this route plan." />
  const ordered = [...segments].sort((a, b) => a.sequenceNo - b.sequenceNo)
  const Heading = review ? "h3" : "h2"
  return <section aria-label={review ? `${review.title} segment timeline` : "Segment timeline"} className="min-w-0 space-y-4">
    <Heading className="font-heading text-lg uppercase text-slate-900">{review?.title ?? "Segment Timeline"}</Heading>
    <ol className="ml-2 space-y-5 border-l-2 border-slate-200 pl-5 sm:pl-7">
      {ordered.map((segment) => {
        const impact = review?.impact(segment)
        const details = <>
          <dl className={`grid gap-4 text-sm sm:grid-cols-2 ${review ? "" : "lg:grid-cols-3"}`}>
            <Field label="Planned departure">{segment.plannedDepartureAt ? formatBookingDate(segment.plannedDepartureAt, true) : "Not scheduled"}</Field>
            <Field label="Planned arrival">{segment.plannedArrivalAt ? formatBookingDate(segment.plannedArrivalAt, true) : "Not scheduled"}</Field>
            <Field label="Distance">{distanceLabel(segment.route.distanceKm)}</Field>
            <Field label="Duration">{durationLabel(segment.route.estimatedDurationMinutes)}</Field>
            {segment.actualDepartureAt && <Field label="Actual departure">{formatBookingDate(segment.actualDepartureAt, true)}</Field>}
            {segment.actualArrivalAt && <Field label="Actual arrival">{formatBookingDate(segment.actualArrivalAt, true)}</Field>}
            {segment.dwellAfterMinutes != null && <Field label="Dwell after segment">{`${segment.dwellAfterMinutes} min`}</Field>}
            {segment.isOutsourced ? <Field label="Provider">{segment.outsourcing?.provider.providerName ?? "Provider information unavailable"}</Field> : <>
              <Field label="Vehicles">{segment.vehicles.length ? <ul className="space-y-1">{segment.vehicles.map((vehicle) => <li key={vehicle.vehicleId}>{vehicle.vehicleName || vehicle.vehicleCode} · {vehicle.licensePlate || vehicle.vehicleCode} · {vehicle.capacityHorses == null ? "Capacity unavailable" : `${vehicle.capacityHorses} horses`}</li>)}</ul> : "Not assigned"}</Field>
              <Field label="Driver">{segment.driver?.fullName ?? "Not assigned"}</Field><Field label="Escort">{segment.escort?.fullName ?? "Not assigned"}</Field>
            </>}
          </dl>
          {segment.note && <div className="border-t pt-3"><p className="mb-1 text-xs text-slate-500">Notes</p><p className="whitespace-pre-wrap break-words text-sm">{segment.note}</p></div>}
        </>
        return <li key={segment.routePlanRouteId} data-impact={impact?.kind} data-assignment={segment.isOutsourced ? "outsourced" : "internal"} className="relative min-w-0">
        <span aria-hidden="true" className={`absolute top-2 -left-[27px] size-3 rounded-full border-2 border-white sm:-left-[35px] ${review && !impact?.highlighted ? "bg-slate-700" : "bg-primary"}`} />
        <p className="mb-2 text-xs font-medium text-slate-500">{segment.fromLocation.locationName}</p>
        <Section title={`Segment ${String(segment.sequenceNo).padStart(2, "0")}`} className={impact?.highlighted ? "border-primary/30 bg-primary/[0.025]" : undefined}
          actions={<div className="flex flex-wrap items-center gap-2">{impact ? <Badge variant="outline" className={`max-w-full whitespace-normal rounded-md text-[10px] ${impact.highlighted ? "border-primary/30 text-primary" : "border-slate-200 text-slate-600"}`}>{impact.label}</Badge> : null}{canManageOutsource && routePlanId && !review ? <OutsourceSegmentDialog routePlanId={routePlanId} routePlanRouteId={segment.routePlanRouteId} transportMode={segment.route.transportMode} isOutsourced={segment.isOutsourced} currentNote={segment.note}><button type="button" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">{segment.isOutsourced ? "Manage outsource" : "Outsource"}</button></OutsourceSegmentDialog> : null}</div>}>
          <div className="flex flex-wrap gap-2"><ApprovedBookingBadge value={segment.route.transportMode} /><ApprovedBookingBadge value={segment.isOutsourced ? "OUTSOURCED" : "INTERNAL"} /><ApprovedBookingBadge value={segment.status} /><ApprovedBookingBadge value={segment.routeType} /></div>
          <p className="break-words text-sm font-semibold">{segment.fromLocation.locationName} → {segment.toLocation.locationName}</p>
          {review ? <>
            <p className="text-xs leading-5 text-slate-500">{impact?.detail}</p>
            <p className="text-xs text-slate-600">Planned arrival · {segment.plannedArrivalAt ? formatBookingDate(segment.plannedArrivalAt, true) : "Not scheduled"}</p>
            <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Timing, resources &amp; notes</summary><div className="mt-4 space-y-4">{details}</div></details>
          </> : details}
        </Section>
      </li>})}
    </ol>
    <p className="pl-7 text-xs font-medium text-slate-500">Destination · {ordered.at(-1)?.toLocation.locationName}</p>
  </section>
}
