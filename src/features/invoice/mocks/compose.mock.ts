import { INVOICE_CURRENCIES, INVOICE_TAX_RATE_PERCENT } from "@/features/invoice/constants"
import { InvoiceApiError } from "@/features/invoice/errors"
import type { CreateInvoicePayload, Invoice, InvoiceBookingContext, InvoiceItem, InvoiceItemPayload, InvoiceSuggestion, InvoiceType, IssuedInvoice, UpdateInvoicePayload } from "@/features/invoice/types"
import { roundMoney, todayIsoDate } from "@/features/invoice/utils"

/**
 * In-memory stand-in for the Flow 6 API (IV1, IV2, IV3, IV6, IV7 and Flow 1 B8). It follows api-contract/flow6.md,
 * including the rules R3 to R9, so the screens behave like the real BE. The state lives in sessionStorage, so it
 * survives a Vite reload but is dropped with the tab. Booking ids pick a scenario, see MOCK_BOOKINGS.
 */

interface MockBooking {
  bookingId: string
  bookingCode: string
  customerName: string
  bookingStatus: string
  transportStatus: string | null
  horses: { horseId: string; horseName: string }[]
}

const HORSES = [
  { horseId: "mock-horse-1", horseName: "Thunder Bolt" },
  { horseId: "mock-horse-2", horseName: "Silver Mist" },
  { horseId: "mock-horse-3", horseName: "Desert Rose" },
]

/** Ids you can open at /admin/invoices/new/<id>. Any other id behaves like `mock-booking-deposit`. */
export const MOCK_BOOKINGS: Record<string, MockBooking> = {
  "mock-booking-deposit": {
    bookingId: "mock-booking-deposit",
    bookingCode: "REQ-20261001-0001",
    customerName: "Example Racing Club",
    bookingStatus: "APPROVED",
    transportStatus: "CREATED",
    horses: HORSES,
  },
  // Transport COMPLETED and a PAID deposit of 30,000,000 VND: FINAL shows the deduction line.
  "mock-booking-final": {
    bookingId: "mock-booking-final",
    bookingCode: "REQ-20261001-0005",
    customerName: "Example Racing Club",
    bookingStatus: "APPROVED",
    transportStatus: "COMPLETED",
    horses: HORSES,
  },
  // Already has a PAID FINAL: CREDIT_NOTE is allowed, a second FINAL is not.
  "mock-booking-claim": {
    bookingId: "mock-booking-claim",
    bookingCode: "REQ-20261001-0007",
    customerName: "Newmarket Stud Ltd",
    bookingStatus: "APPROVED",
    transportStatus: "COMPLETED",
    horses: HORSES,
  },
  "mock-booking-pending": {
    bookingId: "mock-booking-pending",
    bookingCode: "REQ-20261001-0009",
    customerName: "Chantilly Stables",
    bookingStatus: "PENDING",
    transportStatus: null,
    horses: HORSES,
  },
}

const DEFAULT_BOOKING_ID = "mock-booking-deposit"
const STORAGE_KEY = "pegaxus.mock.invoices.v1"
const LATENCY_MS = 250

const customerFor = (booking: MockBooking) => ({
  customerId: `mock-customer-${booking.bookingId}`,
  customerCode: "CUS-0001",
  name: booking.customerName,
  phone: "+33 1 23 45 67 89",
  address: "12 Rue des Courses, Chantilly, France",
  email: "contact@exampleracing.com",
})

const CONTACT_PERSON = { name: "Le Hoang Phuc", email: "phuc.lh@pegaxus.example", phone: "+84 90 123 4567" }

let counter = 0
const newId = () => globalThis.crypto?.randomUUID?.() ?? `mock-${Date.now()}-${(counter += 1)}`
const delay = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS))

function bookingFor(bookingId: string): MockBooking {
  const known = MOCK_BOOKINGS[bookingId]
  if (known) return known
  return { ...MOCK_BOOKINGS[DEFAULT_BOOKING_ID], bookingId, bookingCode: `REQ-${bookingId.slice(0, 8).toUpperCase()}` }
}

