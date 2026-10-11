import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import { Field, Section } from "@/features/transport-plan/components/ApprovedBookingDetails"
import { formatPlanDate } from "@/features/transport-plan/format"
import { distanceLabel, durationLabel, replacementLabel } from "../../display"
import type { RoutePlanDetail, RoutePlanSummary, RouteSegment } from "../../types"

// Read-only primitives while the owner's RouteCompare export is unavailable. No map/timeline fork.
export function EmergencyChangeSummary({ plan, title = "Selected Route" }: { plan: RoutePlanDetail | RoutePlanSummary; title?: string }) {
  const segments = "segments" in plan ? plan.segments : undefined
  return <Section title={title}>
    <div className="flex flex-wrap items-center gap-2"><h3 className="min-w-0 break-all font-heading text-lg">{plan.routePlanCode}</h3><ApprovedBookingBadge value={plan.routeType} /><ApprovedBookingBadge value={plan.status} /></div>
    {segments?.length ? <p className="break-words text-sm font-medium">{segments[0].fromLocation.locationName} → {segments.at(-1)?.toLocation.locationName}</p> : null}
    <dl className="grid grid-cols-2 gap-3 text-xs"><Field label="Distance">{distanceLabel(plan.totalDistanceKm)}</Field><Field label="Duration">{durationLabel(plan.estimatedDurationMinutes)}</Field>
      <Field label="Last updated">{formatPlanDate(plan.updatedAt)}</Field><Field label="Personnel">{plan.isPersonnelComplete ? "Complete" : "Incomplete"}</Field></dl>
    {plan.routeType === "BACKUP" && <p className="text-xs text-slate-500">Replaces {replacementLabel(plan)}. Distance and duration cover only the replacement, not the effective journey.</p>}
    {plan.routeNote && <p className="whitespace-pre-wrap break-words text-xs text-slate-600">{plan.routeNote}</p>}
  </Section>
}

export function EmergencySegments({ segments, errors = [] }: { segments: RouteSegment[]; errors?: { field: string; message: string }[] }) {
  return <div className="min-w-0 overflow-x-auto rounded-md border border-slate-200">
    <table className="w-full min-w-[580px] text-left text-xs"><caption className="sr-only">Return segment assignments</caption>
      <thead className="bg-muted text-muted-foreground"><tr>{["#", "Route", "Execution", "Vehicle / Provider", "Driver"].map(label => <th key={label} scope="col" className="px-3 py-3 font-heading uppercase">{label}</th>)}</tr></thead>
      <tbody>{segments.map((segment, index) => <tr key={segment.routePlanRouteId} className="border-t bg-white">
        <td className="px-3 py-3">{segment.sequenceNo}</td><td className="max-w-60 px-3 py-3"><p>{segment.fromLocation.locationName} → {segment.toLocation.locationName}</p>
          {errors.filter(error => error.field.startsWith(`segments[${index}]`) || error.field.startsWith(`segments.${index}.`) || error.field.includes(segment.routePlanRouteId)).map(error => <p role="alert" key={error.field} className="mt-1 text-destructive">{error.message}</p>)}</td>
        <td className="px-3 py-3">{segment.isOutsourced ? "Outsourced" : "Internal"}</td>
        <td className="px-3 py-3">{segment.isOutsourced ? segment.outsourcing?.provider.providerName ?? "Not assigned" : segment.vehicles.map(vehicle => vehicle.licensePlate || vehicle.vehicleCode).join(", ") || "Not assigned"}</td>
        <td className="px-3 py-3">{segment.driver?.fullName ?? "Not assigned"}</td>
      </tr>)}</tbody>
    </table>{!segments.length && <p className="p-4 text-xs text-slate-500">No return segments are available.</p>}
  </div>
}
