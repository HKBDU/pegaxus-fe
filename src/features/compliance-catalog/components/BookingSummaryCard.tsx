import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"

import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge"
import type { ApplyBooking } from "@/features/compliance-catalog/dossier-types"

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3 first:pl-0 sm:border-l sm:border-slate-200 sm:first:border-l-0">
      <dt className="font-heading text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400">{label}</dt>
      <dd className="m-0 mt-1 flex min-h-5 items-center gap-1.5 text-sm font-semibold text-slate-900">{children}</dd>
    </div>
  )
}

/** The booking the dossier is created for, shown on top of every wizard step. */
export function BookingSummaryCard({ booking, compact = false }: { booking: ApplyBooking; compact?: boolean }) {
  return (
    <dl className={compact ? "m-0 grid gap-y-2" : "booking-panel m-0 grid gap-y-1 border bg-white px-5 py-1 sm:grid-cols-[1.2fr_1fr_1fr_0.7fr_1.4fr]"}>
      <Cell label="Booking code"><span className="break-all">{booking.bookingCode}</span></Cell>
      <Cell label="Route">
        <span className="truncate">{booking.originCountry}</span>
        <ArrowRight className="size-3.5 shrink-0 text-amber-500" aria-hidden="true" />
        <span className="truncate">{booking.destinationCountry}</span>
      </Cell>
      <Cell label="Booking status"><BookingStatusBadge status={booking.status} audience="manager" /></Cell>
      <Cell label="No. of horses">{booking.horses.length}</Cell>
      <Cell label="Customer"><span className="truncate">{booking.customer.fullName}</span></Cell>
    </dl>
  )
}
