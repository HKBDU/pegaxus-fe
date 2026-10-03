import type { ComplianceCategory, ComplianceRequirementSummary, ComplianceStatus } from "@/features/compliance-catalog/types"

const categoryLabels: Record<ComplianceCategory, string> = {
  QUARANTINE: "Quarantine",
  CUSTOMS: "Customs",
  TRANSPORT: "Transport",
  HORSE_HEALTH: "Horse Health",
  HORSE_IDENTITY: "Horse Identity",
  OTHER: "Other",
}

const statusLabels: Record<ComplianceStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
}

// Messages for the errorCode values the BE returns (API contract, flow 2, section 3).
const complianceErrorMessages: Record<string, string> = {
  DUPLICATE_REQUIREMENT_CODE: "A ComplianceRequirement with this code already exists. Please use a unique code or edit the existing record.",
  REQUIREMENT_IN_USE: "Cannot delete this ComplianceRequirement because it is linked to existing DossierTemplates or ComplianceDossiers. Please deactivate it instead.",
  REFERENCE_IMPACT_CONFIRMATION_REQUIRED: "This ComplianceRequirement is in use. Confirm that you accept responsibility for the change.",
  VALIDATION_ERROR: "Some fields are invalid. Check the form and try again.",
  NOT_FOUND: "This ComplianceRequirement no longer exists.",
  FORBIDDEN: "Access denied. Only Transport Specialists can modify ComplianceRequirements.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
}

export const getComplianceCategoryLabel = (category: ComplianceCategory) => categoryLabels[category]
export const getComplianceStatusLabel = (status: ComplianceStatus) => statusLabels[status]

/** The service rethrows API failures as Error(errorCode); mock mode throws the same codes. */
export function getComplianceErrorMessage(error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : ""
  return complianceErrorMessages[code] ?? fallback
}

export function formatValidity(requirement: Pick<ComplianceRequirementSummary, "validityRequired" | "validityPeriodDays">) {
  if (!requirement.validityRequired) return "Not required"
  const days = requirement.validityPeriodDays
  return days ? `${days} ${days === 1 ? "Day" : "Days"}` : "—"
}

export function formatComplianceDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value))
}

export function formatComplianceTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(value))
}
