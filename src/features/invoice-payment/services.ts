import type { AxiosError } from 'axios'
import apiClient from '@/lib/axios'
import type {
  CancelInvoicePayload,
  CancelInvoiceResponse,
  OnlinePaymentResponse,
  RecordPaymentPayload,
  RecordPaymentResponse,
} from '@/shared/types/invoice'

const INVOICE_ENDPOINT = '/api/v1/invoices'

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

async function request<T>(callback: () => Promise<T>): Promise<T> {
  try {
    return await callback()
  } catch (error) {
    throw normalizeInvoiceError(error)
  }
}

export function recordPayment(invoiceId: string, payload: RecordPaymentPayload): Promise<RecordPaymentResponse> {
  return request(() =>
    apiClient.post(`${INVOICE_ENDPOINT}/${encodeURIComponent(invoiceId)}/receipts`, payload),
  )
}

export function startOnlinePayment(invoiceId: string): Promise<OnlinePaymentResponse> {
  return request(() =>
    apiClient.post(`${INVOICE_ENDPOINT}/${encodeURIComponent(invoiceId)}/online-payments`),
  )
}

export function cancelInvoice(invoiceId: string, payload: CancelInvoicePayload): Promise<CancelInvoiceResponse> {
  return request(() =>
    apiClient.post(`${INVOICE_ENDPOINT}/${encodeURIComponent(invoiceId)}/cancel`, payload),
  )
}
