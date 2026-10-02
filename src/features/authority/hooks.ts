import { useMutation } from '@tanstack/react-query'
import { recordAuthoritySubmission } from './services'
import type { RecordAuthoritySubmissionInput } from './types'

export function useRecordAuthoritySubmission(dossierId: number) {
  return useMutation({
    mutationFn: (input: RecordAuthoritySubmissionInput) => recordAuthoritySubmission(dossierId, input),
  })
}
