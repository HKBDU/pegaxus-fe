import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import { Field, Section } from "@/features/transport-plan/components/ApprovedBookingDetails"
import { formatPlanDate } from "@/features/transport-plan/format"
import { distanceLabel, durationLabel, replacementLabel } from "../../display"
import type { RoutePlanDetail, RoutePlanSummary, RouteSegment } from "../../types"
import { GitBranch, Route } from "lucide-react"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { orderedSegments } from "../../route-comparison"

// Read-only primitives while the owner's RouteCompare export is unavailable. No map/timeline fork.
export function EmergencyChangeSummary({ plan, title = "Selected Route", proposed = false, compact = false }: { plan: RoutePlanDetail | RoutePlanSummary; title?: string; proposed?: boolean; compact?: boolean }) {
  const segments = "segments" in plan ? orderedSegments(plan) : undefined
  return <Section title={title} icon={proposed ? GitBranch : Route} className={proposed ? "border-t-2 border-t-primary" : undefined} actions={<ApprovedBookingBadge value={plan.status} />}>
    <div className="flex flex-wrap items-center gap-2"><h3 className="min-w-0 break-all font-heading text-xl text-slate-900">{plan.routePlanCode}</h3><ApprovedBookingBadge value={plan.routeType} /></div>
    {segments?.length ? <p className="break-words text-sm font-medium">{segments[0].fromLocation.locationName} → {segments.at(-1)?.toLocation.locationName}</p> : null}
    {!compact && <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs"><Field label="Distance">{distanceLabel(plan.totalDistanceKm)}</Field><Field label="Duration">{durationLabel(plan.estimatedDurationMinutes)}</Field>
      <Field label="Last updated">{formatPlanDate(plan.updatedAt)}</Field><Field label="Personnel">{plan.isPersonnelComplete ? "Complete" : "Incomplete"}</Field><Field label="Segments">{String(segments?.length ?? ("segmentCount" in plan ? plan.segmentCount : 0))}</Field></dl>}
    {plan.routeType === "BACKUP" && <p className="text-xs text-slate-500">Replaces {replacementLabel(plan)}. Distance and duration cover only the replacement, not the effective journey.</p>}
    {!compact && plan.routeNote && <p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{plan.routeNote}</p>}
  </Section>
}

export function EmergencySegments({ segments, errors = [] }: { segments: RouteSegment[]; errors?: { field: string; message: string }[] }) {
  return <div className="booking-panel min-w-0 overflow-x-auto rounded-[2px] border border-slate-200">
    <Table className="min-w-[580px] text-xs"><TableCaption className="sr-only">Return segment assignments</TableCaption>
      <TableHeader className="bg-[#e9e6de]"><TableRow>{["#", "Route", "Execution", "Vehicle / Provider", "Driver"].map(label => <TableHead key={label} scope="col" className="h-11 px-2.5 font-heading text-[11px] uppercase tracking-[0.06em] text-gray-600">{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{segments.map((segment, index) => <TableRow key={segment.routePlanRouteId} className="border-slate-200 bg-white transition-colors duration-200 hover:bg-primary/5 motion-reduce:transition-none">
        <TableCell className="px-2.5 py-1.5">{segment.sequenceNo}</TableCell><TableCell className="max-w-60 whitespace-normal px-2.5 py-1.5"><p>{segment.fromLocation.locationName} → {segment.toLocation.locationName}</p>
          {errors.filter(error => error.field.startsWith(`segments[${index}]`) || error.field.startsWith(`segments.${index}.`) || error.field.includes(segment.routePlanRouteId)).map(error => <p role="alert" key={error.field} className="mt-1 text-destructive">{error.message}</p>)}</TableCell>
        <TableCell className="px-2.5 py-1.5">{segment.isOutsourced ? "Outsourced" : "Internal"}</TableCell>
        <TableCell className="px-2.5 py-1.5">{segment.isOutsourced ? segment.outsourcing?.provider.providerName ?? "Not assigned" : segment.vehicles.map(vehicle => vehicle.licensePlate || vehicle.vehicleCode).join(", ") || "Not assigned"}</TableCell>
        <TableCell className="px-2.5 py-1.5">{segment.isOutsourced ? "Provider-managed" : segment.driver?.fullName ?? "Not assigned"}</TableCell>
      </TableRow>)}</TableBody>
    </Table>{!segments.length && <p className="p-4 text-xs text-slate-500">No return segments are available.</p>}
  </div>
}
