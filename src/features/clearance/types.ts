export type CustomsLane = 'GREEN_LANE' | 'ORANGE_LANE' | 'RED_LANE'

export interface SubmitCustomsClearanceProofRequest {
  customsPortName: string
  locationId?: number
  mrnNumber?: string
  customsLane?: CustomsLane
  isHeld?: boolean
  quickNote?: string
  files: File[]
}

export interface SubmitCustomsClearanceProofResponse {
  customsClearanceProofId: number
}

export type CustomsClearanceProofStatus = 'PENDING_VERIFICATION' | 'CLEARED' | 'HELD' | 'REJECTED'
export type CustomsFinalizeAction = 'FINALIZE' | 'REJECT_PROOF'

export interface CustomsProofFile {
  fileName: string
  fileUrl: string
  mimeType: string
  fileSizeBytes: number
  sortOrder: number
}

export interface CustomsClearanceProofDetail {
  customsClearanceProofId: number
  complianceDossierId: number
  status: CustomsClearanceProofStatus
  customsPortName: string
  locationId: number | null
  mrnNumber: string | null
  customsLane: CustomsLane | null
  submittedNote: string | null
  ataCarnetExpiryDate: string | null
  ataCarnet: { complianceDocumentId: number; expiryDate: string; status: string } | null
  clearanceAt: string | null
  submittedBy: { employeeId: number; fullName: string }
  submittedAt: string
  verifiedBy: { employeeId: number; fullName: string } | null
  verifiedAt: string | null
  verificationNote: string | null
  rejectionReason: string | null
  isFinalized: boolean
  finalizedAt: string | null
  files: CustomsProofFile[]
}

export interface FinalizeCustomsClearanceProofRequest {
  action: CustomsFinalizeAction
  mrnNumber?: string
  customsLane?: CustomsLane
  ataCarnetExpiryDate?: string
  status?: 'CLEARED' | 'HELD' | 'REJECTED'
  verificationNote?: string
  rejectionReason?: string
}

export interface FinalizeCustomsClearanceProofResponse {
  customsClearanceProofId: number
  status: CustomsClearanceProofStatus
  isFinalized: boolean
}

export interface ApiEnvelope<T> {
  isSuccess: boolean
  code: number
  message: string
  value: T
}
