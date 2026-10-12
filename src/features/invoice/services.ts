import apiClient from "@/lib/axios"
import { InvoiceApiError } from "@/features/invoice/errors"
import {
  mockCreateInvoice,
  mockGetBookingContext,
  mockGetInvoice,
  mockGetSuggestion,
  mockIssueInvoice,
  mockUpdateInvoice,
} from "@/features/invoice/mock-api"
import type {
  ApiEnvelope,
  ApiFieldError,
  CreateInvoicePayload,
  Invoice,
  InvoiceBookingContext,
  InvoiceSuggestion,
  InvoiceType,
  IssuedInvoice,
  UpdateInvoicePayload,
} from "@/features/invoice/types"

/**
 * Flow 6 has no BE yet, so the mock is on by default. Set VITE_INVOICE_API_MOCKS=false to call the real API
 * (endpoints below are exactly the ones in api-contract/flow6.md). Restart `pnpm dev` after changing it.
 */
export const useInvoiceMocks = import.meta.env.VITE_INVOICE_API_MOCKS !== "false"

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
