import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { templateService } from "@/features/compliance-catalog/template-services"
import { complianceService } from "@/features/compliance-catalog/services"
import type { DossierTemplateListParams, DossierTemplatePayload, TemplateStatus } from "@/features/compliance-catalog/template-types"
import type { EntityId } from "@/shared/types"

export const templateKeys = {
  all: ["dossier-templates"] as const,
  lists: () => [...templateKeys.all, "list"] as const,
  list: (params: DossierTemplateListParams) => [...templateKeys.lists(), params] as const,
  details: () => [...templateKeys.all, "detail"] as const,
  detail: (id: EntityId) => [...templateKeys.details(), String(id)] as const,
  requirementOptions: () => [...templateKeys.all, "requirement-options"] as const,
}

export function useDossierTemplates(params: DossierTemplateListParams) {
  return useQuery({
    queryKey: templateKeys.list(params),
    queryFn: () => templateService.getTemplates(params),
    placeholderData: (previousData) => previousData,
  })
}

export function useDossierTemplate(id: EntityId | undefined) {
  return useQuery({
    queryKey: templateKeys.detail(id ?? ""),
    queryFn: () => templateService.getTemplate(id as EntityId),
    enabled: id !== undefined && String(id).length > 0,
    // isReferenced decides whether the template can be edited, so never show a stale copy.
    staleTime: 0,
  })
}

/** ACTIVE ComplianceRequirements offered by the item rows (a template may only reference ACTIVE ones, T3). */
export function useActiveRequirementOptions() {
  return useQuery({
    queryKey: templateKeys.requirementOptions(),
    queryFn: async () =>
      (await complianceService.getRequirements({ pageIndex: 1, pageSize: 100, search: "", country: "ALL", category: "ALL", status: "ACTIVE", sortBy: "requirementCode:asc" })).data,
  })
}

function useInvalidateTemplates() {
  const queryClient = useQueryClient()
  return (id?: EntityId) => {
    void queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
    if (id !== undefined) void queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) })
  }
}

export function useCreateDossierTemplate() {
  const invalidate = useInvalidateTemplates()
  return useMutation({
    mutationFn: (data: DossierTemplatePayload) => templateService.createTemplate(data),
    onSuccess: () => invalidate(),
  })
}

export function useUpdateDossierTemplate() {
  const invalidate = useInvalidateTemplates()
  return useMutation({
    mutationFn: ({ id, data }: { id: EntityId; data: DossierTemplatePayload }) => templateService.updateTemplate(id, data),
    onSuccess: (_, variables) => invalidate(variables.id),
  })
}

export function useChangeTemplateStatus() {
  const invalidate = useInvalidateTemplates()
  return useMutation({
    mutationFn: ({ id, status }: { id: EntityId; status: TemplateStatus }) => templateService.changeStatus(id, status),
    onSuccess: (_, variables) => invalidate(variables.id),
  })
}

export function useDeleteDossierTemplate() {
  const invalidate = useInvalidateTemplates()
  return useMutation({
    mutationFn: (id: EntityId) => templateService.deleteTemplate(id),
    onSuccess: () => invalidate(),
  })
}
