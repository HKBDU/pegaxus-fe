/**
 * In-memory stand-in for PS1-PS6 (+ the TP3 / RP2 / RP3 reads) while the BE does not serve them.
 * It enforces the same rules and error codes as api-contract/flow3.md section 11.
 *
 * Demo plans: the scenario comes from the last character of the transportPlanId, so any id works.
 *   ...1  APPROVED, phase 1 not assigned, route DRAFT (phase 2 locked)
 *   ...2  phase 1 assigned, route DRAFT (phase 2 locked, phase 1 can still be changed)
 *   ...3  phase 1 assigned, route CONFIRMED, phase 2 empty (default for any other id)
 *   ...4  everything assigned, segment 1 already COMPLETED (SEGMENT_LOCKED on change)
 *   ...5  plan still PENDING (no deposit): phase 1 answers DEPOSIT_REQUIRED
 * EMP-DRV-099 shows up in the lists but always fails on save with SCHEDULE_CONFLICT (SCR-F3-019).
 */
import { PersonnelApiError } from "@/features/personnel/errors"
import type {
  AssignableEmployeesPage,
  ComplianceDossierBrief,
  ComplianceDossierStatus,
  AssignableEmployeesParams,
  Assignments,
  EmployeeBrief,
  Phase1AssignPayload,
  Phase1ChangePayload,
  Phase1Result,
  Phase2AssignPayload,
  Phase2Result,
  Phase2Segment,
  PrimaryRoutePlanStatus,
  RoutePlanStatus,
  RoutePlanSummary,
  ScheduleConflictDetails,
  SegmentChangePayload,
  SegmentChangeResult,
  SegmentStatus,
  SegmentVehicle,
  TransportPlanStatus,
  TransportPlanSummary,
} from "@/features/personnel/types"

const emp = (employeeId: string, employeeCode: string, fullName: string, role: EmployeeBrief["role"]): EmployeeBrief => ({
  employeeId,
  employeeCode,
  fullName,
  role,
  email: `${fullName.toLowerCase().replace(/\s+/g, ".")}@pegaxus.example`,
  avatarUrl: null,
})

const EMPLOYEES: EmployeeBrief[] = [
  emp("e0000000-0000-4000-8000-000000000014", "EMP-TS-014", "Taylor Smith", "TRANSPORT_SPECIALIST"),
  emp("e0000000-0000-4000-8000-000000000021", "EMP-TS-021", "Nguyen Van A", "TRANSPORT_SPECIALIST"),
  emp("e0000000-0000-4000-8000-000000000033", "EMP-TS-033", "Maria Lopez", "TRANSPORT_SPECIALIST"),
  emp("e1000000-0000-4000-8000-000000000008", "EMP-RC-008", "Alex Turner", "FLEET_ROUTE_COORDINATOR"),
  emp("e1000000-0000-4000-8000-000000000035", "EMP-RC-035", "Pham Hoang Nam", "FLEET_ROUTE_COORDINATOR"),
  emp("e1000000-0000-4000-8000-000000000041", "EMP-RC-041", "Sofia Rossi", "FLEET_ROUTE_COORDINATOR"),
  emp("e2000000-0000-4000-8000-000000000021", "EMP-DRV-021", "Jean Dupont", "DRIVER"),
  emp("e2000000-0000-4000-8000-000000000028", "EMP-DRV-028", "Lukas Peeters", "DRIVER"),
  emp("e2000000-0000-4000-8000-000000000034", "EMP-DRV-034", "Lucas Bernard", "DRIVER"),
  emp("e2000000-0000-4000-8000-000000000042", "EMP-DRV-042", "Marc Petit", "DRIVER"),
  emp("e2000000-0000-4000-8000-000000000099", "EMP-DRV-099", "Victor Hale", "DRIVER"),
  emp("e3000000-0000-4000-8000-000000000003", "EMP-ESC-003", "Sophie Laurent", "ESCORT"),
  emp("e3000000-0000-4000-8000-000000000006", "EMP-ESC-006", "Emma Jacobs", "ESCORT"),
  emp("e3000000-0000-4000-8000-000000000009", "EMP-ESC-009", "Marie Laurent", "ESCORT"),
  emp("e3000000-0000-4000-8000-000000000012", "EMP-ESC-012", "Sophie Bernard", "ESCORT"),
]

const CONFLICT_CODE = "EMP-DRV-099"

interface MockSegment {
  routePlanRouteId: string
  sequenceNo: number
  from: string
  to: string
  distanceKm: number
  durationMinutes: number
  departure: string
  arrival: string
  provider: { id: string; code: string; name: string } | null
  status: SegmentStatus
  driver: EmployeeBrief | null
  escort: EmployeeBrief | null
  vehicles: SegmentVehicle[]
}

