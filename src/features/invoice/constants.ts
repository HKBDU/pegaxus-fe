// ---- from shared/constants.ts ----
export const INVOICE_TYPE = {
  QUOTATION: 'QUOTATION',
  DEPOSIT: 'DEPOSIT',
  FINAL: 'FINAL',
  SUPPLEMENTARY: 'SUPPLEMENTARY',
  CREDIT_NOTE: 'CREDIT_NOTE',
} as const

export const INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const

export const INVOICE_ITEM_TYPE = {
  TRANSPORT_FEE: 'TRANSPORT_FEE',
  HORSE_SERVICE_FEE: 'HORSE_SERVICE_FEE',
  HANDLING_FEE: 'HANDLING_FEE',
  COMPLIANCE_FEE: 'COMPLIANCE_FEE',
  EMERGENCY_COST: 'EMERGENCY_COST',
  OTHER: 'OTHER',
} as const

export const INVOICE_HISTORY_TYPE = {
  CREATE: 'CREATE',
  ISSUE: 'ISSUE',
  RECORD_PAYMENT: 'RECORD_PAYMENT',
  MARK_OVERDUE: 'MARK_OVERDUE',
  CANCEL: 'CANCEL',
} as const

export const PAYMENT_METHOD = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  OTHER: 'OTHER',
} as const

export const RECEIPT_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const

export const INVOICE_ACTION = {
  EDIT: 'EDIT',
  ISSUE: 'ISSUE',
  RECORD_PAYMENT: 'RECORD_PAYMENT',
  PAY_NOW: 'PAY_NOW',
  CANCEL: 'CANCEL',
  CREATE_ANOTHER: 'CREATE_ANOTHER',
} as const

// VND is the only supported currency (SePay takes whole VND amounts).
export const INVOICE_CURRENCIES = ['VND'] as const

export const INVOICE_TAX_RATE_PERCENT = 20

/** The server builds the lines of these types (IV1/IV2/IV3 answer them; sending `items` is a 422 INVOICE_ITEMS_GENERATED). */
export const GENERATED_INVOICE_TYPES: readonly string[] = ['QUOTATION', 'DEPOSIT', 'FINAL']
export const isGeneratedInvoiceType = (type: string | null | undefined) => GENERATED_INVOICE_TYPES.includes(type ?? '')

/** Allowed trip length of a QUOTATION (BE QuotationCatalog). */
export const TRANSIT_DAYS_RANGE = { min: 1, max: 60 } as const

export const INVOICE_TYPE_LABELS = {
  QUOTATION: 'Quotation',
  DEPOSIT: 'Deposit invoice',
  FINAL: 'Final invoice',
  SUPPLEMENTARY: 'Supplementary invoice',
  CREDIT_NOTE: 'Credit note',
} as const

export const INVOICE_ITEM_TYPE_LABELS = {
  TRANSPORT_FEE: 'Transport fee',
  HORSE_SERVICE_FEE: 'Horse service fee',
  HANDLING_FEE: 'Handling fee',
  COMPLIANCE_FEE: 'Compliance fee',
  EMERGENCY_COST: 'Emergency cost',
  OTHER: 'Other',
} as const

export const INVOICE_STATUS_LABELS = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
} as const

export const RECEIPT_STATUS_LABELS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
} as const

export const INVOICE_STATUS_COLORS = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-700',
} as const

export const INVOICE_TYPE_COLORS = {
  QUOTATION: 'bg-slate-100 text-slate-700',
  DEPOSIT: 'bg-indigo-100 text-indigo-700',
  FINAL: 'bg-purple-100 text-purple-700',
  SUPPLEMENTARY: 'bg-cyan-100 text-cyan-700',
  CREDIT_NOTE: 'bg-orange-100 text-orange-700',
} as const

export const RECEIPT_STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-slate-100 text-slate-700',
} as const

export const QUOTATION_BANNER_TEXT = 'Reference quotation - No payment required'

