import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { finalizeCustomsClearanceProof, getCustomsClearanceProof, getDossierContext, submitCustomsClearanceProof } from './services'
import type { FinalizeCustomsClearanceProofResponse, SubmitCustomsClearanceProofResponse } from './types'

export const clearanceKeys = {
  all: ['clearance'] as const,
  dossier: (id: string) => [...clearanceKeys.all, 'dossier', id] as const,
  proof: (id: string) => [...clearanceKeys.all, 'proof', id] as const,
}

export function useCustomsClearanceProofDetail(proofId: string | null) {
  return useQuery({
    queryKey: clearanceKeys.proof(proofId ?? ''),
    queryFn: () => getCustomsClearanceProof(proofId!),
    enabled: proofId != null,
    staleTime: 30_000,
  })
}

export function useClearanceDossierContext(dossierId: string | null) {
  return useQuery({
    queryKey: clearanceKeys.dossier(dossierId ?? ''),
    queryFn: () => getDossierContext(dossierId!),
    enabled: dossierId != null,
    staleTime: 60_000,
  })
}

export function useFinalizeCustomsClearanceProof(proofId: string) {
  const queryClient = useQueryClient()
  return useMutation<
    FinalizeCustomsClearanceProofResponse,
    Error,
    Parameters<typeof finalizeCustomsClearanceProof>[1]
  >({
    mutationFn: (payload) => finalizeCustomsClearanceProof(proofId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.proof(proofId) })
    },
  })
}

export function useSubmitCustomsClearanceProof(dossierId: string) {
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