interface MockPlan {
  transportPlanId: string
  planCode: string
  status: TransportPlanStatus
  updatedAt: string
  ts: EmployeeBrief | null
  rc: EmployeeBrief | null
  phase1At: string | null
  dossierStatus: ComplianceDossierStatus | null
  routeStatus: RoutePlanStatus | null
  routeUpdatedAt: string
  segments: MockSegment[]
}

const plans = new Map<string, MockPlan>()

function wait(delay = 220) {
  return new Promise((resolve) => window.setTimeout(resolve, delay))
}

const find = (code: string) => EMPLOYEES.find((employee) => employee.employeeCode === code) as EmployeeBrief

function baseSegments(suffix: string): MockSegment[] {
  const vehicle = (n: number, code: string, plate: string): SegmentVehicle[] => [
    { vehicleId: `v${n}000000-0000-4000-8000-000000000000`, vehicleCode: code, vehicleName: "Horse transporter", licensePlate: plate },
  ]
  const seg = (n: number, from: string, to: string, km: number, min: number, dep: string, arr: string, provider: MockSegment["provider"]): MockSegment => ({
    routePlanRouteId: `s${n}000000-0000-4000-8000-${suffix.padStart(12, "0")}`,
    sequenceNo: n,
    from,
    to,
    distanceKm: km,
    durationMinutes: min,
    departure: `2026-10-27T${dep}:00Z`,
    arrival: `2026-10-27T${arr}:00Z`,
    provider,
    status: "PENDING",
    driver: null,
    escort: null,
    vehicles: provider ? [] : vehicle(n, `VH-00${n}`, `29C-${n}00.1${n}`),
  })
  return [
    seg(1, "Paris, France", "Lille, France", 225, 195, "06:00", "09:15", null),
    seg(2, "Lille, France", "Dunkirk, France", 75, 90, "10:00", "11:30", { id: "p0000000-0000-4000-8000-000000000004", code: "SP-TR-004", name: "EuroTrans Logistics" }),
    seg(3, "Dunkirk, France", "Ghent, Belgium", 110, 120, "12:30", "14:30", null),
    seg(4, "Ghent, Belgium", "Cologne, Germany", 240, 240, "15:00", "19:00", { id: "p0000000-0000-4000-8000-000000000006", code: "SP-TR-006", name: "Rhine Cargo Transport" }),
    seg(5, "Cologne, Germany", "Frankfurt, Germany", 190, 180, "20:00", "23:00", null),
  ]
}

function createPlan(transportPlanId: string): MockPlan {
  const now = new Date().toISOString()
  const scenario = transportPlanId.slice(-1)
  const segments = baseSegments(transportPlanId.slice(-12).replace(/[^0-9a-f]/gi, "0"))
  const plan: MockPlan = {
    transportPlanId,
    planCode: `TP-2026100${/[1-5]/.test(scenario) ? scenario : "3"}-0001`,
    status: "APPROVED",
    updatedAt: now,
    ts: null,
    rc: null,
    phase1At: null,
    dossierStatus: "IN_PREPARATION",
    routeStatus: "CONFIRMED",
    routeUpdatedAt: now,
    segments,
  }
  const assignPhase1 = () => {
    plan.ts = find("EMP-TS-014")
    plan.rc = find("EMP-RC-008")
    plan.phase1At = now
  }
  const assignPhase2 = () => {
    segments[0].driver = find("EMP-DRV-021")
    segments[0].escort = find("EMP-ESC-003")
    segments[2].driver = find("EMP-DRV-028")
    segments[2].escort = find("EMP-ESC-006")
    segments[4].driver = find("EMP-DRV-034")
    segments[4].escort = find("EMP-ESC-009")
  }
  if (scenario === "1") {
    plan.routeStatus = "DRAFT"
    plan.dossierStatus = null
  } else if (scenario === "2") {
    plan.routeStatus = "DRAFT"
    plan.dossierStatus = "DRAFT"
    assignPhase1()
  } else if (scenario === "4") {
    assignPhase1()
    assignPhase2()
    segments[0].status = "COMPLETED"
    plan.dossierStatus = "APPROVED"
  } else if (scenario === "5") {
    plan.status = "PENDING"
    plan.routeStatus = null
    plan.dossierStatus = null
  } else assignPhase1()
  return plan
}

function getPlan(transportPlanId: string) {
  let plan = plans.get(transportPlanId)
  if (!plan) {
    plan = createPlan(transportPlanId)
    plans.set(transportPlanId, plan)
  }
  return plan
}

