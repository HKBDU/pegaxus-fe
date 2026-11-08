import { PRICE_LIST_ERROR_MESSAGES, PRICE_LIST_TIER_MISSING } from "@/features/price-list/constants"
import type { ApiFieldError } from "@/features/price-list/types"

export type { ApiFieldError }

/** Error(errorCode) so the UI reacts to the contract codes, never to the HTTP status (A-03). */
export class PriceListApiError extends Error {
  backendMessage?: string
  errors?: ApiFieldError[]
  /** Seconds from the `Retry-After` header of a 429, when the client exposes it. */
  retryAfterSeconds?: number

  constructor(code: string, options?: { cause?: unknown; backendMessage?: string; errors?: ApiFieldError[]; retryAfterSeconds?: number }) {
    super(code, { cause: options?.cause })
    this.name = "PriceListApiError"
    this.backendMessage = options?.backendMessage
    this.errors = options?.errors
    this.retryAfterSeconds = options?.retryAfterSeconds
  }
}

export function getPriceListErrorCode(error: unknown) {
  return error instanceof PriceListApiError ? error.message : undefined
}

/** Table of the contract first, then the BE message, then the fallback. A missing tier names the tier, so the BE text wins there. */
export function getPriceListErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (!(error instanceof PriceListApiError)) return fallback
  if (error.message === PRICE_LIST_TIER_MISSING) return error.backendMessage ?? PRICE_LIST_ERROR_MESSAGES[PRICE_LIST_TIER_MISSING]
  if (error.message === "TOO_MANY_REQUESTS" && error.retryAfterSeconds) return `Too many requests. Try again in ${error.retryAfterSeconds} seconds.`
  return PRICE_LIST_ERROR_MESSAGES[error.message] ?? error.backendMessage ?? fallback
}
