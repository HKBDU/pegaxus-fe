import type { ComplianceCategory, ComplianceRequirementSummary, ComplianceStatus } from "@/features/compliance-catalog/types"
import { formatUtcDate, formatUtcTime } from "@/shared/utils/datetime"

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

export function getBackendErrorMessage(error: unknown, fallback = "Request failed") {
  const value = error as {
    backendMessage?: unknown
    backendCode?: unknown
    response?: { data?: { message?: unknown; errorCode?: unknown } }
    cause?: { response?: { data?: { message?: unknown; errorCode?: unknown } } }
  }
  const data = value.response?.data ?? value.cause?.response?.data
  const message = value.backendMessage ?? data?.message
  if (typeof message === "string" && message.trim()) return message
  const code = value.backendCode ?? data?.errorCode
  if (typeof code === "string" && code.trim()) return code
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

/** The service rethrows API failures as Error(errorCode); mock mode throws the same codes. */
export function getComplianceErrorMessage(error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : ""
  return getBackendErrorMessage(error, complianceErrorMessages[code] ?? fallback)
}

export function formatValidity(requirement: Pick<ComplianceRequirementSummary, "validityRequired" | "validityPeriodDays">) {
  if (!requirement.validityRequired) return "Not required"
  const days = requirement.validityPeriodDays
  return days ? `${days} ${days === 1 ? "Day" : "Days"}` : "—"
}

export const formatComplianceDate = (value: string) => formatUtcDate(value)

/** "08:00 UTC": the label stays because the tables show the date and the time on two lines. */
export const formatComplianceTime = (value: string) => formatUtcTime(value)