const routePlanIdOf = (plan: MockPlan) => `rp-${plan.transportPlanId}`
const planOfRoute = (routePlanId: string) => {
  if (!routePlanId.startsWith("rp-")) throw new PersonnelApiError("ROUTE_PLAN_NOT_FOUND")
  return getPlan(routePlanId.slice(3))
}
const isOpen = (plan: MockPlan) => plan.routeStatus === "CONFIRMED" || plan.routeStatus === "ACTIVE"
const touchPlan = (plan: MockPlan) => void (plan.updatedAt = new Date().toISOString())
const touchRoute = (plan: MockPlan) => void (plan.routeUpdatedAt = new Date().toISOString())

function toPhase2Segment(segment: MockSegment): Phase2Segment {
  return {
    routePlanRouteId: segment.routePlanRouteId,
    sequenceNo: segment.sequenceNo,
    isOutsourced: Boolean(segment.provider),
    plannedDepartureAt: segment.departure,
    plannedArrivalAt: segment.arrival,
    driver: segment.driver,
    escort: segment.escort,
    provider: segment.provider
      ? { transportProviderId: segment.provider.id, providerCode: segment.provider.code, providerName: segment.provider.name }
      : null,
    isComplete: segment.provider ? true : Boolean(segment.driver && segment.escort),
  }
}

const isPersonnelComplete = (plan: MockPlan) => plan.segments.every((segment) => toPhase2Segment(segment).isComplete)

function assertEmployee(employeeId: string, role: EmployeeBrief["role"]) {
  const employee = EMPLOYEES.find((item) => item.employeeId === employeeId)
  if (!employee) throw new PersonnelApiError("EMPLOYEE_NOT_FOUND")
  if (employee.role !== role) throw new PersonnelApiError("INVALID_ROLE_ASSIGNMENT")
  return employee
}

function assertNoConflict(employee: EmployeeBrief, routePlanRouteId: string) {
  if (employee.employeeCode !== CONFLICT_CODE) return
  const label = employee.role === "ESCORT" ? "Escort" : "Driver"
  const details: ScheduleConflictDetails = {
    employeeId: employee.employeeId,
    employeeCode: employee.employeeCode,
    role: employee.role === "ESCORT" ? "ESCORT" : "DRIVER",
    routePlanRouteId,
    conflictingTransportPlanCode: "TP-20261003-0007",
    conflictingFromLocationName: "Brussels",
    conflictingToLocationName: "Amsterdam",
    conflictingPlannedDepartureAt: "2026-10-27T04:00:00Z",
    conflictingPlannedArrivalAt: "2026-10-27T10:00:00Z",
  }
  throw new PersonnelApiError("SCHEDULE_CONFLICT", {
    backendMessage: `${label} ${employee.employeeCode} is already assigned to Transport TP-20261003-0007 during this time slot.`,
    details,
  })
}

function assertPlanOpen(plan: MockPlan) {
  if (plan.status === "IN_PROGRESS" || plan.status === "COMPLETED" || plan.status === "CANCELLED") throw new PersonnelApiError("PLAN_LOCKED")
}

// ---------------------------------------------------------------- reads

export async function mockAssignable(params: AssignableEmployeesParams): Promise<AssignableEmployeesPage> {
  await wait(160)
  const needsWindow = params.role === "DRIVER" || params.role === "ESCORT"
  if (needsWindow && (!params.availableFrom || !params.availableTo)) throw new PersonnelApiError("VALIDATION_ERROR")
  const search = params.search?.trim().toLowerCase()
  const items = EMPLOYEES.filter(
    (employee) =>
      employee.role === params.role &&
      (!params.country || employee.country?.toUpperCase() === params.country.toUpperCase()) &&
      (!search || employee.fullName.toLowerCase().includes(search) || employee.employeeCode.toLowerCase().includes(search)),
  )
  const pageSize = params.pageSize ?? 20
  const pageIndex = params.pageIndex ?? 1
  return {
    items: items.slice((pageIndex - 1) * pageSize, pageIndex * pageSize),
    pageIndex,
    pageSize,
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
  }
}

export async function mockTransportPlan(transportPlanId: string): Promise<TransportPlanSummary> {
  await wait()
  const plan = getPlan(transportPlanId)
  return {
    transportPlanId,
    planCode: plan.planCode,
    status: plan.status,
    booking: {
      bookingId: "b0000000-0000-4000-8000-000000001002",
      bookingCode: "REQ-20261001-1002",
      customerName: "Royal Equestrian Club",
      originAddress: "Haras de Chantilly, Paris, France",
      destinationAddress: "Frankfurt Racecourse, Frankfurt, Germany",
      totalHorses: 4,
    },
    plannedStartAt: plan.segments[0].departure,
    updatedAt: plan.updatedAt,
  }
}

