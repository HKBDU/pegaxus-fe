// Enum values are exactly the DB V8 ones (api-contract/flow6.md, section 2.1). Do not add values.
export const INVOICE_TYPES = ["QUOTATION", "DEPOSIT", "FINAL", "SUPPLEMENTARY", "CREDIT_NOTE"] as const
export const INVOICE_STATUSES = ["DRAFT", "ISSUED", "PAID", "OVERDUE", "CANCELLED"] as const
export const INVOICE_ITEM_TYPES = ["TRANSPORT_FEE", "HORSE_SERVICE_FEE", "HANDLING_FEE", "COMPLIANCE_FEE", "EMERGENCY_COST", "OTHER"] as const
export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "OTHER"] as const
export const RECEIPT_STATUSES = ["PENDING", "CONFIRMED", "FAILED", "REFUNDED"] as const

/** Not a DB enum: the keys of `availableActions` the BE returns (R12). */
export const INVOICE_ACTIONS = ["EDIT", "ISSUE", "RECORD_PAYMENT", "PAY_NOW", "CANCEL", "CREATE_ANOTHER"] as const

export const INVOICE_CURRENCIES = ["EUR", "VND"] as const

export type InvoiceType = (typeof INVOICE_TYPES)[number]
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]
export type InvoiceItemType = (typeof INVOICE_ITEM_TYPES)[number]
export type InvoiceCurrency = (typeof INVOICE_CURRENCIES)[number]
export const DEFAULT_INVOICE_CURRENCY: InvoiceCurrency = "EUR"

/** Fixed 20% tax and no discount (UC-67 BR-006). Only used for the "estimated" total in the draft form. */
export const INVOICE_TAX_RATE_PERCENT = 20

export const DESCRIPTION_MAX_LENGTH = 500

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  QUOTATION: "Quotation",
  DEPOSIT: "Deposit",
  FINAL: "Final",
  SUPPLEMENTARY: "Supplementary",
  CREDIT_NOTE: "Credit note",
}

export const INVOICE_TYPE_HINTS: Record<InvoiceType, string> = {
  QUOTATION: "Reference quote for the customer. No payment is required.",
  DEPOSIT: "Deposit collected before the transport starts.",
  FINAL: "Final settlement after the trip. Paid deposits are deducted automatically.",
  SUPPLEMENTARY: "Extra fees that appear after the final settlement.",
  CREDIT_NOTE: "Compensation paid to the customer. Needs a PAID final invoice.",
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
}

export const INVOICE_STATUS_CLASSES: Record<InvoiceStatus, string> = {
  DRAFT: "border-slate-300 bg-slate-100 text-slate-700",
  ISSUED: "border-sky-300 bg-sky-50 text-sky-800",
  PAID: "border-emerald-300 bg-emerald-50 text-emerald-800",
  OVERDUE: "border-amber-300 bg-amber-50 text-amber-800",
  CANCELLED: "border-red-300 bg-red-50 text-red-700",
}

export const INVOICE_ITEM_TYPE_LABELS: Record<InvoiceItemType, string> = {
  TRANSPORT_FEE: "Transport fee",
  HORSE_SERVICE_FEE: "Horse service fee",
  HANDLING_FEE: "Handling fee",
  COMPLIANCE_FEE: "Compliance fee",
  EMERGENCY_COST: "Emergency cost",
  OTHER: "Other",
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
  CURRENCY_MISMATCH: "The currency must match the currency of the paid deposit.",
  BOOKING_NOT_FOUND: "Booking not found.",
  INVOICE_NOT_FOUND: "Invoice not found.",
  INVOICE_LOCKED: "Only DRAFT invoices can be edited.",
  INVOICE_MODIFIED: "The invoice was just modified by another session. Please reload the page.",
  INVALID_INVOICE_STATUS: "The invoice must be in DRAFT status to be issued.",
  EMPTY_INVOICE_ITEMS: "The invoice needs at least one fee line before it can be issued.",
  INVOICE_TOTAL_NOT_POSITIVE: "The invoice total must be greater than 0.",
  DEPOSIT_DEDUCTION_CHANGED: "The paid deposits changed after this draft was saved. Open the draft and save it again.",
  FORBIDDEN: "Only the Logistics Manager can create and issue invoices.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
}

export const INVOICE_CURRENCY_LABELS: Record<InvoiceCurrency, string> = {
  EUR: "EUR - Euro",
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
