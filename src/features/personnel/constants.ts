import type { AssignableRole, RoutePlanStatus, TransportPlanStatus } from "@/features/personnel/types"

export const REASON_MAX = 500

/** PS6 pageSize: dropdowns show the first page only (BE already filters out unavailable people). */
export const ASSIGNABLE_PAGE_SIZE = 50

export const ROLE_LABEL: Record<AssignableRole, string> = {
  TRANSPORT_SPECIALIST: "Transport Specialist",
  FLEET_ROUTE_COORDINATOR: "Route Coordinator",
  DRIVER: "Driver",
  ESCORT: "Escort",
}

/** Countries of the optional "filter by country" of PS6 (ISO-2 code, as `Employee.country` and `Location.country`). */
export const COUNTRY_FILTER_OPTIONS: { code: string; label: string }[] = [
  { code: "AT", label: "Austria" },
  { code: "BE", label: "Belgium" },
  { code: "DK", label: "Denmark" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "IE", label: "Ireland" },
  { code: "IT", label: "Italy" },
  { code: "NL", label: "Netherlands" },
  { code: "ES", label: "Spain" },
  { code: "SE", label: "Sweden" },
  { code: "CH", label: "Switzerland" },
  { code: "GB", label: "United Kingdom" },
]

export const TRANSPORT_PLAN_STATUS_LABEL: Record<TransportPlanStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export const ROUTE_PLAN_STATUS_LABEL: Record<RoutePlanStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

/** The plan can no longer be re-assigned once it has left APPROVED territory (BE answers 409 PLAN_LOCKED). */
export const PLAN_LOCKED_STATUSES: readonly TransportPlanStatus[] = ["IN_PROGRESS", "COMPLETED", "CANCELLED"]
