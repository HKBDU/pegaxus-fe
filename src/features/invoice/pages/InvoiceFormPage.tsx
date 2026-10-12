import { useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"

import { invoiceDetail, invoiceEdit, ROLE_ROUTES } from "@/app/route-config"
import { InvoiceFormDialog } from "@/features/invoice/components/InvoiceFormDialog"
import { getInvoiceErrorMessage } from "@/features/invoice/errors"
import { useInvoice, useInvoiceBookingContext } from "@/features/invoice/hooks"
import { ErrorState, LoadingState } from "@/shared/components/common"

interface InvoiceFormPageProps {
  mode: "create" | "edit"
}

/**
 * Route wrapper of SCR-F6-003 (the create/edit modal). Create is entered with a bookingId from Transport Plans or
 * "Create another invoice"; edit loads the draft with IV6. The modal is route-based so the entry points only navigate.
 */
export default function InvoiceFormPage({ mode }: InvoiceFormPageProps) {
  const { bookingId = "", invoiceId = "" } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [reloadCount, setReloadCount] = useState(0)

  const invoiceQuery = useInvoice(mode === "edit" ? invoiceId : undefined)
  const targetBookingId = mode === "edit" ? invoiceQuery.data?.booking.bookingId : bookingId
  const bookingQuery = useInvoiceBookingContext(targetBookingId)

  function close(saved?: { invoiceId: string }, options?: { edit?: boolean }) {
    if (saved) return navigate(options?.edit ? invoiceEdit(saved.invoiceId) : invoiceDetail(saved.invoiceId), { replace: true })
    // Cancelled: go back to where the manager came from (Transport Plans, invoice detail), else to the invoice list.
    if (location.key !== "default") navigate(-1)
    else navigate(mode === "edit" ? invoiceDetail(invoiceId) : ROLE_ROUTES.invoices, { replace: true })
  }

  async function reload() {
    await invoiceQuery.refetch()
    setReloadCount((count) => count + 1)
  }

  const failure = (mode === "edit" && invoiceQuery.isError ? invoiceQuery : null) ?? (bookingQuery.isError ? bookingQuery : null)
  const loading = (mode === "edit" && invoiceQuery.isLoading) || bookingQuery.isLoading

  return (
    <div className="min-h-[70dvh] bg-[#f4f2ed] px-5 pt-5 pb-8 sm:px-6 lg:px-10">
      {loading ? <LoadingState /> : null}
      {failure ? (
        <div className="mx-auto max-w-[640px] space-y-3">
          <ErrorState
            message={getInvoiceErrorMessage(failure.error, "Unable to load the data of this invoice.")}
            onRetry={() => void (mode === "edit" ? invoiceQuery.refetch() : bookingQuery.refetch())}
          />
          <Link to={ROLE_ROUTES.invoices} className="block text-center text-xs font-bold uppercase tracking-wider text-primary">← Back to invoices</Link>
        </div>
      ) : null}
      {bookingQuery.data && (mode === "create" || invoiceQuery.data) ? (
        <InvoiceFormDialog
          // A reload remounts the form so it starts again from the freshly read draft.
          key={`${mode}-${invoiceId || bookingId}-${reloadCount}`}
          mode={mode}
          booking={bookingQuery.data}
          invoice={mode === "edit" ? invoiceQuery.data : undefined}
          onClose={close}
          onReload={() => void reload()}
        />
      ) : null}
    </div>
  )
}
