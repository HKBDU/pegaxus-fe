import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { AddRequirementInput, DossierRequirementParams, UpdateRequirementInput, WaiveRequirementInput } from "@/features/compliance-catalog/dossier-types"
import { requirementService } from "@/features/compliance-catalog/requirement-services"
import type { EntityId } from "@/shared/types"

export const requirementKeys = {
  all: ["dossier-requirements"] as const,
  list: (dossierId: EntityId, params: DossierRequirementParams) => [...requirementKeys.all, String(dossierId), params] as const,
  ofDossier: (dossierId: EntityId) => [...requirementKeys.all, String(dossierId)] as const,
}

export function useDossierRequirements(dossierId: EntityId | undefined, params: DossierRequirementParams) {
  return useQuery({
    queryKey: requirementKeys.list(dossierId ?? "", params),
    queryFn: () => requirementService.getRequirements(dossierId as EntityId, params),
    enabled: dossierId !== undefined && String(dossierId).length > 0,
    placeholderData: (previousData) => previousData,
  })
}

export function useAddDossierRequirement(dossierId: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddRequirementInput) => requirementService.addRequirement(dossierId, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: requirementKeys.ofDossier(dossierId) }),
  })
}

export function useRemoveDossierRequirement(dossierId: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dossierRequirementId: EntityId) => requirementService.removeRequirement(dossierId, dossierRequirementId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: requirementKeys.ofDossier(dossierId) }),
  })
}

export function useUpdateDossierRequirement(dossierId: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dossierRequirementId, input }: { dossierRequirementId: EntityId; input: UpdateRequirementInput }) =>
      requirementService.updateRequirement(dossierId, dossierRequirementId, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: requirementKeys.ofDossier(dossierId) }),
  })
}

export function useWaiveDossierRequirement(dossierId: EntityId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dossierRequirementId, input }: { dossierRequirementId: EntityId; input: WaiveRequirementInput }) =>
      requirementService.waiveRequirement(dossierId, dossierRequirementId, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: requirementKeys.ofDossier(dossierId) }),
  })
}
