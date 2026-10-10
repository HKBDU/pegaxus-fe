import type {
  CreateRoutePlanRequest,
  Location,
  PaginatedValue,
  RouteMaster,
  RoutePlan,
  RoutePlanMutationResult,
  RouteSegment,
  UpdateRoutePlanRequest,
} from "./types"

const now = "2026-10-10T08:00:00+07:00"
const transportPlanId = "mock-transport-plan"
const locationSeed = [
  ["13", "Tattersalls Newmarket Sales Complex", "STABLE", "Newmarket", "GB", 52.2425, 0.4042],
  ["1", "Eurotunnel Folkestone Border Control Post", "BORDER_GATE", "Folkestone", "GB", 51.096412, 1.134523],
  ["2", "Dover Western Docks Border Control Post", "BORDER_GATE", "Dover", "GB", 51.119245, 1.309412],
  ["98", "City of Dublin Transit Gateway", "CITY", "Dublin", "IE", 53.349805, -6.26031],
] as const

const locations: Location[] = locationSeed.map(([locationId, locationName, locationType, city, country, latitude, longitude]) => ({
  locationId,
  locationName,
  locationType,
  city,
  country,
  latitude,
  longitude,
  address: null,
  stateProvince: null,
  locationNote: null,
  updatedAt: now,
}))

const loc = (id: string) => locations.find((item) => item.locationId === id)!
const routes: RouteMaster[] = [
  { routeId: "mock-route-13-1", routeCode: "RT-13-1", routeName: "Newmarket to Folkestone BCP", transportMode: "ROAD", fromLocation: loc("13"), toLocation: loc("1"), distanceKm: 164, estimatedDurationMinutes: 180, routeNote: null, updatedAt: now },
  { routeId: "mock-route-1-2", routeCode: "RT-1-2", routeName: "Folkestone BCP to Dover Docks", transportMode: "ROAD", fromLocation: loc("1"), toLocation: loc("2"), distanceKm: 20, estimatedDurationMinutes: 35, routeNote: null, updatedAt: now },
  { routeId: "mock-route-2-98", routeCode: "RT-2-98", routeName: "Dover to Dublin Gateway", transportMode: "SEA", fromLocation: loc("2"), toLocation: loc("98"), distanceKm: 480, estimatedDurationMinutes: 900, routeNote: null, updatedAt: now },
]

const transportPlan = {
  transportPlanId,
  planCode: "TP-MOCK-001",
  bookingCode: "REQ-MOCK-001",
  status: "APPROVED",
  isCrossBorder: true,
  plannedDepartureAt: "2026-10-12T07:00:00+07:00",
  plannedArrivalAt: "2026-10-13T15:00:00+07:00",
  fromLocation: loc("13"),
  toLocation: loc("98"),
}

const segment = (route: RouteMaster, sequenceNo: number, routeType: "PRIMARY" | "BACKUP" | "RETURN" = "PRIMARY"): RouteSegment => ({
  routePlanRouteId: `mock-segment-${route.routeId}`,
  sequenceNo,
  routeType,
  route,
  fromLocation: route.fromLocation,
  toLocation: route.toLocation,
  plannedDepartureAt: `2026-10-${12 + sequenceNo - 1}T07:00:00+07:00`,
  plannedArrivalAt: `2026-10-${12 + sequenceNo - 1}T10:00:00+07:00`,
  actualDepartureAt: null,
  actualArrivalAt: null,
  status: "PENDING",
  dwellAfterMinutes: null,
  isOutsourced: false,
  vehicles: [],
  outsourcing: null,
  driver: null,
  escort: null,
  note: null,
})

let plans: RoutePlan[] = [
  {
    routePlanId: "mock-route-plan",
    routePlanCode: "RP-MOCK-PRIMARY",
    transportPlanId,
    bookingId: "mock-booking-001",
    bookingCode: "REQ-MOCK-001",
    routeType: "PRIMARY",
    status: "DRAFT",
    isCrossBorder: true,
    totalDistanceKm: 664,
    estimatedDurationMinutes: 1115,
    plannedDepartureAt: transportPlan.plannedDepartureAt,
    plannedArrivalAt: transportPlan.plannedArrivalAt,
    segments: [segment(routes[0], 1), segment(routes[1], 2), segment(routes[2], 3)],
    isPersonnelComplete: false,
    legalReview: null,
    routeNote: "Mock primary route for UI testing",
    createdAt: now,
    updatedAt: now,
  },
]

const page = <T>(items: T[], pageIndex = 1, pageSize = 200): PaginatedValue<T> => ({ items, pageIndex, pageSize, totalItems: items.length, totalPages: 1 })
const clone = <T>(value: T): T => structuredClone(value)

export async function mockGetTransportPlan(id: string) { return clone(id === transportPlanId ? transportPlan : { ...transportPlan, transportPlanId: id }) }
export async function mockGetLocations() { return page(clone(locations)) }
export async function mockGetRoutes() { return page(clone(routes)) }
export async function mockGetRoutePlans(id: string) { return page(clone(plans.filter((plan) => plan.transportPlanId === id))) }
export async function mockGetRoutePlan(id: string) { return clone(plans.find((plan) => plan.routePlanId === id) ?? plans[0]) }

export async function mockCreateRoutePlan(id: string, input: CreateRoutePlanRequest) {
  const primary = plans.find((plan) => plan.transportPlanId === id && plan.routeType === "PRIMARY")
  const sourceRoutes: RouteMaster[] = input.routeType === "BACKUP" && primary
    ? primary.segments.map(({ route }) => {
      const master = routes.find((item) => item.routeId === route.routeId)
      if (!master) throw new Error(`Mock route not found: ${route.routeId}`)
      return master
    })
    : routes
  const created: RoutePlan = { ...plans[0], routePlanId: `mock-${input.routeType.toLowerCase()}-${Date.now()}`, routePlanCode: `RP-MOCK-${input.routeType}`, transportPlanId: id, routeType: input.routeType, status: "DRAFT", routeNote: input.routeNote ?? null, segments: sourceRoutes.map((route, index) => segment(route, index + 1, input.routeType)), updatedAt: new Date().toISOString() }
  plans = [created, ...plans]
  return clone(created)
}

export async function mockUpdateRoutePlan(id: string, input: UpdateRoutePlanRequest): Promise<RoutePlanMutationResult> {
  const current = plans.find((plan) => plan.routePlanId === id)
  if (current) { current.routeNote = input.routeNote ?? current.routeNote; current.updatedAt = new Date().toISOString() }
  return { routePlanId: id, status: current?.status ?? "DRAFT", updatedAt: current?.updatedAt ?? new Date().toISOString() }
}

export async function mockCancelRoutePlan(id: string): Promise<RoutePlanMutationResult> {
  const current = plans.find((plan) => plan.routePlanId === id)
  if (current) { current.status = "CANCELLED"; current.updatedAt = new Date().toISOString() }
  return { routePlanId: id, status: "CANCELLED", cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
}
