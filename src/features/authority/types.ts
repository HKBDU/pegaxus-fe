export interface ApiEnvelope<T> {
  isSuccess: boolean
  code: number
  message: string
  value: T
}

export type AuthoritySubmissionStatus = 'READY_FOR_SUBMISSION' | 'SUBMITTED' | 'PENDING'

export interface RecordAuthoritySubmissionInput {
  authorityName: string
  submissionReference: string
  submittedAt: string
  isRequired: boolean
  proofFiles: File[]
  decisionNote?: string
}

export interface RecordAuthoritySubmissionResult {
  authoritySubmissionId: string
  submissionNo: string
  status: string
  dossierStatus: string
}

export type AuthorityDecision = 'APPROVED' | 'REJECTED' | 'RETURNED'

export interface UpdateAuthorityReviewInput {
  decision: AuthorityDecision
  permitNumber?: string
  permitIssuedDate?: string
  permitExpiryDate?: string
  decisionFile: File
  decisionNote?: string
  rejectionReason?: string
  revisionDueDate?: string
}

export interface UpdateAuthorityReviewResult {
  authoritySubmissionId: string
  submissionStatus: string
  dossierStatus: string
}
