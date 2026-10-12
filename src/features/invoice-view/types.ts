import type { z } from "zod"
import type { invoiceDetailSchema, invoiceListItemSchema, invoicePageSchema, invoiceQuerySchema, bookingInvoiceQuerySchema, invoiceStatusHistoryEventSchema } from "./schemas"

// Read DTOs only. Replace this boundary with the agreed shared exports when available.
export type InvoiceDetail = z.infer<typeof invoiceDetailSchema>
export type InvoiceListItem = z.infer<typeof invoiceListItemSchema>
export type InvoicePage = z.infer<typeof invoicePageSchema>
export type InvoiceQueryParams = z.infer<typeof invoiceQuerySchema>
export type BookingInvoiceQueryParams = z.infer<typeof bookingInvoiceQuerySchema>
export type InvoiceAction = InvoiceDetail["availableActions"][number]
export type InvoiceStatusHistoryEvent = z.infer<typeof invoiceStatusHistoryEventSchema>
export type InvoiceHistoryType = InvoiceStatusHistoryEvent["type"]
