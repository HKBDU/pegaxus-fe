import type { NavigateFunction } from "react-router-dom"
import { invoiceCreate } from "@/app/route-config"
import type { Claim } from "@/features/claim/types"
import type { InvoicePrefill } from "@/features/invoice/types"

/** P2.1.4: opens the invoice form for the booking with the credit note line the BE suggested (R22). */
export function openCreditNoteForm(claim: Claim, navigate: NavigateFunction) {
  const suggested = claim.billing?.creditNote.suggestedItem
  if (!suggested) return
  const prefill: InvoicePrefill = { type: "CREDIT_NOTE", items: [{ itemType: suggested.itemType, description: suggested.description, quantity: suggested.quantity, price: suggested.price }] }
  navigate(invoiceCreate(claim.booking.bookingId), { state: { prefill } })
}
