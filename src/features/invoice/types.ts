import type {
  InvoiceAction, InvoiceCurrency, InvoiceHistoryType, InvoiceItemType, InvoiceStatus, InvoiceType, PaymentMethod, ReceiptStatus,
  PAYMENT_ERROR_CODES, invoiceSorts,
} from "@/features/invoice/constants"

// Enum types live next to their values in constants.ts; re-exported so type imports can stay in one place.
export type { InvoiceAction, InvoiceCurrency, InvoiceHistoryType, InvoiceItemType, InvoiceStatus, InvoiceType, PaymentMethod, ReceiptStatus }

// ---- from shared/types.ts ----
export type RecordPaymentPayload = {
  amount: number
  currency: InvoiceCurrency
  paymentMethod: PaymentMethod
  paidAt?: string
  transactionReference?: string
  note?: string
}

export type CancelInvoicePayload = {
  cancellationReason: string
}

export type OnlinePaymentResponse = {
  /** SePay checkout endpoint. A plain GET redirect cannot start the checkout: POST `checkoutFields` to it. */
  paymentUrl: string
  /** Form fields for the checkout POST, in the order the BE returned them (the order is part of the signature). */
  checkoutFields: Record<string, string>
  receipt: Receipt
}

export type InvoiceMutationSummary = {
  invoiceId: string
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  paidAt?: string | null
  cancelledAt?: string | null
  cancellationReason?: string | null
  availableActions: InvoiceAction[]
  updatedAt: string
}

export type RecordPaymentResponse = {
  receipt: Receipt
  invoice: InvoiceMutationSummary
  effects: {
    transportPlanStatus: string | null
    creditNoteUnlocked: boolean
  }
}

export type CancelInvoiceResponse = InvoiceMutationSummary

export type InvoicePayment = {
  method: string
  qrCodeUrl: string | null
}

export type InvoiceCustomer = {
  customerId: string
  customerCode: string
  name: string
  phone: string | null
  address: string | null
  email: string
}

export type InvoiceContactPerson = {
  name: string
  email: string
  phone: string | null
}

export type InvoiceBooking = {
  bookingId: string
  bookingCode: string
  status: string
  originAddress: string
  originCountry: string
  destinationAddress: string
  destinationCountry: string
  requestedDepartureDate: string
}

export type InvoiceTransport = {
  transportId: string
  transportCode: string
  status: string
}

export type InvoiceTransportPlan = {
  transportPlanId: string
  planCode: string
  status: string
}

export type InvoiceHorse = {
  horseId: string
  horseName: string
}

export type InvoiceItem = {
  invoiceItemId: string | null
  itemType: InvoiceItemType
  description: string
  itemDate?: string | null
  quantity: number
  price: number
  total: number
  horse: InvoiceHorse | null
  emergencyCostRequestId: string | null
  isDepositDeduction: boolean
  note: string | null
}

export type InvoiceSummary = {
  subtotal: number
  discount: number
  tax: number
  taxRatePercent: number
  depositDeduction: number
  grandTotal: number
}

export type ReceiptRecordedBy = {
  accountId: string
  fullName: string
}

export type Receipt = {
  receiptId: string
  receiptCode: string
  amount: number
  currency: InvoiceCurrency
  paymentMethod: PaymentMethod
  status: ReceiptStatus
  transactionReference: string | null
  paidAt: string | null
  confirmedAt: string | null
  note: string | null
  recordedBy: ReceiptRecordedBy | null
}

export type Invoice = {
  invoiceId: string
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  isPaymentRequired: boolean
  invoiceDate: string
  dueDate: string
  currency: InvoiceCurrency
  note: string | null
  payment: InvoicePayment | null
  customer: InvoiceCustomer
  items: InvoiceItem[]
  summary: InvoiceSummary
  contactPerson: InvoiceContactPerson
  issuedAt: string | null
  paidAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  booking: InvoiceBooking
  transport: InvoiceTransport | null
  transportPlan: InvoiceTransportPlan | null
  receipts: Receipt[]
  availableActions: InvoiceAction[]
  createdAt: string
  updatedAt: string
}

