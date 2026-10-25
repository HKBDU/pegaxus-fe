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

function toUploadedFiles(photoPublicIds?: string[]) {
  if (!photoPublicIds || photoPublicIds.length === 0) return undefined
  return photoPublicIds.map((publicId) => ({ publicId }))
}

export async function createHealthLog(transportId: string, input: HealthLogInput): Promise<HealthLog> {
  if (isHorseHealthMockMode()) return healthLogSchema.parse(mockCreateHealthLog(transportId, input))
  const payload = {
    horseId: input.horseId,
    logType: input.logType,
    healthStatus: input.healthStatus,
    hydrationStatus: input.hydrationStatus,
    checkedAt: input.checkedAt,
    temperatureCelsius: input.temperatureCelsius ?? undefined,
    heartRateBpm: input.heartRateBpm ?? undefined,
    respiratoryRateBpm: input.respiratoryRateBpm ?? undefined,
    behaviorNote: input.behaviorNote,
    feedingNote: input.feedingNote,
    hydrationNote: input.hydrationNote,
    symptomNote: input.symptomNote,
    injuryNote: input.injuryNote,
    treatmentProvided: input.treatmentProvided,
    medicationGiven: input.medicationGiven,
    veterinarianRequired: input.veterinarianRequired ?? false,
    veterinarianNote: input.veterinarianNote,
    locationDescription: input.locationDescription,
    generalNote: input.generalNote,
    files: toUploadedFiles(input.photoPublicIds),
  }
  const response = await apiClient.post<unknown, ApiEnvelope<HealthLog>>(
    `/transports/${encodeURIComponent(transportId)}/horse-health-logs`,
    payload,
  )
  return healthLogSchema.parse(response.value)
}

export async function markAllNormal(transportId: string, input: MarkAllNormalInput): Promise<HealthLog> {
  if (isHorseHealthMockMode()) return healthLogSchema.parse(mockMarkAllNormal(transportId, input))
  const payload = {
    logType: input.logType,
    checkedAt: input.checkedAt,
    locationDescription: input.locationDescription,
    generalNote: input.generalNote,
    files: toUploadedFiles(input.photoPublicIds),
  }
  const response = await apiClient.post<unknown, ApiEnvelope<HealthLog>>(
    `/transports/${encodeURIComponent(transportId)}/horse-health-logs/mark-all-normal`,
    payload,
  )
  return healthLogSchema.parse(response.value)
}

export async function addHealthLogPhotos(transportId: string, horseHealthLogId: string, input: HealthLogPhotoInput): Promise<HealthLog> {
  if (isHorseHealthMockMode()) return healthLogSchema.parse(mockAddHealthLogPhotos(transportId, horseHealthLogId, input))
  const payload = {
    files: toUploadedFiles(input.photoPublicIds),
  }
  const response = await apiClient.post<unknown, ApiEnvelope<HealthLog>>(
    `/transports/${encodeURIComponent(transportId)}/horse-health-logs/${encodeURIComponent(horseHealthLogId)}/photos`,
    payload,
  )
  return healthLogSchema.parse(response.value)
}

