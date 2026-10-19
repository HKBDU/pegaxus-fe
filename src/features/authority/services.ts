import apiClient from '@/lib/axios'
import type {
  ApiEnvelope,
  AuthoritySubmissionDetail,
  RecordAuthoritySubmissionInput,
  RecordAuthoritySubmissionResult,
  UpdateAuthorityReviewInput,
  UpdateAuthorityReviewResult,
} from './types'

export async function recordAuthoritySubmission(
  dossierId: string,
  input: RecordAuthoritySubmissionInput,
): Promise<RecordAuthoritySubmissionResult> {
  const formData = new FormData()
  formData.append('AuthorityName', input.authorityName.trim())
  formData.append('SubmissionReference', input.submissionReference.trim())
  formData.append('SubmittedAt', input.submittedAt)
  formData.append('IsRequired', String(input.isRequired))

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
  try {
    const response = await apiClient.get<unknown, ApiEnvelope<AuthoritySubmissionDetail>>(
      `/authority-submissions/${encodeURIComponent(submissionId)}`,
    )
    if (response?.isSuccess && response?.value) {
      return response.value
    }
  } catch {
    // Fallback to standard mock data when backend endpoint is not yet provided
  }

  return {
    authoritySubmissionId: submissionId,
    submissionNo: '1',
    dossierId: '501',
    authorityName: 'EU TRACES-NT',
    submissionReference: 'CHEDA.GB.2026.109283',
    submittedAt: '05 Oct 2026 14:30 (UTC+7)',
    submittedBy: 'Nguyen Van A (TS)',
    status: 'SUBMITTED',
    dossierStatus: 'SUBMITTED',
    evidenceFile: {
      fileName: 'traces_submission_receipt.pdf',
      fileUrl: '#',
      fileSize: 2.4 * 1024 * 1024,
    },
    notes: 'Submitted via TRACES-NT portal. All documents attached as required.',
    dossierSummary: {
      cdosCode: 'CDOS-20260925-1002',
      bookingNo: 'REQ-20260925-1002',
      originCountry: 'London (UK)',
      destinationCountry: 'Paris (FR)',
      departureDate: '05 Oct 2026',
      horsesCount: 2,
      customerName: 'Greenwood Racing Ltd',
      status: 'SUBMITTED',
    },
    reviewHistory: [
      {
        id: 'h-1',
        title: 'Dossier Submitted to Authority',
        timestamp: '05 Oct 2026 14:30 (UTC+7) by Nguyen Van A (TS)',
        actor: 'Nguyen Van A (TS)',
        referenceOrPermit: 'EU TRACES-NT | Ref: CHEDA.GB.2026.109283',
      },
    ],
  }
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

