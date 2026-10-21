import { isAxiosError } from "axios";
import apiClient from "@/lib/axios";
import {
  HANDOVER_GEOFENCE_METERS,
  LIST_PAGE_SIZE,
  SIGNATURE_MAX_BYTES,
} from "./constants";
import { presignedUpload } from "@/shared/utils/presigned";
import { distanceMeters } from "./utils";
import {
  apiEnvelopeSchema,
  handoverListSchema,
  handoverRecordSchema,
  segmentsOverviewSchema,
} from "./schemas";
import type {
  CancelInput,
  CompleteInput,
  CreateHandoverInput,
  HandoverList,
  HandoverRecord,
  ListFilters,
  SegmentsOverview,
} from "./types";

export interface FieldError {
  field: string;
  message: string;
}

/** Every failed call becomes one of these. The UI branches on `errorCode`, never on the HTTP status (contract rule). */
export class HandoverApiError extends Error {
  readonly status?: number;
  readonly errorCode?: string;
  readonly errors: FieldError[];
  /** `value` of the error body: `HANDOVER_ALREADY_EXISTS` carries `handoverRecordId` here. */
  readonly value?: Record<string, unknown>;
  constructor(init: {
    status?: number;
    errorCode?: string | null;
    message?: string | null;
    errors?: FieldError[];
    value?: Record<string, unknown>;
  }) {
    super(init.message || init.errorCode || "Request failed");
    this.status = init.status;
    this.errorCode = init.errorCode ?? undefined;
    this.errors = init.errors ?? [];
    this.value = init.value;
  }
}

function toFieldErrors(raw: unknown): FieldError[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { field, message } = entry as { field?: unknown; message?: unknown };
    return typeof message === "string"
      ? [{ field: typeof field === "string" ? field : "", message }]
      : [];
  });
}

function fromBody(body: unknown, status?: number): HandoverApiError | null {
  const parsed = apiEnvelopeSchema.safeParse(body);
  if (!parsed.success || parsed.data.isSuccess) return null;
  const value =
    parsed.data.value && typeof parsed.data.value === "object"
      ? (parsed.data.value as Record<string, unknown>)
      : undefined;
  return new HandoverApiError({
    status: status ?? parsed.data.code,
    errorCode: parsed.data.errorCode,
    message: parsed.data.message,
    errors: toFieldErrors(parsed.data.errors),
    value,
  });
}

/** Normalises axios failures (error body) and `isSuccess: false` envelopes into `HandoverApiError`. */
export function toHandoverError(error: unknown): HandoverApiError {
  if (error instanceof HandoverApiError) return error;
  if (isAxiosError(error)) {
    const fromResponse = error.response
      ? fromBody(error.response.data, error.response.status)
      : null;
    if (fromResponse) return fromResponse;
    if (error.code === "ERR_CANCELED")
      return new HandoverApiError({
        errorCode: "CANCELED",
        message: "Request canceled",
      });
    if (!error.response)
      return new HandoverApiError({
        errorCode: "NETWORK_ERROR",
        message:
          "Cannot reach the server. Check your connection and try again.",
      });
    return new HandoverApiError({
      status: error.response.status,
      message: `Request failed (${error.response.status})`,
    });
  }
  return new HandoverApiError({
    message: error instanceof Error ? error.message : "Unexpected error",
  });
}

function unwrap(response: unknown): unknown {
  const failed = fromBody(response);
  if (failed) throw failed;
  const parsed = apiEnvelopeSchema.safeParse(response);
  return parsed.success ? parsed.data.value : response;
}

async function call<T>(
  request: () => Promise<unknown>,
  parse: (value: unknown) => T,
): Promise<T> {
  try {
    return parse(unwrap(await request()));
  } catch (error) {
    throw toHandoverError(error);
  }
}

const path = (transportId: string) =>
  `/transports/${encodeURIComponent(transportId)}`;
const recordPath = (handoverRecordId: string) =>
  `/handover-records/${encodeURIComponent(handoverRecordId)}`;

const clean = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

/** Never replay a user-confirmed write after token refresh or a stale location observation. */
function oneShotConfig(signal?: AbortSignal, assertCurrent?: () => void) {
  let dispatched = false;
  const defaults = apiClient.defaults.transformRequest;
  return {
    signal,
    transformRequest: [
      (data: unknown) => {
        assertCurrent?.();
        signal?.throwIfAborted();
        if (dispatched || !navigator.onLine)
          throw new HandoverApiError({
            errorCode: "NETWORK_ERROR",
            message:
              "The request was not replayed. Reload the record and submit again.",
          });
        dispatched = true;
        return data;
      },
      ...(Array.isArray(defaults) ? defaults : defaults ? [defaults] : []),
    ],
  };
}

