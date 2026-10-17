import { isAxiosError } from "axios";
import { z } from "zod";
import apiClient from "@/lib/axios";
import {
  driverLocationAcceptedSchema,
  driverLocationRequestSchema,
  locationEnvelopeSchema,
  locationPermissionDeniedSchema,
} from "./schemas";
import type { DriverLocationRequest } from "./types";

class LocationSharingApiError extends Error {
  readonly status: number;
  readonly errorCode: string | null | undefined;

  constructor(status: number, errorCode: string | null | undefined) {
    super("Location sharing request was rejected.");
    this.status = status;
    this.errorCode = errorCode;
  }
}

function readValue(response: unknown) {
  const envelope = locationEnvelopeSchema.parse(response);
  if (!envelope.isSuccess || envelope.code < 200 || envelope.code >= 300) {
    throw new LocationSharingApiError(envelope.code, envelope.errorCode);
  }
  return envelope.value;
}

export const locationSharingService = {
  async send(
    transportId: string,
    request: DriverLocationRequest,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted();
    const body = driverLocationRequestSchema.parse(request);
    const response = await apiClient.post<unknown, unknown>(
      `/transports/${encodeURIComponent(transportId)}/locations`,
      body,
      { signal },
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

export function getLocationSharingError(error: unknown) {
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
