import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { dossierService } from "../services"
import { dossierIdSchema } from "../schemas"
import { documentKeys, invalidateComplianceDocument } from "./useComplianceDocument"

export const documentRequestKeys = {
  comments: (dossierId: string, requirementId: string, requestId: string) => [...documentKeys.root(dossierId, requirementId), "comments", requestId] as const,
}

export function useDocumentRequestComments(dossierId: string, requirementId: string, requestId: string | null, enabled = true) {
  return useQuery({ queryKey: documentRequestKeys.comments(dossierId, requirementId, requestId ?? ""), queryFn: ({ signal }) => dossierService.getDocumentRequestComments(dossierId, requirementId, requestId!, signal), enabled: enabled && [dossierId, requirementId, requestId].every((id) => dossierIdSchema.safeParse(id).success), retry: false })
}

export function useAddDocumentRequestComment() {
  const client = useQueryClient()
  return useMutation({ mutationFn: dossierService.addDocumentRequestComment, retry: false,
    onSuccess: (_response, input) => invalidateComplianceDocument(client, undefined, input.dossierId, input.requirementId),
    onError: (error, input) => { if ((error as { response?: { status?: number } }).response?.status === 409) return invalidateComplianceDocument(client, undefined, input.dossierId, input.requirementId) },
  })
}
