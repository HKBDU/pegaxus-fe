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
  authoritySubmissionId: number
  submissionNo: number
  status: string
  dossierStatus: string
}
