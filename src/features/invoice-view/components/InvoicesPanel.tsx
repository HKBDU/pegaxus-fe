import { BookingInvoiceList } from "./BookingInvoiceList"

export function InvoicesPanel({ bookingId }: { bookingId: string }) {
  return <section aria-label="Transport plan invoices"><BookingInvoiceList key={bookingId} bookingId={bookingId} audience="manager" /></section>
}
