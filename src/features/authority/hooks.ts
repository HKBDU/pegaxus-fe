import { useMutation } from '@tanstack/react-query'
import { recordAuthoritySubmission, updateAuthorityReview } from './services'
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
