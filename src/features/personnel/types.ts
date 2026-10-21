/** Personnel types follow api-contract/flow3.md (sections 3.1, 3.7, 11: PS1-PS6). IDs are uuid strings. */

export type ApiEnvelope<T> = { isSuccess?: boolean; code?: number; message?: string; value: T }

/** Values of the DB `employee_role` enum used by PS6. */
export const ASSIGNABLE_ROLES = ["TRANSPORT_SPECIALIST", "FLEET_ROUTE_COORDINATOR", "DRIVER", "ESCORT"] as const
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

export const TRANSPORT_PLAN_STATUSES = ["DRAFT", "PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const
export type TransportPlanStatus = (typeof TRANSPORT_PLAN_STATUSES)[number]

export const ROUTE_PLAN_STATUSES = ["DRAFT", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"] as const
export type RoutePlanStatus = (typeof ROUTE_PLAN_STATUSES)[number]

export type SegmentStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED"

/** 3.1 EmployeeBrief. */
export interface EmployeeBrief {
  employeeId: string
  employeeCode: string
  fullName: string
  role: AssignableRole | "LOGISTICS_MANAGER"
  /** Account.email (nullable). Shown on the Phase 1 cards. */
  email?: string | null
  /** Account.avatar_url (nullable). Shown on the employee cards of the dialogs. */
  avatarUrl?: string | null
  /** Employee.country: where the person works now (ISO-2, nullable). Shown in the dropdowns, used for the R18 warning. */
  country?: string | null
}

/** PS2 phase 1 person: EmployeeBrief + EmployeeTransportPlan.assigned_at. */
export interface Phase1Person extends EmployeeBrief {
  assignedAt?: string | null
}

/** compliance_dossier_status of the DB. */
export const COMPLIANCE_DOSSIER_STATUSES = [
  "DRAFT",
  "IN_PREPARATION",
  "READY_FOR_SUBMISSION",
  "SUBMITTED",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CLOSED",
] as const
export type ComplianceDossierStatus = (typeof COMPLIANCE_DOSSIER_STATUSES)[number]

/** PS2 `complianceDossier`: only a chip is shown, nothing branches on the value. */
export interface ComplianceDossierBrief {
  complianceDossierId: string
  dossierCode: string
  status: ComplianceDossierStatus
}

/** Vehicle of a segment (RP3 `segment.vehicles`). */
export interface SegmentVehicle {
  vehicleId: string
  vehicleCode: string
  vehicleName?: string | null
  licensePlate?: string | null
}

/** `value` of a 409 SCHEDULE_CONFLICT answer (contract section 11). Optional: the `message` alone is enough to show the error. */
export interface ScheduleConflictDetails {
  employeeId?: string
  employeeCode?: string
  role?: AssignableRole
  routePlanRouteId?: string
  conflictingTransportPlanCode?: string
  conflictingFromLocationName?: string
  conflictingToLocationName?: string
  conflictingPlannedDepartureAt?: string
  conflictingPlannedArrivalAt?: string
}

export interface ProviderBrief {
  transportProviderId: string
  providerCode: string
  providerName: string
}

// ---------------------------------------------------------------- PS6 (assignable employees)

export interface AssignableEmployeesParams {
  role: AssignableRole
  /** Required for DRIVER / ESCORT: plannedDepartureAt / plannedArrivalAt of the segment. */
  availableFrom?: string
  availableTo?: string
  /** The plan being assigned: its own segments never make a person "busy" (PS6). */
  transportPlanId?: string
  /** Optional filter chosen by the Route Coordinator (ISO-2). Never sent by default (R18). */
  country?: string
  search?: string
  pageIndex?: number
  pageSize?: number
}

/** What the Route Coordinator typed / picked in the search and country filter of the assignment dialogs. */
export interface AssignableFilters {
  search?: string
  country?: string
}

export interface AssignableEmployeesPage {
  items: EmployeeBrief[]
  pageIndex: number
  pageSize: number
  totalItems: number
  totalPages: number
}

// ---------------------------------------------------------------- PS2 (assignments)

export interface Phase1Assignment {
  isAssigned: boolean
  /** true when phase 2 is open: the TS / RC can no longer be changed. */
  isLocked: boolean
  transportSpecialist: Phase1Person | null
  routeCoordinator: Phase1Person | null
}

export interface Phase2Segment {
  routePlanRouteId: string
  sequenceNo: number
  isOutsourced: boolean
  plannedDepartureAt: string
  plannedArrivalAt: string
  driver: EmployeeBrief | null
  escort: EmployeeBrief | null
  provider: ProviderBrief | null
  isComplete: boolean
}

export interface Phase2Assignment {
  /** false until the PRIMARY RoutePlan is CONFIRMED (server decides, FE never compares route status). */
  enabled: boolean
  routePlanId: string | null
  isPersonnelComplete: boolean
  segments: Phase2Segment[]
}

export interface Assignments {
  transportPlanId: string
  /** null while the transport has no compliance dossier yet. */
  complianceDossier?: ComplianceDossierBrief | null
  phase1: Phase1Assignment
  phase2: Phase2Assignment
}

// ---------------------------------------------------------------- read-only context (TP3, RP2, RP3)

/** Subset of TP3 used by this feature. updatedAt is the lastUpdatedAt of PS5. */
export interface TransportPlanSummary {
  transportPlanId: string
  planCode: string
  status: TransportPlanStatus
  booking: {
    bookingId: string
    bookingCode: string
    customerName: string
    originAddress: string | null
    destinationAddress: string | null
    totalHorses: number
  }
  plannedStartAt: string | null
  updatedAt: string
}

export interface LocationBrief {
  locationId: string
  locationName: string
  city?: string | null
  country?: string | null
}

/** Segment of RP3, trimmed to what the assignment screens show. */
export interface RouteSegmentInfo {
  routePlanRouteId: string
  sequenceNo: number
  status: SegmentStatus
  fromLocation: LocationBrief
  toLocation: LocationBrief
  route: { distanceKm: number | null; estimatedDurationMinutes: number | null } | null
  plannedDepartureAt: string
  plannedArrivalAt: string
  isOutsourced: boolean
  vehicles?: SegmentVehicle[]
}

/** Subset of RP3. updatedAt is the lastUpdatedAt of PS3 / PS4. */
export interface RoutePlanSummary {
  routePlanId: string
  routePlanCode: string
  status: RoutePlanStatus
  updatedAt: string
  segments: RouteSegmentInfo[]
}

/** Primary route plan row of RP2, only to show its status while phase 2 is still locked. */
export interface PrimaryRoutePlanStatus {
  routePlanId: string
  routePlanCode: string
  status: RoutePlanStatus
}

// ---------------------------------------------------------------- writes

/** PS1 body. */
export interface Phase1AssignPayload {
  transportSpecialistId: string
  routeCoordinatorId: string
}

/** PS5 body: an omitted id keeps the current person. */
export interface Phase1ChangePayload {
  lastUpdatedAt: string
  transportSpecialistId?: string
  routeCoordinatorId?: string
  reason: string
}

export interface AssignedEmployee extends EmployeeBrief {
  responsibility: string
  isPrimary: boolean
  assignedAt: string
}

export interface Phase1Result {
  transportPlanId: string
  assignedEmployees: AssignedEmployee[]
  updatedAt: string
}

export interface Phase2SegmentInput {
  routePlanRouteId: string
  driverEmployeeId: string
  escortEmployeeId: string
}

/** PS3 body: one entry per internal segment. */
export interface Phase2AssignPayload {
  lastUpdatedAt: string
  segments: Phase2SegmentInput[]
}

export interface Phase2Result {
  routePlanId: string
  isPersonnelComplete: boolean
  segments: Pick<Phase2Segment, "routePlanRouteId" | "sequenceNo" | "isOutsourced" | "driver" | "escort" | "provider">[]
  updatedAt: string
}

/** PS4 body: an omitted id keeps the current person. */
export interface SegmentChangePayload {
  lastUpdatedAt: string
  driverEmployeeId?: string
  escortEmployeeId?: string
  reason: string
}

export interface SegmentChangeResult {
  routePlanId: string
  segment: Phase2Segment
  isPersonnelComplete: boolean
  updatedAt: string
}
