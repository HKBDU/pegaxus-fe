import { isAxiosError } from "axios"
import apiClient from "@/lib/axios"
import { presignedUpload } from "@/shared/utils/presigned"
import { LIST_PAGE_SIZE } from "./constants"
import { apiEnvelopeSchema, handoverListSchema, handoverRecordSchema, segmentsOverviewSchema } from "./schemas"
import type { CancelInput, CompleteInput, CreateHandoverInput, HandoverList, HandoverRecord, ListFilters, SegmentsOverview } from "./types"

export interface FieldError {
  field: string
  message: string
}

/** Every failed call becomes one of these. The UI branches on `errorCode`, never on the HTTP status (contract rule). */
export class HandoverApiError extends Error {
  readonly status?: number
  readonly errorCode?: string
  readonly errors: FieldError[]
  /** `value` of the error body: `HANDOVER_ALREADY_EXISTS` carries `handoverRecordId` here. */
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

function fromBody(body: unknown, status?: number): HandoverApiError | null {
  const parsed = apiEnvelopeSchema.safeParse(body)
  if (!parsed.success || parsed.data.isSuccess) return null
  const value = parsed.data.value && typeof parsed.data.value === "object" ? (parsed.data.value as Record<string, unknown>) : undefined
  return new HandoverApiError({ status: status ?? parsed.data.code, errorCode: parsed.data.errorCode, message: parsed.data.message, errors: toFieldErrors(parsed.data.errors), value })
}

/** Normalises axios failures (error body) and `isSuccess: false` envelopes into `HandoverApiError`. */
export function toHandoverError(error: unknown): HandoverApiError {
  if (error instanceof HandoverApiError) return error
  if (isAxiosError(error)) {
    const fromResponse = error.response ? fromBody(error.response.data, error.response.status) : null
    if (fromResponse) return fromResponse
    if (error.code === "ERR_CANCELED") return new HandoverApiError({ errorCode: "CANCELED", message: "Request canceled" })
    if (!error.response) return new HandoverApiError({ errorCode: "NETWORK_ERROR", message: "Cannot reach the server. Check your connection and try again." })
    return new HandoverApiError({ status: error.response.status, message: `Request failed (${error.response.status})` })
  }
  return new HandoverApiError({ message: error instanceof Error ? error.message : "Unexpected error" })
}

function unwrap(response: unknown): unknown {
  const failed = fromBody(response)
  if (failed) throw failed
  const parsed = apiEnvelopeSchema.safeParse(response)
  return parsed.success ? parsed.data.value : response
}

async function call<T>(request: () => Promise<unknown>, parse: (value: unknown) => T): Promise<T> {
  try {
    return parse(unwrap(await request()))
  } catch (error) {
    throw toHandoverError(error)
  }
}

const path = (transportId: string) => `/transports/${encodeURIComponent(transportId)}`
const recordPath = (handoverRecordId: string) => `/handover-records/${encodeURIComponent(handoverRecordId)}`

const clean = (value: string) => {
  const trimmed = value.trim()
  return trimmed === "" ? undefined : trimmed
}

/** Uploads both signature PNGs (separate uploads) and returns their `publicId`s; a failure becomes a `HandoverApiError`. */
async function uploadSignatures(sender: Blob, receiver: Blob): Promise<[string, string]> {
  const toFile = (blob: Blob, name: string) => new File([blob], name, { type: "image/png" })
  try {
    return await Promise.all([
      presignedUpload.upload({ file: toFile(sender, "sender-signature.png"), entity: "attachment" }),
      presignedUpload.upload({ file: toFile(receiver, "receiver-signature.png"), entity: "attachment" }),
    ])
  } catch (error) {
    const code = (error as { code?: string }).code
    // The BE rejected the picture itself (not a PNG / too big): same answer HO5 gives for a bad image.
    if (code === "FILE_REJECTED") throw new HandoverApiError({ errorCode: "INVALID_IMAGE", message: "A signature image was rejected. Clear the pad, sign again and retry." })
    throw new HandoverApiError({ errorCode: "SIGNATURE_UPLOAD_FAILED", message: "Could not upload the signatures. Check your connection and try again." })
  }
}

export const handoverService = {
  /** HO1. */
  listByTransport(transportId: string, filters: ListFilters, signal?: AbortSignal): Promise<HandoverList> {
    return call(
      () =>
        apiClient.get<unknown, unknown>(`${path(transportId)}/handover-records`, {
          params: { handoverType: filters.handoverType, status: filters.status, pageIndex: 1, pageSize: LIST_PAGE_SIZE, sortBy: "sequenceNo:asc" },
          signal,
        }),
      (value) => handoverListSchema.parse(value),
    )
  },

  /** HO2. */
  getRecord(handoverRecordId: string, signal?: AbortSignal): Promise<HandoverRecord> {
    return call(() => apiClient.get<unknown, unknown>(recordPath(handoverRecordId), { signal }), (value) => handoverRecordSchema.parse(value))
  },

  /** HO3. `HANDOVER_ALREADY_EXISTS` carries the id of the open record in `error.value.handoverRecordId`. */
  create(transportId: string, input: CreateHandoverInput): Promise<HandoverRecord> {
    return call(
      () => apiClient.post<unknown, unknown>(`${path(transportId)}/handover-records`, input),
      (value) => handoverRecordSchema.parse(value),
    )
  },

  /** HO4: PLANNED -> IN_PROGRESS. */
  start(handoverRecordId: string): Promise<HandoverRecord> {
    return call(() => apiClient.post<unknown, unknown>(`${recordPath(handoverRecordId)}/start`), (value) => handoverRecordSchema.parse(value))
  },

  /**
   * HO5: JSON. The two signature PNGs are uploaded first (presigned, one upload each) and only their `publicId` is sent.
   * The party and location snapshot is sent only for the fields the user filled in.
   */
  async complete(handoverRecordId: string, input: CompleteInput): Promise<HandoverRecord> {
    const [senderSignature, receiverSignature] = await uploadSignatures(input.senderSignature, input.receiverSignature)
    const body: Record<string, unknown> = {
      lastUpdatedAt: input.lastUpdatedAt,
      latitude: input.latitude,
      longitude: input.longitude,
      horseConditionNote: input.horseConditionNote.trim(),
      documentHandoverNote: input.documentHandoverNote.trim(),
      equipmentHandoverNote: input.equipmentHandoverNote.trim(),
      senderSignature: { publicId: senderSignature },
      receiverSignature: { publicId: receiverSignature },
    }
    const optional: Array<[string, string]> = [
      ["discrepancyNote", input.discrepancyNote],
      ["fromPartyName", input.from.partyName],
      ["fromContactName", input.from.contactName],
      ["fromContactPhone", input.from.contactPhone],
      ["toPartyName", input.to.partyName],
      ["toContactName", input.to.contactName],
      ["toContactPhone", input.to.contactPhone],
      ["locationName", input.location.locationName],
      ["address", input.location.address],
      ["country", input.location.country],
    ]
    for (const [key, raw] of optional) {
      const value = clean(raw)
      if (value) body[key] = value
    }
    return call(
      () => apiClient.post<unknown, unknown>(`${recordPath(handoverRecordId)}/complete`, body),
      (value) => handoverRecordSchema.parse(value),
    )
  },

  /** HO6. */
  cancel(handoverRecordId: string, input: CancelInput): Promise<HandoverRecord> {
    return call(
      () => apiClient.post<unknown, unknown>(`${recordPath(handoverRecordId)}/cancel`, { lastUpdatedAt: input.lastUpdatedAt, cancellationReason: input.cancellationReason.trim() }),
      (value) => handoverRecordSchema.parse(value),
    )
  },

  /** OT4, read only: the handover boundaries (what can be created) and the coordinates of the handover point. */
  getSegments(transportId: string, signal?: AbortSignal): Promise<SegmentsOverview> {
    return call(() => apiClient.get<unknown, unknown>(`${path(transportId)}/segments`, { signal }), (value) => segmentsOverviewSchema.parse(value))
  },
}
