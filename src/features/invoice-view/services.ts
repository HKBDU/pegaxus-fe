import { isAxiosError } from "axios"
import { z } from "zod"
import apiClient from "@/lib/axios"
import type { PaginationMeta } from "@/shared/types"
import { invoiceEnvelopeSchema, invoiceIdSchema, invoicePageSchema, invoiceDetailSchema, invoiceQuerySchema, bookingInvoiceQuerySchema, invoiceStatusHistorySchema } from "./schemas"
import { isFlow6MockMode } from "./source"
import type { InvoicePage, InvoiceQueryParams, BookingInvoiceQueryParams } from "./types"

export class InvoiceReadError extends Error {
  readonly errorCode: string
  constructor(errorCode: string, message: string) { super(message); this.errorCode = errorCode }
}
function readEnvelope(response: unknown) {
  const envelope = invoiceEnvelopeSchema.parse(response)
  if (!envelope.isSuccess) throw new InvoiceReadError(envelope.errorCode || "INVOICE_READ_FAILED", envelope.message || "Unable to load invoices.")
  return envelope.value
}
export function invoicePaginationMeta(page: InvoicePage): PaginationMeta {
  return { currentPage: page.pageIndex, itemsPerPage: page.pageSize, totalItems: page.totalItems, totalPages: page.totalPages,
    hasPreviousPage: page.pageIndex > 1, hasNextPage: page.pageIndex < page.totalPages }
}
export const invoiceViewService = {
  async list(params: InvoiceQueryParams, signal?: AbortSignal) {
    const query = invoiceQuerySchema.parse(params)
    signal?.throwIfAborted()
    const response = !import.meta.env.PROD && isFlow6MockMode()
      ? (await import("./mocks/invoice.mock")).invoiceMock.list(query)
      : await apiClient.get<unknown, unknown>("/invoices", { params: query, signal })
    return invoicePageSchema.parse(readEnvelope(response))
  },
  async bookingList(bookingId: string, params: BookingInvoiceQueryParams, signal?: AbortSignal) {
    const id = invoiceIdSchema.parse(bookingId), query = bookingInvoiceQuerySchema.parse(params)
    signal?.throwIfAborted()
    const response = !import.meta.env.PROD && isFlow6MockMode()
      ? (await import("./mocks/invoice.mock")).invoiceMock.bookingList(id, query)
      : await apiClient.get<unknown, unknown>(`/bookings/${encodeURIComponent(id)}/invoices`, { params: query, signal })
    return invoicePageSchema.parse(readEnvelope(response))
  },
  async detail(invoiceId: string, signal?: AbortSignal) {
    const id = invoiceIdSchema.parse(invoiceId)
    signal?.throwIfAborted()
    const response = !import.meta.env.PROD && isFlow6MockMode()
      ? (await import("./mocks/invoice.mock")).invoiceMock.detail(id)
      : await apiClient.get<unknown, unknown>(`/invoices/${encodeURIComponent(id)}`, { signal })
    return invoiceDetailSchema.parse(readEnvelope(response))
  },
  async statusHistory(invoiceId: string, signal?: AbortSignal) {
    const id = invoiceIdSchema.parse(invoiceId)
    signal?.throwIfAborted()
    const response = !import.meta.env.PROD && isFlow6MockMode()
      ? (await import("./mocks/invoice.mock")).invoiceMock.statusHistory(id)
      : await apiClient.get<unknown, unknown>(`/invoices/${encodeURIComponent(id)}/status-history`, { signal })
    return invoiceStatusHistorySchema.parse(readEnvelope(response))
      .sort((a, b) => Date.parse(a.changedAt) - Date.parse(b.changedAt))
  },
}
export function getInvoiceError(error: unknown) {
  const data = isAxiosError(error) ? error.response?.data as { errorCode?: string; message?: string } | undefined : undefined
  const code = error instanceof InvoiceReadError ? error.errorCode : data?.errorCode
  const message = error instanceof InvoiceReadError ? error.message : data?.message
  if (code === "UNAUTHORIZED") return { message: "Your session has expired. Please sign in again.", retryable: false }
  if (code === "FORBIDDEN") return { message: message || "You do not have permission to view these invoices.", retryable: false }
  if (code === "INVOICE_NOT_FOUND") return { message: "Invoice not found or unavailable to your account.", retryable: false }
  if (code === "BOOKING_NOT_FOUND") return { message: "Booking not found or unavailable to your account.", retryable: false }
  if (code === "INVALID_SORT_PARAMETER" || code === "VALIDATION_ERROR") return { message: message || "Check the invoice filters and try again.", retryable: false }
  if (error instanceof z.ZodError) return { message: "The invoice response does not match the expected API contract.", retryable: false }
  return { message: message || "Unable to load invoices. Please try again.", retryable: true }
}
