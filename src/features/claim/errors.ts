import { CLAIM_ERROR_MESSAGES } from "@/features/claim/constants"
import type { ApiFieldError } from "@/features/claim/types"

/** Error(errorCode) so the UI reacts to the contract codes, never to the HTTP status. */
export class ClaimApiError extends Error {
  backendMessage?: string
  errors?: ApiFieldError[]

  constructor(code: string, options?: { cause?: unknown; backendMessage?: string; errors?: ApiFieldError[] }) {
    super(code, { cause: options?.cause })
    this.name = "ClaimApiError"
    this.backendMessage = options?.backendMessage
    this.errors = options?.errors
  }
}

export function getClaimErrorCode(error: unknown) {
  return error instanceof ClaimApiError ? error.message : undefined
}

/** Message of the contract table first, then the BE message, then the fallback. */
export function getClaimErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof ClaimApiError) return CLAIM_ERROR_MESSAGES[error.message] ?? error.backendMessage ?? fallback
  return fallback
}
