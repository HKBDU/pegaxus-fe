import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAuthoritySubmissionDetail, listAuthoritySubmissions, recordAuthoritySubmission, updateAuthorityReview } from './services'
import type { RecordAuthoritySubmissionInput, UpdateAuthorityReviewInput } from './types'

export function useRecordAuthoritySubmission(dossierId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RecordAuthoritySubmissionInput) => recordAuthoritySubmission(dossierId, input),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['authoritySubmissions', dossierId] }),
        queryClient.invalidateQueries({ queryKey: ['dossier'] }),
      ])
    },
  })
}

export function useAuthoritySubmissions(dossierId: string) {
  return useQuery({ queryKey: ['authoritySubmissions', dossierId], queryFn: () => listAuthoritySubmissions(dossierId), enabled: Boolean(dossierId) })
}

export function useUpdateAuthorityReview(submissionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAuthorityReviewInput) => updateAuthorityReview(submissionId, input),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['authoritySubmissions'] }),
        queryClient.invalidateQueries({ queryKey: ['authoritySubmission', submissionId] }),
        queryClient.invalidateQueries({ queryKey: ['dossier'] }),
      ])
    },
  })
}

export function useAuthoritySubmissionDetail(submissionId: string) {
  return useQuery({
    queryKey: ['authoritySubmission', submissionId],
    queryFn: () => getAuthoritySubmissionDetail(submissionId),
    enabled: Boolean(submissionId),
  })
}

