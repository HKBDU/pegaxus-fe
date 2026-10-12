// Temporary feature-local contract boundary until Khuyên's shared invoice exports are merged.
export const invoiceTypes = ["QUOTATION", "DEPOSIT", "FINAL", "SUPPLEMENTARY", "CREDIT_NOTE"] as const
export const invoiceStatuses = ["DRAFT", "ISSUED", "PAID", "OVERDUE", "CANCELLED"] as const
export const invoiceItemTypes = ["TRANSPORT_FEE", "HORSE_SERVICE_FEE", "HANDLING_FEE", "COMPLIANCE_FEE", "EMERGENCY_COST", "OTHER"] as const
export const invoiceActions = ["EDIT", "ISSUE", "RECORD_PAYMENT", "PAY_NOW", "CANCEL", "CREATE_ANOTHER"] as const
export const receiptStatuses = ["PENDING", "CONFIRMED", "FAILED"] as const
export const paymentMethods = ["CASH", "BANK_TRANSFER", "OTHER"] as const
export const invoiceSorts = ["createdAt:desc", "createdAt:asc", "issuedAt:desc", "issuedAt:asc", "dueDate:asc", "dueDate:desc", "totalAmount:desc", "totalAmount:asc"] as const
export const controlClass = "h-8 rounded-[2px] border-slate-300 bg-white text-xs shadow-none"
export const invoiceListPath = "/admin/invoices"
export const invoiceDetailPath = (id: string) => `${invoiceListPath}/${encodeURIComponent(id)}`
export const customerInvoicePath = (bookingId: string, id: string) => `/bookings/${encodeURIComponent(bookingId)}/invoices/${encodeURIComponent(id)}`
export const planInvoicesPath = (id: string) => `${invoiceListPath}?${new URLSearchParams({ transportPlanId: id })}`
export const humanize = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
export const initialInvoiceParams = { pageIndex: 1, pageSize: 20, sortBy: "createdAt:desc" as const }