export type InvoiceListItem = {
  invoiceId: string
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  bookingId: string
  bookingCode: string
  transportPlanId: string | null
  customerName: string
  totalAmount: number
  currency: InvoiceCurrency
  dueDate: string | null
  issuedAt: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

// ---- from view/types.ts ----
// Read side (IV4, IV5, IV6, IV10). The zod schemas in schemas.ts validate the responses against these shapes.
export type InvoiceDetail = Omit<Invoice, "dueDate"> & { dueDate: string | null }

export type InvoicePage = {
  items: InvoiceListItem[]
  pageIndex: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type BookingInvoiceQueryParams = {
  pageIndex: number
  pageSize: number
  type?: InvoiceType
  status?: InvoiceStatus
  sortBy: (typeof invoiceSorts)[number]
}

export type InvoiceQueryParams = BookingInvoiceQueryParams & {
  search?: string
  bookingId?: string
  transportPlanId?: string
  issuedFrom?: string
  issuedTo?: string
  dueFrom?: string
  dueTo?: string
}

export type InvoiceStatusHistoryEvent = {
  historyId: string
  type: InvoiceHistoryType
  previousStatus: InvoiceStatus | null
  newStatus: InvoiceStatus
  reason: string | null
  changedBy: { accountId: string | null; fullName: string; role: string | null }
  changedAt: string
}

// ---- from payment/types.ts ----
export type CancelInvoiceInput = {
  invoiceId: string
  payload: CancelInvoicePayload
}

export type OnlinePaymentInput = {
  invoiceId: string
}

export type RecordPaymentInput = {
  invoiceId: string
  payload: RecordPaymentPayload
}

export type RecordPaymentDialogProps = {
  invoice: Invoice
  onRecorded: (response: RecordPaymentResponse) => void
}

export type PayNowButtonProps = {
  invoice: Invoice
}

export type CancelInvoiceDialogProps = {
  invoice: Invoice
  onCancelled: (response: CancelInvoiceResponse) => void
}

export type PaymentErrorCode = (typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES]

export type PaymentErrorState = {
  errorCode?: string
  message: string
  retryable: boolean
}

// ---- from compose/types.ts ----
// Domain types (Invoice, InvoiceItem, Receipt, ...) and enum types are the shared ones (shared/types, shared/constants).
// Only what the compose screens add is declared here: the IV1 and IV7 responses, the request payloads and the booking context.

export interface ApiEnvelope<T> {
  isSuccess: boolean
  code: number
  message: string
  value: T
}

/** IV1 response: precheck result plus the read-only deposit deduction lines of a FINAL. */
export interface InvoiceSuggestion {
  bookingId: string
  bookingCode: string
  bookingStatus: string
  transportId: string | null
  transportStatus: string | null
  type: InvoiceType
  /** Currency of the PAID deposit, null when there is none. */
  currency: InvoiceCurrency | null
  isPaymentRequired: boolean
  items: InvoiceItem[]
}

/** IV7 response. */
export interface IssuedInvoice {
  invoiceId: string
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  invoiceDate: string
  issuedAt: string
  grandTotal: number
  currency: InvoiceCurrency
  dueDate: string
  availableActions: InvoiceAction[]
  updatedAt: string
}

/** Booking context for the form: Flow 1 B8 gives the horses and the customer name. */
export interface InvoiceBookingContext {
  bookingId: string
  bookingCode: string
  customerName: string
  transportCode: string | null
  horses: { horseId: string; horseName: string }[]
}

export interface InvoiceItemPayload {
  /** Present = a saved line to keep, absent = a new line (IV3 replaces the whole list). */
  invoiceItemId?: string
  itemType: InvoiceItemType
  description: string
  quantity: number
  price: number
  horseId: string | null
  note: string | null
}

export interface CreateInvoicePayload {
  type: InvoiceType
  currency: InvoiceCurrency
  dueDate: string
  note?: string
  items: InvoiceItemPayload[]
}

export interface UpdateInvoicePayload {
  lastUpdatedAt: string
  currency: InvoiceCurrency
  dueDate: string
  note?: string
  items: InvoiceItemPayload[]
}

export interface ApiFieldError {
  field: string
  message: string
}
