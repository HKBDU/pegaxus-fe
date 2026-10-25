import { isAxiosError } from "axios";
import { z } from "zod";
import apiClient from "@/lib/axios";
import type { EntityId, PaginatedResponse } from "@/shared/types";
import {
  approvedBookingDetailSchema,
  approvedBookingsPageSchema,
  approvedBookingsQuerySchema,
  actionEntityIdSchema,
  createTransportPlanSchema,
  updateTransportPlanSchema,
  transportPlanDetailSchema,
  transportPlansPageSchema,
  transportPlansQuerySchema,
  apiErrorSchema,
  locationBriefSchema,
} from "./schemas";
import type {
  ApprovedBookingListItem,
  ApprovedBookingsQueryParams,
  CreateTransportPlanInput,
  UpdateTransportPlanInput,
  TransportPlanListItem,
  TransportPlansQueryParams,
} from "./types";
import { isFlow3MockMode } from "./source";

class ApprovedBookingApiError extends Error {
  readonly status: number;
  readonly errorCode?: string | null;
  readonly errors: { field: string; message: string }[];
  constructor(
    status: number,
    errorCode?: string | null,
    message?: string,
    errors?: { field: string; message: string }[] | null,
  ) {
    super(message || errorCode || "APPROVED_BOOKING_REQUEST_FAILED");
    this.status = status;
    this.errorCode = errorCode;
    this.errors = errors ?? [];
  }
}

export function readEnvelope(response: unknown) {
  if (typeof response === "object" && response !== null) {
    const res = response as Record<string, unknown>;
    if ("isSuccess" in res) {
      if (res.isSuccess === false) {
        throw new ApprovedBookingApiError(
          typeof res.code === "number" ? res.code : 500,
          typeof res.errorCode === "string" ? res.errorCode : null,
          typeof res.message === "string" ? res.message : undefined,
          Array.isArray(res.errors) ? (res.errors as any) : null,
        );
      }
      if ("value" in res && res.value !== undefined) return res.value;
      if ("data" in res && res.data !== undefined) return res.data;
    }
    if ("value" in res && res.value !== undefined) return res.value;
    if ("data" in res && res.data !== undefined) return res.data;
  }
  return response;
}

export function buildApprovedBookingQuery(params: ApprovedBookingsQueryParams) {
  return approvedBookingsQuerySchema.parse(params);
}