function seedItem(itemType: InvoiceItem["itemType"], description: string, quantity: number, price: number): InvoiceItem {
  return {
    invoiceItemId: newId(), itemType, description, itemDate: null, quantity, price,
    total: roundMoney(quantity * price), horse: null, emergencyCostRequestId: null, isDepositDeduction: false, note: null,
  }
}

function seedInvoices(): Invoice[] {
  const paidDeposit = buildInvoice({
    booking: MOCK_BOOKINGS["mock-booking-final"], type: "DEPOSIT", status: "PAID", currency: "VND", dueDate: "2026-10-10",
    note: "Deposit for REQ-20261001-0005", items: [seedItem("OTHER", "Transport deposit", 1, 25000000)], number: "INV-20261002-0003",
  })
  const claimDeposit = buildInvoice({
    booking: MOCK_BOOKINGS["mock-booking-claim"], type: "DEPOSIT", status: "PAID", currency: "VND", dueDate: "2026-10-10",
    note: null, items: [seedItem("OTHER", "Transport deposit", 1, 50000000)], number: "INV-20261002-0004",
  })
  const paidFinal = buildInvoice({
    booking: MOCK_BOOKINGS["mock-booking-claim"], type: "FINAL", status: "PAID", currency: "VND", dueDate: "2026-10-20",
    note: null, items: [seedItem("TRANSPORT_FEE", "Transport fee", 1, 150000000)], number: "INV-20261012-0005", depositSource: [claimDeposit],
  })
  return [paidDeposit, claimDeposit, paidFinal]
}

interface BuildInput {
  booking: MockBooking
  type: InvoiceType
  status: Invoice["status"]
  currency: Invoice["currency"]
  dueDate: string
  note: string | null
  items: InvoiceItem[]
  number: string
  /** Paid deposits whose totals become deduction lines (FINAL only). */
  depositSource?: Invoice[]
  base?: Invoice
}

/** Server-side money rules (R8): the client numbers are never trusted. */
function summarize(items: InvoiceItem[]) {
  const manual = items.filter((item) => !item.isDepositDeduction)
  const subtotal = roundMoney(manual.reduce((sum, item) => sum + item.total, 0))
  const tax = roundMoney((subtotal * INVOICE_TAX_RATE_PERCENT) / 100)
  const depositDeduction = roundMoney(items.filter((item) => item.isDepositDeduction).reduce((sum, item) => sum + item.total, 0))
  return { subtotal, discount: 0, tax, taxRatePercent: INVOICE_TAX_RATE_PERCENT, depositDeduction, grandTotal: roundMoney(subtotal + tax + depositDeduction) }
}

function actionsFor(status: Invoice["status"], type: InvoiceType): Invoice["availableActions"] {
  const actions: Invoice["availableActions"] = []
  if (status === "DRAFT") actions.push("EDIT", "ISSUE")
  if ((status === "ISSUED" || status === "OVERDUE") && type !== "QUOTATION") actions.push("RECORD_PAYMENT")
  if (status === "DRAFT" || status === "ISSUED" || status === "OVERDUE") actions.push("CANCEL")
  actions.push("CREATE_ANOTHER")
  return actions
}

function depositDeductionLines(deposits: Invoice[]): InvoiceItem[] {
  return deposits.map((deposit) => ({
    invoiceItemId: newId(),
    itemType: "OTHER",
    description: `Deposit deduction (${deposit.invoiceNumber})`,
    itemDate: null,
    quantity: 1,
    price: -deposit.summary.grandTotal,
    total: -deposit.summary.grandTotal,
    horse: null,
    emergencyCostRequestId: null,
    isDepositDeduction: true,
    note: "Deposit is not refunded in cash; it is deducted from this final invoice.",
  }))
}

