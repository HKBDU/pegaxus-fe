import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDossierContext, submitCustomsClearanceProof } from './services'
import type { SubmitCustomsClearanceProofResponse } from './types'

export const clearanceKeys = {
  all: ['clearance'] as const,
  dossier: (id: number) => [...clearanceKeys.all, 'dossier', id] as const,
}

export function useClearanceDossierContext(dossierId: number | null) {
  return useQuery({
    queryKey: clearanceKeys.dossier(dossierId ?? 0),
    queryFn: () => getDossierContext(dossierId!),
    enabled: dossierId != null,
    staleTime: 60_000,
  })
}

export function useSubmitCustomsClearanceProof(dossierId: number) {
  const queryClient = useQueryClient()
  return useMutation<
    SubmitCustomsClearanceProofResponse,
    Error,
    Parameters<typeof submitCustomsClearanceProof>[1]
  >({
    mutationFn: (payload) => submitCustomsClearanceProof(dossierId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.dossier(dossierId) })
    },
  })
}
