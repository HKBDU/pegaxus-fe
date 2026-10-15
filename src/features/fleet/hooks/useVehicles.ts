import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { vehicleService } from "@/features/fleet/services"
import type { VehicleListParams, VehiclePayload, VehicleStatusPayload, VehicleUpdatePayload } from "@/features/fleet/types"

export const vehicleKeys = {
  all: ["fleet", "vehicles"] as const,
  lists: () => [...vehicleKeys.all, "list"] as const,
  list: (params: VehicleListParams) => [...vehicleKeys.lists(), params] as const,
  details: () => [...vehicleKeys.all, "detail"] as const,
  detail: (id: string) => [...vehicleKeys.details(), id] as const,
}

export function useVehicles(params: VehicleListParams) {
  return useQuery({
    queryKey: vehicleKeys.list(params),
    queryFn: () => vehicleService.list(params),
    placeholderData: (previousData) => previousData,
  })
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: vehicleKeys.detail(id ?? ""),
    queryFn: () => vehicleService.get(id as string),
    enabled: Boolean(id),
    // The edit form sends lastUpdatedAt, so never serve a stale copy.
    staleTime: 0,
  })
}

function useInvalidateVehicles() {
  const queryClient = useQueryClient()
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
    if (id) void queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(id) })
  }
}

export function useCreateVehicle() {
  const invalidate = useInvalidateVehicles()
  return useMutation({
    mutationFn: (payload: VehiclePayload) => vehicleService.create(payload),
    onSuccess: () => invalidate(),
  })
}

export function useUpdateVehicle() {
  const invalidate = useInvalidateVehicles()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VehicleUpdatePayload }) => vehicleService.update(id, payload),
    onSuccess: (_, variables) => invalidate(variables.id),
  })
}

export function useChangeVehicleStatus() {
  const invalidate = useInvalidateVehicles()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VehicleStatusPayload }) => vehicleService.changeStatus(id, payload),
    onSuccess: (_, variables) => invalidate(variables.id),
  })
}
