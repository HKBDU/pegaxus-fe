import type { ClaimAction, ClaimSort, ClaimStatus, ClaimType, ResolutionType } from "@/features/claim/constants"

export interface ApiFieldError {
  field: string
  message: string
}

/** CL1 */
export interface ClaimEligibility {
  serverTime: string
  booking: { bookingId: string; bookingCode: string }
  transport: { transportId: string; transportCode: string; status: string } | null
  handover: { handoverRecordId: string; handoverCode: string; handoverType: string; completedAt: string } | null
  claimDeadline: string | null
  remainingSeconds: number | null
  canSubmit: boolean
  /** `HANDOVER_NOT_COMPLETED` or `CLAIM_WINDOW_EXPIRED` when `canSubmit` is false. */
  blockedReason: string | null
  claimCount: number
}

/** The part of the delivery record every role sees; the manager version adds the on-site notes and signatures. */
export interface ClaimHandover {
  handoverRecordId: string
  handoverCode: string
  handoverType: string
  status: string
  completedAt: string | null
  claimDeadline: string | null
  fromPartyName?: string | null
  toPartyName?: string | null
  horseConditionNote?: string | null
  discrepancyNote?: string | null
  senderSignatureUrl?: string | null
  receiverSignatureUrl?: string | null
}

export interface ClaimResolution {
  claimResolutionId: string
  resolutionType: ResolutionType
  approvedCompensationAmount: number | null
  currency: string | null
  resolutionSummary: string
  resolvedAt: string
  /** Manager only. */
  correctiveAction?: string | null
  internalNote?: string | null
}

export interface ClaimPickupHandover {
  handoverRecordId: string
  handoverCode: string
  completedAt: string | null
  horseConditionNote: string | null
  discrepancyNote: string | null
  senderSignatureUrl: string | null
  receiverSignatureUrl: string | null
}

export interface ClaimIncident {
  incidentReportId: string
  incidentCode: string
  category: string
  severity: string
  status: string
  occurredAt: string
}

export interface SuggestedCreditNoteItem {
  itemType: string
  description: string
  quantity: number
  price: number
}

export interface ClaimBilling {
  finalInvoice: { invoiceId: string; invoiceNumber: string; status: string; totalAmount: number; currency: string; paidAt: string | null } | null
  warning: "NO_FINAL_INVOICE" | "FINAL_NOT_PAID" | null
  creditNote: { eligible: boolean; blockedReason: string | null; approvedAmount: number | null; suggestedItem: SuggestedCreditNoteItem | null }
  bookingCreditNotes: { invoiceId: string; invoiceNumber: string; status: string; totalAmount: number; currency: string }[]
}

/** CL2, CL4, CL5, CL6, CL7: the manager-only blocks are absent in the customer version. */
export interface Claim {
  claimId: string
  claimCode: string
  status: ClaimStatus
  claimType: ClaimType
  title: string
  description: string
  requestedCompensationAmount: number | null
  currency: string | null
  evidenceNote: string | null
  customerNote: string | null
  submittedAt: string
  reviewedAt: string | null
  resolvedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  customer: { customerId: string; customerCode: string; name: string; phone: string | null; email: string }
  booking: { bookingId: string; bookingCode: string }
  transport: { transportId: string; transportCode: string; status: string }
  handover: ClaimHandover
  resolution: ClaimResolution | null
  availableActions: ClaimAction[]
  createdAt: string
  updatedAt: string
  pickupHandover?: ClaimPickupHandover | null
  healthLogSummary?: { totalCount: number; abnormalCount: number; lastCheckedAt: string | null }
  incidents?: ClaimIncident[]
  billing?: ClaimBilling
}

/** CL3 */
export interface ClaimListItem {
  claimId: string
  claimCode: string
  bookingId: string
  bookingCode: string
  customerName: string
  claimType: ClaimType
  status: ClaimStatus
  title: string
  requestedCompensationAmount: number | null
  approvedCompensationAmount: number | null
  currency: string | null
  submittedAt: string
  reviewedAt: string | null
  resolvedAt: string | null
  updatedAt: string
}

export interface ClaimPage {
  items: ClaimListItem[]
  pageIndex: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface ClaimQueryParams {
  search?: string
  claimType?: ClaimType
  status?: ClaimStatus
  bookingId?: string
  submittedFrom?: string
  submittedTo?: string
  pageIndex: number
  pageSize: number
  sortBy: ClaimSort
}

/** CL2 body: no handover, currency or customer; the server derives them. */
export interface SubmitClaimPayload {
  claimType: ClaimType
  title: string
  description: string
  requestedCompensationAmount?: number
  evidenceNote?: string
  customerNote?: string
}

/** CL5 body. */
export interface ResolveClaimPayload {
  lastUpdatedAt: string
  resolutionType: ResolutionType
  approvedCompensationAmount?: number
  resolutionSummary: string
  correctiveAction?: string
  internalNote?: string
}

/** CL6 body. */
export interface CancelClaimPayload {
  lastUpdatedAt: string
  cancellationReason: string
}

/** B8 (Flow 1), only to show the horses of the booking next to the claim form. */
export interface ClaimBookingHorse {
  horseId: string
  horseName: string
  microchipNumber: string | null
}
