// ─── Enums ────────────────────────────────────────────────────────────────────

export type QuarantineProofStatus =
  | 'PENDING_VERIFICATION'
  | 'PASSED'
  | 'PASSED_WITH_CONDITIONS'
  | 'HOLDBACK'
  | 'FAILED'
  | 'REJECTED'

// ─── Proof Attachment ─────────────────────────────────────────────────────────

export interface ProofAttachmentFile {
  fileName: string
  fileUrl: string
  mimeType: string
  fileSizeBytes: number
  sortOrder: number
}

// ─── Submitted By ─────────────────────────────────────────────────────────────

export interface SubmittedByEmployee {
  employeeId: number
  fullName: string
}

// ─── Q1: Submit Quarantine Proof (UC-28a BCP Quarantine Proof) ────────────────

export interface SubmitQuarantineProofRequest {
  bcpName: string
  locationId?: number
  officialVetName?: string
  bcpReceiptNumber?: string
  inspectionAt?: string
  // Submitters can flag a held horse/trip immediately; detailed notes may follow later.
  isHoldback?: boolean
  quickNote?: string
  files: File[]
}

export interface SubmitQuarantineProofResponse {
  quarantineProofId: number
}

// ─── Q2: Detail ───────────────────────────────────────────────────────────────

export interface QuarantineProof {
  quarantineProofId: number
  complianceDossierId: number
  status: QuarantineProofStatus
  bcpName: string
  locationId: number | null
  inspectionAt: string | null
  submittedNote: string | null
  submittedBy: SubmittedByEmployee
  submittedAt: string
  officialVeterinarianName: string | null
  bcpReceiptNumber: string | null
  conditions: string | null
  verifiedBy: SubmittedByEmployee | null
  verifiedAt: string | null
  verificationNote: string | null
  rejectionReason: string | null
  isFinalized: boolean
  finalizedAt: string | null
  files: ProofAttachmentFile[]
  expectedHorses?: ExpectedQuarantineHorse[]
  microchipChecklist?: MicrochipChecklistItem[]
}

export interface ExpectedQuarantineHorse {
  horseId: number
  horseName: string
  microchipNumber: string
}

export interface MicrochipChecklistItem {
  horseId: number
  microchipNumber: string
  isMatched: boolean
}

export interface FinalizeQuarantineProofRequest {
  action: 'FINALIZE' | 'REJECT_PROOF'
  officialVetName?: string
  bcpReceiptNo?: string
  status?: 'PASSED' | 'PASSED_WITH_CONDITIONS' | 'FAILED'
  conditions?: string
  microchipChecklist?: MicrochipChecklistItem[]
  rejectionReason?: string
  verificationNote?: string
}

export interface FinalizeQuarantineProofResponse {
  quarantineProofId: number
  status: QuarantineProofStatus
  isFinalized: boolean
}

// ─── Booking Summary (for dossier trip context) ────────────────────────────────

export interface BookingTripSummary {
  bookingId: number
  bookingCode: string
  tripCode?: string
  originPort?: string
  destinationPort?: string
  originAddress?: string
  destinationAddress?: string
  originCountry: string
  destinationCountry: string
  requestedDepartureDate?: string
}

// ─── Compliance Dossier Context ───────────────────────────────────────────────

export interface ComplianceDossierContext {
  complianceDossierId: number
  dossierCode: string
  status: string
  bookingId: number
  bookingCode: string
  bookingSummary: BookingTripSummary
}

// ─── API Envelope ─────────────────────────────────────────────────────────────

export interface ApiEnvelope<T> {
  isSuccess: boolean
  code: number
  message: string
  value: T
}
