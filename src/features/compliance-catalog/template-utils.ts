import type { TemplateStatus } from "@/features/compliance-catalog/template-types"
import { getBackendErrorMessage } from "@/features/compliance-catalog/utils"

const templateStatusLabels: Record<TemplateStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
}

// Messages for the errorCode values the BE returns (API contract, flow 2, section 4).
const templateErrorMessages: Record<string, string> = {
  DUPLICATE_TEMPLATE_CODE: "Template code already exists. Please use a unique template code.",
  DTI_DUPLICATE: "Duplicate ComplianceRequirement or Sequence Number detected in the same template. Each requirement and sequence number must be unique within a DossierTemplate.",
  TEMPLATE_NEEDS_ONE_ITEM: "A DossierTemplate must contain at least 1 item.",
  TEMPLATE_IN_USE: "This DossierTemplate is linked to existing ComplianceDossiers, so it cannot be edited or deleted. Change its status to INACTIVE instead.",
  DOSSIER_TEMPLATE_IN_USE: "This DossierTemplate is linked to existing ComplianceDossiers, so it cannot be deleted. Change its status to INACTIVE instead.",
  TEMPLATE_NOT_ACTIVATABLE: "A template needs at least 1 item and valid effective dates before it can be activated.",
  VALIDATION_ERROR: "Some fields are invalid. Check the form and try again.",
  NOT_FOUND: "This DossierTemplate no longer exists.",
  FORBIDDEN: "Access denied. Only Transport Specialists can modify DossierTemplates.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
}

export const getTemplateStatusLabel = (status: TemplateStatus) => templateStatusLabels[status]

/** The service rethrows API failures as Error(errorCode); mock mode throws the same codes. */
export function getTemplateErrorMessage(error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : ""
  return getBackendErrorMessage(error, templateErrorMessages[code] ?? fallback)
}

export function formatTemplateDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value))
}

// Messages for the errorCode values of the dossier endpoints D2/D3 (API contract, flow 2, section 5-6).
const dossierErrorMessages: Record<string, string> = {
  BOOKING_NOT_APPROVED: "ComplianceDossier can only be initialized for APPROVED transport bookings.",
  DOSSIER_ALREADY_EXISTS: "A ComplianceDossier already exists for this booking. Please manage individual DossierRequirements instead.",
  TEMPLATE_OR_MANUAL_REQUIRED: "Select a template with at least one item, or add at least one custom requirement.",
  TEMPLATE_ITEM_INVALID: "A selected template item no longer belongs to this template, or the template is not ACTIVE. Go back and reselect the template.",
  REQUIREMENT_INACTIVE: "A selected ComplianceRequirement is no longer ACTIVE.",
  DR_DUPLICATE: "This ComplianceRequirement is already required for this dossier/horse combination.",
  HORSE_NOT_IN_BOOKING: "The selected horse does not belong to this booking.",
  BOOKING_CHANGE_IN_PROGRESS: "Operation aborted: the booking is being changed and is no longer APPROVED.",
  DOSSIER_CLOSED: "Operation aborted: The associated Booking status has changed and is no longer APPROVED.",
}

export function getDossierErrorMessage(error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : ""
  return getBackendErrorMessage(error, dossierErrorMessages[code] ?? getTemplateErrorMessage(error, fallback))
}

// Messages for the errorCode values of D3/D5 (API contract, flow 2, section 6).
const requirementErrorMessages: Record<string, string> = {
  MANDATORY_DR_CANNOT_BE_REMOVED: "Mandatory core DossierRequirements cannot be removed. You may only modify optional requirements.",
  DR_HAS_DOCUMENT: "Cannot remove a DossierRequirement that already has a ComplianceDocument.",
  DOSSIER_LOCKED: "Cannot modify DossierRequirements after dossier submission to official authorities.",
  DOSSIER_NOT_FOUND: "ComplianceDossier not found.",
}

export function getRequirementErrorMessage(error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : ""
  return getBackendErrorMessage(error, requirementErrorMessages[code] ?? getDossierErrorMessage(error, fallback))
}
