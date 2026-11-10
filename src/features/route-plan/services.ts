import apiClient from "@/lib/axios";
import { ROUTE_PLAN_ENDPOINTS, ROUTE_PLAN_ERROR_MESSAGES } from "./constants";
import {
  cancelRoutePlanResultSchema,
  legalReviewSchema,
  legalReviewResultSchema,
  outsourceSegmentResultSchema,
  routePlanMutationResultSchema,
} from "./schemas";
import type {
  ApiEnvelope,
  CancelRoutePlanRequest,
  CancelRoutePlanResult,
  ChangeRoutePlanVehiclesRequest,
  ChangeRoutePlanVehiclesResult,
  CreateRoutePlanRequest,
  LegalReviewRequest,
  LegalReviewResult,
  Location,
  LocationListParams,
  PaginatedValue,
  Provider,
  ProviderListParams,
  RouteListParams,
  RouteMaster,
  RoutePlan,
  RoutePlanListParams,
  RoutePlanListValue,
  RoutePlanMutationResult,
  OutsourceSegmentRequest,
  OutsourceSegmentResult,
  UpdateRoutePlanRequest,
  Vehicle,
  VehicleListParams,
} from "./types";

export class RoutePlanApiError extends Error {
  readonly errorCode: string;

  constructor(
    errorCode: string,
    message = ROUTE_PLAN_ERROR_MESSAGES[errorCode] ?? errorCode,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.errorCode = errorCode;
    this.name = "RoutePlanApiError";
  }
}

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  return typeof payload === "object" && payload !== null && "value" in payload
    ? (payload as ApiEnvelope<T>).value
    : (payload as T);
}

async function request<T>(call: Promise<ApiEnvelope<T> | T>): Promise<T> {
  try {
    return unwrap(await call);
  } catch (error) {
    const data = (
      error as {
        response?: { data?: { errorCode?: string; message?: string } };
      }
    ).response?.data;
    if (data?.errorCode)
      throw new RoutePlanApiError(data.errorCode, data.message, error);
    throw error;
  }
}

export const getTransportPlan = (transportPlanId: string) =>
  request(
    apiClient.get(`${ROUTE_PLAN_ENDPOINTS.transportPlans}/${transportPlanId}`),
  );
export const getApprovedBooking = (bookingId: string) =>
  request(apiClient.get(`${ROUTE_PLAN_ENDPOINTS.bookings}/${bookingId}`));
export const getLocations = (params?: LocationListParams) =>
  request(apiClient.get(ROUTE_PLAN_ENDPOINTS.locations, { params })) as Promise<
    PaginatedValue<Location>
  >;
export const getLocation = (locationId: string) =>
  request<Location>(
    apiClient.get(`${ROUTE_PLAN_ENDPOINTS.locations}/${locationId}`),
  );
export const createLocation = (payload: {
  locationName: string;
  locationType: string;
  address?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
  locationNote?: string | null;
}) =>
  request<Location>(
    apiClient.post(ROUTE_PLAN_ENDPOINTS.locations, payload),
  );
export const updateLocation = (
  locationId: string,
  payload: {
    locationName?: string | null;
    locationType?: string | null;
    address?: string | null;
    city?: string | null;
    stateProvince?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    locationNote?: string | null;
    lastUpdatedAt: string;
  },
) =>
  request<{ locationId: string; updatedAt: string }>(
    apiClient.put(`${ROUTE_PLAN_ENDPOINTS.locations}/${locationId}`, payload),
  );
export const getRoutes = (params?: RouteListParams) =>
  request(apiClient.get(ROUTE_PLAN_ENDPOINTS.routes, { params })) as Promise<
    PaginatedValue<RouteMaster>
  >;
export const getVehicles = (params?: VehicleListParams) =>
  request(apiClient.get(ROUTE_PLAN_ENDPOINTS.vehicles, { params })) as Promise<
    PaginatedValue<Vehicle>
  >;
export const getTransportProviders = (params?: ProviderListParams) =>
  request(apiClient.get(ROUTE_PLAN_ENDPOINTS.providers, { params })) as Promise<
    PaginatedValue<Provider>
  >;

export const getRoutePlan = (routePlanId: string) =>
  request<RoutePlan>(
    apiClient.get(`${ROUTE_PLAN_ENDPOINTS.routePlans}/${routePlanId}`),
  );