export async function mockAssignments(transportPlanId: string): Promise<Assignments> {
  await wait()
  const plan = getPlan(transportPlanId)
  const enabled = isOpen(plan)
  const withDate = (employee: EmployeeBrief | null) => (employee ? { ...employee, assignedAt: plan.phase1At } : null)
  const complianceDossier: ComplianceDossierBrief | null = plan.dossierStatus
    ? { complianceDossierId: `c0000000-0000-4000-8000-${transportPlanId.slice(-12)}`, dossierCode: "CDOS-20261001-0001", status: plan.dossierStatus }
    : null
  return {
    transportPlanId,
    complianceDossier,
    phase1: {
      isAssigned: Boolean(plan.ts && plan.rc),
      isLocked: enabled,
      transportSpecialist: withDate(plan.ts),
      routeCoordinator: withDate(plan.rc),
    },
    phase2: {
      enabled,
      routePlanId: enabled ? routePlanIdOf(plan) : null,
      isPersonnelComplete: enabled && isPersonnelComplete(plan),
      segments: enabled ? plan.segments.map(toPhase2Segment) : [],
    },
  }
}

export async function mockPrimaryRoutePlan(transportPlanId: string): Promise<PrimaryRoutePlanStatus | null> {
  await wait(120)
  const plan = getPlan(transportPlanId)
  if (!plan.routeStatus) return null
  return { routePlanId: routePlanIdOf(plan), routePlanCode: `RP-${plan.planCode.slice(3)}`, status: plan.routeStatus }
}

export async function mockRoutePlan(routePlanId: string): Promise<RoutePlanSummary> {
  await wait()
  const plan = planOfRoute(routePlanId)
  if (!plan.routeStatus) throw new PersonnelApiError("ROUTE_PLAN_NOT_FOUND")
  return {
    routePlanId,
    routePlanCode: `RP-${plan.planCode.slice(3)}`,
    status: plan.routeStatus,
    updatedAt: plan.routeUpdatedAt,
    segments: plan.segments.map((segment) => {
      const [fromName, fromCountry] = segment.from.split(", ")
      const [toName, toCountry] = segment.to.split(", ")
      return {
        routePlanRouteId: segment.routePlanRouteId,
        sequenceNo: segment.sequenceNo,
        status: segment.status,
        fromLocation: { locationId: `l-${segment.sequenceNo}-from`, locationName: fromName, city: fromName, country: fromCountry },
        toLocation: { locationId: `l-${segment.sequenceNo}-to`, locationName: toName, city: toName, country: toCountry },
        route: { distanceKm: segment.distanceKm, estimatedDurationMinutes: segment.durationMinutes },
        plannedDepartureAt: segment.departure,
        plannedArrivalAt: segment.arrival,
        isOutsourced: Boolean(segment.provider),
        vehicles: segment.vehicles,
      }
    }),
  }
}

// ---------------------------------------------------------------- writes

function phase1Result(plan: MockPlan): Phase1Result {
  const assignedAt = plan.updatedAt
  const assigned = (employee: EmployeeBrief) => ({ ...employee, responsibility: employee.role, isPrimary: true, assignedAt })
  return {
    transportPlanId: plan.transportPlanId,
    assignedEmployees: [plan.ts, plan.rc].filter((employee): employee is EmployeeBrief => Boolean(employee)).map(assigned),
    updatedAt: plan.updatedAt,
  }
}

export async function mockAssignPhase1(transportPlanId: string, payload: Phase1AssignPayload): Promise<Phase1Result> {
  await wait()
  const plan = getPlan(transportPlanId)
  assertPlanOpen(plan)
  if (plan.status !== "APPROVED") throw new PersonnelApiError("DEPOSIT_REQUIRED")
  if (plan.ts && plan.rc) throw new PersonnelApiError("PHASE1_ALREADY_ASSIGNED")
  plan.ts = assertEmployee(payload.transportSpecialistId, "TRANSPORT_SPECIALIST")
  plan.rc = assertEmployee(payload.routeCoordinatorId, "FLEET_ROUTE_COORDINATOR")
  plan.phase1At = new Date().toISOString()
  touchPlan(plan)
  return phase1Result(plan)
}

