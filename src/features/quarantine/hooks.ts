import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDossierContext, getQuarantineProof, submitQuarantineProof } from './services'
import type { SubmitQuarantineProofResponse } from './types'

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const quarantineKeys = {
  all: ['quarantine'] as const,
  dossier: (id: number) => [...quarantineKeys.all, 'dossier', id] as const,
  quarantineProof: (id: number) => [...quarantineKeys.all, 'proof', id] as const,
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useDossierContext(dossierId: number | null) {
  return useQuery({
    queryKey: quarantineKeys.dossier(dossierId ?? 0),
    queryFn: () => getDossierContext(dossierId!),
    enabled: dossierId != null,
    staleTime: 60_000,
  })
}

export function useQuarantineProofDetail(proofId: number | null) {
  return useQuery({
    queryKey: quarantineKeys.quarantineProof(proofId ?? 0),
    queryFn: () => getQuarantineProof(proofId!),
    enabled: proofId != null,
    staleTime: 30_000,
  })
}

export function useSubmitQuarantineProof(dossierId: number) {
  const qc = useQueryClient()
  return useMutation<
    SubmitQuarantineProofResponse,
    Error,
    Parameters<typeof submitQuarantineProof>[1]
  >({
    mutationFn: (payload) => submitQuarantineProof(dossierId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: quarantineKeys.dossier(dossierId) })
    },
  })
}

// Aliases for compatibility
export const clearanceKeys = quarantineKeys
export const useCustomsProofDetail = useQuarantineProofDetail
export const useSubmitCustomsProof = useSubmitQuarantineProof