function buildInvoice(input: BuildInput): Invoice {
  const now = new Date().toISOString()
  const items = [...input.items.filter((item) => !item.isDepositDeduction), ...(input.type === "FINAL" ? depositDeductionLines(input.depositSource ?? []) : [])]
  const { booking } = input
  return {
    invoiceId: input.base?.invoiceId ?? newId(),
    invoiceNumber: input.number,
    type: input.type,
    status: input.status,
    isPaymentRequired: input.type !== "QUOTATION",
    invoiceDate: (input.base?.issuedAt ?? input.base?.createdAt ?? now).slice(0, 10),
    dueDate: input.dueDate,
    currency: input.currency,
    note: input.note,
    payment: null,
    customer: customerFor(booking),
    items,
    summary: summarize(items),
    contactPerson: CONTACT_PERSON,
    issuedAt: input.status === "PAID" ? (input.base?.issuedAt ?? now) : (input.base?.issuedAt ?? null),
    paidAt: input.status === "PAID" ? now : null,
    cancelledAt: null,
    cancellationReason: null,
    booking: {
      bookingId: booking.bookingId, bookingCode: booking.bookingCode, status: booking.bookingStatus,
      originAddress: "Haras de Chantilly, Paris", originCountry: "France",
      destinationAddress: "Newmarket Stables, London", destinationCountry: "United Kingdom", requestedDepartureDate: "2026-10-27",
    },
    transport: booking.transportStatus ? { transportId: `mock-transport-${booking.bookingId}`, transportCode: "TR-20261001-0005", status: booking.transportStatus } : null,
    transportPlan: booking.transportStatus ? { transportPlanId: `mock-plan-${booking.bookingId}`, planCode: "TP-20261001-0001", status: "APPROVED" } : null,
    receipts: [],
    availableActions: actionsFor(input.status, input.type),
    createdAt: input.base?.createdAt ?? now,
    updatedAt: now,
  }
}

function load(): Invoice[] {
  try {
    const raw = globalThis.sessionStorage?.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Invoice[]
  } catch {
    // Private mode or a corrupt value: start from the seed.
  }
  return seedInvoices()
}

let store: Invoice[] | null = null
const invoices = () => (store ??= load())

function save() {
  try {
    globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Storage is only a convenience for the mock.
  }
}

function nextNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "")
  return `INV-${date}-${String(invoices().length + 1).padStart(4, "0")}`
}

const stillOpen = (invoice: Invoice) => ["DRAFT", "ISSUED", "OVERDUE"].includes(invoice.status)

/** R3, R4, R6 and R5, shared by IV1 and IV2. Returns the paid deposits to deduct from a FINAL. */
function precheck(bookingId: string, type: InvoiceType) {
  const booking = bookingFor(bookingId)
  const ofBooking = invoices().filter((invoice) => invoice.booking.bookingId === booking.bookingId)
  if (booking.bookingStatus !== "APPROVED") throw new InvoiceApiError("INVALID_BOOKING_STATUS")
  const transportStatus = booking.transportStatus
  const allowed =
    type === "DEPOSIT" ? ["CREATED", "PLANNING", "READY"].includes(transportStatus ?? "")
    : type === "FINAL" ? transportStatus === "COMPLETED"
    : transportStatus !== null && transportStatus !== "CANCELLED"
  if (!allowed) throw new InvoiceApiError("INVALID_TRANSPORT_STATUS")
  if (type === "FINAL" && ofBooking.some((invoice) => invoice.type === "FINAL" && invoice.status !== "CANCELLED")) {
    throw new InvoiceApiError("FINAL_INVOICE_ALREADY_EXISTS")
  }
  if (ofBooking.some((invoice) => invoice.type === type && stillOpen(invoice))) throw new InvoiceApiError("INVOICE_ALREADY_EXISTS")
  if (type === "CREDIT_NOTE" && !ofBooking.some((invoice) => invoice.type === "FINAL" && invoice.status === "PAID")) {
    throw new InvoiceApiError("UNPAID_FINAL_INVOICE")
  }
  const deposits = type === "FINAL" ? ofBooking.filter((invoice) => invoice.type === "DEPOSIT" && invoice.status === "PAID") : []
  return { booking, deposits }
}

