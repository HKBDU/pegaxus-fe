import { BookingInvoiceList } from "@/features/invoice/components/BookingInvoiceList"

export function InvoicesPanel({ bookingId }: { bookingId: string }) {
  return <section aria-label="Transport plan invoices"><BookingInvoiceList key={bookingId} bookingId={bookingId} audience="manager" /></section>
}
