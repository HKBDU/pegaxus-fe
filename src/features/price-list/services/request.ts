import { PriceListApiError } from "@/features/price-list/errors"
import type { ApiFieldError } from "@/features/price-list/types"

interface ErrorBody {
  errorCode?: string
  message?: string
  errors?: ApiFieldError[]
}

/** The API answers { isSuccess, code, message, value } (A-03); callers work with `value`. */
export function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "value" in payload) return (payload as { value: T }).value
  return payload as T
}

/** Turns an HTTP failure into a PriceListApiError carrying the contract `errorCode`; anything else (network, timeout) passes through. */
export async function call<T>(request: Promise<unknown>): Promise<T> {
  try {
    return unwrap<T>(await request)
  } catch (error) {
    const response = (error as { response?: { data?: ErrorBody; headers?: Record<string, unknown> } }).response
    const code = response?.data?.errorCode
    if (!code) throw error
    const retryAfter = Number(response?.headers?.["retry-after"])
    throw new PriceListApiError(code, {
      cause: error,
      backendMessage: response?.data?.message,
      errors: response?.data?.errors,
      retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    })
  }
}
