import type { ApprovedBookingDetail } from "../types"
import type { TransportPlanDetail, TransportPlanStatus } from "../transport-plan.types"

export const mockId = (group: number, index: number) => `${group.toString(16).padStart(8, "0")}-0000-4000-8000-${index.toString(16).padStart(12, "0")}`
const timestamp = "2026-10-09T08:00:00Z"
const employee = (index: number, role: string) => ({ employeeId: mockId(20, index), employeeCode: `EMP-DEMO-${index}`, fullName: `Demo ${role.replaceAll("_", " ")}`, role })
const locations = [
  { locationId: mockId(10, 1), locationName: "Demo Paris Stable", locationType: "STABLE", city: "Paris", country: "FR", latitude: 48.8566, longitude: 2.3522 },
  { locationId: mockId(10, 2), locationName: "Demo CDG Cargo", locationType: "AIRPORT", city: "Paris", country: "FR", latitude: 49.0097, longitude: 2.5479 },
  { locationId: mockId(10, 3), locationName: "Demo Heathrow", locationType: "AIRPORT", city: "London", country: "GB", latitude: 51.47, longitude: -0.4543 },
  { locationId: mockId(10, 4), locationName: "Demo Newmarket Stable", locationType: "STABLE", city: "Newmarket", country: "GB", latitude: 52.245, longitude: 0.407 },
]
const backupLocations = [
  locations[0],
  { locationId: mockId(10, 6), locationName: "Demo Dunkirk Port", locationType: "SEAPORT", city: "Dunkirk", country: "FR", latitude: 51.0344, longitude: 2.3768 },
  { locationId: mockId(10, 7), locationName: "Demo Dover Port", locationType: "SEAPORT", city: "Dover", country: "GB", latitude: 51.1279, longitude: 1.3134 },
  locations[3],
]
function routeFixture(index: number, plan: TransportPlanDetail, backup = false, missingCoordinates = false, empty = false) {
  const type = backup ? "BACKUP" : "PRIMARY"
  const departureDate = plan.plannedStartAt!.slice(0, 10)
  const stops = backup ? backupLocations : locations
  const segments = empty ? [] : [0, 1, 2].map((offset) => ({
    routePlanRouteId: mockId(9, index * 10 + offset), sequenceNo: offset + 1, routeType: type,
    route: { routeId: mockId(11, index * 10 + offset + 1), routeCode: `RT-DEMO-${index}-${offset + 1}`, routeName: `${stops[offset].locationName} to ${stops[offset + 1].locationName}`,
      transportMode: offset === 1 ? backup ? "SEA" : "AIR" : "ROAD", distanceKm: (backup ? [240, 60, 350] : [48.2, 350, 214.2])[offset], estimatedDurationMinutes: [110, 90, 150][offset] },
    fromLocation: stops[offset],
    toLocation: missingCoordinates && offset === 2 ? { ...stops[offset + 1], locationId: mockId(10, 5), latitude: null, longitude: null } : stops[offset + 1],
    plannedDepartureAt: `${departureDate}T${["06", "14", "17"][offset]}:00:00Z`,
    plannedArrivalAt: `${departureDate}T${["08", "16", "20"][offset]}:00:00Z`,
    actualDepartureAt: null, actualArrivalAt: null, status: "PENDING", dwellAfterMinutes: offset === 2 ? null : [360, 60][offset],
    isOutsourced: offset === 1,
    vehicles: offset === 1 ? [] : [{ vehicleId: mockId(12, offset + 1), vehicleCode: `VEH-DEMO-${offset + 1}`, vehicleName: "Demo Horse Truck", licensePlate: `DEMO-${offset + 1}`, transportMode: "ROAD", capacityHorses: 6 }],
    outsourcing: offset === 1 ? { provider: { transportProviderId: mockId(13, backup ? 2 : 1), providerCode: backup ? "PRV-DEMO-02" : "PRV-DEMO-01", providerName: backup ? "Demo Ferry Partner" : "Demo Air Partner", status: "ACTIVE", supportedModes: [backup ? "SEA" : "AIR"] } } : null,
    driver: backup || offset === 1 ? null : employee(3, "DRIVER"), escort: backup || offset === 1 ? null : employee(4, "ESCORT"),
    note: offset === 1 ? "Fictional outsourced segment for development only." : null,
  }))
  return {
    routePlanId: mockId(4, index), routePlanCode: `RP-DEMO-${String(index).padStart(4, "0")}`, transportPlanId: plan.transportPlanId,
    bookingId: plan.booking.bookingId, bookingCode: plan.booking.bookingCode, routeType: type,
    status: index === 6 ? "CONFIRMED" : "DRAFT", isCrossBorder: true,
    // Explicit fixture metrics simulate server projections; the UI never derives totals.
    totalDistanceKm: empty ? 0 : backup ? 650 : 612.4, estimatedDurationMinutes: empty ? 0 : backup ? 840 : 750,
    plannedDepartureAt: `${departureDate}T06:00:00Z`, plannedArrivalAt: `${departureDate}T20:00:00Z`,
    segments, isPersonnelComplete: !backup && !empty,
    legalReview: index === 6 || missingCoordinates ? { isFeasible: !missingCoordinates, note: missingCoordinates ? "Demo permit restriction; coordinator revision required." : "Demo legal feasibility confirmed.",
      blockedSegments: missingCoordinates ? [3] : [], reviewedBy: employee(1, "TRANSPORT_SPECIALIST"), reviewedAt: timestamp } : null,
    routeNote: backup ? "Fictional backup option; not an operational itinerary." : null, createdAt: timestamp, updatedAt: timestamp,
  }
}

