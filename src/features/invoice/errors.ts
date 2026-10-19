import { INVOICE_ERROR_MESSAGES } from "@/features/invoice/constants"
import type { ApiFieldError } from "@/features/invoice/types"

/** Error(errorCode) so the UI reacts to contract codes; `errors` carries per-field validation messages. */
export class InvoiceApiError extends Error {
  backendMessage?: string
  errors?: ApiFieldError[]

  constructor(code: string, options?: { cause?: unknown; backendMessage?: string; errors?: ApiFieldError[] }) {
    super(code, { cause: options?.cause })
    this.name = "InvoiceApiError"
    this.backendMessage = options?.backendMessage
    this.errors = options?.errors
  }
}

/** Branch on the contract errorCode, never on the HTTP status. */
export function getInvoiceErrorCode(error: unknown) {
  return error instanceof InvoiceApiError ? error.message : undefined
}

export function getInvoiceErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof InvoiceApiError) {
    return INVOICE_ERROR_MESSAGES[error.message] ?? error.backendMessage ?? fallback
  }
  return fallback
}
