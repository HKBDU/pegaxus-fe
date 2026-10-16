import apiClient from "@/lib/axios"
import { useAuthStore } from "@/features/auth/store"

import { getMockAssignedTransports } from "./mock"
import { getMockHealthLog, getMockHealthLogHistory, getMockHealthOverview, mockCreateHealthLog, mockMarkAllNormal } from "./mock"
import { healthLogHistorySchema, healthLogSchema, horseHealthOverviewSchema } from "./schemas"
import type { AssignedTransportsResponse, HealthLog, HealthLogHistory, HealthLogInput, HorseHealthOverview, LogType, MarkAllNormalInput } from "./types"

export const isHorseHealthMockMode = () => import.meta.env.DEV && import.meta.env.VITE_HORSE_HEALTH_MOCK !== "false"

interface ApiEnvelope<T> {
  value: T
}

export async function getAssignedTransports(signal?: AbortSignal): Promise<AssignedTransportsResponse> {
  if (isHorseHealthMockMode()) {
    return getMockAssignedTransports(useAuthStore.getState().principal?.roles ?? [])
  }

  const response = await apiClient.get<unknown, ApiEnvelope<AssignedTransportsResponse>>(
    "/transports/assigned-to-me",
    { params: { status: "READY,IN_TRANSIT" }, signal },
  )
  return response.value
}

export const horseHealthKeys = {
  all: ["horse-health"] as const,
  overview: (transportId: string) => [...horseHealthKeys.all, "overview", transportId] as const,
  history: (transportId: string, horseId: string, filters: HealthHistoryFilters) => [...horseHealthKeys.all, "history", transportId, horseId, filters] as const,
  detail: (logId: string) => [...horseHealthKeys.all, "detail", logId] as const,
}

export interface HealthHistoryFilters {
  logType?: LogType
  healthStatus?: string
  pageIndex?: number
  pageSize?: number
}

export async function getHorseHealthOverview(transportId: string, signal?: AbortSignal): Promise<HorseHealthOverview> {
  if (isHorseHealthMockMode()) return horseHealthOverviewSchema.parse(getMockHealthOverview(transportId))
  const response = await apiClient.get<unknown, ApiEnvelope<HorseHealthOverview>>(`/transports/${encodeURIComponent(transportId)}/horse-health`, { signal })
  return horseHealthOverviewSchema.parse(response.value)
}

export async function getHealthLogHistory(transportId: string, horseId: string, filters: HealthHistoryFilters = {}, signal?: AbortSignal): Promise<HealthLogHistory> {
  const query = { pageIndex: filters.pageIndex ?? 0, pageSize: filters.pageSize ?? 20, logType: filters.logType, healthStatus: filters.healthStatus }
  if (isHorseHealthMockMode()) return healthLogHistorySchema.parse(getMockHealthLogHistory(transportId, horseId, query))
  const response = await apiClient.get<unknown, ApiEnvelope<HealthLogHistory>>(`/transports/${encodeURIComponent(transportId)}/horses/${encodeURIComponent(horseId)}/health-logs`, { params: query, signal })
  return healthLogHistorySchema.parse(response.value)
}

export async function getHealthLogDetail(logId: string, signal?: AbortSignal): Promise<HealthLog> {
  if (isHorseHealthMockMode()) return healthLogSchema.parse(getMockHealthLog(logId))
  const response = await apiClient.get<unknown, ApiEnvelope<HealthLog>>(`/horse-health-logs/${encodeURIComponent(logId)}`, { signal })
  return healthLogSchema.parse(response.value)
}

function appendOptional(form: FormData, key: string, value: unknown) {
  if (value !== undefined && value !== null && value !== "") form.append(key, String(value))
}

function healthLogForm(input: HealthLogInput) {
  const form = new FormData()
  appendOptional(form, "horseId", input.horseId)
  appendOptional(form, "logType", input.logType)
  appendOptional(form, "healthStatus", input.healthStatus)
  appendOptional(form, "hydrationStatus", input.hydrationStatus)
  for (const key of ["checkedAt", "temperatureCelsius", "heartRateBpm", "respiratoryRateBpm", "behaviorNote", "symptomNote", "injuryNote", "feedingNote", "hydrationNote", "treatmentProvided", "medicationGiven", "veterinarianRequired", "veterinarianNote", "locationDescription", "generalNote", "latitude", "longitude"] as const) appendOptional(form, key, input[key])
  input.files?.forEach((file) => form.append("files", file))
  input.photoCaptions?.forEach((value) => form.append("photoCaptions", value))
  input.photoLatitudes?.forEach((value) => form.append("photoLatitudes", String(value)))
  input.photoLongitudes?.forEach((value) => form.append("photoLongitudes", String(value)))
  input.photoCapturedAts?.forEach((value) => form.append("photoCapturedAts", value))
  return form
}

export async function createHealthLog(transportId: string, input: HealthLogInput): Promise<HealthLog> {
  if (isHorseHealthMockMode()) return healthLogSchema.parse(mockCreateHealthLog(transportId, input))
  const response = await apiClient.post<unknown, ApiEnvelope<HealthLog>>(`/transports/${encodeURIComponent(transportId)}/horse-health-logs`, healthLogForm(input), { headers: { "Content-Type": "multipart/form-data" } })
  return healthLogSchema.parse(response.value)
}

export async function markAllNormal(transportId: string, input: MarkAllNormalInput): Promise<HealthLog> {
  if (isHorseHealthMockMode()) return healthLogSchema.parse(mockMarkAllNormal(transportId, input))
  const form = new FormData()
  appendOptional(form, "logType", input.logType)
  appendOptional(form, "checkedAt", input.checkedAt)
  appendOptional(form, "locationDescription", input.locationDescription)
  appendOptional(form, "generalNote", input.generalNote)
  appendOptional(form, "latitude", input.latitude)
  appendOptional(form, "longitude", input.longitude)
  input.files?.forEach((file) => form.append("files", file))
  const response = await apiClient.post<unknown, ApiEnvelope<HealthLog>>(`/transports/${encodeURIComponent(transportId)}/horse-health-logs/mark-all-normal`, form, { headers: { "Content-Type": "multipart/form-data" } })
  return healthLogSchema.parse(response.value)
}
