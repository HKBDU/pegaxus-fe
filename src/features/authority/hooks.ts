import { useMutation, useQuery } from '@tanstack/react-query'
import { getAuthoritySubmissionDetail, recordAuthoritySubmission, updateAuthorityReview } from './services'
import type { RecordAuthoritySubmissionInput, UpdateAuthorityReviewInput } from './types'

export function useRecordAuthoritySubmission(dossierId: string) {
  return useMutation({
    mutationFn: (input: RecordAuthoritySubmissionInput) => recordAuthoritySubmission(dossierId, input),
  })
}

export function useUpdateAuthorityReview(submissionId: string) {
  return useMutation({
    mutationFn: (input: UpdateAuthorityReviewInput) => updateAuthorityReview(submissionId, input),
  })
}

export function useAuthoritySubmissionDetail(submissionId: string) {
  return useQuery({
    queryKey: ['authoritySubmission', submissionId],
    queryFn: () => getAuthoritySubmissionDetail(submissionId),
    enabled: Boolean(submissionId),
  })
}

