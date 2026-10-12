import type { InvoiceDetail, InvoiceStatusHistoryEvent } from "../types"

export const mockInvoiceId = (index: number) => `00000051-0000-4000-8000-${String(index).padStart(12, "0")}`
export const invoiceMockBookingId = "00000001-0000-4000-8000-000000000002"
export const invoiceMockPlanId = "00000003-0000-4000-8000-000000000002"
export const invoiceMockEmptyBookingId = "flow6-demo-empty-booking"
export const invoiceMockEmptyHistoryId = mockInvoiceId(9)
const scenarios: { type: InvoiceDetail["type"]; status: InvoiceDetail["status"]; issued: boolean; receipt?: InvoiceDetail["receipts"][number]["status"] }[] = [
  { type: "QUOTATION", status: "ISSUED", issued: true },
  { type: "DEPOSIT", status: "DRAFT", issued: false },
  { type: "DEPOSIT", status: "ISSUED", issued: true },
  { type: "DEPOSIT", status: "PAID", issued: true, receipt: "CONFIRMED" },
  { type: "FINAL", status: "ISSUED", issued: true },
  { type: "SUPPLEMENTARY", status: "OVERDUE", issued: true },
  { type: "DEPOSIT", status: "CANCELLED", issued: true },
  { type: "DEPOSIT", status: "CANCELLED", issued: false },
  { type: "DEPOSIT", status: "ISSUED", issued: true, receipt: "PENDING" },
  { type: "DEPOSIT", status: "ISSUED", issued: true, receipt: "FAILED" },
  { type: "CREDIT_NOTE", status: "ISSUED", issued: true },
  { type: "FINAL", status: "PAID", issued: true, receipt: "CONFIRMED" },
]

// Development demonstration records only. The primary demo Booking is bound to
// the actual logged-in Customer ID, never to a fabricated role/token. The last
// two records belong to another demo customer to exercise the 404 ownership case.
export function createInvoiceFixtures(customerId = "flow6-demo-customer"): InvoiceDetail[] {
  return scenarios.map((scenario, offset) => {
    const index = offset + 1, foreign = index >= 11, final = scenario.type === "FINAL" && !foreign
    // Independent bookings avoid concurrent active DEPOSIT invoices for one booking.
    const bookingIndex = foreign ? 4 : index === 2 ? 3 : index === 9 ? 5 : index === 10 ? 6 : 2
    const bookingId = `00000001-0000-4000-8000-${String(bookingIndex).padStart(12, "0")}`
    const planId = `00000003-0000-4000-8000-${String(bookingIndex).padStart(12, "0")}`
    const createdAt = final ? "2026-10-12T10:40:00Z" : index === 12 ? "2026-10-11T08:00:00Z" : `2026-10-${String(index + 1).padStart(2, "0")}T08:00:00Z`
    const issuedAt = scenario.issued ? final ? "2026-10-12T10:50:00Z" : `${createdAt.slice(0, 10)}T09:00:00Z` : null
    const total = final ? 3000 : 600
    const paidAt = scenario.status === "PAID" ? index === 12 ? "2026-10-11T10:00:00Z" : "2026-10-12T09:30:00Z" : null
    const currency = index === 6 ? "VND" : "EUR"
    // Fixed server-like totals, not computed by the page or from user input.
    const summary = index === 6 ? { subtotal: 1000000, discount: 0, tax: 200000, taxRatePercent: 20, depositDeduction: 0, grandTotal: 1200000 }
      : final ? { subtotal: 3000, discount: 0, tax: 600, taxRatePercent: 20, depositDeduction: -600, grandTotal: 3000 }
      : { subtotal: 500, discount: 0, tax: 100, taxRatePercent: 20, depositDeduction: 0, grandTotal: 600 }
    return {
      invoiceId: mockInvoiceId(index), invoiceNumber: `INV-${createdAt.slice(0, 10).replaceAll("-", "")}-${String(index).padStart(4, "0")}`,
      type: scenario.type, status: scenario.status, isPaymentRequired: scenario.type !== "QUOTATION",
      invoiceDate: (issuedAt ?? createdAt).slice(0, 10), dueDate: index === 6 ? "2026-10-10" : "2026-10-25", currency,
      note: "Fictional development invoice for UC-69 UI review; not a financial transaction.", payment: null,
      customer: { customerId: foreign ? "flow6-other-customer" : customerId, customerCode: foreign ? "CUS-DEMO-OTHER" : "CUS-DEMO-2",
        name: foreign ? "Demo Racing Club 4" : "Demo Racing Club 2", email: "invoices@example.test", phone: null, address: "Demo Paris Stable, Paris, France" },
      contactPerson: { name: "Demo Accounts Contact", email: "accounts@example.test", phone: null },
      booking: { bookingId,
        bookingCode: `REQ-DEMO-${String(bookingIndex).padStart(4, "0")}`, status: "APPROVED", requestedDepartureDate: "2026-10-28",
        originAddress: "Demo Paris Stable", originCountry: "FR", destinationAddress: "Demo Lyon Stable", destinationCountry: "FR" },
      transport: { transportId: `00000002-0000-4000-8000-${String(bookingIndex).padStart(12, "0")}`, transportCode: `TR-DEMO-${bookingIndex}`, status: bookingIndex === 2 || foreign ? "COMPLETED" : index === 2 ? "CREATED" : "PLANNING" },
      transportPlan: index === 2 ? null : { transportPlanId: planId, planCode: `TP-DEMO-${String(bookingIndex).padStart(4, "0")}`, status: bookingIndex === 2 || foreign ? "COMPLETED" : "DRAFT" },
      items: [
        { invoiceItemId: `${mockInvoiceId(index)}-item-1`, itemType: "TRANSPORT_FEE", description: "Demo horse transport service", quantity: 1,
          price: summary.subtotal, total: summary.subtotal, horse: null, itemDate: null, emergencyCostRequestId: null, isDepositDeduction: false, note: null },
        ...(final ? [{ invoiceItemId: `${mockInvoiceId(index)}-item-2`, itemType: "OTHER" as const,
          description: "Deposit deduction (INV-20261005-0004)", quantity: 1, price: -600, total: -600,
          horse: null, itemDate: null, emergencyCostRequestId: null, isDepositDeduction: true, note: "Previously paid deposit." }] : []),
      ], summary,
      receipts: scenario.receipt ? [{ receiptId: `${mockInvoiceId(index)}-receipt`, receiptCode: `RCP-${index === 12 ? "20261011" : "20261012"}-${String(index).padStart(4, "0")}`,
        amount: total, currency, paymentMethod: "BANK_TRANSFER", status: scenario.receipt,
        transactionReference: scenario.receipt === "CONFIRMED" ? "DEMO-BANK-0004" : null, paidAt,
        confirmedAt: scenario.receipt === "CONFIRMED" ? index === 12 ? "2026-10-11T10:10:00Z" : "2026-10-12T09:40:00Z" : null,
        note: scenario.receipt === "FAILED" ? "Demo failed payment attempt; invoice remains issued." : null,
        recordedBy: scenario.receipt === "CONFIRMED" ? { accountId: "flow6-demo-manager", fullName: "Demo Logistics Manager" } : null }] : [],
      availableActions: [], issuedAt, paidAt,
      cancelledAt: scenario.status === "CANCELLED" ? "2026-10-12T11:00:00Z" : null,
      cancellationReason: scenario.status === "CANCELLED" ? "Demo invoice cancelled for UI verification." : null,
      createdAt, updatedAt: "2026-10-12T11:00:00Z",
    }
  })
}

