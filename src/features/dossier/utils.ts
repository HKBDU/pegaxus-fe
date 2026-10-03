import type { AuditActionType, DossierStatus } from "@/features/dossier/types"

const statusLabels: Record<DossierStatus, string> = {
  DRAFT: "Draft",
  IN_PREPARATION: "In preparation",
  READY_FOR_SUBMISSION: "Ready for submission",
  SUBMITTED: "Submitted",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CLOSED: "Closed",
}

export const getDossierStatusLabel = (status: DossierStatus) => statusLabels[status]

/** "DOCUMENT_REVIEW_APPROVED" -> "Document review approved" (used in filters). */
export function humanizeAction(action: string) {
  const text = action.replaceAll("_", " ").toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export type AuditTone = "neutral" | "info" | "success" | "danger" | "warning" | "accent"

const auditTones: Partial<Record<AuditActionType, AuditTone>> = {
  DOSSIER_INITIALIZED: "neutral",
  DOSSIER_STATUS_CHANGED: "neutral",
  DOSSIER_REQUIREMENT_ADDED: "info",
  DOSSIER_REQUIREMENT_REMOVED: "danger",
  DOSSIER_REQUIREMENT_UPDATED: "info",
  DOSSIER_REQUIREMENT_WAIVED: "neutral",
  DOSSIER_REQUIREMENT_REMINDED: "warning",
  DOCUMENT_VERSION_SUBMITTED: "info",
  DOCUMENT_REVIEW_APPROVED: "success",
  DOCUMENT_REVIEW_REJECTED: "danger",
  DOCUMENT_REVIEW_REVISION_REQUIRED: "warning",
  DOCUMENT_REQUEST_CREATED: "warning",
  AUTHORITY_SUBMITTED: "info",
  AUTHORITY_DECISION_UPDATED: "accent",
  QUARANTINE_PROOF_SUBMITTED: "info",
  QUARANTINE_RESULT_FINALIZED: "accent",
  CUSTOMS_PROOF_SUBMITTED: "info",
  CUSTOMS_RESULT_FINALIZED: "accent",
}

export const getAuditTone = (action: AuditActionType): AuditTone => auditTones[action] ?? "neutral"

const roleLabels: Record<string, string> = {
  CUSTOMER: "Customer",
  LOGISTICS_MANAGER: "Logistics Manager",
  TRANSPORT_SPECIALIST: "Transport Specialist",
  FLEET_ROUTE_COORDINATOR: "Fleet Route Coordinator",
  DRIVER: "Driver",
  ESCORT: "Escort",
}

export const getRoleLabel = (role: string) => roleLabels[role] ?? humanizeAction(role)

export function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ""
  return (first + last).toUpperCase()
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
const dateTimeUtcFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC" })
const dateTimeLocalFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })

export const formatDossierDate = (value: string) => dateFormat.format(new Date(value))
export const formatUtcDateTime = (value: string) => `${dateTimeUtcFormat.format(new Date(value))} UTC`
export const formatLocalDateTime = (value: string) => dateTimeLocalFormat.format(new Date(value))

const dashboardErrorMessages: Record<string, string> = {
  FORBIDDEN: "Access denied. Only Transport Specialists and Logistics Managers can open this page.",
  INVALID_EXPORT_FORMAT: "The export format must be xlsx or pdf.",
  DOSSIER_NOT_FOUND: "This ComplianceDossier no longer exists.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
}

/** The services rethrow API failures as Error(errorCode); mock mode throws the same codes. */
export function getDossierErrorMessage(error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : ""
  return dashboardErrorMessages[code] ?? fallback
}
