import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBookingDate } from "@/features/booking/utils"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { EmptyState } from "@/shared/components/common"
import type { ApprovedBookingDetail } from "../types"
import { ApprovedBookingBadge } from "./ApprovedBookingBadge"

export function Section({ title, children, description, icon: Icon, actions, className, embedded = false, unframed = false }: { title: string; children: ReactNode; description?: string; icon?: LucideIcon; actions?: ReactNode; className?: string; embedded?: boolean; unframed?: boolean }) {
  if (embedded) return <div role="group" aria-label={title} className={cn("min-w-0 space-y-3", className)}>{actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}{children}</div>
  const Container = unframed ? "section" : Card
  const Content = unframed ? "div" : CardContent
  return <Container className={cn("min-w-0", !unframed && "gap-0 rounded-[2px] border-slate-200 bg-white py-0 shadow-xs", className)}>
    <Content className={cn("space-y-3", !unframed && "p-3")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <span className="flex size-7 shrink-0 items-center justify-center rounded-[2px] border border-primary/15 bg-primary/5 text-primary"><Icon aria-hidden="true" className="size-3.5" /></span>}
          <div className="min-w-0"><h2 className="m-0! font-heading text-base! leading-5! uppercase tracking-wide text-slate-900">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}</div>
        </div>
        {actions}
      </div>
      {children}
    </Content>
  </Container>
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="mb-1 text-[11px] font-medium text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words text-sm font-medium leading-5 text-slate-800">{children == null || children === "" || children === false ? "—" : children}</dd></div>
}

export function ApprovedBookingDetails({ booking, showDossier = false }: { booking: ApprovedBookingDetail; showDossier?: boolean }) {
  return <div className="space-y-3">
    <Section title="Customer & requested journey">
      <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Customer">{booking.customer.fullName}</Field>
        <Field label="Customer code">{booking.customer.customerCode}</Field>
        <Field label="Phone">{booking.customer.phone}</Field>
        <Field label="Origin">{booking.originAddress} ({booking.originCountry})</Field>
        <Field label="Destination">{booking.destinationAddress} ({booking.destinationCountry})</Field>
        <Field label="Transport scope"><ApprovedBookingBadge value={booking.isInternational ? "INTERNATIONAL" : "DOMESTIC"} /></Field>
        <Field label="Requested departure">{formatBookingDate(booking.requestedDepartureDate)}</Field>
        <Field label="Requested arrival">{booking.requestedArrivalDate ? formatBookingDate(booking.requestedArrivalDate) : "—"}</Field>
        <Field label="Total horses">{String(booking.totalHorses)}</Field>
      </dl>
    </Section>
    <Section title="Transport instructions">
      <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <Field label="Special requirements">{booking.specialRequirements}</Field>
        <Field label="Customer note">{booking.customerNote}</Field>
      </dl>
    </Section>
    <Section title={`Horses (${booking.totalHorses})`}>
      {!booking.horses.length ? <EmptyState message="No horse details are available for this booking." /> : <Table className="text-xs [&_td]:h-11 [&_td]:px-2.5 [&_td]:py-1.5">
        <TableHeader className="bg-[#e9e6de]"><TableRow>
          {["Name", "Sex", "Breed", "Microchip", "Passport", "Special handling"].map((label) => <TableHead key={label} className="h-11 px-2.5 font-heading text-[11px] uppercase tracking-[0.06em] text-gray-600">{label}</TableHead>)}
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
      <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Transport">{booking.transport ? <div className="space-y-1"><p>{booking.transport.transportCode}</p><ApprovedBookingBadge value={booking.transport.status} /></div> : "Not available"}</Field>
        <Field label="Transport plan">{booking.transportPlan ? <div className="space-y-1"><p>{booking.transportPlan.planCode}</p><ApprovedBookingBadge value={booking.transportPlan.status} /></div> : "Not created"}</Field>
        {showDossier && <Field label="Compliance dossier">{booking.complianceDossier ? <ApprovedBookingBadge value={booking.complianceDossier.status} /> : "Not created"}</Field>}
      </dl>
    </Section>
  </div>
}
