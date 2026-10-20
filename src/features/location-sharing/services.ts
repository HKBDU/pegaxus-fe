import { isAxiosError, type AxiosRequestTransformer } from "axios";
import { z } from "zod";
import apiClient from "@/lib/axios";
import {
  driverLocationAcceptedSchema,
  driverLocationRequestSchema,
  locationEnvelopeSchema,
  locationPermissionDeniedSchema,
  assignedLocationContextSchema,
  segmentArrivalRequestSchema,
  segmentArrivalResultSchema,
} from "./schemas";
import type { DriverLocationRequest } from "./types";
import { isFreshObservation } from "./position";
import { FEATURES } from "./features";

class ExpiredLocationSampleError extends Error {
  constructor() {
    super("The GPS observation expired before dispatch.");
  }
}

export class LocationSharingApiError extends Error {
  readonly status: number;
  readonly errorCode: string | null | undefined;

  constructor(
    status: number,
    errorCode: string | null | undefined,
    message = "Location sharing request was rejected.",
  ) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

function readValue(response: unknown) {
  const envelope = locationEnvelopeSchema.parse(response);
  if (!envelope.isSuccess || envelope.code < 200 || envelope.code >= 300) {
    throw new LocationSharingApiError(
      envelope.code,
      envelope.errorCode,
      envelope.message,
    );
  }
  return envelope.value;
}

export const locationSharingService = {
  async assigned(signal: AbortSignal) {
    const response = await apiClient.get<unknown, unknown>(
      "/transports/assigned-to-me",
      {
        signal,
        params: { status: "READY,IN_TRANSIT,COMPLETED" },
      },
    );
    signal.throwIfAborted();
    return assignedLocationContextSchema.parse(readValue(response));
  },
  async confirmArrival(
    transportId: string,
    segmentId: string,
    sample: DriverLocationRequest,
    signal: AbortSignal,
  ) {
    if (!FEATURES.segmentArrival)
      throw new Error("HO7 is not enabled on this deployment.");
    signal.throwIfAborted();
    const body = segmentArrivalRequestSchema.parse(sample);
    const guard: AxiosRequestTransformer = (data: unknown) => {
      signal.throwIfAborted();
      if (!isFreshObservation(Date.parse(sample.recordedAt), Date.now()))
        throw new ExpiredLocationSampleError();
      return data;
    };
    const transforms = apiClient.defaults.transformRequest;
    const response = await apiClient.post<unknown, unknown>(
      `/transports/${encodeURIComponent(transportId)}/segments/${encodeURIComponent(segmentId)}/arrival`,
      body,
      {
        signal,
        transformRequest: [
          guard,
          ...(Array.isArray(transforms)
            ? transforms
            : transforms
              ? [transforms]
              : []),
        ],
      },
    );
    signal.throwIfAborted();
    const result = segmentArrivalResultSchema.parse(readValue(response));
    if (result.from.routePlanRouteId !== segmentId)
      throw new Error("Arrival response does not match the requested segment.");
    return result;
  },
  async send(
    transportId: string,
    request: DriverLocationRequest,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted();
    const body = driverLocationRequestSchema.parse(request);
    const recordedAt = Date.parse(body.recordedAt);
    // Axios invokes transforms for initial dispatch AND its authenticated retry.
    // Leave an already dispatched request alone; only prevent sending an expired body.
    const freshnessGuard: AxiosRequestTransformer = (data: unknown) => {
      signal.throwIfAborted();
      if (!isFreshObservation(recordedAt, Date.now()))
        throw new ExpiredLocationSampleError();
      return data;
    };
    const transforms = apiClient.defaults.transformRequest;
    const response = await apiClient.post<unknown, unknown>(
      `/transports/${encodeURIComponent(transportId)}/locations`,
      body,
      {
        signal,
        transformRequest: [
          freshnessGuard,
          ...(Array.isArray(transforms)
            ? transforms
            : transforms
              ? [transforms]
              : []),
        ],
      },
    );
    signal.throwIfAborted();
    return driverLocationAcceptedSchema.parse(readValue(response));
  },
  async permissionDenied(transportId: string, signal: AbortSignal) {
    signal.throwIfAborted();
    const response = await apiClient.post<unknown, unknown>(
      `/transports/${encodeURIComponent(transportId)}/locations/permission-denied`,
      undefined,
      { signal },
    );
    signal.throwIfAborted();
    return locationPermissionDeniedSchema.parse(readValue(response));
  },
};

export function getArrivalError(error: unknown) {
  const payload = isAxiosError(error)
    ? locationEnvelopeSchema.safeParse(error.response?.data)
    : null;
  const code =
    error instanceof LocationSharingApiError
      ? error.errorCode
      : payload?.success
        ? payload.data.errorCode
        : undefined;
  const message = payload?.success
    ? payload.data.message
    : error instanceof Error
      ? error.message
      : "Arrival could not be confirmed.";
  return { code, message, network: isAxiosError(error) && !error.response };
}

export function getLocationSharingError(error: unknown) {
  if (error instanceof ExpiredLocationSampleError)
    return {
      terminal: false,
      refresh: false,
      message:
        "The GPS observation expired before it could be sent. Waiting for a new observation; the old point is not retried.",
    };
  const payload = isAxiosError(error)
    ? locationEnvelopeSchema.safeParse(error.response?.data)
    : null;
  const status =
    error instanceof LocationSharingApiError
      ? error.status
      : isAxiosError(error)
        ? error.response?.status
        : undefined;
  const code =
    error instanceof LocationSharingApiError
      ? error.errorCode
      : payload?.success
        ? payload.data.errorCode
        : undefined;
  if (status === 401 || code === "UNAUTHORIZED")
    return {
      terminal: true,
      refresh: false,
      message: "Your session is unavailable. Sign in again before sharing.",
    };
  if (status === 403 || code === "FORBIDDEN")
    return {
      terminal: true,
      refresh: true,
      message:
        "Location sharing is not permitted. Check your Driver assignment.",
    };
  if (status === 404 || code === "TRANSPORT_NOT_FOUND")
    return {
      terminal: true,
      refresh: true,
      message: "This transport is no longer available.",
    };
  if (status === 409 || code === "INVALID_TRANSPORT_STATUS")
    return {
      terminal: true,
      refresh: true,
      message:
        "This transport is no longer eligible for sharing. Reload the journey.",
    };
  if (error instanceof z.ZodError)
    return {
      terminal: true,
      refresh: false,
      message:
        "Unexpected location request or response. Sharing has stopped; contact support.",
    };
  if (status === 400 || code === "VALIDATION_ERROR")
    return {
      terminal: false,
      refresh: false,
      message:
        "The server rejected this location sample. Waiting for a new GPS observation.",
    };
  return {
    terminal: false,
    refresh: false,
    message:
      "Location update could not be confirmed. Waiting for a new observation; no points are queued.",
  };
}