// Stable IV10 read fixtures derived from the existing invoice timestamps only.
// Invoice #9 deliberately has missing audit data to demonstrate a successful empty response.
export function createInvoiceHistoryFixtures(invoice: InvoiceDetail): InvoiceStatusHistoryEvent[] {
  if (invoice.invoiceId === invoiceMockEmptyHistoryId) return []
  const manager = { accountId: "flow6-demo-manager", fullName: "Demo Logistics Manager", role: "LOGISTICS_MANAGER" }
  const system = { accountId: null, fullName: "System", role: null }
  const events: InvoiceStatusHistoryEvent[] = []
  const add = (type: InvoiceStatusHistoryEvent["type"], previousStatus: InvoiceStatusHistoryEvent["previousStatus"],
    newStatus: InvoiceStatusHistoryEvent["newStatus"], changedAt: string, changedBy: InvoiceStatusHistoryEvent["changedBy"], reason: string | null = null) => {
    events.push({ historyId: `${invoice.invoiceId}-history-${type}`, type, previousStatus, newStatus, reason, changedBy, changedAt })
  }
  add("CREATE", null, "DRAFT", invoice.createdAt, manager)
  if (invoice.issuedAt) add("ISSUE", "DRAFT", "ISSUED", invoice.issuedAt, manager)
  if (invoice.status === "OVERDUE" && invoice.type !== "QUOTATION") {
    // Overdue is the first UTC day after the due date, never before ISSUE.
    const overdueAt = new Date(Date.parse(`${invoice.dueDate}T00:00:00Z`) + 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString()
    add("MARK_OVERDUE", "ISSUED", "OVERDUE", overdueAt, system)
  }
  if (invoice.status === "PAID" && invoice.paidAt && invoice.type !== "QUOTATION") {
    const receipt = invoice.receipts.find(item => item.status === "CONFIRMED")
    const actor = receipt?.recordedBy ? { ...receipt.recordedBy, role: "LOGISTICS_MANAGER" } : system
    add("RECORD_PAYMENT", "ISSUED", "PAID", invoice.paidAt, actor)
  }
  if (invoice.status === "CANCELLED" && invoice.cancelledAt) {
    add("CANCEL", invoice.issuedAt ? "ISSUED" : "DRAFT", "CANCELLED", invoice.cancelledAt, manager, invoice.cancellationReason)
  }
  return events
}
