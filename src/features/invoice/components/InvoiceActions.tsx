import { useState } from "react"
import { Link } from "react-router-dom"

import { invoiceCreate, invoiceEdit } from "@/app/route-config"
import { CancelInvoiceDialog } from "@/features/invoice/components/CancelInvoiceDialog"
import { IssueInvoiceDialog } from "@/features/invoice/components/IssueInvoiceDialog"
import { PayNowButton } from "@/features/invoice/components/PayNowButton"
import { RecordPaymentDialog } from "@/features/invoice/components/RecordPaymentDialog"
import type { InvoiceAction } from "@/features/invoice/constants"
import type { Invoice, InvoiceDetail } from "@/features/invoice/types"
import { Button } from "@/shared/components/ui/button"

interface InvoiceActionsProps {
  invoice: InvoiceDetail
  manager: boolean
  onInvoiceChanged: () => Promise<void>
}

function IssueAction({ invoice, onInvoiceChanged }: { invoice: Invoice; onInvoiceChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" className="rounded-[2px]" onClick={() => setOpen(true)}>Issue invoice</Button>
      <IssueInvoiceDialog invoice={invoice} open={open} onOpenChange={setOpen} onIssued={() => void onInvoiceChanged()} />
    </>
  )
}

/**
 * The buttons of the invoice detail page. It renders one control per `availableActions` key the API returned for the
 * caller; nothing here infers permissions from the status. A Customer only ever gets "Pay now".
 */
export function InvoiceActions({ invoice, manager, onInvoiceChanged }: InvoiceActionsProps) {
  // Legacy actions only read dueDate for display (Issue's day("") renders “—”). This
  // presentation adapter is never a form default or Create/Edit payload; the read DTO stays null.
  // Issue submits only the ID/version; payment and cancellation do not read or submit dueDate.
  const actionPresentation: Invoice = { ...invoice, dueDate: invoice.dueDate ?? "" }
  const actions = invoice.availableActions.filter((action: InvoiceAction) => manager ? action !== "PAY_NOW" : action === "PAY_NOW" && invoice.type !== "QUOTATION")
  const changed = () => void onInvoiceChanged()
  return (
    <>
      {actions.map((action) => {
        switch (action) {
          case "EDIT":
            return <Button key={action} asChild variant="outline" className="rounded-[2px]"><Link to={invoiceEdit(invoice.invoiceId)}>Edit invoice</Link></Button>
          case "ISSUE":
            return <IssueAction key={action} invoice={actionPresentation} onInvoiceChanged={onInvoiceChanged} />
          case "RECORD_PAYMENT":
            return <RecordPaymentDialog key={action} invoice={actionPresentation} onRecorded={changed} />
          case "CANCEL":
            return <CancelInvoiceDialog key={action} invoice={actionPresentation} onCancelled={changed} />
          case "CREATE_ANOTHER":
            return <Button key={action} asChild variant="outline" className="rounded-[2px]"><Link to={invoiceCreate(invoice.booking.bookingId)}>Create another invoice</Link></Button>
          case "PAY_NOW":
            return <PayNowButton key={action} invoice={actionPresentation} />
          default:
            return null
        }
      })}
    </>
  )
}
