import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { providerService } from "@/features/fleet/services"
import type { ProviderListParams, ProviderPayload, ProviderStatusPayload, ProviderUpdatePayload } from "@/features/fleet/types"

export const providerKeys = {
  all: ["fleet", "providers"] as const,
  lists: () => [...providerKeys.all, "list"] as const,
  list: (params: ProviderListParams) => [...providerKeys.lists(), params] as const,
  counts: () => [...providerKeys.all, "counts"] as const,
  detail: (id: string) => [...providerKeys.all, "detail", id] as const,
}

export function useProviders(params: ProviderListParams) {
  return useQuery({
    queryKey: providerKeys.list(params),
    queryFn: () => providerService.list(params),
    placeholderData: (previousData) => previousData,
  })
}

export function useProviderCounts() {
  return useQuery({ queryKey: providerKeys.counts(), queryFn: () => providerService.counts() })
}

export function useProvider(id: string | undefined) {
  return useQuery({
    queryKey: providerKeys.detail(id ?? ""),
    queryFn: () => providerService.get(id as string),
    enabled: Boolean(id),
    staleTime: 0,
  })
}

function useInvalidateProviders() {
  const queryClient = useQueryClient()
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: providerKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: providerKeys.counts() })
    if (id) void queryClient.invalidateQueries({ queryKey: providerKeys.detail(id) })
  }
}

export function useCreateProvider() {
  const invalidate = useInvalidateProviders()
  return useMutation({
    mutationFn: (payload: ProviderPayload) => providerService.create(payload),
    onSuccess: () => invalidate(),
  })
}

export function useUpdateProvider() {
  const invalidate = useInvalidateProviders()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProviderUpdatePayload }) => providerService.update(id, payload),
    onSuccess: (_, variables) => invalidate(variables.id),
  })
}

export function useChangeProviderStatus() {
  const invalidate = useInvalidateProviders()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProviderStatusPayload }) => providerService.changeStatus(id, payload),
    onSuccess: (_, variables) => invalidate(variables.id),
  })
}

export function useDeleteProvider() {
  const invalidate = useInvalidateProviders()
  return useMutation({
    mutationFn: (id: string) => providerService.remove(id),
    onSuccess: (_, id) => invalidate(id),
  })
}
