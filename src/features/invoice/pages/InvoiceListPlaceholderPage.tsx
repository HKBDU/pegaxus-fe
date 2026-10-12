import { Link } from "react-router-dom"

import { invoiceCreate } from "@/app/route-config"
import { MOCK_BOOKINGS } from "@/features/invoice/mock-api"
import { useInvoiceMocks } from "@/features/invoice/services"
import { PageHeader } from "@/shared/components/PageHeader"

const SCENARIOS: Record<string, string> = {
  "mock-booking-deposit": "Transport CREATED. DEPOSIT, QUOTATION and SUPPLEMENTARY are allowed.",
  "mock-booking-final": "Transport COMPLETED with a PAID deposit. A FINAL shows the deduction line (VND).",
  "mock-booking-claim": "Has a PAID FINAL. CREDIT_NOTE is allowed, a second FINAL is rejected.",
  "mock-booking-pending": "Booking not approved. Every type is rejected (INVALID_BOOKING_STATUS).",
}

/**
 * TEMPORARY stand-in for the invoice list (invoice-view feature, SCR-F6-001) so the sidebar entry has a target.
 * Replace the `invoices` route with the real list when it is merged and delete this file. In mock mode it also
 * lists the booking scenarios the mock API understands, since the real entry points live in Transport Plans.
 */
export default function InvoiceListPlaceholderPage() {
  return (
    <div className="min-h-[70dvh] bg-[#f4f2ed] px-5 pt-5 pb-8 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[1152px]">
        <PageHeader title="INVOICES" backHref="/admin" backLabel="BACK TO DASHBOARD" showBack={false} />
        <p className="text-sm text-gray-600">The invoice list is built in the invoice-view feature and is not merged yet.</p>

        {useInvoiceMocks ? (
          <section className="mt-4 border border-[#e5e2d9] bg-white p-4">
            <h2 className="m-0! font-heading text-base! font-bold! uppercase tracking-normal! text-gray-900!">Mock scenarios</h2>
            <p className="mt-1 text-xs text-gray-500">Create-invoice entry points while Flow 6 has no backend (VITE_INVOICE_API_MOCKS).</p>
            <ul className="mt-3 divide-y divide-gray-200">
              {Object.keys(MOCK_BOOKINGS).map((bookingId) => (
                <li key={bookingId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900">{MOCK_BOOKINGS[bookingId].bookingCode} <span className="font-normal text-gray-500">({bookingId})</span></p>
                    <p className="text-xs text-gray-600">{SCENARIOS[bookingId]}</p>
                  </div>
                  <Link
                    to={invoiceCreate(bookingId)}
                    className="inline-flex h-8 items-center rounded-[2px] border border-gray-900 bg-white px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] text-gray-900 hover:bg-gray-100"
                  >
                    Create invoice
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
