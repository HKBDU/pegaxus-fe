import { canAccess } from "@/features/auth/access-control"
import { adoptMockInvoice, listMockInvoices } from "@/features/invoice/mocks/compose.mock"
import type { Invoice, InvoiceDetail, InvoiceListItem, InvoiceQueryParams, BookingInvoiceQueryParams } from "@/features/invoice/types"
import { useAuthStore } from "@/features/auth/store"
import { createInvoiceFixtures, createInvoiceHistoryFixtures, invoiceMockEmptyBookingId } from "@/features/invoice/mocks/fixtures"

const success = (value: unknown) => ({ isSuccess: true, code: 200, message: "Development mock invoices retrieved.", value })
const failure = (code: number, errorCode: string, message: string) => ({ isSuccess: false, code, errorCode, message, value: null })
// The demo fixtures plus every invoice of the compose mock (created, edited or issued in this session). A fixture that was
// changed through the compose mock is replaced by its stored version, so list, detail and history stay consistent.
function allInvoices(customerId?: string): InvoiceDetail[] {
  const fixtures = createInvoiceFixtures(customerId)
  const stored = listMockInvoices() as unknown as InvoiceDetail[]
  const storedById = new Map(stored.map((invoice) => [invoice.invoiceId, invoice]))
  const fixtureIds = new Set(fixtures.map((invoice) => invoice.invoiceId))
  return [...fixtures.map((invoice) => storedById.get(invoice.invoiceId) ?? invoice), ...stored.filter((invoice) => !fixtureIds.has(invoice.invoiceId))]
}
function context() {
  const { principal, user } = useAuthStore.getState()
  return { manager: canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }), customer: canAccess(principal, { anyRole: ["CUSTOMER"] }),
    customerId: user?.customerId, authenticated: Boolean(principal), invoices: allInvoices(user?.customerId ?? undefined) }
}
function asListItem(invoice: InvoiceDetail): InvoiceListItem {
  return { invoiceId: invoice.invoiceId, invoiceNumber: invoice.invoiceNumber, type: invoice.type, status: invoice.status,
    bookingId: invoice.booking.bookingId, bookingCode: invoice.booking.bookingCode, customerName: invoice.customer.name,
    transportPlanId: invoice.transportPlan?.transportPlanId ?? null, totalAmount: invoice.summary.grandTotal, currency: invoice.currency,
    dueDate: invoice.dueDate, issuedAt: invoice.issuedAt, paidAt: invoice.paidAt, createdAt: invoice.createdAt, updatedAt: invoice.updatedAt }
}
function page(invoices: InvoiceDetail[], query: InvoiceQueryParams | BookingInvoiceQueryParams) {
  const params: InvoiceQueryParams = query
  const search = params.search?.toLowerCase()
  const items = invoices.map(asListItem).filter((item) => (!params.type || item.type === params.type) && (!params.status || item.status === params.status)
    && (!params.bookingId || item.bookingId === params.bookingId) && (!params.transportPlanId || item.transportPlanId === params.transportPlanId)
    && (!search || [item.invoiceNumber, item.bookingCode, item.customerName].some(value => value.toLowerCase().includes(search)))
    && (!params.issuedFrom || (item.issuedAt && item.issuedAt.slice(0, 10) >= params.issuedFrom))
    && (!params.issuedTo || (item.issuedAt && item.issuedAt.slice(0, 10) <= params.issuedTo))
    && (!params.dueFrom || item.dueDate >= params.dueFrom) && (!params.dueTo || item.dueDate <= params.dueTo))
  const [field, direction] = query.sortBy.split(":") as ["createdAt" | "issuedAt" | "dueDate" | "totalAmount", "asc" | "desc"]
  items.sort((a, b) => {
    const left = a[field], right = b[field]
    if (left === null) return right === null ? 0 : 1
    if (right === null) return -1
    const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right))
    return (direction === "asc" ? result : -result) || a.invoiceId.localeCompare(b.invoiceId)
  })
  return success({ items: items.slice((query.pageIndex - 1) * query.pageSize, query.pageIndex * query.pageSize),
    pageIndex: query.pageIndex, pageSize: query.pageSize, totalItems: items.length, totalPages: Math.ceil(items.length / query.pageSize) })
}
export const invoiceMock = {
  statusHistory(invoiceId: string) {
    const ctx = context()
    if (!ctx.authenticated) return failure(401, "UNAUTHORIZED", "Please sign in.")
    if (!ctx.manager && !ctx.customer) return failure(403, "FORBIDDEN", "You cannot view invoice history.")
    const invoice = ctx.invoices.find(item => item.invoiceId === invoiceId)
    if (!invoice || (!ctx.manager && invoice.customer.customerId !== ctx.customerId)) return failure(404, "INVOICE_NOT_FOUND", "Invoice not found.")
    if (!ctx.manager && !invoice.issuedAt) return failure(403, "FORBIDDEN", "Customer cannot view history for an invoice that was never issued.")
    const events = createInvoiceHistoryFixtures(invoice)
    // This is the mock API's response rule, not a second filtering rule in the UI.
    return success(ctx.manager ? events : events.filter(event => event.type !== "CREATE" && event.newStatus !== "DRAFT"))
  },
  list(query: InvoiceQueryParams) {
    const ctx = context()
    if (!ctx.authenticated) return failure(401, "UNAUTHORIZED", "Please sign in.")
    if (!ctx.manager) return failure(403, "FORBIDDEN", "Customer cannot access the invoice list.")
    return page(ctx.invoices, query)
  },
  bookingList(bookingId: string, query: BookingInvoiceQueryParams) {
    const ctx = context()
    if (!ctx.authenticated) return failure(401, "UNAUTHORIZED", "Please sign in.")
    if (!ctx.manager && !ctx.customer) return failure(403, "FORBIDDEN", "You cannot view invoices.")
    const invoices = ctx.invoices.filter(invoice => invoice.booking.bookingId === bookingId)
    if (bookingId === invoiceMockEmptyBookingId && (ctx.manager || ctx.customerId)) return page([], query)
    if (!invoices.length || (!ctx.manager && invoices[0].customer.customerId !== ctx.customerId)) return failure(404, "BOOKING_NOT_FOUND", "Booking not found.")
    return page(ctx.manager ? invoices : invoices.filter(invoice => invoice.issuedAt !== null), query)
  },
  detail(invoiceId: string) {
    const ctx = context()
    if (!ctx.authenticated) return failure(401, "UNAUTHORIZED", "Please sign in.")
    if (!ctx.manager && !ctx.customer) return failure(403, "FORBIDDEN", "You cannot view invoices.")
    const invoice = ctx.invoices.find(item => item.invoiceId === invoiceId)
    if (!invoice || (!ctx.manager && invoice.customer.customerId !== ctx.customerId)) return failure(404, "INVOICE_NOT_FOUND", "Invoice not found.")
    if (!ctx.manager && !invoice.issuedAt) return failure(403, "FORBIDDEN", "Customer cannot view draft invoices.")
    if (ctx.manager) {
      adoptMockInvoice(invoice as unknown as Invoice)
      invoice.availableActions = ["CREATE_ANOTHER"]
      if (invoice.status === "DRAFT") invoice.availableActions.push("EDIT", "ISSUE")
      if (["DRAFT", "ISSUED", "OVERDUE"].includes(invoice.status) && !invoice.receipts.some(receipt => receipt.status === "CONFIRMED")) invoice.availableActions.push("CANCEL")
      if (["ISSUED", "OVERDUE"].includes(invoice.status) && invoice.type !== "QUOTATION") invoice.availableActions.push("RECORD_PAYMENT")
    } else if (["ISSUED", "OVERDUE"].includes(invoice.status) && ["DEPOSIT", "FINAL", "SUPPLEMENTARY"].includes(invoice.type)
      && !invoice.receipts.some(receipt => receipt.status === "CONFIRMED")) invoice.availableActions = ["PAY_NOW"]
    return success(invoice)
  },
}
