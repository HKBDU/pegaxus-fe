import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAuthoritySubmissionDetail, getRouteAuthorities, listAuthoritySubmissions, recordAuthoritySubmission, updateAuthorityReview } from './services'
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

/** The authorities of the countries on the dossier's route; the key shares the list prefix so a new submission refreshes it. */
export function useRouteAuthorities(dossierId: string, enabled = true) {
  return useQuery({
    queryKey: ['authoritySubmissions', dossierId, 'route'],
    queryFn: () => getRouteAuthorities(dossierId),
    enabled: Boolean(dossierId) && enabled,
  })
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

export function useAuthoritySubmissionDetail(dossierId: string, submissionId: string) {
  return useQuery({
    queryKey: ['authoritySubmission', dossierId, submissionId],
    queryFn: () => getAuthoritySubmissionDetail(dossierId, submissionId),
    enabled: Boolean(dossierId && submissionId),
  })
}

