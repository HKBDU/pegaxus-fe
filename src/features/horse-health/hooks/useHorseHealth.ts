import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { createHealthLog, getHealthLogDetail, getHealthLogHistory, getHorseHealthOverview, horseHealthKeys, markAllNormal, type HealthHistoryFilters } from "../services"
import type { HealthLogInput, MarkAllNormalInput } from "../types"

export function useHorseHealthOverview(transportId: string | null) {
  return useQuery({
    queryKey: horseHealthKeys.overview(transportId ?? ""),
    queryFn: ({ signal }) => getHorseHealthOverview(transportId!, signal),
    enabled: Boolean(transportId),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
}

export function useHealthLogHistory(transportId: string | null, horseId: string | null, filters: HealthHistoryFilters = {}) {
  return useQuery({
    queryKey: horseHealthKeys.history(transportId ?? "", horseId ?? "", filters),
    queryFn: ({ signal }) => getHealthLogHistory(transportId!, horseId!, filters, signal),
    enabled: Boolean(transportId && horseId),
  })
}

export function useHealthLogDetail(logId: string | null) {
  return useQuery({
    queryKey: horseHealthKeys.detail(logId ?? ""),
    queryFn: ({ signal }) => getHealthLogDetail(logId!, signal),
    enabled: Boolean(logId),
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
