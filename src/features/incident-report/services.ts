import type { AxiosError, AxiosRequestConfig } from "axios";
import apiClient from "@/lib/axios";
import type {
  AddHorseDetailsRequest,
  EmergencyContactsResponse,
  IncidentMutationResponse,
  IncidentLocation,
  RaiseSeverityRequest,
  SupplementVehicleRequest,
  VehicleIncidentRequest,
  VeterinaryOutcomeRequest,
  HorseHealthIncidentRequest,
} from "@/shared/types/incident";

export interface IncidentApiErrorItem {
  field?: string;
  message: string;
}
export interface IncidentApiError extends Error {
  errorCode?: string;
  errors: IncidentApiErrorItem[];
  status?: number;
  value?: unknown;
}
export interface IncidentApiEnvelope<T> {
  isSuccess?: boolean;
  code?: number;
  message?: string | null;
  value?: T;
  errorCode?: string | null;
  errors?: IncidentApiErrorItem[] | null;
}
export type IncidentMutationResult = IncidentMutationResponse;

function errorFromResponse(error: unknown): IncidentApiError {
  const axiosError = error as AxiosError<IncidentApiEnvelope<unknown>>;
  const payload = axiosError.response?.data;
  const result = new Error(
    payload?.message ??
      (error instanceof Error ? error.message : "Incident request failed"),
  ) as IncidentApiError;
  result.name = "IncidentApiError";
  result.errorCode = payload?.errorCode ?? undefined;
  result.errors = payload?.errors ?? [];
  result.status = axiosError.response?.status;
  result.value = payload?.value;
  return result;
}

async function request<T>(operation: Promise<T>): Promise<T> {
  try {
    const response = await operation;
    return response;
  } catch (error) {
    throw errorFromResponse(error);
  }
}

function unwrap<T>(payload: IncidentApiEnvelope<T> | T): T {
  if (payload && typeof payload === "object" && "value" in payload) {
    const envelope = payload as IncidentApiEnvelope<T>;
    if (envelope.isSuccess === false) {
      const error = new Error(
        envelope.message ?? "Incident request failed",
      ) as IncidentApiError;
      error.name = "IncidentApiError";
      error.errorCode = envelope.errorCode ?? undefined;
      error.errors = envelope.errors ?? [];
      error.value = envelope.value;
      throw error;
    }
    return envelope.value as T;
  }
  return payload as T;
}

export function createVehicleIncident(
  input: VehicleIncidentRequest,
  config?: AxiosRequestConfig,
) {
  return request(
    apiClient
      .post<
        unknown,
        IncidentApiEnvelope<IncidentMutationResult> | IncidentMutationResult
      >("/incidents/vehicle", input, config)
      .then(unwrap),
  );
}

export function createHorseHealthIncident(
  input: HorseHealthIncidentRequest,
  config?: AxiosRequestConfig,
) {
  return request(
    apiClient
      .post<
        unknown,
        IncidentApiEnvelope<IncidentMutationResult> | IncidentMutationResult
      >("/incidents/horse-health", input, config)
      .then(unwrap),
  );
}

export function addHorseDetails(
  incidentReportId: string,
  input: AddHorseDetailsRequest,
  config?: AxiosRequestConfig,
) {
  return request(
    apiClient
      .post<
        unknown,
        IncidentApiEnvelope<IncidentMutationResult> | IncidentMutationResult
      >(
        `/incidents/${encodeURIComponent(incidentReportId)}/horse-details`,
        input,
        config,
      )
      .then(unwrap),
  );
}

export function supplementVehicle(
  incidentReportId: string,
  input: SupplementVehicleRequest,
  config?: AxiosRequestConfig,
) {
  return request(
    apiClient
      .patch<
        unknown,
        IncidentApiEnvelope<IncidentMutationResult> | IncidentMutationResult
      >(
        `/incidents/${encodeURIComponent(incidentReportId)}/vehicle-detail`,
        input,
        config,
      )
      .then(unwrap),
  );
}

export function updateVeterinaryOutcome(
  incidentReportId: string,
  horseHealthIncidentDetailId: string,
  input: VeterinaryOutcomeRequest,
  config?: AxiosRequestConfig,
) {
  return request(
    apiClient
      .patch<
        unknown,
        IncidentApiEnvelope<IncidentMutationResult> | IncidentMutationResult
      >(
        `/incidents/${encodeURIComponent(incidentReportId)}/horse-details/${encodeURIComponent(horseHealthIncidentDetailId)}`,
        input,
        config,
      )
      .then(unwrap),
  );
}

export function getEmergencyContacts(
  transportId: string,
  config?: AxiosRequestConfig,
) {
  return request(
    apiClient
      .get<
        unknown,
        | IncidentApiEnvelope<EmergencyContactsResponse>
        | EmergencyContactsResponse
      >(
        `/transports/${encodeURIComponent(transportId)}/emergency-contacts`,
        config,
      )
      .then(unwrap),
  );
}

export function raiseIncidentSeverity(
  incidentReportId: string,
  input: RaiseSeverityRequest,
  config?: AxiosRequestConfig,
) {
  return request(
    apiClient
      .post<
        unknown,
        IncidentApiEnvelope<IncidentMutationResult> | IncidentMutationResult
      >(
        `/incidents/${encodeURIComponent(incidentReportId)}/raise-severity`,
        input,
        config,
      )
      .then(unwrap),
  );
}

export interface IncidentLocationCreateInput {
  locationName: string;
  locationType: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
  locationNote?: string | null;
}

export async function findIncidentLocation(
  latitude: number,
  longitude: number,
  config?: AxiosRequestConfig,
) {
  const payload = await request(
    apiClient.get<
      unknown,
      | IncidentApiEnvelope<{ items: IncidentLocation[] }>
      | { items: IncidentLocation[] }
    >("/locations", {
      ...config,
      params: { latitude, longitude, pageIndex: 1, pageSize: 20 },
    }),
  );
  const items =
    "value" in (payload as object)
      ? ((payload as IncidentApiEnvelope<{ items: IncidentLocation[] }>).value
          ?.items ?? [])
      : ((payload as { items?: IncidentLocation[] }).items ?? []);
  return (
    items.find(
      (item) => item.latitude === latitude && item.longitude === longitude,
    ) ?? null
  );
}

export function getIncidentLocation(
  locationId: string,
  config?: AxiosRequestConfig,
) {
  return request(
    apiClient
      .get<unknown, IncidentApiEnvelope<IncidentLocation> | IncidentLocation>(
        `/locations/${encodeURIComponent(locationId)}`,
        config,
      )
      .then(unwrap),
  );
}

export function createIncidentLocation(
  input: IncidentLocationCreateInput,
  config?: AxiosRequestConfig,
) {
  return request(
    apiClient
      .post<unknown, IncidentApiEnvelope<IncidentLocation> | IncidentLocation>(
        "/locations",
        input,
        config,
      )
      .then(unwrap),
  );
}
