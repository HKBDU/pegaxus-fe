import apiClient from '@/lib/axios'
import type {
  ApiEnvelope,
  AuthoritySubmissionDetail,
  RecordAuthoritySubmissionInput,
  RecordAuthoritySubmissionResult,
  UpdateAuthorityReviewInput,
  UpdateAuthorityReviewResult,
  AuthoritySubmissionSummary,
} from './types'

export async function listAuthoritySubmissions(dossierId: string): Promise<AuthoritySubmissionSummary[]> {
  const response = await apiClient.get<unknown, ApiEnvelope<{ items: AuthoritySubmissionSummary[] }>>(
    `/compliance-dossiers/${encodeURIComponent(dossierId)}/authority-submissions`,
  )
  if (!response.isSuccess) throw new Error(response.message)
  return response.value?.items ?? []
}

export async function recordAuthoritySubmission(
  dossierId: string,
  input: RecordAuthoritySubmissionInput,
): Promise<RecordAuthoritySubmissionResult> {
  const response = await apiClient.post<unknown, ApiEnvelope<RecordAuthoritySubmissionResult>>(
    `/compliance-dossiers/${encodeURIComponent(dossierId)}/authority-submissions`,
    {
      ...input,
      authorityName: input.authorityName.trim(),
      submissionReference: input.submissionReference.trim(),
      submissionMethod: input.submissionMethod?.trim() || undefined,
      decisionNote: input.decisionNote?.trim() || undefined,
    },
  )

  if (!response.isSuccess) throw new Error(response.message)
  return response.value
}

export async function getAuthoritySubmissionDetail(
  submissionId: string,
): Promise<AuthoritySubmissionDetail> {
  const response = await apiClient.get<unknown, ApiEnvelope<AuthoritySubmissionDetail>>(
    `/authority-submissions/${encodeURIComponent(submissionId)}`,
  )
  if (!response.isSuccess || !response.value) throw new Error(response.message)
  return response.value
}

export async function updateAuthorityReview(
  submissionId: string,
  input: UpdateAuthorityReviewInput,
): Promise<UpdateAuthorityReviewResult> {
  const response = await apiClient.patch<unknown, ApiEnvelope<UpdateAuthorityReviewResult>>(
    `/authority-submissions/${encodeURIComponent(submissionId)}/decision`,
    input,
  )

  if (!response.isSuccess) throw new Error(response.message)
  return response.value
}

