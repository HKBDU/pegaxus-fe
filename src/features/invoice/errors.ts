import { INVOICE_ERROR_MESSAGES } from "@/features/invoice/constants"
import type { ApiFieldError } from "@/features/invoice/types"

/** Error(errorCode) so the UI reacts to contract codes; `errors` carries per-field validation messages. */
export class InvoiceApiError extends Error {
  backendMessage?: string
  errors?: ApiFieldError[]
  /** Extra facts the API sends with some errors, such as `transportStatus` with INVALID_TRANSPORT_STATUS. */
  value?: Record<string, unknown> | null

  constructor(code: string, options?: { cause?: unknown; backendMessage?: string; errors?: ApiFieldError[]; value?: Record<string, unknown> | null }) {
    super(code, { cause: options?.cause })
    this.name = "InvoiceApiError"
    this.backendMessage = options?.backendMessage
    this.errors = options?.errors
    this.value = options?.value
  }
}

/** Branch on the contract errorCode, never on the HTTP status. */
export function getInvoiceErrorCode(error: unknown) {
  return error instanceof InvoiceApiError ? error.message : undefined
}

/** Codes whose API message names the transport and its state, which says more than the fixed text. */
const SPECIFIC_BACKEND_MESSAGES = new Set(["INVALID_TRANSPORT_STATUS"])

export function getInvoiceErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof InvoiceApiError) {
    if (SPECIFIC_BACKEND_MESSAGES.has(error.message) && error.backendMessage) return error.backendMessage
    return INVOICE_ERROR_MESSAGES[error.message] ?? error.backendMessage ?? fallback
  }
  return fallback
}