function freshPosition(
  signal?: AbortSignal,
): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    if (!navigator.geolocation)
      return reject(
        new HandoverApiError({
          message: "This device cannot share its location.",
        }),
      );
    const aborted = () =>
      reject(
        new HandoverApiError({
          errorCode: "CANCELED",
          message: "Request canceled",
        }),
      );
    signal?.addEventListener("abort", aborted, { once: true });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        signal?.removeEventListener("abort", aborted);
        if (signal?.aborted) return aborted();
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180 ||
          !Number.isFinite(position.timestamp) ||
          position.timestamp > Date.now() ||
          Date.now() - position.timestamp > 15_000
        )
          return reject(
            new HandoverApiError({
              message: "Your device returned invalid coordinates. Try again.",
            }),
          );
        resolve({ latitude, longitude });
      },
      (error) => {
        signal?.removeEventListener("abort", aborted);
        reject(
          new HandoverApiError({
            message:
              error.code === 1
                ? "Allow location access to complete the handover."
                : "Could not read a fresh position. Try again.",
          }),
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12_000 },
    );
  });
}

export const handoverService = {
  /** HO1. */
  listByTransport(
    transportId: string,
    filters: ListFilters,
    signal?: AbortSignal,
  ): Promise<HandoverList> {
    return call(
      () =>
        apiClient.get<unknown, unknown>(
          `${path(transportId)}/handover-records`,
          {
            params: {
              handoverType: filters.handoverType,
              status: filters.status,
              pageIndex: 1,
              pageSize: LIST_PAGE_SIZE,
              sortBy: "sequenceNo:asc",
            },
            signal,
          },
        ),
      (value) => handoverListSchema.parse(value),
    );
  },

  /** HO2. */
  getRecord(
    handoverRecordId: string,
    signal?: AbortSignal,
  ): Promise<HandoverRecord> {
    return call(
      () =>
        apiClient.get<unknown, unknown>(recordPath(handoverRecordId), {
          signal,
        }),
      (value) => handoverRecordSchema.parse(value),
    );
  },

  /** HO3. `HANDOVER_ALREADY_EXISTS` carries the id of the open record in `error.value.handoverRecordId`. */
  create(
    transportId: string,
    input: CreateHandoverInput,
    signal?: AbortSignal,
    assertCurrent?: () => void,
  ): Promise<HandoverRecord> {
    return call(
      () =>
        apiClient.post<unknown, unknown>(
          `${path(transportId)}/handover-records`,
          input,
          oneShotConfig(signal, assertCurrent),
        ),
      (value) => handoverRecordSchema.parse(value),
    );
  },

  /** HO4: PLANNED -> IN_PROGRESS. */
  start(
    handoverRecordId: string,
    signal?: AbortSignal,
    assertCurrent?: () => void,
  ): Promise<HandoverRecord> {
    return call(
      () =>
        apiClient.post<unknown, unknown>(
          `${recordPath(handoverRecordId)}/start`,
          undefined,
          oneShotConfig(signal, assertCurrent),
        ),
      (value) => handoverRecordSchema.parse(value),
    );
  },

  /** HO5 is JSON; acquire fresh coordinates after uploading both signatures. */
  async complete(
    handoverRecordId: string,
    input: CompleteInput,
    signal?: AbortSignal,
    assertCurrent?: () => void,
  ): Promise<HandoverRecord> {
    const current = await handoverService.getRecord(handoverRecordId, signal);
    assertCurrent?.();
    if (
      current.status !== "IN_PROGRESS" ||
      !current.availableActions.includes("COMPLETE")
    )
      throw new HandoverApiError({
        errorCode: "INVALID_HANDOVER_STATUS",
        message: "Start this handover before completing it.",
      });
    if (current.updatedAt !== input.lastUpdatedAt)
      throw new HandoverApiError({
        errorCode: "HANDOVER_MODIFIED",
        message:
          "The handover record was just modified. Please reload the page.",
      });
    for (const blob of [input.senderSignature, input.receiverSignature]) {
      if (
        blob.type !== "image/png" ||
        blob.size < 45 ||
        blob.size > SIGNATURE_MAX_BYTES
      )
        throw new HandoverApiError({
          errorCode: "INVALID_IMAGE",
          message: "Both signatures must be PNG images up to 200 KB.",
        });
    }
    const senderPublicId = await presignedUpload.upload({
      file: new File([input.senderSignature], "sender-signature.png", {
        type: "image/png",
      }),
      entity: "attachment",
      signal,
    });
    assertCurrent?.();
    const receiverPublicId = await presignedUpload.upload({
      file: new File([input.receiverSignature], "receiver-signature.png", {
        type: "image/png",
      }),
      entity: "attachment",
      signal,
    });
    assertCurrent?.();
    let target = current.geofence ?? null;
    if (!target && current.handoverType !== "OTHER") {
      const overview = await handoverService.getSegments(
        current.transport.transportId,
        signal,
      );
      assertCurrent?.();
      const next = overview.segments.find(
        (leg) => leg.routePlanRouteId === current.toSegment?.routePlanRouteId,
      )?.fromLocation;
      const previous = overview.segments.find(
        (leg) => leg.routePlanRouteId === current.fromSegment?.routePlanRouteId,
      )?.toLocation;
      const location =
        previous?.latitude != null && previous.longitude != null
          ? previous
          : next;
      if (location?.latitude != null && location.longitude != null)
        target = {
          latitude: location.latitude,
          longitude: location.longitude,
          radiusMeters: HANDOVER_GEOFENCE_METERS,
        };
    }
    if (!target && current.handoverType !== "OTHER")
      throw new HandoverApiError({
        errorCode: "HANDOVER_LOCATION_UNAVAILABLE",
        message:
          "The handover coordinates could not be verified. Reload the transport and try again.",
      });
    const position = await freshPosition(signal);
    assertCurrent?.();
    if (target && distanceMeters(position, target) > target.radiusMeters)
      throw new HandoverApiError({
        errorCode: "NOT_IN_HANDOVER_RADIUS",
        message: `You must be within ${target.radiusMeters} m of the handover point to complete it.`,
      });
    signal?.throwIfAborted();
    if (!navigator.onLine)
      throw new HandoverApiError({
        errorCode: "NETWORK_ERROR",
        message: "Connect to the network and submit again.",
      });
    const body: Record<string, unknown> = {
      lastUpdatedAt: input.lastUpdatedAt,
      horseConditionNote: input.horseConditionNote.trim(),
      documentHandoverNote: input.documentHandoverNote.trim(),
      equipmentHandoverNote: input.equipmentHandoverNote.trim(),
      senderSignature: { publicId: senderPublicId },
      receiverSignature: { publicId: receiverPublicId },
      latitude: position.latitude,
      longitude: position.longitude,
    };
    const discrepancy = clean(input.discrepancyNote);
    if (discrepancy) body.discrepancyNote = discrepancy;
    const optional: Array<[string, string]> = [
      ["fromPartyName", input.from.partyName],
      ["fromContactName", input.from.contactName],
      ["fromContactPhone", input.from.contactPhone],
      ["toPartyName", input.to.partyName],
      ["toContactName", input.to.contactName],
      ["toContactPhone", input.to.contactPhone],
      ["locationName", input.location.locationName],
      ["address", input.location.address],
      ["country", input.location.country],
    ];
    for (const [key, raw] of optional) {
      const value = clean(raw);
      if (value) body[key] = value;
    }
    return call(
      () =>
        apiClient.post<unknown, unknown>(
          `${recordPath(handoverRecordId)}/complete`,
          body,
          { ...oneShotConfig(signal, assertCurrent), timeout: 60_000 },
        ),
      (value) => handoverRecordSchema.parse(value),
    );
  },

  /** HO6. */
  cancel(
    handoverRecordId: string,
    input: CancelInput,
    signal?: AbortSignal,
    assertCurrent?: () => void,
  ): Promise<HandoverRecord> {
    return call(
      () =>
        apiClient.post<unknown, unknown>(
          `${recordPath(handoverRecordId)}/cancel`,
          {
            lastUpdatedAt: input.lastUpdatedAt,
            cancellationReason: input.cancellationReason.trim(),
          },
          oneShotConfig(signal, assertCurrent),
        ),
      (value) => handoverRecordSchema.parse(value),
    );
  },

  /** OT4, read only: the handover boundaries (what can be created) and the coordinates of the handover point. */
  getSegments(
    transportId: string,
    signal?: AbortSignal,
  ): Promise<SegmentsOverview> {
    return call(
      () =>
        apiClient.get<unknown, unknown>(`${path(transportId)}/segments`, {
          signal,
        }),
      (value) => segmentsOverviewSchema.parse(value),
    );
  },
};
