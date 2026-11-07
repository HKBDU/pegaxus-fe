export interface ApiFieldError {
  field?: string
  message: string
}

export const PRICE_LIST_ERROR_MESSAGES: Record<string, string> = {
  PRICE_LIST_NOT_FOUND: "This price list no longer exists.",
  PRICE_LIST_ITEM_NOT_FOUND: "This price line no longer exists.",
  ACTIVE_PRICELIST_LOCKED: "The active price list is locked. Clone it, edit the copy, then activate.",
  TOO_MANY_REQUESTS: "Too many requests. Try again in a few seconds.",
  VALIDATION_ERROR: "Validation error. Please check the input fields.",
  FORBIDDEN: "You do not have permission to perform this action.",
}

export class PriceListApiError extends Error {
  backendMessage?: string
  errors?: ApiFieldError[]

  constructor(code: string, options?: { cause?: unknown; backendMessage?: string; errors?: ApiFieldError[] }) {
    super(code, { cause: options?.cause })
    this.name = "PriceListApiError"
    this.backendMessage = options?.backendMessage
    this.errors = options?.errors
  }
}

export function getPriceListErrorCode(error: unknown) {
  return error instanceof PriceListApiError ? error.message : undefined
}

export function getPriceListErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof PriceListApiError) return PRICE_LIST_ERROR_MESSAGES[error.message] ?? error.backendMessage ?? fallback
  return fallback
}
