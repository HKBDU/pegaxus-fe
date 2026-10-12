import type {
  INVOICE_ACTIONS,
  InvoiceCurrency,
  InvoiceItemType,
  InvoiceStatus,
  InvoiceType,
  PAYMENT_METHODS,
  RECEIPT_STATUSES,
} from "@/features/invoice/constants"

export type { InvoiceCurrency, InvoiceItemType, InvoiceStatus, InvoiceType }

// Shapes follow api-contract/flow6.md (section 3). All ids are uuid strings, money is a JSON number.

export type InvoiceAction = (typeof INVOICE_ACTIONS)[number]
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number]

export interface ApiEnvelope<T> {
  isSuccess: boolean
  code: number
  message: string
  value: T
}

export interface InvoiceItem {
  /** null in the IV1 preview, the line is not saved yet. */
  invoiceItemId: string | null
  itemType: InvoiceItemType
  description: string
  /** Pending P-03: the BE returns null until the DB has the column. */
  itemDate: string | null
  quantity: number
  /** Negative only for the deposit deduction line. */
  price: number
  total: number
  horse: { horseId: string; horseName: string } | null
  emergencyCostRequestId: string | null
  isDepositDeduction: boolean
  note: string | null
}

export interface InvoiceSummary {
  subtotal: number
  discount: number
  tax: number
  taxRatePercent: number
  depositDeduction: number
  grandTotal: number
}

export interface InvoiceCustomer {
  customerId: string
  customerCode: string
  name: string
  phone: string | null
  address: string | null
  email: string
}

export interface InvoiceContactPerson {
  name: string
  email: string
  phone: string | null
}

export interface InvoiceReceipt {
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
  recordedBy: { accountId: string; fullName: string } | null
}

export interface Invoice {
  invoiceId: string
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  isPaymentRequired: boolean
  invoiceDate: string
  dueDate: string
  currency: InvoiceCurrency
  note: string | null
  /** Pending P-01/P-02: always null for now. */
  payment: { method: string; qrCodeUrl: string | null } | null
  customer: InvoiceCustomer
  items: InvoiceItem[]
  summary: InvoiceSummary
  contactPerson: InvoiceContactPerson
  issuedAt: string | null
  paidAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  booking: {
    bookingId: string
    bookingCode: string
    status: string
    originAddress: string
    originCountry: string
    destinationAddress: string
    destinationCountry: string
    requestedDepartureDate: string
  }
  transport: { transportId: string; transportCode: string; status: string } | null
  transportPlan: { transportPlanId: string; planCode: string; status: string } | null
  receipts: InvoiceReceipt[]
  availableActions: InvoiceAction[]
  createdAt: string
  updatedAt: string
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