export async function mockChangePhase1(transportPlanId: string, payload: Phase1ChangePayload): Promise<Phase1Result> {
  await wait()
  const plan = getPlan(transportPlanId)
  assertPlanOpen(plan)
  if (payload.lastUpdatedAt !== plan.updatedAt) throw new PersonnelApiError("TRANSPORT_PLAN_MODIFIED")
  if (!plan.ts || !plan.rc) throw new PersonnelApiError("PHASE1_NOT_ASSIGNED")
  if (isOpen(plan)) throw new PersonnelApiError("PHASE1_LOCKED")
  if (payload.transportSpecialistId) plan.ts = assertEmployee(payload.transportSpecialistId, "TRANSPORT_SPECIALIST")
  if (payload.routeCoordinatorId) plan.rc = assertEmployee(payload.routeCoordinatorId, "FLEET_ROUTE_COORDINATOR")
  touchPlan(plan)
  return phase1Result(plan)
}

export async function mockAssignPhase2(routePlanId: string, payload: Phase2AssignPayload): Promise<Phase2Result> {
  await wait(300)
  const plan = planOfRoute(routePlanId)
  assertPlanOpen(plan)
  if (payload.lastUpdatedAt !== plan.routeUpdatedAt) throw new PersonnelApiError("ROUTE_PLAN_MODIFIED")
  if (!isOpen(plan)) throw new PersonnelApiError("ROUTE_NOT_CONFIRMED")

  const staged = new Map<string, { driver: EmployeeBrief; escort: EmployeeBrief }>()
  for (const input of payload.segments) {
    const segment = plan.segments.find((item) => item.routePlanRouteId === input.routePlanRouteId)
    if (!segment) throw new PersonnelApiError("SEGMENT_NOT_FOUND")
    if (segment.provider) throw new PersonnelApiError("OUTSOURCED_SEGMENT")
    if (segment.driver || segment.escort) throw new PersonnelApiError("SEGMENT_ALREADY_ASSIGNED")
    const driver = assertEmployee(input.driverEmployeeId, "DRIVER")
    const escort = assertEmployee(input.escortEmployeeId, "ESCORT")
    assertNoConflict(driver, segment.routePlanRouteId)
    assertNoConflict(escort, segment.routePlanRouteId)
    staged.set(segment.routePlanRouteId, { driver, escort })
  }
  const missing = plan.segments.some((segment) => !segment.provider && !staged.has(segment.routePlanRouteId))
  if (missing) throw new PersonnelApiError("VALIDATION_ERROR")

  for (const [segmentId, people] of staged) {
    const segment = plan.segments.find((item) => item.routePlanRouteId === segmentId) as MockSegment
    segment.driver = people.driver
    segment.escort = people.escort
  }
  touchRoute(plan)
  return {
    routePlanId,
    isPersonnelComplete: isPersonnelComplete(plan),
    segments: plan.segments.map(toPhase2Segment).map(({ routePlanRouteId, sequenceNo, isOutsourced, driver, escort, provider }) => ({
      routePlanRouteId,
      sequenceNo,
      isOutsourced,
      driver,
      escort,
      provider,
    })),
    updatedAt: plan.routeUpdatedAt,
  }
}

export async function mockChangeSegment(routePlanId: string, routePlanRouteId: string, payload: SegmentChangePayload): Promise<SegmentChangeResult> {
  await wait()
  const plan = planOfRoute(routePlanId)
  assertPlanOpen(plan)
  if (payload.lastUpdatedAt !== plan.routeUpdatedAt) throw new PersonnelApiError("ROUTE_PLAN_MODIFIED")
  const segment = plan.segments.find((item) => item.routePlanRouteId === routePlanRouteId)
  if (!segment) throw new PersonnelApiError("SEGMENT_NOT_FOUND")
  if (segment.provider) throw new PersonnelApiError("OUTSOURCED_SEGMENT")
  if (segment.status !== "PENDING") throw new PersonnelApiError("SEGMENT_LOCKED")
  const driver = payload.driverEmployeeId ? assertEmployee(payload.driverEmployeeId, "DRIVER") : null
  const escort = payload.escortEmployeeId ? assertEmployee(payload.escortEmployeeId, "ESCORT") : null
  if (driver) assertNoConflict(driver, segment.routePlanRouteId)
  if (escort) assertNoConflict(escort, segment.routePlanRouteId)
  if (driver) segment.driver = driver
  if (escort) segment.escort = escort
  touchRoute(plan)
  return {
    routePlanId,
    segment: toPhase2Segment(segment),
    isPersonnelComplete: isPersonnelComplete(plan),
    updatedAt: plan.routeUpdatedAt,
  }
}
