import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { complianceService } from "@/features/compliance-catalog/services"
import type { EntityId } from "@/shared/types"
import type {
  ComplianceRequirementListParams,
  ComplianceRequirementPayload,
  ComplianceStatus,
} from "@/features/compliance-catalog/types"

export const complianceKeys = {
  all: ["compliance-requirements"] as const,
  lists: () => [...complianceKeys.all, "list"] as const,
  list: (params: ComplianceRequirementListParams) => [...complianceKeys.lists(), params] as const,
  details: () => [...complianceKeys.all, "detail"] as const,
  // String(id): the route gives "12" while mock data uses 12; both must hit the same cache entry.
  detail: (id: EntityId) => [...complianceKeys.details(), String(id)] as const,
}

export function useComplianceRequirements(params: ComplianceRequirementListParams) {
  return useQuery({
    queryKey: complianceKeys.list(params),
    queryFn: () => complianceService.getRequirements(params),
    placeholderData: (previousData) => previousData,
  })
}

export function useComplianceRequirement(id: EntityId | undefined) {
  return useQuery({
    queryKey: complianceKeys.detail(id ?? ""),
    queryFn: () => complianceService.getRequirement(id as EntityId),
    enabled: id !== undefined && String(id).length > 0,
    // Reference counts decide the Edit warning, so never show a stale copy.
    staleTime: 0,
  })
}

function useInvalidateCatalog() {
  const queryClient = useQueryClient()
  return (id?: EntityId) => {
    void queryClient.invalidateQueries({ queryKey: complianceKeys.lists() })
    if (id !== undefined) void queryClient.invalidateQueries({ queryKey: complianceKeys.detail(id) })
  }
}

export function useCreateComplianceRequirement() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: (data: ComplianceRequirementPayload) => complianceService.createRequirement(data),
    onSuccess: () => invalidate(),
  })
}

export function useUpdateComplianceRequirement() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: ({ id, data }: { id: EntityId; data: ComplianceRequirementPayload }) => complianceService.updateRequirement(id, data),
    onSuccess: (_, variables) => invalidate(variables.id),
  })
}

export function useChangeComplianceStatus() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: ({ id, status }: { id: EntityId; status: ComplianceStatus }) => complianceService.changeStatus(id, status),
    onSuccess: (_, variables) => invalidate(variables.id),
  })
}

export function useDeleteComplianceRequirement() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: (id: EntityId) => complianceService.deleteRequirement(id),
    onSuccess: () => invalidate(),
  })
}