export type InvoiceType = (typeof INVOICE_TYPE)[keyof typeof INVOICE_TYPE]
export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS]
export type InvoiceItemType = (typeof INVOICE_ITEM_TYPE)[keyof typeof INVOICE_ITEM_TYPE]
export type InvoiceHistoryType = (typeof INVOICE_HISTORY_TYPE)[keyof typeof INVOICE_HISTORY_TYPE]
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD]
export type ReceiptStatus = (typeof RECEIPT_STATUS)[keyof typeof RECEIPT_STATUS]
export type InvoiceAction = (typeof INVOICE_ACTION)[keyof typeof INVOICE_ACTION]
export type InvoiceCurrency = (typeof INVOICE_CURRENCIES)[number]

// Enum values come from shared/constants (DB V8); zod needs them as a non-empty tuple.
const valuesOf = <T extends Record<string, string>>(source: T) =>
  Object.values(source) as [T[keyof T], ...T[keyof T][]];
export const invoiceTypes = valuesOf(INVOICE_TYPE);
export const invoiceStatuses = valuesOf(INVOICE_STATUS);
export const invoiceHistoryTypes = valuesOf(INVOICE_HISTORY_TYPE);
export const invoiceItemTypes = valuesOf(INVOICE_ITEM_TYPE);
export const invoiceActions = valuesOf(INVOICE_ACTION);
export const receiptStatuses = valuesOf(RECEIPT_STATUS);
export const paymentMethods = valuesOf(PAYMENT_METHOD);
export const invoiceSorts = [
  "createdAt:desc",
  "createdAt:asc",
  "issuedAt:desc",
  "issuedAt:asc",
  "dueDate:asc",
  "dueDate:desc",
  "totalAmount:desc",
  "totalAmount:asc",
] as const;
export const controlClass =
  "h-8 rounded-[2px] border-slate-300 bg-white text-xs shadow-none";
export const invoiceListPath = "/admin/invoices";
export const invoiceDetailPath = (id: string) =>
  `${invoiceListPath}/${encodeURIComponent(id)}`;
export const customerInvoicePath = (bookingId: string, id: string) =>
  `/bookings/${encodeURIComponent(bookingId)}/invoices/${encodeURIComponent(id)}`;
export const planInvoicesPath = (id: string) =>
  `${invoiceListPath}?${new URLSearchParams({ transportPlanId: id })}`;
export const humanize = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
export const initialInvoiceParams = {
  pageIndex: 1,
  pageSize: 20,
  sortBy: "createdAt:desc" as const,
};

// ---- from payment/constants/payment.constants.ts ----
export const PAYMENT_TRANSACTION_REFERENCE_MAX_LENGTH = 150
export const CANCELLATION_REASON_MIN_LENGTH = 10

export const PAYMENT_ERROR_CODES = {
  PARTIAL_PAYMENT_NOT_SUPPORTED: 'PARTIAL_PAYMENT_NOT_SUPPORTED',
  UNPAYABLE_INVOICE_TYPE: 'UNPAYABLE_INVOICE_TYPE',
  INVALID_INVOICE_STATUS: 'INVALID_INVOICE_STATUS',
  INVOICE_HAS_PAYMENT: 'INVOICE_HAS_PAYMENT',
  PAYMENT_IN_PROGRESS: 'PAYMENT_IN_PROGRESS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',
  UNSUPPORTED_PAYMENT_AMOUNT: 'UNSUPPORTED_PAYMENT_AMOUNT',
  UNSUPPORTED_PAYMENT_CURRENCY: 'UNSUPPORTED_PAYMENT_CURRENCY',
} as const

export const PAYMENT_METHOD_VALUES = [
  PAYMENT_METHOD.CASH,
  PAYMENT_METHOD.BANK_TRANSFER,
  PAYMENT_METHOD.OTHER,
] as const

// ---- from compose/constants.ts ----
// Enums, labels and colors live in `shared/constants` (DB V8 values). Only what the compose screens add is kept here.

export const DEFAULT_INVOICE_CURRENCY: InvoiceCurrency = "VND"

