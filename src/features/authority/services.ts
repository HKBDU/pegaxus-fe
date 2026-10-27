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
  dossierId: string,
  submissionId: string,
): Promise<AuthoritySubmissionDetail> {
  const submissions = await listAuthoritySubmissions(dossierId)
  const summary = submissions.find(
    (item) => String(item.authoritySubmissionId) === String(submissionId),
  )
  if (!summary) throw new Error("AUTHORITY_SUBMISSION_NOT_FOUND")
  const evidence = summary.evidenceFiles?.[0]
  return {
    authoritySubmissionId: summary.authoritySubmissionId,
    submissionNo: String(summary.submissionNo),
    dossierId,
    authorityName: summary.authorityName,
    submissionReference: summary.submissionReference,
    submittedAt: summary.submittedAt,
    status: summary.status,
    dossierStatus: "",
    isRequired: summary.isRequired,
    evidenceFile: evidence
      ? {
          fileName: evidence.fileName,
          fileUrl: evidence.fileUrl ?? "",
          fileSize: evidence.fileSizeBytes ?? 0,
        }
      : undefined,
  }
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