export const approvedBookingService = {
  async getApprovedBookings(
    params: ApprovedBookingsQueryParams,
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<ApprovedBookingListItem>> {
    signal?.throwIfAborted();
    const query = buildApprovedBookingQuery(params);
    const response =
      !import.meta.env.PROD && isFlow3MockMode()
        ? (
            await import("./mock/mock-service")
          ).flow3MockService.getApprovedBookings(query)
        : await apiClient.get<unknown, unknown>("/bookings/approved", {
            params: query,
            signal,
          });
    const page = approvedBookingsPageSchema.parse(readEnvelope(response));
    return {
      data: page.items,
      meta: {
        currentPage: page.pageIndex,
        itemsPerPage: page.pageSize,
        totalItems: page.totalItems,
        totalPages: page.totalPages,
        hasPreviousPage: page.pageIndex > 1,
        hasNextPage: page.pageIndex < page.totalPages,
      },
    };
  },
  async getApprovedBooking(bookingId: EntityId, signal?: AbortSignal) {
    const id = actionEntityIdSchema.parse(bookingId);
    signal?.throwIfAborted();
    const response =
      !import.meta.env.PROD && isFlow3MockMode()
        ? (
            await import("./mock/mock-service")
          ).flow3MockService.getApprovedBooking(id)
        : await apiClient.get<unknown, unknown>(
            `/bookings/approved/${encodeURIComponent(id)}`,
            { signal },
          );
    return approvedBookingDetailSchema.parse(readEnvelope(response));
  },
};

export function getApiErrorInfo(error: unknown) {
  const payload = isAxiosError(error)
    ? apiErrorSchema.safeParse(error.response?.data)
    : null;
  const code =
    error instanceof ApprovedBookingApiError
      ? error.errorCode
      : payload?.success
        ? payload.data.errorCode
        : undefined;
  const status =
    error instanceof ApprovedBookingApiError
      ? error.status
      : isAxiosError(error)
        ? error.response?.status
        : undefined;
  const data = payload?.success ? payload.data : undefined;
  return {
    code,
    status,
    message:
      error instanceof ApprovedBookingApiError ? error.message : data?.message,
    errors:
      error instanceof ApprovedBookingApiError
        ? error.errors
        : (data?.errors ?? []),
  };
}

export function getApprovedBookingError(
  error: unknown,
  context: "list" | "detail" = "detail",
) {
  const { code, status } = getApiErrorInfo(error);
  if (code === "INVALID_SORT_PARAMETER")
    return {
      message: "This sort option is not supported. Select another sort option.",
      retryable: false,
    };
  if (status === 404 && context === "list")
    return {
      message:
        "The approved bookings API is not available. Please contact your administrator.",
      retryable: false,
    };
  if (code === "BOOKING_NOT_FOUND" || status === 404)
    return {
      message: "Approved booking not found or no longer available.",
      retryable: false,
    };
  if (code === "INVALID_BOOKING_STATUS")
    return {
      message: "This booking is no longer approved and cannot be opened here.",
      retryable: false,
    };
  if (code === "FORBIDDEN" || status === 403)
    return {
      message: "You do not have permission to view approved bookings.",
      retryable: false,
    };
  if (code === "UNAUTHORIZED" || status === 401)
    return {
      message: "Your session has expired. Please sign in again.",
      retryable: false,
    };
  if (error instanceof z.ZodError)
    return {
      message: "The server returned an unexpected approved booking response.",
      retryable: false,
    };
  return {
    message: "Unable to load approved bookings. Please try again.",
    retryable: true,
  };
}

export const buildTransportPlanQuery = (params: TransportPlansQueryParams) =>
  transportPlansQuerySchema.parse(params);
const detailPath = (id: EntityId) =>
  `/transport-plans/${encodeURIComponent(actionEntityIdSchema.parse(id))}`;

export function isTransportPlanDuplicateCode(code?: string | null) {
  return (
    code === "TRANSPORT_PLAN_EXISTS" || code === "TRANSPORT_PLAN_ALREADY_EXISTS"
  );
}

export function isTransportPlanConcurrencyCode(code?: string | null) {
  return (
    code === "TRANSPORT_PLAN_CONCURRENCY_CONFLICT" ||
    code === "TRANSPORT_PLAN_MODIFIED"
  );
}

export function isTransportPlanLockedCode(code?: string | null) {
  return code === "PLAN_LOCKED" || code === "INVALID_TRANSPORT_PLAN_STATUS";
}

export const transportPlanService = {
  async getLocations(search: string, pageIndex: number, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const payload =
      !import.meta.env.PROD && isFlow3MockMode()
        ? (await import("./mock/mock-service")).flow3MockService.getLocations(
            search,
            pageIndex,
          )
        : await apiClient.get<unknown, unknown>("/locations", {
            params: { search: search || undefined, pageIndex, pageSize: 20 },
            signal,
          });
    return z
      .object({
        items: z.array(locationBriefSchema),
        totalPages: z.number().int().nonnegative(),
      })
      .parse(readEnvelope(payload));
  },
  async getPlans(
    params: TransportPlansQueryParams,
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<TransportPlanListItem>> {
    signal?.throwIfAborted();
    const query = buildTransportPlanQuery(params);
    const payload =
      !import.meta.env.PROD && isFlow3MockMode()
        ? (await import("./mock/mock-service")).flow3MockService.getPlans(query)
        : await apiClient.get<unknown, unknown>("/transport-plans", {
            params: query,
            signal,
          });
    const page = transportPlansPageSchema.parse(readEnvelope(payload));
    return {
      data: page.items,
      meta: {
        currentPage: page.pageIndex,
        itemsPerPage: page.pageSize,
        totalItems: page.totalItems,
        totalPages: page.totalPages,
        hasPreviousPage: page.pageIndex > 1,
        hasNextPage: page.pageIndex < page.totalPages,
      },
    };
  },
  async getPlan(id: EntityId, signal?: AbortSignal) {
    const path = detailPath(id);
    signal?.throwIfAborted();
    const payload =
      !import.meta.env.PROD && isFlow3MockMode()
        ? (await import("./mock/mock-service")).flow3MockService.getPlan(
            String(id),
          )
        : await apiClient.get<unknown, unknown>(path, { signal });
    return transportPlanDetailSchema.parse(readEnvelope(payload));
  },
  async createPlan(bookingId: string, input: CreateTransportPlanInput) {
    const id = actionEntityIdSchema.parse(bookingId),
      body = createTransportPlanSchema.parse(input);
    const payload =
      !import.meta.env.PROD && isFlow3MockMode()
        ? (await import("./mock/mock-service")).flow3MockService.createPlan(
            id,
            body,
          )
        : await apiClient.post<unknown, unknown>(
            `/bookings/${encodeURIComponent(id)}/transport-plans`,
            body,
          );
    return transportPlanDetailSchema.parse(readEnvelope(payload));
  },
  async updatePlan(id: string, input: UpdateTransportPlanInput) {
    const path = detailPath(id),
      body = updateTransportPlanSchema.parse(input);
    const payload =
      !import.meta.env.PROD && isFlow3MockMode()
        ? (await import("./mock/mock-service")).flow3MockService.updatePlan(
            id,
            body,
          )
        : await apiClient.put<unknown, unknown>(path, body);
    return transportPlanDetailSchema.parse(readEnvelope(payload));
  },
};

export function getTransportPlanError(
  error: unknown,
  context: "list" | "detail" | "quotation" | "personnel" = "detail",
) {
  const { code, status, message } = getApiErrorInfo(error);
  if (code === "LOCATION_NOT_FOUND")
    return {
      message:
        "A selected location no longer exists. Choose an available location and save again.",
      retryable: false,
    };
  if (isTransportPlanLockedCode(code))
    return {
      message:
        message || "This plan is no longer editable in its current status.",
      retryable: false,
    };
  if (isTransportPlanConcurrencyCode(code))
    return {
      message:
        message ||
        "This plan has changed. Reload Latest Data before saving again.",
      retryable: false,
    };
  if (isTransportPlanDuplicateCode(code))
    return {
      message:
        message ||
        "A plan already exists for this booking. Open the existing plan instead.",
      retryable: false,
    };
  if (code === "BOOKING_NOT_FOUND")
    return { message: message || "Booking not found.", retryable: false };
  if (code === "TRANSPORT_NOT_FOUND")
    return {
      message:
        message ||
        "This approved booking has no transport. Contact your administrator.",
      retryable: false,
    };
  if (code === "INVALID_BOOKING_STATUS")
    return {
      message: message || "Booking must be approved before creating a plan.",
      retryable: false,
    };
  if (code === "VALIDATION_ERROR")
    return {
      message: message || "Check the transport plan fields and try again.",
      retryable: false,
    };
  if (code === "UNAUTHORIZED" || status === 401)
    return {
      message: "Your session has expired. Please sign in again.",
      retryable: false,
    };
  if (code === "FORBIDDEN" || status === 403)
    return {
      message: "You do not have permission to view this transport plan.",
      retryable: false,
    };
  if (code === "TRANSPORT_PLAN_NOT_FOUND")
    return {
      message: "Transport plan not found or no longer available.",
      retryable: false,
    };
  if (status === 404)
    return {
      message:
        context === "detail"
          ? "Transport plan not found or its API is unavailable."
          : "This transport plan API is not available. Please contact your administrator.",
      retryable: false,
    };
  if (code === "INVALID_SORT_PARAMETER")
    return {
      message: "This sort option is not supported. Select another sort option.",
      retryable: false,
    };
  if (error instanceof z.ZodError)
    return {
      message: "The server returned an unexpected transport plan response.",
      retryable: false,
    };
  const subject = {
    list: "transport plans",
    detail: "the transport plan",
    quotation: "the quotation",
    personnel: "personnel assignments",
  }[context];
  return {
    message: `Unable to load ${subject}. Please try again.`,
    retryable: true,
  };
}
