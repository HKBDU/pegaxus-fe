import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { addHealthLogPhotos, createHealthLog, getHealthLogDetail, getHealthLogHistory, getHorseHealthOverview, horseHealthKeys, markAllNormal, type HealthHistoryFilters } from "../services"
import type { HealthLogInput, HealthLogPhotoInput, MarkAllNormalInput } from "../types"

function shouldRetry(error: unknown, failureCount: number) {
  const status = (error as { response?: { status?: number } } | null)?.response?.status
  return status !== 403 && status !== 404 && failureCount < 2
}

export function useHorseHealthOverview(transportId: string | null) {
  return useQuery({
    queryKey: horseHealthKeys.overview(transportId ?? ""),
    queryFn: ({ signal }) => getHorseHealthOverview(transportId!, signal),
    enabled: Boolean(transportId),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: shouldRetry,
  })
}

export function useHealthLogHistory(transportId: string | null, horseId: string | null, filters: HealthHistoryFilters = {}) {
  return useQuery({
    queryKey: horseHealthKeys.history(transportId ?? "", horseId ?? "", filters),
    queryFn: ({ signal }) => getHealthLogHistory(transportId!, horseId!, filters, signal),
    enabled: Boolean(transportId && horseId),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: shouldRetry,
  })
}

export function useHealthLogDetail(logId: string | null) {
  return useQuery({
    queryKey: horseHealthKeys.detail(logId ?? ""),
    queryFn: ({ signal }) => getHealthLogDetail(logId!, signal),
    enabled: Boolean(logId),
    retry: shouldRetry,
  })
}

export function useCreateHealthLog(transportId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: HealthLogInput) => createHealthLog(transportId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: horseHealthKeys.overview(transportId) }),
  })
}

export function useMarkAllNormal(transportId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MarkAllNormalInput) => markAllNormal(transportId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: horseHealthKeys.overview(transportId) }),
  })
}

export function useAddHealthLogPhotos(transportId: string, horseHealthLogId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: HealthLogPhotoInput) => addHealthLogPhotos(transportId, horseHealthLogId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: horseHealthKeys.overview(transportId) })
      queryClient.invalidateQueries({ queryKey: horseHealthKeys.detail(horseHealthLogId ?? "") })
      queryClient.invalidateQueries({ queryKey: horseHealthKeys.all })
    },
  })
}
