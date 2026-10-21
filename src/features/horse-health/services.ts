import apiClient from "@/lib/axios";

import { locationSharingService } from "@/features/location-sharing/services";
import {
  getMockHealthLog,
  getMockHealthLogHistory,
  getMockHealthOverview,
  mockAddHealthLogPhotos,
  mockCreateHealthLog,
  mockMarkAllNormal,
} from "./mock";
import {
  healthLogHistorySchema,
  healthLogSchema,
  horseHealthOverviewSchema,
} from "./schemas";
import type {
  AssignedTransportsResponse,
  HealthLog,
  HealthLogHistory,
  HealthLogInput,
  HealthLogPhotoInput,
  HorseHealthOverview,
  LogType,
  MarkAllNormalInput,
} from "./types";

export const isHorseHealthMockMode = () =>
  import.meta.env.DEV && import.meta.env.VITE_HORSE_HEALTH_MOCK !== "false";

interface ApiEnvelope<T> {
  value: T;
}

export async function getAssignedTransports(
  signal?: AbortSignal,
): Promise<AssignedTransportsResponse> {
  return locationSharingService.assigned(signal);
}

export const horseHealthKeys = {
  all: ["horse-health"] as const,
  overview: (transportId: string) =>
    [...horseHealthKeys.all, "overview", transportId] as const,
  history: (
    transportId: string,
    horseId: string,
    filters: HealthHistoryFilters,
  ) =>
    [...horseHealthKeys.all, "history", transportId, horseId, filters] as const,
  detail: (logId: string) => [...horseHealthKeys.all, "detail", logId] as const,
};

export interface HealthHistoryFilters {
  logType?: LogType;
  healthStatus?: string;
  pageIndex?: number;
  pageSize?: number;
}

export async function getHorseHealthOverview(
  transportId: string,
  signal?: AbortSignal,
): Promise<HorseHealthOverview> {
  if (isHorseHealthMockMode())
    return horseHealthOverviewSchema.parse(getMockHealthOverview(transportId));
  const response = await apiClient.get<
    unknown,
    ApiEnvelope<HorseHealthOverview>
  >(`/transports/${encodeURIComponent(transportId)}/horse-health`, { signal });
  return horseHealthOverviewSchema.parse(response.value);
}

export async function getHealthLogHistory(
  transportId: string,
  horseId: string,
  filters: HealthHistoryFilters = {},
  signal?: AbortSignal,
): Promise<HealthLogHistory> {
  const pageIndex = filters.pageIndex ?? 0;
  const pageSize = filters.pageSize ?? 20;
  const mockQuery = {
    pageIndex,
    pageSize,
    logType: filters.logType,
    healthStatus: filters.healthStatus,
  };
  if (isHorseHealthMockMode())
    return healthLogHistorySchema.parse(
      getMockHealthLogHistory(transportId, horseId, mockQuery),
    );
  const query = {
    PageIndex: pageIndex,
    PageSize: pageSize,
    LogType: filters.logType,
    HealthStatus: filters.healthStatus,
  };
  const response = await apiClient.get<unknown, ApiEnvelope<HealthLogHistory>>(
    `/transports/${encodeURIComponent(transportId)}/horses/${encodeURIComponent(horseId)}/health-logs`,
    { params: query, signal },
  );
  return healthLogHistorySchema.parse(response.value);
}

export async function getHealthLogDetail(
  logId: string,
  signal?: AbortSignal,
): Promise<HealthLog> {
  if (isHorseHealthMockMode())
    return healthLogSchema.parse(getMockHealthLog(logId));
  const response = await apiClient.get<unknown, ApiEnvelope<HealthLog>>(
    `/horse-health-logs/${encodeURIComponent(logId)}`,
    { signal },
  );
  return healthLogSchema.parse(response.value);
}

function appendOptional(form: FormData, key: string, value: unknown) {
  if (value !== undefined && value !== null && value !== "")
    form.append(key, String(value));
}

