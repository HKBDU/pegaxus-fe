import { isAxiosError } from "axios";
import { z } from "zod";
import apiClient from "@/lib/axios";
import { useAuthStore } from "@/features/auth/store";
import { canAccess } from "@/features/auth/access-control";
import {
  ongoingTransportEnvelopeSchema,
  ongoingTransportPageSchema,
  ongoingTransportQuerySchema,
  transportOverviewSchema,
  transportSegmentsSchema,
  trackingSnapshotSchema,
} from "./schemas";
import { isOngoingTransportMockMode } from "./source";
import type {
  MockScenario,
  OngoingTransportParams,
  OverviewScenario,
  TransportAudience,
  SegmentsScenario,
  TransportOverview,
} from "./types";

export class OngoingTransportApiError extends Error {
  readonly status: number;
  readonly errorCode?: string | null;

  constructor(
    status: number,
    errorCode: string | null | undefined,
    message: string,
  ) {
    super(message);
    this.name = "OngoingTransportApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

export const buildOngoingTransportQuery = (params: OngoingTransportParams) =>
  ongoingTransportQuerySchema.parse(params);

export const ongoingTransportService = {
  async tracking(transportId: string, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const response = await apiClient.get<unknown, unknown>(
      `/transports/${encodeURIComponent(transportId)}/tracking`,
      { signal },
    );
    signal?.throwIfAborted();
    const envelope = ongoingTransportEnvelopeSchema.parse(response);
    if (!envelope.isSuccess)
      throw new OngoingTransportApiError(envelope.code, envelope.errorCode, envelope.message);
    return trackingSnapshotSchema.parse(envelope.value);
  },
  async segments(
    transportId: string,
    _audience: TransportAudience,
    _scenario: SegmentsScenario = "data",
    signal?: AbortSignal,
  ) {
    signal?.throwIfAborted();
    const response = await apiClient.get<unknown, unknown>(
      `/transports/${encodeURIComponent(transportId)}/segments`,
      { signal },
    );
    signal?.throwIfAborted();
    const envelope = ongoingTransportEnvelopeSchema.parse(response);
    if (!envelope.isSuccess)
      throw new OngoingTransportApiError(
        envelope.code,
        envelope.errorCode,
        envelope.message,
      );
    return transportSegmentsSchema.parse(envelope.value);
  },
  async overview(
    transportId: string,
    audience: TransportAudience,
    _scenario: OverviewScenario = "data",
    signal?: AbortSignal,
  ) {
    signal?.throwIfAborted();
    const response = await apiClient.get<unknown, unknown>(
      `/transports/${encodeURIComponent(transportId)}/overview`,
      { signal },
    );
    signal?.throwIfAborted();
    const envelope = ongoingTransportEnvelopeSchema.parse(response);
    if (!envelope.isSuccess)
      throw new OngoingTransportApiError(
        envelope.code,
        envelope.errorCode,
        envelope.message,
      );
    const hideIncidents =
      audience === "customer" ||
      canAccess(useAuthStore.getState().principal, { anyRole: ["CUSTOMER"] });
    return (
      hideIncidents
        ? transportOverviewSchema.extend({
            activeIncidents: z
              .unknown()
              .transform((): TransportOverview["activeIncidents"] => []),
          })
        : transportOverviewSchema
    ).parse(envelope.value);
  },
  async list(
    params: OngoingTransportParams,
    signal?: AbortSignal,
    scenario: MockScenario = "data",
  ) {
    const query = buildOngoingTransportQuery(params);
    signal?.throwIfAborted();
    const response =
      !import.meta.env.PROD && isOngoingTransportMockMode()
        ? await (
            await import("./mock/service")
          ).getMockOngoingTransports(query, scenario, signal)
        : await apiClient.get<unknown, unknown>("/transports/ongoing", {
            params: query,
            signal,
          });
    signal?.throwIfAborted();
    const envelope = ongoingTransportEnvelopeSchema.parse(response);
    if (!envelope.isSuccess)
      throw new OngoingTransportApiError(
        envelope.code,
        envelope.errorCode,
        envelope.message,
      );
    return ongoingTransportPageSchema.parse(envelope.value);
  },
};

export function getOngoingTransportError(
  error: unknown,
  context: "list" | "overview" | "segments" = "list",
) {
  const subject =
    context === "segments"
      ? "route tracking"
      : context === "overview"
        ? "transport overview"
        : "ongoing transports";
  if (error instanceof z.ZodError)
    return {
      message:
        "The server returned an unexpected transport response. Please contact your administrator.",
      retryable: false,
    };
  const payload = isAxiosError(error)
    ? ongoingTransportEnvelopeSchema.safeParse(error.response?.data)
    : null;
  const code =
    error instanceof OngoingTransportApiError
      ? error.errorCode
      : payload?.success
        ? payload.data.errorCode
        : undefined;
  const status =
    error instanceof OngoingTransportApiError
      ? error.status
      : isAxiosError(error)
        ? error.response?.status
        : undefined;
  if (code === "TRANSPORT_NOT_FOUND")
    return {
      message: "Transport not found or unavailable to your account.",
      retryable: false,
    };
  if (code === "INVALID_TRANSPORT_STATUS")
    return {
      message:
        "This journey is not available for tracking yet, or has been cancelled.",
      retryable: false,
    };
  if (code === "FORBIDDEN" || status === 403)
    return {
      message:
        context !== "list"
          ? "You do not have permission to view this transport. Crew must be assigned to the transport."
          : "You do not have permission to view ongoing transports.",
      retryable: false,
    };
  if (code === "UNAUTHORIZED" || status === 401)
    return {
      message: "Your session has expired. Please sign in again.",
      retryable: false,
    };
  if (status === 404)
    return {
      message:
        "The API resource was not found. Check the backend URL and deployed API version.",
      retryable: false,
    };
  if (code === "VALIDATION_ERROR" || status === 400)
    return {
      message: payload?.success
        ? payload.data.message
        : error instanceof OngoingTransportApiError
          ? error.message
          : "The selected filters are invalid.",
      retryable: false,
    };
  if (isAxiosError(error) && !error.response)
    return {
      message:
        "Unable to reach the server. Check your connection and try again.",
      retryable: true,
    };
  if (status === 503)
    return {
      message:
        "The transport service is temporarily unavailable. Please try again.",
      retryable: true,
    };
  return {
    message: `Unable to load ${subject}. Please try again.`,
    retryable: true,
  };
}
