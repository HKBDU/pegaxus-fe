import { isAxiosError } from "axios"
import { z } from "zod"
import apiClient from "@/lib/axios"
import type { PaginationMeta } from "@/shared/types"
import { invoiceEnvelopeSchema, invoiceIdSchema, invoicePageSchema, invoiceDetailSchema, invoiceQuerySchema, bookingInvoiceQuerySchema, invoiceStatusHistorySchema } from "@/features/invoice/schemas"
import { isInvoiceMockMode } from "@/features/invoice/utils"
import type { InvoicePage, InvoiceQueryParams, BookingInvoiceQueryParams, ApiEnvelope, ApiFieldError, CreateInvoicePayload, Invoice, InvoiceBookingContext, InvoiceSuggestion, InvoiceType, IssuedInvoice, UpdateInvoicePayload, CancelInvoicePayload, CancelInvoiceResponse, OnlinePaymentResponse, RecordPaymentPayload, RecordPaymentResponse } from "@/features/invoice/types"
import { InvoiceApiError } from "@/features/invoice/errors"
import { mockCreateInvoice, mockGetBookingContext, mockGetInvoice, mockGetSuggestion, mockIssueInvoice, mockUpdateInvoice } from "@/features/invoice/mocks/compose.mock"
import type { AxiosError } from "axios"

export class InvoiceReadError extends Error {
  readonly errorCode: string;
  constructor(errorCode: string, message: string) {
    super(message);
    this.errorCode = errorCode;
  }
}
function readEnvelope(response: unknown) {
  const envelope = invoiceEnvelopeSchema.parse(response);
  if (!envelope.isSuccess)
    throw new InvoiceReadError(
      envelope.errorCode || "INVOICE_READ_FAILED",
      envelope.message || "Unable to load invoices.",
    );
  return envelope.value;
}
export function invoicePaginationMeta(page: InvoicePage): PaginationMeta {
  return {
    currentPage: page.pageIndex,
    itemsPerPage: page.pageSize,
    totalItems: page.totalItems,
    totalPages: page.totalPages,
    hasPreviousPage: page.pageIndex > 1,
    hasNextPage: page.pageIndex < page.totalPages,
  };
}
export const invoiceViewService = {
  async list(params: InvoiceQueryParams, signal?: AbortSignal) {
    const query = invoiceQuerySchema.parse(params);
    signal?.throwIfAborted();
    const response =
      !import.meta.env.PROD && isInvoiceMockMode()
        ? (await import("./mocks/invoice.mock")).invoiceMock.list(query)
        : await apiClient.get<unknown, unknown>("/invoices", {
            params: query,
            signal,
          });
    return invoicePageSchema.parse(readEnvelope(response));
  },
  async bookingList(
    bookingId: string,
    params: BookingInvoiceQueryParams,
    signal?: AbortSignal,
  ) {
    const id = invoiceIdSchema.parse(bookingId),
      query = bookingInvoiceQuerySchema.parse(params);
    signal?.throwIfAborted();
    const response =
      !import.meta.env.PROD && isInvoiceMockMode()
        ? (await import("./mocks/invoice.mock")).invoiceMock.bookingList(
            id,
            query,
          )
        : await apiClient.get<unknown, unknown>(
            `/bookings/${encodeURIComponent(id)}/invoices`,
            { params: query, signal },
          );
    return invoicePageSchema.parse(readEnvelope(response));
  },
  async detail(invoiceId: string, signal?: AbortSignal) {
    const id = invoiceIdSchema.parse(invoiceId);
    signal?.throwIfAborted();
    const response =
      !import.meta.env.PROD && isInvoiceMockMode()
        ? (await import("./mocks/invoice.mock")).invoiceMock.detail(id)
        : await apiClient.get<unknown, unknown>(
            `/invoices/${encodeURIComponent(id)}`,
            { signal },
          );
    return invoiceDetailSchema.parse(readEnvelope(response));
  },
  async statusHistory(invoiceId: string, signal?: AbortSignal) {
    const id = invoiceIdSchema.parse(invoiceId);
    signal?.throwIfAborted();
    const response =
      !import.meta.env.PROD && isInvoiceMockMode()
        ? (await import("./mocks/invoice.mock")).invoiceMock.statusHistory(id)
        : await apiClient.get<unknown, unknown>(
            `/invoices/${encodeURIComponent(id)}/status-history`,
            { signal },
          );
    return invoiceStatusHistorySchema
      .parse(readEnvelope(response))
      .sort((a, b) => Date.parse(a.changedAt) - Date.parse(b.changedAt));
  },
};
export function getInvoiceError(error: unknown) {
  const data = isAxiosError(error)
    ? (error.response?.data as
        { errorCode?: string; message?: string } | undefined)
    : undefined;
  const code =
    error instanceof InvoiceReadError ? error.errorCode : data?.errorCode;
  const message =
    error instanceof InvoiceReadError ? error.message : data?.message;
  if (code === "UNAUTHORIZED")
    return {
      message: "Your session has expired. Please sign in again.",
      retryable: false,
    };
  if (code === "FORBIDDEN")
    return {
      message: message || "You do not have permission to view these invoices.",
      retryable: false,
    };
  if (code === "INVOICE_NOT_FOUND")
    return {
      message: "Invoice not found or unavailable to your account.",
      retryable: false,
    };
  if (code === "BOOKING_NOT_FOUND")
    return {
      message: "Booking not found or unavailable to your account.",
      retryable: false,
    };
  if (code === "INVALID_SORT_PARAMETER" || code === "VALIDATION_ERROR")
    return {
      message: message || "Check the invoice filters and try again.",
      retryable: false,
    };
  if (error instanceof z.ZodError)
    return {
      message: "The invoice response does not match the expected API contract.",
      retryable: false,
    };
  return {
    message: message || "Unable to load invoices. Please try again.",
    retryable: true,
  };
}