export function createFlow3Fixtures() {
  const statuses: (TransportPlanStatus | null)[] = [null, "DRAFT", "PENDING", "APPROVED", "APPROVED", "APPROVED", "APPROVED", "IN_PROGRESS"]
  const bookings: ApprovedBookingDetail[] = statuses.map((status, offset) => {
    const index = offset + 1
    return {
      bookingId: mockId(1, index), bookingCode: `REQ-DEMO-${String(index).padStart(4, "0")}`, status: "APPROVED",
      customer: { customerId: mockId(5, index), customerCode: `CUS-DEMO-${index}`, fullName: `Demo Racing Club ${index}`, phone: null },
      originAddress: "Demo Paris Stable", originCountry: "FR", destinationAddress: index === 2 ? "Demo Lyon Stable" : "Demo Newmarket Stable", destinationCountry: index === 2 ? "FR" : "GB",
      isInternational: index !== 2, totalHorses: 2, requestedDepartureDate: `2026-10-${26 + index}`, requestedArrivalDate: "2026-11-05",
      specialRequirements: null, customerNote: null,
      horses: [1, 2].map((horse) => ({ horseId: mockId(6, index * 10 + horse), horseName: `Demo Horse ${index}-${horse}`, sex: null, breed: null, microchipNumber: null, passportNumber: null, specialHandlingNotes: null })),
      transport: { transportId: mockId(2, index), transportCode: `TR-DEMO-${index}`, status: status === "IN_PROGRESS" ? "IN_TRANSIT" : "PLANNING" },
      transportPlan: null, routePlans: [], complianceDossier: index % 2 ? null : { complianceDossierId: mockId(7, index), status: "IN_PREPARATION" },
    }
  })
  // Dates span a month boundary without invalid date strings.
  bookings.forEach((booking, offset) => { booking.requestedDepartureDate = new Date(Date.UTC(2026, 9, 27 + offset)).toISOString().slice(0, 10) })
  const plans: TransportPlanDetail[] = bookings.flatMap((booking, offset) => statuses[offset] ? [{
    transportPlanId: mockId(3, offset + 1), planCode: `TP-DEMO-${String(offset + 1).padStart(4, "0")}`, status: statuses[offset]!,
    booking: { ...booking, customerName: booking.customer.fullName }, transport: booking.transport,
    plannedStartAt: `${booking.requestedDepartureDate}T06:00:00Z`, plannedEndAt: "2026-11-05T20:00:00Z",
    estimatedDistanceKm: offset === 1 ? null : 612.4, estimatedDurationMinutes: offset === 1 ? null : 750,
    planningNote: "Fictional development data; no payment or personnel operations.",
    assignedEmployees: statuses[offset] === "APPROVED" ? [employee(1, "TRANSPORT_SPECIALIST"), employee(2, "FLEET_ROUTE_COORDINATOR")].map((item) => ({ ...item, responsibility: item.role, isPrimary: true, assignedAt: timestamp })) : [],
    approvedBy: null, approvedAt: statuses[offset] === "APPROVED" ? timestamp : null,
    createdAt: `2026-10-0${offset + 1}T08:00:00Z`, updatedAt: timestamp,
  }] : [])
  const routes = [5, 6, 7, 8].map((index) => routeFixture(index, plans.find((plan) => plan.transportPlanId === mockId(3, index))!, false, index === 7, index === 8))
  routes.push(routeFixture(9, plans.find((plan) => plan.transportPlanId === mockId(3, 6))!, true))
  return { bookings, plans, routes }
}
