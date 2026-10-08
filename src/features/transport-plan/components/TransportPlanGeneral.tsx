import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { EmptyState } from "@/shared/components/common"
import { formatPlanDate } from "../format"
import type { TransportPlanDetail } from "../transport-plan.types"
import { Field, Section } from "./ApprovedBookingDetails"
import { ApprovedBookingBadge } from "./ApprovedBookingBadge"

export function TransportPlanGeneral({ plan }: { plan: TransportPlanDetail }) {
  return <div className="space-y-5">
    <Section title="General / Modes">
      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Plan code">{plan.planCode}</Field>
        <Field label="Booking code">{plan.booking.bookingCode}</Field>
        <Field label="Transport code">{plan.transport.transportCode}</Field>
        <Field label="Booking status"><ApprovedBookingBadge value={plan.booking.status} /></Field>
        <Field label="Transport status"><ApprovedBookingBadge value={plan.transport.status} /></Field>
        <Field label="Transport scope"><ApprovedBookingBadge value={plan.booking.transportScope} /></Field>
        <Field label="Planned start">{formatPlanDate(plan.plannedStartAt)}</Field>
        <Field label="Planned end">{formatPlanDate(plan.plannedEndAt)}</Field>
        {plan.transportModeOptions?.length ? <Field label="Transport modes"><div className="flex flex-wrap gap-1">{plan.transportModeOptions.map((mode) => <ApprovedBookingBadge key={mode} value={mode} />)}</div></Field> : null}
        <Field label="Estimated distance">{plan.estimatedDistanceKm == null ? "—" : `${plan.estimatedDistanceKm} km`}</Field>
        <Field label="Estimated duration">{plan.estimatedDurationMinutes == null ? "—" : `${plan.estimatedDurationMinutes} minutes`}</Field>
      </dl>
      <dl className="border-t pt-4"><Field label="Planning notes">{plan.planningNote}</Field></dl>
    </Section>
    <Section title="Linked transport providers">
      {!plan.providers.length ? <EmptyState message="No transport providers are linked to this plan." /> : <Table>
        <TableHeader className="bg-[#e9e6de]"><TableRow>{["Provider", "Service type", "Assigned at", "Note"].map((label) => <TableHead key={label} className="whitespace-nowrap font-heading text-xs uppercase">{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{plan.providers.map((item, index) => <TableRow key={`${item.provider.transportProviderId}-${item.serviceType}-${index}`}>
          <TableCell><p className="font-medium">{item.provider.providerName}</p><p className="mt-1 text-xs text-slate-500">{item.provider.providerCode}</p></TableCell>
          <TableCell>{item.serviceType.replaceAll("_", " ")}</TableCell>
          <TableCell className="whitespace-nowrap">{formatPlanDate(item.assignedAt)}</TableCell>
          <TableCell className="min-w-40 max-w-72 whitespace-pre-wrap">{item.note || "—"}</TableCell>
        </TableRow>)}</TableBody>
      </Table>}
    </Section>
    <Section title="Record information">
      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Approved by">{plan.approvedBy?.fullName}</Field>
        <Field label="Approved at">{formatPlanDate(plan.approvedAt)}</Field>
        <Field label="Created at">{formatPlanDate(plan.createdAt)}</Field>
        <Field label="Updated at">{formatPlanDate(plan.updatedAt)}</Field>
      </dl>
    </Section>
  </div>
}