export const DESCRIPTION_MAX_LENGTH = 500

export const INVOICE_TYPE_HINTS: Record<InvoiceType, string> = {
  QUOTATION: "Reference quote priced by the system from the horse count and the trip length. No payment is required.",
  DEPOSIT: "Deposit collected before the transport starts: a share of the issued quotation. Needs an issued quotation.",
  FINAL: "Final settlement after the trip: the quotation plus approved emergency costs, with paid deposits deducted. Needs an issued quotation.",
  SUPPLEMENTARY: "Extra fees that appear after the final settlement.",
  CREDIT_NOTE: "Compensation paid to the customer. Needs a PAID final invoice.",
}

/** Confirmation text of the issue dialog, one per UC-68 step 4. */
export const ISSUE_CONFIRMATION_TEXT: Record<InvoiceType, string> = {
  QUOTATION: "The quotation will be sent to the customer for reference and cannot be edited after it is issued. Confirm?",
  DEPOSIT: "The invoice will be sent to the customer with its due date and cannot be edited after it is issued. Confirm?",
  FINAL: "The invoice will be sent to the customer with its due date and cannot be edited after it is issued. Confirm?",
  SUPPLEMENTARY: "The invoice will be sent to the customer with its due date and cannot be edited after it is issued. Confirm?",
  CREDIT_NOTE: "The invoice will be sent to the customer and cannot be edited after it is issued. Confirm?",
}

/** Message per contract errorCode. Anything not listed falls back to the BE message. */
export const INVOICE_ERROR_MESSAGES: Record<string, string> = {
  INVALID_BOOKING_STATUS: "This booking is not approved, so no invoice can be created for it.",
  INVALID_TRANSPORT_STATUS: "The transport status does not allow this invoice type.",
  INVOICE_ALREADY_EXISTS: "An unresolved invoice of this type already exists. Edit or cancel the existing invoice first.",
  FINAL_INVOICE_ALREADY_EXISTS: "This booking already has a FINAL invoice. A second one is only allowed after the previous one is cancelled.",
  UNPAID_FINAL_INVOICE: "A credit note needs the FINAL invoice of this booking to be PAID first.",
  BOOKING_NOT_FOUND: "Booking not found.",
  INVOICE_NOT_FOUND: "Invoice not found.",
  INVOICE_LOCKED: "Only DRAFT invoices can be edited.",
  INVOICE_MODIFIED: "The invoice was just modified by another session. Please reload the page.",
  INVALID_INVOICE_STATUS: "The invoice must be in DRAFT status to be issued.",
  EMPTY_INVOICE_ITEMS: "The invoice needs at least one fee line before it can be issued.",
  INVOICE_TOTAL_NOT_POSITIVE: "The invoice total must be greater than 0.",
  DEPOSIT_DEDUCTION_CHANGED: "The paid deposits changed after this draft was saved. Open the draft and save it again.",
  QUOTATION_REQUIRED: "Issue a quotation for this booking first. Deposit and final invoices are built from it.",
  PENDING_EMERGENCY_COSTS: "Emergency cost requests of this transport are still pending. Approve or reject them before creating the final invoice.",
  HORSE_COUNT_UNSUPPORTED: "The price formula covers 1 to 9 horses. This booking is outside that range.",
  INVOICE_ITEMS_GENERATED: "The lines of this invoice type are generated by the system and cannot be edited.",
  INVOICE_SOURCE_CHANGED: "The quotation, deposits or approved emergency costs changed after this draft was saved. Open the draft and save it again to rebuild the lines.",
  FORBIDDEN: "Only the Logistics Manager can create and issue invoices.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
}

export const INVOICE_CURRENCY_LABELS: Record<InvoiceCurrency, string> = {
  VND: "VND - Vietnamese dong",
}

export const TRANSPORT_STATUS_LABELS: Record<string, string> = {
  CREATED: "Created",
  PLANNING: "Planning",
  READY: "Ready",
  IN_TRANSIT: "In transit",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}