// ---- from compose/services.ts ----
/**
 * Flow 6 has no BE yet, so the mock is on by default (VITE_INVOICE_API_MOCKS=false calls the real API; the endpoints
 * below are exactly the ones in api-contract/flow6.md). The switch is shared with the view and payment APIs.
 */
export const useInvoiceMocks = isInvoiceMockMode()

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "value" in payload) return (payload as ApiEnvelope<T>).value
  return payload as T
}

async function call<T>(request: Promise<unknown>): Promise<T> {
  try {
    return unwrap<T>(await request)
  } catch (error) {
    const data = (error as { response?: { data?: { errorCode?: string; message?: string; errors?: ApiFieldError[] } } }).response?.data
    if (data?.errorCode) throw new InvoiceApiError(data.errorCode, { cause: error, backendMessage: data.message, errors: data.errors })
    throw error
  }
}

const enc = encodeURIComponent

interface BookingDetailResponse {
  bookingId: string
  bookingCode: string
  customer?: { fullName?: string }
  transport?: { transportCode?: string } | null
  horses?: { horseId: string; horseName: string }[]
}

export const invoiceService = {
  /** Flow 1 B8, only to fill the horse dropdown and the booking header of the form. */
  async getBookingContext(bookingId: string): Promise<InvoiceBookingContext> {
    if (useInvoiceMocks) return mockGetBookingContext(bookingId)
    const booking = await call<BookingDetailResponse>(apiClient.get(`bookings/${enc(bookingId)}`))
    return {
      bookingId: booking.bookingId,
      bookingCode: booking.bookingCode,
      customerName: booking.customer?.fullName ?? "",
      transportCode: booking.transport?.transportCode ?? null,
      horses: (booking.horses ?? []).map(({ horseId, horseName }) => ({ horseId, horseName })),
    }
  },

  /** IV1: prechecks the invoice type and previews the deposit deduction lines of a FINAL. */
  async getSuggestion(bookingId: string, type: InvoiceType): Promise<InvoiceSuggestion> {
    if (useInvoiceMocks) return mockGetSuggestion(bookingId, type)
    return call<InvoiceSuggestion>(apiClient.get(`bookings/${enc(bookingId)}/invoices/suggestion`, { params: { type } }))
  },

  /** IV6: loads a draft for editing. */
  async getInvoice(invoiceId: string): Promise<Invoice> {
    if (useInvoiceMocks) return mockGetInvoice(invoiceId)
    return call<Invoice>(apiClient.get(`invoices/${enc(invoiceId)}`))
  },

  /** IV2 */
  async createInvoice(bookingId: string, payload: CreateInvoicePayload): Promise<Invoice> {
    if (useInvoiceMocks) return mockCreateInvoice(bookingId, payload)
    return call<Invoice>(apiClient.post(`bookings/${enc(bookingId)}/invoices`, payload))
  },

  /** IV3: `items` replaces the whole list; `lastUpdatedAt` is the `updatedAt` of the last read. */
  async updateInvoice(invoiceId: string, payload: UpdateInvoicePayload): Promise<Invoice> {
    if (useInvoiceMocks) return mockUpdateInvoice(invoiceId, payload)
    return call<Invoice>(apiClient.put(`invoices/${enc(invoiceId)}`, payload))
  },

  /** IV7 */
  async issueInvoice(invoiceId: string, lastUpdatedAt: string): Promise<IssuedInvoice> {
    if (useInvoiceMocks) return mockIssueInvoice(invoiceId, lastUpdatedAt)
    return call<IssuedInvoice>(apiClient.post(`invoices/${enc(invoiceId)}/issue`, { lastUpdatedAt }))
  },
}

