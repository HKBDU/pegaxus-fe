import { isAxiosError } from "axios"

import { INCIDENT_ERROR_MESSAGES } from "./constants"
import { apiEnvelopeSchema } from "./schemas"

export interface FieldError {
  field: string
  message: string
}

/** Every failed call becomes one of these. The UI branches on `errorCode`, never on the HTTP status (contract rule). */
export class IncidentApiError extends Error {
  readonly status?: number
  readonly errorCode?: string
  readonly errors: FieldError[]
  /** `value` of the error body: `pendingRequests[]`, `requests[]` or `approvedRequests[]` for the 422 cost errors. */
  readonly value?: Record<string, unknown>
  constructor(init: { status?: number; errorCode?: string | null; message?: string | null; errors?: FieldError[]; value?: Record<string, unknown> }) {
    super(init.message || init.errorCode || "Request failed")
    this.status = init.status
    this.errorCode = init.errorCode ?? undefined
    this.errors = init.errors ?? []
    this.value = init.value
  }
}

function toFieldErrors(raw: unknown): FieldError[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []
    const { field, message } = entry as { field?: unknown; message?: unknown }
    return typeof message === "string" ? [{ field: typeof field === "string" ? field : "", message }] : []
  })
}

export function fromBody(body: unknown, status?: number): IncidentApiError | null {
  const parsed = apiEnvelopeSchema.safeParse(body)
  if (!parsed.success || parsed.data.isSuccess) return null
  const value = parsed.data.value && typeof parsed.data.value === "object" ? (parsed.data.value as Record<string, unknown>) : undefined
  return new IncidentApiError({ status: status ?? parsed.data.code, errorCode: parsed.data.errorCode, message: parsed.data.message, errors: toFieldErrors(parsed.data.errors), value })
}

/** Normalises axios failures (error body) and `isSuccess: false` envelopes into `IncidentApiError`. */
export function toIncidentError(error: unknown): IncidentApiError {
  if (error instanceof IncidentApiError) return error
  if (isAxiosError(error)) {
    const fromResponse = error.response ? fromBody(error.response.data, error.response.status) : null
    if (fromResponse) return fromResponse
    if (error.code === "ERR_CANCELED") return new IncidentApiError({ errorCode: "CANCELED", message: "Request canceled" })
    if (!error.response) return new IncidentApiError({ errorCode: "NETWORK_ERROR", message: INCIDENT_ERROR_MESSAGES.NETWORK_ERROR })
    return new IncidentApiError({ status: error.response.status, message: `Request failed (${error.response.status})` })
  }
  return new IncidentApiError({ message: error instanceof Error ? error.message : "Unexpected error" })
}

/** Text for a toast / inline alert: our message per `errorCode`, else the BE message. */
export function incidentErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const apiError = toIncidentError(error)
  return (apiError.errorCode && INCIDENT_ERROR_MESSAGES[apiError.errorCode]) || apiError.message || fallback
}

/** `404` for a missing, forbidden-by-scope (DRV/ESC) or hidden (Customer, LOW/MEDIUM) incident: shown as "not found". */
export const isNotFound = (error: unknown) => toIncidentError(error).status === 404
