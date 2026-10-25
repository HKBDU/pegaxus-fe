// Enum values are the DB V10 ones (claim_type, claim_status, claim_resolution_type); api-contract/flow6.md Mục 10.
export const CLAIM_TYPES = ["HORSE_INJURY", "HORSE_HEALTH", "LOSS", "DAMAGE", "DELAY", "DOCUMENT_ISSUE", "SERVICE_ISSUE", "OTHER"] as const
export const CLAIM_STATUSES = ["PENDING", "APPROVED", "REJECTED", "RESOLVED", "CANCELLED"] as const
export const RESOLUTION_TYPES = ["COMPENSATION", "PARTIAL_COMPENSATION", "REFUND", "SERVICE_RECOVERY", "NO_COMPENSATION", "OTHER"] as const
export const CLAIM_SORTS = ["submittedAt:desc", "submittedAt:asc"] as const

export type ClaimType = (typeof CLAIM_TYPES)[number]
export type ClaimStatus = (typeof CLAIM_STATUSES)[number]
export type ResolutionType = (typeof RESOLUTION_TYPES)[number]
export type ClaimSort = (typeof CLAIM_SORTS)[number]

/** Server-computed actions; the buttons follow them and never infer from `status` (contract R20). */
export type ClaimAction = "CANCEL" | "RESOLVE" | "COMPLETE" | "CREATE_CREDIT_NOTE"

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  HORSE_INJURY: "Horse injury",
  HORSE_HEALTH: "Horse health",
  LOSS: "Loss",
  DAMAGE: "Damage",
  DELAY: "Delay",
  DOCUMENT_ISSUE: "Document issue",
  SERVICE_ISSUE: "Service issue",
  OTHER: "Other",
}

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
}

export const CLAIM_STATUS_COLORS: Record<ClaimStatus, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-800",
  APPROVED: "border-sky-300 bg-sky-50 text-sky-800",
  REJECTED: "border-red-300 bg-red-50 text-red-700",
  RESOLVED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-300 bg-slate-100 text-slate-600",
}

export const RESOLUTION_TYPE_LABELS: Record<ResolutionType, string> = {
  COMPENSATION: "Compensation",
  PARTIAL_COMPENSATION: "Partial compensation",
  REFUND: "Refund",
  SERVICE_RECOVERY: "Service recovery",
  NO_COMPENSATION: "No compensation",
  OTHER: "Other",
}

/** Resolution types that need an approved amount > 0 (R21); NO_COMPENSATION / SERVICE_RECOVERY carry none, OTHER is optional. */
export const AMOUNT_REQUIRED_RESOLUTIONS: readonly ResolutionType[] = ["COMPENSATION", "PARTIAL_COMPENSATION", "REFUND"]
export const AMOUNT_FORBIDDEN_RESOLUTIONS: readonly ResolutionType[] = ["NO_COMPENSATION", "SERVICE_RECOVERY"]

export const CLAIM_LIMITS = {
  titleMin: 10,
  titleMax: 200,
  descriptionMin: 10,
  descriptionMax: 2000,
  noteMax: 2000,
  summaryMin: 10,
  summaryMax: 2000,
  reasonMin: 10,
  reasonMax: 2000,
} as const

export const BILLING_WARNING_MESSAGES: Record<string, string> = {
  NO_FINAL_INVOICE: "This booking has no FINAL invoice yet. A credit note can only be issued after the FINAL invoice is paid (BR-057).",
  FINAL_NOT_PAID: "The FINAL invoice is not paid yet. A credit note can only be issued after the FINAL invoice is paid (BR-057).",
}

export const CREDIT_NOTE_BLOCKED_MESSAGES: Record<string, string> = {
  CLAIM_NOT_APPROVED: "The claim must be approved first.",
  NO_COMPENSATION_APPROVED: "No compensation amount was approved for this claim.",
  FINAL_NOT_PAID: "The FINAL invoice must be paid first.",
  NO_FINAL_INVOICE: "This booking has no FINAL invoice yet.",
}

/** Contract error table (Mục 10) + the generic ones every endpoint can return. */
export const CLAIM_ERROR_MESSAGES: Record<string, string> = {
  BOOKING_NOT_FOUND: "Booking not found.",
  CLAIM_NOT_FOUND: "Claim not found.",
  HANDOVER_NOT_COMPLETED: "The handover record has not been signed yet. A claim can only be submitted after the handover is completed.",
  CLAIM_WINDOW_EXPIRED: "The claim period for this handover (24 hours after the e-POD is signed) has expired. Please contact customer care for assistance.",
  INVALID_CLAIM_STATUS: "This action cannot be performed in the current status of the claim. Reload to see the latest state.",
  CLAIM_ALREADY_RESOLVED: "This claim already has a resolution.",
  CLAIM_MODIFIED: "The claim was just modified. Please reload the page.",
  FORBIDDEN: "You are not allowed to do this.",
}