// ---- from payment/services.ts ----
// The axios base URL already ends with /api/v1/, so endpoints are written without that prefix.
const INVOICE_ENDPOINT = '/invoices'

export class InvoiceServiceError extends Error {
  readonly errorCode: string | undefined
  readonly status: number | undefined
  readonly errors: unknown

  constructor(message: string, options: { errorCode?: string; status?: number; errors?: unknown } = {}) {
    super(message)
    this.name = 'InvoiceServiceError'
    this.errorCode = options.errorCode
    this.status = options.status
    this.errors = options.errors
  }
}

function normalizeInvoiceError(error: unknown): InvoiceServiceError {
  if (error instanceof InvoiceServiceError) return error

  const axiosError = error as AxiosError<{ errorCode?: string; message?: string; errors?: unknown }>
  const responseData = axiosError.response?.data
  return new InvoiceServiceError(
    responseData?.message ?? (error instanceof Error ? error.message : 'Invoice request failed.'),
    {
      errorCode: responseData?.errorCode,
      status: axiosError.response?.status,
      errors: responseData?.errors,
    },
  )
}

/** The API answers { isSuccess, code, message, value }; the components work with `value`. */
function unwrapValue<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'value' in payload) return (payload as { value: T }).value
  return payload as T
}

async function request<T>(callback: () => Promise<unknown>): Promise<T> {
  try {
    return unwrapValue<T>(await callback())
  } catch (error) {
    throw normalizeInvoiceError(error)
  }
}

export function recordPayment(invoiceId: string, payload: RecordPaymentPayload): Promise<RecordPaymentResponse> {
  return request<RecordPaymentResponse>(() =>
    apiClient.post(`${INVOICE_ENDPOINT}/${encodeURIComponent(invoiceId)}/receipts`, payload),
  )
}

export function startOnlinePayment(invoiceId: string): Promise<OnlinePaymentResponse> {
  return request<OnlinePaymentResponse>(() =>
    apiClient.post(`${INVOICE_ENDPOINT}/${encodeURIComponent(invoiceId)}/online-payments`),
  )
}

export function cancelInvoice(invoiceId: string, payload: CancelInvoicePayload): Promise<CancelInvoiceResponse> {
  return request<CancelInvoiceResponse>(() =>
    apiClient.post(`${INVOICE_ENDPOINT}/${encodeURIComponent(invoiceId)}/cancel`, payload),
  )
}
