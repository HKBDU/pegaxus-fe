import { BookingInvoiceList } from "./BookingInvoiceList"

export function CustomerInvoicesTab({ bookingId, highlightInvoiceId }: { bookingId: string; highlightInvoiceId?: string }) {
  return <section aria-label="Booking invoices"><BookingInvoiceList key={bookingId} bookingId={bookingId} audience="customer" highlightInvoiceId={highlightInvoiceId} /></section>
}
