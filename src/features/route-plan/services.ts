import apiClient from "@/lib/axios";
import { ROUTE_PLAN_ENDPOINTS, ROUTE_PLAN_ERROR_MESSAGES } from "./constants";
import type {
  ApiEnvelope,
  CancelRoutePlanRequest,
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
export const updateRoutePlan = (
  routePlanId: string,
  payload: UpdateRoutePlanRequest,
) =>
  request<RoutePlanMutationResult>(
    apiClient.put(`${ROUTE_PLAN_ENDPOINTS.routePlans}/${routePlanId}`, payload),
  );
export const cancelRoutePlan = (
  routePlanId: string,
  payload: CancelRoutePlanRequest,
) =>
  request<RoutePlanMutationResult>(
    apiClient.post(
      `${ROUTE_PLAN_ENDPOINTS.routePlans}/${routePlanId}/cancel`,
      payload,
    ),
  );
export const submitLegalReview = (
  routePlanId: string,
  payload: LegalReviewRequest,
) =>
  request<LegalReviewResult>(
    apiClient.post(
      `${ROUTE_PLAN_ENDPOINTS.routePlans}/${routePlanId}/legal-review`,
      payload,
    ),
  );
export const updateSegmentOutsourcing = (
  routePlanId: string,
  routePlanRouteId: string,
  payload: OutsourceSegmentRequest,
) =>
  request<OutsourceSegmentResult>(
    apiClient.put(
      `${ROUTE_PLAN_ENDPOINTS.routePlans}/${routePlanId}/segments/${routePlanRouteId}/outsourcing`,
      payload,
    ),
  );
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
    return { code: error.errorCode, message: error.message };
  return {
    code: "UNKNOWN_ERROR",
    message: "Unable to complete the route plan request.",
  };
}
