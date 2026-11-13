import { isAxiosError } from "axios"
import { ZodError } from "zod"
import apiClient from "@/lib/axios"
import type { ZodType } from "zod"
import { apiEnvelopeSchema, overviewSchema, segmentsResponseSchema, trackingSnapshotSchema } from "./schemas"
import type { SegmentsResponse, TrackingSnapshot, TransportOverview } from "./types"

/** A failed tracking call, with the BE `errorCode` when there is one (`FORBIDDEN`, `TRANSPORT_NOT_FOUND`, ...). */
export class TrackingApiError extends Error {
  readonly status: number
  readonly errorCode: string | null
  constructor(status: number, errorCode: string | null, message: string) {
    super(message)
    this.name = "TrackingApiError"
    this.status = status
    this.errorCode = errorCode
  }
}

const MESSAGES: Record<string, string> = {
  FORBIDDEN: "You are not allowed to view the live location of this transport.",
  UNAUTHORIZED: "You are not allowed to view the live location of this transport.",
  TRANSPORT_NOT_FOUND: "This transport could not be found.",
  INVALID_TRANSPORT_STATUS: "Live tracking is available once the transport is ready, in transit or completed.",
}

export function getTrackingErrorMessage(error: unknown) {
  if (error instanceof TrackingApiError) return MESSAGES[error.errorCode ?? ""] ?? error.message
  if (error instanceof ZodError) return "The server returned an unexpected tracking response."
  if (isAxiosError(error) && !error.response) return "Unable to reach the server. Check your connection and try again."
  return "Unable to load the live location right now."
}

/** Network and server errors may succeed on a retry; a refusal (403/404/409) never will. */
export function isRetryableTrackingError(error: unknown) {
  if (error instanceof TrackingApiError) return error.status >= 500
  return !(error instanceof ZodError)
}

function toTrackingError(error: unknown): unknown {
  if (!isAxiosError(error) || !error.response) return error
  const body = apiEnvelopeSchema.safeParse(error.response.data)
  const data = body.success ? body.data : null
  return new TrackingApiError(
    error.response.status,
    data?.errorCode ?? null,
    data?.message || data?.errorCode || `Tracking request failed (${error.response.status})`,
  )
}

async function read<T>(path: string, schema: ZodType<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted()
  try {
    const response = await apiClient.get<unknown, unknown>(path, { signal })
    const envelope = apiEnvelopeSchema.parse(response)
    if (!envelope.isSuccess) throw new TrackingApiError(envelope.code ?? 500, envelope.errorCode ?? null, envelope.message || "Tracking request failed")
    return schema.parse(envelope.value)
  } catch (error) {
    throw toTrackingError(error)
  }
}

const transportPath = (transportId: string) => `/transports/${encodeURIComponent(transportId)}`

export const trackingService = {
  /** GP1: planned route, next stop, planned ETA and the newest vehicle sample the BE holds in memory. */
  getSnapshot: (transportId: string, signal?: AbortSignal): Promise<TrackingSnapshot> =>
    read(`${transportPath(transportId)}/tracking`, trackingSnapshotSchema, signal),
  /** OT4: every leg of the effective journey with distance, times, crew and provider (read only, shared contract). */
  getSegments: (transportId: string, signal?: AbortSignal): Promise<SegmentsResponse> =>
    read(`${transportPath(transportId)}/segments`, segmentsResponseSchema, signal),
  /** OT3: transport code and status, horse welfare summary and active incidents. */
  getOverview: (transportId: string, signal?: AbortSignal): Promise<TransportOverview> =>
    read(`${transportPath(transportId)}/overview`, overviewSchema, signal),
}
