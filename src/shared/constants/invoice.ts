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

export const INVOICE_CURRENCIES = ['EUR', 'VND'] as const

export const INVOICE_TAX_RATE_PERCENT = 20

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