function validate(payload: { currency: string; dueDate: string; items: InvoiceItemPayload[] }, booking: MockBooking) {
  const errors: { field: string; message: string }[] = []
  if (!(INVOICE_CURRENCIES as readonly string[]).includes(payload.currency)) errors.push({ field: "currency", message: "Currency must be VND" })
  if (!payload.dueDate || payload.dueDate < todayIsoDate()) errors.push({ field: "dueDate", message: "Due date cannot be in the past" })
  payload.items.forEach((item, index) => {
    if (!(item.quantity > 0) || !(item.price > 0)) {
      errors.push({ field: `items[${index}].quantity`, message: "Quantity and unit price must be greater than 0" })
    }
    if (item.horseId && !booking.horses.some((horse) => horse.horseId === item.horseId)) {
      errors.push({ field: `items[${index}].horseId`, message: "Horse does not belong to this booking" })
    }
  })
  if (errors.length) throw new InvoiceApiError("VALIDATION_ERROR", { errors, backendMessage: "Validation failed" })
}

function toItems(payload: InvoiceItemPayload[], booking: MockBooking, previous: InvoiceItem[] = []): InvoiceItem[] {
  return payload.map((item) => {
    const kept = item.invoiceItemId ? previous.find((existing) => existing.invoiceItemId === item.invoiceItemId) : undefined
    const horse = booking.horses.find((candidate) => candidate.horseId === item.horseId) ?? null
    return {
      invoiceItemId: kept?.invoiceItemId ?? newId(),
      itemType: item.itemType,
      description: item.description,
      itemDate: null,
      quantity: item.quantity,
      price: item.price,
      total: roundMoney(item.quantity * item.price),
      horse,
      emergencyCostRequestId: null,
      isDepositDeduction: false,
      note: item.note,
    }
  })
}

export async function mockGetBookingContext(bookingId: string): Promise<InvoiceBookingContext> {
  await delay()
  const booking = bookingFor(bookingId)
  return {
    bookingId: booking.bookingId, bookingCode: booking.bookingCode, customerName: booking.customerName,
    transportCode: booking.transportStatus ? "TR-20261001-0005" : null, horses: booking.horses,
  }
}

export async function mockGetSuggestion(bookingId: string, type: InvoiceType): Promise<InvoiceSuggestion> {
  await delay()
  const { booking, deposits } = precheck(bookingId, type)
  return {
    bookingId: booking.bookingId,
    bookingCode: booking.bookingCode,
    bookingStatus: booking.bookingStatus,
    transportId: `mock-transport-${booking.bookingId}`,
    transportStatus: booking.transportStatus,
    type,
    currency: deposits[0]?.currency ?? null,
    isPaymentRequired: type !== "QUOTATION",
    items: depositDeductionLines(deposits),
  }
}

export async function mockGetInvoice(invoiceId: string): Promise<Invoice> {
  await delay()
  const invoice = invoices().find((candidate) => candidate.invoiceId === invoiceId)
  if (!invoice) throw new InvoiceApiError("INVOICE_NOT_FOUND")
  return invoice
}

export async function mockCreateInvoice(bookingId: string, payload: CreateInvoicePayload): Promise<Invoice> {
  await delay()
  const { booking, deposits } = precheck(bookingId, payload.type)
  validate(payload, booking)
  if (deposits.length && deposits[0].currency !== payload.currency) throw new InvoiceApiError("CURRENCY_MISMATCH")
  const invoice = buildInvoice({
    booking, type: payload.type, status: "DRAFT", currency: payload.currency, dueDate: payload.dueDate, note: payload.note ?? null,
    items: toItems(payload.items, booking), number: nextNumber(), depositSource: deposits,
  })
  invoices().push(invoice)
  save()
  return invoice
}

