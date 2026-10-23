import { normalizeRole } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { INCIDENT_ACTION } from "@/shared/constants/incident"
import { useNotificationStore, type NotificationPriority } from "@/shared/realtime"

import { IncidentApiError } from "./errors"
import { customerIncidentSchema } from "./schemas"
import type {
  CancelInput,
  CustomerIncident,
  Incident,
  IncidentCostRequest,
  IncidentList,
  IncidentListItem,
  IncidentListParams,
  ResolveInput,
  SelfResolveInput,
} from "./types"

/** In-memory stand-in for IN7-IN11 while the BE is not wired (flag `VITE_INCIDENT_MOCK`). Shapes equal the real responses. */

const MIN = 60_000
const HOUR = 60 * MIN
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms))

const SEVERITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const

const svg = (label: string, color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="${color}"/><text x="240" y="170" font-family="sans-serif" font-size="22" fill="#fff" text-anchor="middle">${label}</text></svg>`,
  )}`

const reporters = {
  driver: { employeeId: "emp-driver-1", employeeCode: "DRV-0007", fullName: "Nguyen Van Minh", role: "DRIVER", phone: "+84 90 123 4567" },
  escort: { employeeId: "emp-escort-1", employeeCode: "ESC-0003", fullName: "Tran Thi Lan", role: "ESCORT", phone: "+84 91 765 4321" },
}
const manager = { employeeId: "emp-lm-1", employeeCode: "LM-0001", fullName: "Le Quang Huy", role: "LOGISTICS_MANAGER", phone: "+84 98 000 1111" }

const places = [
  { locationId: "loc-1", locationName: "A1 Highway, km 214", locationType: "ROAD", city: "Lyon", country: "France", latitude: 45.764, longitude: 4.8357 },
  { locationId: "loc-2", locationName: "Dover Eastern Docks", locationType: "PORT", city: "Dover", country: "United Kingdom", latitude: 51.1279, longitude: 1.3134 },
  { locationId: "loc-3", locationName: "Rest Area Kassel-Ost", locationType: "REST_STOP", city: "Kassel", country: "Germany", latitude: 51.3127, longitude: 9.4797 },
  { locationId: "loc-4", locationName: "Newmarket Stables", locationType: "STABLE", city: "Newmarket", country: "United Kingdom", latitude: 52.2453, longitude: 0.4067 },
]

const transports = [
  { transportId: "tr-1", transportCode: "TRN-2026-0042", status: "IN_TRANSIT", bookingCode: "BK-2026-0108" },
  { transportId: "tr-2", transportCode: "TRN-2026-0045", status: "IN_TRANSIT", bookingCode: "BK-2026-0112" },
  { transportId: "tr-3", transportCode: "TRN-2026-0051", status: "IN_TRANSIT", bookingCode: "BK-2026-0120" },
]

const vehicle = { vehicleId: "veh-1", vehicleCode: "VEH-014", licensePlate: "75C-123.45", vehicleName: "Mercedes Actros Horse Carrier", status: "IN_USE" }
const horseA = { horseId: "h-1", horseName: "Thunder Bolt", microchipNumber: "250268731234567", breed: "Thoroughbred", stallNo: 2 }
const horseB = { horseId: "h-2", horseName: "Silver Mist", microchipNumber: "250268739876543", breed: "Arabian", stallNo: 3 }

function cost(partial: Partial<IncidentCostRequest> & Pick<IncidentCostRequest, "emergencyCostRequestId" | "requestCode" | "category" | "status" | "requestedAmount">): IncidentCostRequest {
  return {
    description: "Emergency service needed on the road",
    justification: "No alternative available within the safe window",
    approvedAmount: null,
    currency: "VND",
    requestedAt: ago(40 * MIN),
    requestedBy: reporters.escort,
    decision: null,
    cancelledAt: null,
    cancellationReason: null,
    invoiceRequired: true,
    createdAt: ago(40 * MIN),
    updatedAt: ago(40 * MIN),
    ...partial,
  }
}

function summarize(requests: IncidentCostRequest[]) {
  return {
    requestedTotal: requests.reduce((sum, item) => sum + item.requestedAmount, 0),
    approvedTotal: requests.filter((item) => item.status === "APPROVED").reduce((sum, item) => sum + (item.approvedAmount ?? 0), 0),
    pendingCount: requests.filter((item) => item.status === "PENDING").length,
    currency: "VND",
  }
}

type Seed = Partial<Incident> & Pick<Incident, "incidentReportId" | "incidentCode" | "category" | "severity" | "status" | "title">

function build(seed: Seed): Incident {
  const costRequests = seed.costRequests ?? []
  const costSummary = summarize(costRequests)
  const occurredAt = seed.occurredAt ?? ago(30 * MIN)
  return {
    transport: transports[0],
    description: "Reported by the crew from the road. Details are being collected.",
    immediateAction: "Vehicle stopped at a safe place, hazard lights on.",
    occurredAt,
    reportedAt: occurredAt,
    resolvedAt: null,
    resolutionSummary: null,
    cancelledAt: null,
    cancellationReason: null,
    location: places[0],
    reportedBy: reporters.driver,
    vehicle: null,
    horses: [],
    vehicleDetail: null,
    horseDetails: [],
    photos: [],
    photoCount: 0,
    emergencySettlementRequired: costRequests.length > 0,
    costRequests,
    costRequestCount: costRequests.length,
    pendingCostCount: costSummary.pendingCount,
    approvedTotal: costSummary.approvedTotal,
    costSummary,
    routeChanges: [],
    hold: null,
    canResolve: costSummary.pendingCount === 0,
    availableActions: [],
    serverTime: new Date().toISOString(),
    createdAt: occurredAt,
    updatedAt: occurredAt,
    ...seed,
  }
}

const vehicleDetail = (incidentType: string): NonNullable<Incident["vehicleDetail"]> => ({
  vehicleIncidentDetailId: "vid-1",
  vehicle,
  incidentType,
  vehicleCondition: "Front-left tire burst, vehicle immobile",
  damageDescription: "Tire blowout at highway speed; rim damaged.",
  vehicleOperable: false,
  repairRequired: true,
  towingRequired: true,
  replacementVehicleRequired: false,
  estimatedRepairCost: 8_500_000,
  estimatedRepairHours: 4,
  driverSafetyStatus: "SAFE",
  cargoConditionNote: "Horses calm, ventilation working.",
  repairNote: null,
  updatedAt: ago(25 * MIN),
})

const horseDetail = (horse: typeof horseA, incidentType: string): Incident["horseDetails"][number] => ({
  horseHealthIncidentDetailId: `hhid-${horse.horseId}`,
  horse,
  incidentType,
  conditionDescription: "Limping on the right fore leg after braking, mild swelling.",
  symptoms: "Lameness, elevated heart rate",
  bodyTemperatureCelsius: 38.9,
  heartRateBpm: 52,
  respiratoryRateBpm: 18,
  firstAidProvided: "Cold compress applied, horse rested.",
  veterinarianRequired: true,
  veterinarianContactedAt: ago(15 * MIN),
  isolationRequired: false,
  veterinarianInstruction: "Keep the leg stable, do not unload until the vet arrives.",
  medicationGiven: null,
  outcomeNote: null,
  horseTransportable: true,
  updatedAt: ago(15 * MIN),
})

const vehiclePhotos = [
  { photoId: "ph-1", photoUrl: svg("Scene photo 1", "#64748b"), caption: "Damaged tire", horseHealthIncidentDetailId: null, sortOrder: 1 },
  { photoId: "ph-2", photoUrl: svg("Scene photo 2", "#475569"), caption: "Vehicle position", horseHealthIncidentDetailId: null, sortOrder: 2 },
]
const horsePhotos = [{ photoId: "ph-3", photoUrl: svg("Horse condition", "#92400e"), caption: "Swollen fore leg", horseHealthIncidentDetailId: "hhid-h-1", sortOrder: 3 }]

let store: Incident[] = [
  build({
    incidentReportId: "inc-1", incidentCode: "INC-2026-0001", category: "BOTH", severity: "CRITICAL", status: "REPORTED",
    title: "Tire blowout, horse injured", occurredAt: ago(60 * MIN), reportedAt: ago(58 * MIN),
    description: "Front-left tire burst while braking. One horse lost balance and now favours the right fore leg.",
    vehicle, vehicleDetail: vehicleDetail("TIRE_DAMAGE"), horses: [horseA], horseDetails: [horseDetail(horseA, "INJURY")],
    photos: [...vehiclePhotos, ...horsePhotos], photoCount: 3,
    costRequests: [
      cost({ emergencyCostRequestId: "cr-1", requestCode: "ECR-2026-0011", category: "TOWING", status: "PENDING", requestedAmount: 4_200_000 }),
      cost({
        emergencyCostRequestId: "cr-2", requestCode: "ECR-2026-0012", category: "VETERINARY", status: "APPROVED", requestedAmount: 2_800_000, approvedAmount: 2_500_000,
        decision: { decision: "APPROVED", approvedAmount: 2_500_000, decisionReason: "Approved with a reduced fee", decidedBy: manager, decidedAt: ago(20 * MIN) },
      }),
    ],
  }),
  build({
    incidentReportId: "inc-2", incidentCode: "INC-2026-0002", category: "VEHICLE", severity: "HIGH", status: "PENDING",
    title: "Engine overheating", transport: transports[1], occurredAt: ago(3 * HOUR), location: places[1], reportedBy: reporters.escort,
    vehicle, vehicleDetail: { ...vehicleDetail("ENGINE_FAILURE"), vehicleOperable: true, towingRequired: false, vehicleCondition: "Coolant warning, engine at 110C" },
    photos: vehiclePhotos.slice(0, 1), photoCount: 1,
    hold: {
      status: "ACTIVE", startedAt: ago(20 * MIN), holdUntil: new Date(Date.now() + 70 * MIN).toISOString(), holdMinutes: 90, monitorIntervalMinutes: 30,
      reason: "Wait for the engine to cool and re-check coolant before deciding on the route.", safeStopLocation: places[1], decidedBy: manager,
    },
    routeChanges: [{ routePlanId: "rp-1", routePlanCode: "RP-2026-0031", routeType: "CONTINGENCY", status: "DRAFT", updatedAt: ago(15 * MIN) }],
    costRequests: [cost({ emergencyCostRequestId: "cr-3", requestCode: "ECR-2026-0013", category: "VEHICLE_REPAIR", status: "PENDING", requestedAmount: 6_000_000 })],
  }),
  build({
    incidentReportId: "inc-3", incidentCode: "INC-2026-0003", category: "HORSE_HEALTH", severity: "HIGH", status: "REPORTED",
    title: "Suspected colic", transport: transports[2], occurredAt: ago(55 * MIN), location: places[2], reportedBy: reporters.escort,
    horses: [horseB], horseDetails: [{ ...horseDetail(horseB, "COLIC"), conditionDescription: "Restless, pawing, repeatedly looking at flank.", isolationRequired: true }],
    photos: [{ ...horsePhotos[0], horseHealthIncidentDetailId: "hhid-h-2" }], photoCount: 1,
  }),
  ...Array.from({ length: 6 }, (_, index) =>
    build({
      incidentReportId: `inc-${index + 4}`, incidentCode: `INC-2026-${String(index + 4).padStart(4, "0")}`,
      category: (["VEHICLE", "HORSE_HEALTH", "ROUTE_CHANGE", "VEHICLE", "HORSE_HEALTH", "ROUTE_CHANGE"] as const)[index],
      severity: (["MEDIUM", "LOW", "MEDIUM", "LOW", "MEDIUM", "LOW"] as const)[index],
      status: (["REPORTED", "PENDING", "REPORTED", "RESOLVED", "RESOLVED", "CANCELLED"] as const)[index],
      title: ["Minor mirror damage", "Horse refused feed", "Road closure ahead", "Windscreen chip", "Mild dehydration treated", "Duplicate report"][index],
      transport: transports[index % 3], occurredAt: ago((index + 2) * 6 * HOUR), location: places[index % 4],
      reportedBy: index % 2 ? reporters.escort : reporters.driver,
      ...(index === 3 || index === 4 ? {
        resolvedAt: ago(index * HOUR), resolutionSummary: "Handled on site by the crew; the transport continued without delay.",
        costRequests: index === 4 ? [cost({
          emergencyCostRequestId: `cr-x${index}`, requestCode: `ECR-2026-01${index}`, category: "VETERINARY", status: "APPROVED", requestedAmount: 1_200_000, approvedAmount: 1_200_000,
          decision: { decision: "APPROVED", approvedAmount: 1_200_000, decisionReason: "OK", decidedBy: manager, decidedAt: ago(index * HOUR) },
        })] : [],
      } : {}),
      ...(index === 5 ? { cancelledAt: ago(2 * HOUR), cancellationReason: "Duplicate of another report filed by the escort." } : {}),
    }),
  ),
]

/**
 * Dev only: `window.pushIncidentAlert("URGENT" | "HIGH", "inc-1", "IncidentReport" | "IncidentHold")` drops a fake push into the
 * notification store, so the banner, the card and the drawer can be seen without the BE sending one.
 */
export function installMockAlertTrigger() {
  const target = window as unknown as { pushIncidentAlert?: (priority?: NotificationPriority, referenceId?: string, referenceType?: string) => void }
  target.pushIncidentAlert = (priority = "URGENT", referenceId = "inc-1", referenceType = "IncidentReport") => {
    const hold = referenceType === "IncidentHold"
    useNotificationStore.getState().upsert([{
      id: `mock-${Date.now()}`,
      type: hold ? "ROUTE" : "INCIDENT",
      title: hold ? "Hold your position" : "New incident reported",
      message: hold ? "Logistics Manager: stay at the safe stop and monitor the engine until further notice." : "Tire blowout, horse injured on transport TRN-2026-0042.",
      priority,
      status: "DELIVERED",
      createdAt: new Date().toISOString(),
      referenceType,
      referenceId,
    }])
    useNotificationStore.setState((state) => ({ unreadCount: state.unreadCount + 1 }))
  }
  return () => {
    delete target.pushIncidentAlert
  }
}

function viewerRoles(): string[] {
  return (useAuthStore.getState().principal?.roles ?? []).map(normalizeRole)
}

function actionsFor(item: Incident, roles: string[]): string[] {
  if (item.status !== "REPORTED" && item.status !== "PENDING") return []
  const actions: string[] = []
  if (roles.includes("LOGISTICS_MANAGER")) {
    actions.push(INCIDENT_ACTION.RESOLVE, INCIDENT_ACTION.CANCEL_INCIDENT)
    if (item.severity !== "CRITICAL") actions.push(INCIDENT_ACTION.RAISE_SEVERITY)
    if (item.pendingCostCount > 0) actions.push(INCIDENT_ACTION.DECIDE_COST)
    actions.push(INCIDENT_ACTION.HOLD_ROUTE)
  }
  if (roles.includes("FLEET_ROUTE_COORDINATOR")) actions.push(INCIDENT_ACTION.PROPOSE_REROUTE, INCIDENT_ACTION.ESCALATE_REROUTE, INCIDENT_ACTION.HOLD_ROUTE)
  if (roles.includes("DRIVER") || roles.includes("ESCORT")) {
    actions.push(INCIDENT_ACTION.SELF_RESOLVE, INCIDENT_ACTION.REQUEST_COST)
    if (roles.includes("DRIVER") && item.category !== "HORSE_HEALTH") actions.push(INCIDENT_ACTION.SUPPLEMENT_VEHICLE)
    if (roles.includes("ESCORT") && item.category !== "VEHICLE") actions.push(INCIDENT_ACTION.ADD_HORSE_DETAIL, INCIDENT_ACTION.FOLLOW_UP_HORSE)
  }
  return actions
}

const view = (item: Incident): Incident => ({ ...item, serverTime: new Date().toISOString(), availableActions: actionsFor(item, viewerRoles()) })

function find(incidentReportId: string): Incident {
  const found = store.find((item) => item.incidentReportId === incidentReportId)
  if (!found) throw new IncidentApiError({ status: 404, errorCode: "INCIDENT_NOT_FOUND", message: "Incident not found" })
  return found
}

function toListItem(item: Incident): IncidentListItem {
  return {
    incidentReportId: item.incidentReportId, incidentCode: item.incidentCode, transport: item.transport ?? transports[0], category: item.category,
    severity: item.severity, status: item.status, title: item.title, occurredAt: item.occurredAt, reportedAt: item.reportedAt, location: item.location,
    reportedBy: { employeeId: item.reportedBy.employeeId, employeeCode: item.reportedBy.employeeCode, fullName: item.reportedBy.fullName, role: item.reportedBy.role },
    vehicle: item.vehicle ? { vehicleId: item.vehicle.vehicleId, vehicleCode: item.vehicle.vehicleCode, licensePlate: item.vehicle.licensePlate } : null,
    horses: item.horses.map((horse) => ({ horseId: horse.horseId, horseName: horse.horseName })),
    emergencySettlementRequired: item.emergencySettlementRequired, costRequestCount: item.costRequestCount, pendingCostCount: item.pendingCostCount,
    approvedTotal: item.approvedTotal, updatedAt: item.updatedAt,
  }
}

function comparator(sortBy: string) {
  const keys = sortBy.split(",").map((part) => part.trim().split(":") as [string, "asc" | "desc"])
  const value = (item: Incident, key: string) =>
    key === "severity" ? SEVERITY_RANK[item.severity] : key === "status" ? item.status : Date.parse(key === "updatedAt" ? item.updatedAt : item.occurredAt)
  return (a: Incident, b: Incident) => {
    for (const [key, direction] of keys) {
      const left = value(a, key)
      const right = value(b, key)
      if (left === right) continue
      return (left < right ? -1 : 1) * (direction === "asc" ? 1 : -1)
    }
    return 0
  }
}

export async function mockListIncidents(params: IncidentListParams): Promise<IncidentList> {
  await wait()
  const statuses = params.status ? params.status.split(",") : null
  const search = params.search.trim().toLowerCase()
  const from = params.occurredFrom ? Date.parse(`${params.occurredFrom}T00:00:00Z`) : null
  const to = params.occurredTo ? Date.parse(`${params.occurredTo}T23:59:59Z`) : null
  const matches = store
    .filter((item) => !statuses || statuses.includes(item.status))
    .filter((item) => !params.category || item.category === params.category)
    .filter((item) => !params.severity || item.severity === params.severity)
    .filter((item) => !params.transportId || item.transport?.transportId === params.transportId)
    .filter((item) => params.hasPendingCost === undefined || (item.pendingCostCount > 0) === params.hasPendingCost)
    .filter((item) => params.emergencySettlementRequired === undefined || item.emergencySettlementRequired === params.emergencySettlementRequired)
    .filter((item) => (from === null || Date.parse(item.occurredAt) >= from) && (to === null || Date.parse(item.occurredAt) <= to))
    .filter((item) => !search || [item.incidentCode, item.title, item.transport?.transportCode, item.reportedBy.fullName, item.location?.locationName].some((text) => text?.toLowerCase().includes(search)))
    .sort(comparator(params.sortBy))
  const start = (params.pageIndex - 1) * params.pageSize
  const open = store.filter((item) => item.status === "REPORTED" || item.status === "PENDING")
  return {
    serverTime: new Date().toISOString(),
    counts: {
      reported: store.filter((item) => item.status === "REPORTED").length,
      pending: store.filter((item) => item.status === "PENDING").length,
      resolved: store.filter((item) => item.status === "RESOLVED").length,
      urgentOpen: open.filter((item) => item.severity === "HIGH" || item.severity === "CRITICAL").length,
    },
    items: matches.slice(start, start + params.pageSize).map(toListItem),
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
    totalItems: matches.length,
    totalPages: Math.max(1, Math.ceil(matches.length / params.pageSize)),
  }
}

export async function mockGetIncident(incidentReportId: string): Promise<Incident> {
  await wait()
  return view(find(incidentReportId))
}

export async function mockGetCustomerIncident(incidentReportId: string): Promise<CustomerIncident> {
  await wait()
  const item = find(incidentReportId)
  // Customers only see HIGH / CRITICAL incidents; anything else is a 404 so its existence is not revealed.
  if (item.severity === "LOW" || item.severity === "MEDIUM") throw new IncidentApiError({ status: 404, errorCode: "INCIDENT_NOT_FOUND", message: "Incident not found" })
  // The allowlist DTO of the BE: parsing through the customer schema drops phone, costs and every other staff-only field.
  return customerIncidentSchema.parse({ ...item, serverTime: new Date().toISOString() })
}

function replace(next: Incident): Incident {
  const stamped = { ...next, updatedAt: new Date().toISOString() }
  store = store.map((item) => (item.incidentReportId === stamped.incidentReportId ? stamped : item))
  return view(stamped)
}

function assertWritable(item: Incident, lastUpdatedAt: string) {
  if (item.status !== "REPORTED" && item.status !== "PENDING") {
    throw new IncidentApiError({ status: 422, errorCode: "INVALID_INCIDENT_STATUS", message: "Only open incidents can be changed" })
  }
  if (item.updatedAt !== lastUpdatedAt) {
    throw new IncidentApiError({ status: 409, errorCode: "INCIDENT_MODIFIED", message: "Incident was modified" })
  }
}

const requestBrief = (request: IncidentCostRequest) => ({ emergencyCostRequestId: request.emergencyCostRequestId, requestCode: request.requestCode, status: request.status, requestedAmount: request.requestedAmount })

export async function mockResolveIncident(incidentReportId: string, input: ResolveInput): Promise<Incident> {
  await wait()
  const item = find(incidentReportId)
  assertWritable(item, input.lastUpdatedAt)
  if (!input.emergencySettlementConfirmed) throw new IncidentApiError({ status: 400, errorCode: "SETTLEMENT_NOT_CONFIRMED", message: "Settlement not confirmed" })
  const pending = item.costRequests.filter((request) => request.status === "PENDING")
  if (pending.length) {
    throw new IncidentApiError({ status: 422, errorCode: "UNRESOLVED_EMERGENCY_COSTS", message: "Pending emergency costs", value: { pendingRequests: pending.map(requestBrief) } })
  }
  return replace({ ...item, status: "RESOLVED", resolvedAt: new Date().toISOString(), resolutionSummary: input.resolutionSummary.trim() })
}

export async function mockSelfResolveIncident(incidentReportId: string, input: SelfResolveInput): Promise<Incident> {
  await wait()
  const item = find(incidentReportId)
  assertWritable(item, input.lastUpdatedAt)
  const open = item.costRequests.filter((request) => request.status === "PENDING")
  if (open.length) {
    throw new IncidentApiError({ status: 422, errorCode: "HAS_OPEN_EMERGENCY_COSTS", message: "Open emergency costs", value: { requests: open.map(requestBrief) } })
  }
  return replace({ ...item, status: "RESOLVED", resolvedAt: new Date().toISOString(), resolutionSummary: input.resolutionSummary.trim() })
}

export async function mockCancelIncident(incidentReportId: string, input: CancelInput): Promise<Incident> {
  await wait()
  const item = find(incidentReportId)
  assertWritable(item, input.lastUpdatedAt)
  const approved = item.costRequests.filter((request) => request.status === "APPROVED")
  if (approved.length) {
    throw new IncidentApiError({ status: 422, errorCode: "HAS_APPROVED_EMERGENCY_COST", message: "Approved emergency cost exists", value: { approvedRequests: approved.map(requestBrief) } })
  }
  const costRequests = item.costRequests.map((request) => (request.status === "PENDING" ? { ...request, status: "CANCELLED" as const, cancelledAt: new Date().toISOString() } : request))
  const summary = summarize(costRequests)
  return replace({
    ...item, status: "CANCELLED", cancelledAt: new Date().toISOString(), cancellationReason: input.cancellationReason.trim(),
    costRequests, costSummary: summary, pendingCostCount: summary.pendingCount, canResolve: false,
  })
}
