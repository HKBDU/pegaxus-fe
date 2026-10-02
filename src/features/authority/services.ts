import apiClient from '@/lib/axios'
import type {
  ApiEnvelope,
  RecordAuthoritySubmissionInput,
  RecordAuthoritySubmissionResult,
  UpdateAuthorityReviewInput,
  UpdateAuthorityReviewResult,
} from './types'

export async function recordAuthoritySubmission(
  dossierId: number,
  input: RecordAuthoritySubmissionInput,
): Promise<RecordAuthoritySubmissionResult> {
  const formData = new FormData()
  formData.append('authorityName', input.authorityName.trim())
  formData.append('submissionReference', input.submissionReference.trim())
  formData.append('submittedAt', input.submittedAt)
  formData.append('isRequired', String(input.isRequired))

  // The API contract names this field proofFile. Repeating the field preserves
  // that contract while allowing the UI to attach multiple receipt images/PDFs.
  input.proofFiles.forEach((file) => formData.append('proofFile', file, file.name))
  if (input.decisionNote?.trim()) formData.append('decisionNote', input.decisionNote.trim())

  const response = await apiClient.post<unknown, ApiEnvelope<RecordAuthoritySubmissionResult>>(
    `/compliance-dossiers/${dossierId}/authority-submissions`,
    formData,
  )

  if (!response.isSuccess) throw new Error(response.message)
  return response.value
}

export async function updateAuthorityReview(
  submissionId: number,
  input: UpdateAuthorityReviewInput,
): Promise<UpdateAuthorityReviewResult> {
  const formData = new FormData()
  formData.append('decision', input.decision)
  if (input.permitNumber?.trim()) formData.append('permitNumber', input.permitNumber.trim())
  if (input.permitIssuedDate) formData.append('permitIssuedDate', input.permitIssuedDate)
  if (input.permitExpiryDate) formData.append('permitExpiryDate', input.permitExpiryDate)
  formData.append('decisionFile', input.decisionFile, input.decisionFile.name)
  if (input.decisionNote?.trim()) formData.append('decisionNote', input.decisionNote.trim())
  if (input.rejectionReason?.trim()) formData.append('rejectionReason', input.rejectionReason.trim())
  if (input.revisionDueDate) formData.append('revisionDueDate', input.revisionDueDate)

  const response = await apiClient.patch<unknown, ApiEnvelope<UpdateAuthorityReviewResult>>(
    `/authority-submissions/${submissionId}/decision`,
    formData,
  )

  if (!response.isSuccess) throw new Error(response.message)
  return response.value
}
