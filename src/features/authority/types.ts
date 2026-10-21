export interface ApiEnvelope<T> {
  isSuccess: boolean
  code: number
  message: string
  value: T
}

export type AuthoritySubmissionStatus =
  | 'READY_FOR_SUBMISSION'
  | 'IN_PREPARATION'
  | 'SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'CLOSED'

export interface RecordAuthoritySubmissionInput {
  authorityName: string
  submissionReference: string
  submittedAt: string
  isRequired: boolean
  proofFiles: File[]
  submissionMethod?: string
  decisionNote?: string
}

export interface AuthoritySubmissionSummary {
  authoritySubmissionId: string
  submissionNo: string | number
  authorityName: string
  submissionReference: string
  submissionMethod?: string | null
  status: AuthoritySubmissionStatus | string
  isRequired: boolean
  submittedAt: string
  responseReceivedAt?: string | null
  permitNumber?: string | null
  revisionDueDate?: string | null
  rejectionReason?: string | null
  evidenceFiles?: Array<{ fileName: string; fileUrl?: string; fileSizeBytes?: number; evidenceType?: string }>
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
  notifyStakeholders?: boolean
}

export interface UpdateAuthorityReviewResult {
  authoritySubmissionId: string
  submissionStatus: string
  dossierStatus: string
}

export interface AuthoritySubmissionDetail {
  authoritySubmissionId: string
  submissionNo: string
  dossierId: string
  authorityName: string
  submissionReference: string
  submittedAt: string
  submittedBy?: string
  status: string
  dossierStatus: string
  isRequired?: boolean
  evidenceFile?: {
    fileName: string
    fileUrl: string
    fileSize: number
  }
  notes?: string
  dossierSummary?: {
    cdosCode: string
    bookingNo: string
    originCountry: string
    destinationCountry: string
    departureDate: string
    horsesCount: number
    customerName: string
    status: string
  }
  reviewHistory?: Array<{
    id: string
    title: string
    timestamp: string
    actor: string
    referenceOrPermit?: string
    expiryDate?: string
    outcome?: AuthorityDecision
    file?: {
      fileName: string
      fileSize: number
      fileUrl?: string
    }
  }>
}
