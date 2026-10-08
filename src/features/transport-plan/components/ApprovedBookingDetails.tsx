import type { ReactNode } from "react"
import { formatBookingDate } from "@/features/booking/utils"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { EmptyState } from "@/shared/components/common"
import type { ApprovedBookingDetail } from "../types"
import { ApprovedBookingBadge } from "./ApprovedBookingBadge"

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <Card className="booking-panel gap-0 rounded-[2px] border bg-white py-0">
    <CardContent className="space-y-4 px-5 py-5 sm:px-6">
      <h2 className="font-heading text-lg uppercase tracking-wide">{title}</h2>
      {children}
    </CardContent>
  </Card>
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="mb-1 text-xs text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words text-sm text-slate-800">{children || "—"}</dd></div>
}

export function ApprovedBookingDetails({ booking }: { booking: ApprovedBookingDetail }) {
  return <div className="space-y-5">
    <Section title="Customer & requested journey">
      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Customer">{booking.customer.fullName}</Field>
        <Field label="Customer code">{booking.customer.customerCode}</Field>
        <Field label="Phone">{booking.customer.phone}</Field>
        <Field label="Origin">{booking.originAddress} ({booking.originCountry})</Field>
        <Field label="Destination">{booking.destinationAddress} ({booking.destinationCountry})</Field>
        <Field label="Transport scope"><ApprovedBookingBadge value={booking.transportScope} /></Field>
        <Field label="Requested departure">{formatBookingDate(booking.requestedDepartureDate)}</Field>
        <Field label="Requested arrival">{formatBookingDate(booking.requestedArrivalDate)}</Field>
        <Field label="Total horses">{String(booking.totalHorses)}</Field>
      </dl>
    </Section>
    <Section title="Transport instructions">
      <dl className="grid gap-5 sm:grid-cols-2">
        <Field label="Special requirements">{booking.specialRequirements}</Field>
        <Field label="Customer note">{booking.customerNote}</Field>
      </dl>
    </Section>
    <Section title={`Horses (${booking.totalHorses})`}>
      {!booking.horses.length ? <EmptyState message="No horse details are available for this booking." /> : <Table>
        <TableHeader className="bg-[#e9e6de]"><TableRow>
          {["Name", "Sex", "Breed", "Microchip", "Passport", "Special handling"].map((label) => <TableHead key={label} className="font-heading text-xs uppercase">{label}</TableHead>)}
        </TableRow></TableHeader>
        <TableBody>{booking.horses.map((horse) => <TableRow key={horse.horseId}>
          <TableCell className="font-medium">{horse.horseName}</TableCell>
          <TableCell>{horse.sex ? <span className="capitalize">{horse.sex.toLowerCase()}</span> : "—"}</TableCell>
          <TableCell>{horse.breed || "—"}</TableCell>
          <TableCell>{horse.microchipNumber || "—"}</TableCell>
          <TableCell>{horse.passportNumber || "—"}</TableCell>
          <TableCell className="min-w-40 max-w-72 whitespace-pre-wrap">{horse.specialHandlingNotes || "—"}</TableCell>
        </TableRow>)}</TableBody>
      </Table>}
    </Section>
    <Section title="Operational status">
      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Transport"><div className="space-y-1"><p>{booking.transport.transportCode}</p><ApprovedBookingBadge value={booking.transport.status} /></div></Field>
        <Field label="Transport plan">{booking.transportPlan ? <div className="space-y-1"><p>{booking.transportPlan.planCode}</p><ApprovedBookingBadge value={booking.transportPlan.status} /></div> : "Not created"}</Field>
        <Field label="Deposit"><ApprovedBookingBadge value={booking.depositStatus} /></Field>
        <Field label="Route planning"><ApprovedBookingBadge value={booking.routePlanningStatus} /></Field>
      </dl>
      <div className="border-t pt-4">
        <h3 className="mb-3 text-sm font-medium">Route plans</h3>
        {!booking.routePlans.length ? <p className="text-sm text-slate-500">No route plan has been created.</p> : <ul className="space-y-2">
          {booking.routePlans.map((route) => <li key={route.routePlanId} className="flex flex-wrap items-center gap-3 rounded-[2px] border p-3 text-sm">
            <span className="font-medium">{route.routePlanCode}</span><ApprovedBookingBadge value={route.routeType} /><ApprovedBookingBadge value={route.status} />
          </li>)}
        </ul>}
      </div>
    </Section>
  </div>
}
