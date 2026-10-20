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
  const formData = new FormData()
  formData.append('AuthorityName', input.authorityName.trim())
  formData.append('SubmissionReference', input.submissionReference.trim())
  formData.append('SubmittedAt', input.submittedAt)
  formData.append('IsRequired', String(input.isRequired))
  if (input.submissionMethod?.trim()) formData.append('SubmissionMethod', input.submissionMethod.trim())

  input.proofFiles.forEach((file) => formData.append('ProofFile', file, file.name))
  if (input.decisionNote?.trim()) formData.append('DecisionNote', input.decisionNote.trim())

  const response = await apiClient.post<unknown, ApiEnvelope<RecordAuthoritySubmissionResult>>(
    `/compliance-dossiers/${encodeURIComponent(dossierId)}/authority-submissions`,
    formData,
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
  const formData = new FormData()
  formData.append('Decision', input.decision)
  if (input.permitNumber?.trim()) formData.append('PermitNumber', input.permitNumber.trim())
  if (input.permitIssuedDate) formData.append('PermitIssuedDate', input.permitIssuedDate)
  if (input.permitExpiryDate) formData.append('PermitExpiryDate', input.permitExpiryDate)
  formData.append('DecisionFile', input.decisionFile, input.decisionFile.name)
  if (input.decisionNote?.trim()) formData.append('DecisionNote', input.decisionNote.trim())
  if (input.rejectionReason?.trim()) formData.append('RejectionReason', input.rejectionReason.trim())
  if (input.revisionDueDate) formData.append('RevisionDueDate', input.revisionDueDate)
  if (input.notifyStakeholders !== undefined) formData.append('NotifyStakeholders', String(input.notifyStakeholders))

  const response = await apiClient.patch<unknown, ApiEnvelope<UpdateAuthorityReviewResult>>(
    `/authority-submissions/${encodeURIComponent(submissionId)}/decision`,
    formData,
  )

  if (!response.isSuccess) throw new Error(response.message)
  return response.value
}