function healthLogForm(input: HealthLogInput) {
  const form = new FormData();
  appendOptional(form, "HorseId", input.horseId);
  appendOptional(form, "LogType", input.logType);
  appendOptional(form, "HealthStatus", input.healthStatus);
  appendOptional(form, "HydrationStatus", input.hydrationStatus);
  const fields: Array<[string, keyof HealthLogInput]> = [
    ["CheckedAt", "checkedAt"],
    ["TemperatureCelsius", "temperatureCelsius"],
    ["HeartRateBpm", "heartRateBpm"],
    ["RespiratoryRateBpm", "respiratoryRateBpm"],
    ["BehaviorNote", "behaviorNote"],
    ["SymptomNote", "symptomNote"],
    ["InjuryNote", "injuryNote"],
    ["FeedingNote", "feedingNote"],
    ["HydrationNote", "hydrationNote"],
    ["TreatmentProvided", "treatmentProvided"],
    ["MedicationGiven", "medicationGiven"],
    ["VeterinarianRequired", "veterinarianRequired"],
    ["VeterinarianNote", "veterinarianNote"],
    ["LocationDescription", "locationDescription"],
    ["GeneralNote", "generalNote"],
  ];
  fields.forEach(([formKey, inputKey]) =>
    appendOptional(form, formKey, input[inputKey]),
  );
  // TODO(BE-INTEGRATION): connect confirmed photoPublicIds through the internal
  // health-log attachment API. Do not append raw File objects here.
  input.photoCaptions?.forEach((value) => form.append("photoCaptions", value));
  input.photoLatitudes?.forEach((value) =>
    form.append("photoLatitudes", String(value)),
  );
  input.photoLongitudes?.forEach((value) =>
    form.append("photoLongitudes", String(value)),
  );
  input.photoCapturedAts?.forEach((value) =>
    form.append("photoCapturedAts", value),
  );
  appendOptional(form, "latitude", input.latitude);
  appendOptional(form, "longitude", input.longitude);
  return form;
}

export async function createHealthLog(
  transportId: string,
  input: HealthLogInput,
): Promise<HealthLog> {
  if (isHorseHealthMockMode())
    return healthLogSchema.parse(mockCreateHealthLog(transportId, input));
  const response = await apiClient.post<unknown, ApiEnvelope<HealthLog>>(
    `/transports/${encodeURIComponent(transportId)}/horse-health-logs`,
    healthLogForm(input),
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return healthLogSchema.parse(response.value);
}

export async function markAllNormal(
  transportId: string,
  input: MarkAllNormalInput,
): Promise<HealthLog> {
  if (isHorseHealthMockMode())
    return healthLogSchema.parse(mockMarkAllNormal(transportId, input));
  const form = new FormData();
  appendOptional(form, "LogType", input.logType);
  appendOptional(form, "CheckedAt", input.checkedAt);
  appendOptional(form, "LocationDescription", input.locationDescription);
  appendOptional(form, "GeneralNote", input.generalNote);
  // TODO(BE-INTEGRATION): connect confirmed photoPublicIds through the internal
  // mark-all-normal attachment API. Do not append raw File objects here.
  const response = await apiClient.post<unknown, ApiEnvelope<HealthLog>>(
    `/transports/${encodeURIComponent(transportId)}/horse-health-logs/mark-all-normal`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return healthLogSchema.parse(response.value);
}

export async function addHealthLogPhotos(
  transportId: string,
  horseHealthLogId: string,
  input: HealthLogPhotoInput,
): Promise<HealthLog> {
  if (isHorseHealthMockMode())
    return healthLogSchema.parse(
      mockAddHealthLogPhotos(transportId, horseHealthLogId, input),
    );
  const form = new FormData();
  // TODO(BE-INTEGRATION): connect confirmed photoPublicIds through the internal
  // append-photo API. Do not append raw File objects here.
  const response = await apiClient.post<unknown, ApiEnvelope<HealthLog>>(
    `/transports/${encodeURIComponent(transportId)}/horse-health-logs/${encodeURIComponent(horseHealthLogId)}/photos`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return healthLogSchema.parse(response.value);
}