export const getRoutePlans = (
  transportPlanId: string,
  params?: RoutePlanListParams,
) =>
  request<RoutePlanListValue>(
    apiClient.get(
      `${ROUTE_PLAN_ENDPOINTS.transportPlans}/${transportPlanId}/route-plans`,
      { params },
    ),
  );
export const createRoutePlan = (
  transportPlanId: string,
  payload: CreateRoutePlanRequest,
) =>
  request<RoutePlan>(
    apiClient.post(
      `${ROUTE_PLAN_ENDPOINTS.transportPlans}/${transportPlanId}/route-plans`,
      payload,
    ),
  );
/** RP4 PUT: overwrite the full route plan while it is still DRAFT. */
export const updateRoutePlan = (
  routePlanId: string,
  payload: UpdateRoutePlanRequest,
) =>
  request<unknown>(
    apiClient.put(`${ROUTE_PLAN_ENDPOINTS.routePlans}/${routePlanId}`, payload),
  ).then((value) => routePlanMutationResultSchema.parse(value) as RoutePlanMutationResult);

/** K-01: replace vehicles on existing segments of a CONFIRMED/ACTIVE plan. */
export const changeRoutePlanVehicles = (
  routePlanId: string,
  payload: ChangeRoutePlanVehiclesRequest,
  signal?: AbortSignal,
) =>
  request<ChangeRoutePlanVehiclesResult>(
    apiClient.patch(
      `${ROUTE_PLAN_ENDPOINTS.routePlans}/${routePlanId}/vehicles`,
      payload,
      { signal },
    ),
  );
export const cancelRoutePlan = (
  routePlanId: string,
  payload: CancelRoutePlanRequest,
) =>
  request<unknown>(
    apiClient.post(
      `${ROUTE_PLAN_ENDPOINTS.routePlans}/${routePlanId}/cancel`,
      payload,
    ),
  ).then((value) => cancelRoutePlanResultSchema.parse(value) as CancelRoutePlanResult);
export const submitLegalReview = (
  routePlanId: string,
  payload: LegalReviewRequest,
) =>
  request<unknown>(
    apiClient.post(
      `${ROUTE_PLAN_ENDPOINTS.routePlans}/${routePlanId}/legal-review`,
      legalReviewSchema.parse(payload),
    ),
  ).then((value) => legalReviewResultSchema.parse(value) as unknown as LegalReviewResult);
export const updateSegmentOutsourcing = (
  routePlanId: string,
  routePlanRouteId: string,
  payload: OutsourceSegmentRequest,
) =>
  request<unknown>(
    apiClient.put(
      `${ROUTE_PLAN_ENDPOINTS.routePlans}/${routePlanId}/segments/${routePlanRouteId}/outsourcing`,
      payload,
    ),
  ).then((value) => outsourceSegmentResultSchema.parse(value) as OutsourceSegmentResult);
export const exportRoutePlanPdf = (routePlanId: string) =>
  apiClient.get(`${ROUTE_PLAN_ENDPOINTS.routePlans}/${routePlanId}/export`, {
    params: { format: "pdf" },
    responseType: "blob",
  });

export function getRoutePlanError(error: unknown): {
  code: string;
  message: string;
} {
  if (error instanceof RoutePlanApiError)
    return {
      code: error.errorCode,
      message:
        // The same code comes from different actions, so show the BE message (it names the status) rather than one fixed sentence.
        error.errorCode === "INVALID_ROUTE_PLAN_STATUS"
          ? error.message
          : (ROUTE_PLAN_ERROR_MESSAGES[error.errorCode] ?? error.message),
    };
  return {
    code: "UNKNOWN_ERROR",
    message:
      (
        error as {
          response?: {
            data?: { message?: string; error?: { message?: string } };
          };
        }
      ).response?.data?.message ??
      (
        error as {
          response?: { data?: { error?: { message?: string } } };
        }
      ).response?.data?.error?.message ??
      "Unable to complete the route plan request.",
  };
}

export function getLegalReviewError(error: unknown): {
  code: string;
  message: string;
} {
  const mapped = getRoutePlanError(error);
  if (mapped.code === "ROUTE_PLAN_NOT_SUBMITTED")
    return {
      ...mapped,
      message: "This route plan has not been requested for legal review.",
    };
  if (mapped.code === "INVALID_ROUTE_PLAN_STATUS")
    return { ...mapped, message: mapped.message || "Legal review requires a DRAFT route requested for review." };
  return mapped;
}