export async function mockUpdateInvoice(invoiceId: string, payload: UpdateInvoicePayload): Promise<Invoice> {
  await delay()
  const index = invoices().findIndex((candidate) => candidate.invoiceId === invoiceId)
  if (index < 0) throw new InvoiceApiError("INVOICE_NOT_FOUND")
  const current = invoices()[index]
  if (current.status !== "DRAFT") throw new InvoiceApiError("INVOICE_LOCKED")
  if (payload.lastUpdatedAt !== current.updatedAt) throw new InvoiceApiError("INVOICE_MODIFIED")
  const booking = bookingFor(current.booking.bookingId)
  validate(payload, booking)
  // The deduction lines of a FINAL are generated again from the deposits that are PAID right now (R5).
  const deposits = current.type === "FINAL"
    ? invoices().filter((invoice) => invoice.booking.bookingId === booking.bookingId && invoice.type === "DEPOSIT" && invoice.status === "PAID")
    : []
  if (deposits.length && deposits[0].currency !== payload.currency) throw new InvoiceApiError("CURRENCY_MISMATCH")
  const updated = buildInvoice({
    booking, type: current.type, status: "DRAFT", currency: payload.currency, dueDate: payload.dueDate, note: payload.note ?? null,
    items: toItems(payload.items, booking, current.items), number: current.invoiceNumber, depositSource: deposits, base: current,
  })
  invoices()[index] = updated
  save()
  return updated
}

export async function mockIssueInvoice(invoiceId: string, lastUpdatedAt: string): Promise<IssuedInvoice> {
  await delay()
  const index = invoices().findIndex((candidate) => candidate.invoiceId === invoiceId)
  if (index < 0) throw new InvoiceApiError("INVOICE_NOT_FOUND")
  const current = invoices()[index]
  if (current.status !== "DRAFT") throw new InvoiceApiError("INVALID_INVOICE_STATUS")
  if (lastUpdatedAt !== current.updatedAt) throw new InvoiceApiError("INVOICE_MODIFIED")
  if (!current.items.some((item) => !item.isDepositDeduction)) throw new InvoiceApiError("EMPTY_INVOICE_ITEMS")
  if (current.summary.grandTotal <= 0) throw new InvoiceApiError("INVOICE_TOTAL_NOT_POSITIVE")
  if (current.type === "FINAL") {
    const paidNow = invoices().filter((invoice) => invoice.booking.bookingId === current.booking.bookingId && invoice.type === "DEPOSIT" && invoice.status === "PAID").length
    if (paidNow !== current.items.filter((item) => item.isDepositDeduction).length) throw new InvoiceApiError("DEPOSIT_DEDUCTION_CHANGED")
  }
  const now = new Date().toISOString()
  const issued: Invoice = { ...current, status: "ISSUED", issuedAt: now, invoiceDate: now.slice(0, 10), availableActions: actionsFor("ISSUED", current.type), updatedAt: now }
  invoices()[index] = issued
  save()
  return {
    invoiceId: issued.invoiceId, invoiceNumber: issued.invoiceNumber, type: issued.type, status: issued.status, invoiceDate: issued.invoiceDate,
    issuedAt: now, grandTotal: issued.summary.grandTotal, currency: issued.currency, dueDate: issued.dueDate,
    availableActions: issued.availableActions, updatedAt: now,
  }
}

/** Every invoice of the in-memory mock, shared with the view mock so a created draft shows up in the list and the detail page. */
export const listMockInvoices = (): Invoice[] => invoices()

/** The view mock hands over a demo invoice it is about to show, so the compose actions (edit, issue) can find it by id. */
export function adoptMockInvoice(invoice: Invoice) {
  if (invoices().some((candidate) => candidate.invoiceId === invoice.invoiceId)) return
  invoices().push(invoice)
  save()
}

/** Test helper: forget the session data and go back to the seed. */
export function resetMockInvoices() {
  store = null
  try {
    globalThis.sessionStorage?.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
