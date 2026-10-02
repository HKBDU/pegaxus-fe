import apiClient from '@/lib/axios'
import type { ApiEnvelope, RecordAuthoritySubmissionInput, RecordAuthoritySubmissionResult } from './types'

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
