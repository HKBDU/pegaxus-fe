import type { SegmentDetail, SegmentsResponse, TrackingSnapshot, TransportOverview } from "../types"
import {
  DEMO_BOOKING_CODE,
  DEMO_LEGS,
  DEMO_TRANSPORT_CODE,
  getDemoState,
  legIndexAt,
  loadDemoPath,
  PLANNED_KMH,
  type DemoState,
} from "./demo"

const iso = (time: number) => new Date(time).toISOString()

function stopOf(stop: (typeof DEMO_LEGS)[number]["from"]) {
  return {
    locationId: stop.id,
    locationName: stop.name,
    locationType: stop.type,
    city: stop.city,
    country: stop.country,
    latitude: stop.latitude,
    longitude: stop.longitude,
  }
}

function legStatus(state: DemoState, index: number, current: number) {
  if (state.phase === "COMPLETED") return "COMPLETED"
  if (state.phase === "READY") return "PLANNED"
  return index < current ? "COMPLETED" : index === current ? "IN_TRANSIT" : "PLANNED"
}

async function context() {
  const state = getDemoState()
  const path = await loadDemoPath()
  const current = state.phase === "READY" ? 0 : legIndexAt(path, state.distanceM)
  return { state, path, current, now: Date.now() }
}

export async function demoSnapshot(transportId: string): Promise<TrackingSnapshot> {
  const { state, path, current, now } = await context()
  const total = path.legEnds.at(-1) ?? 0
  const remainingKm = Math.max(0, total - state.distanceM) / 1000
  const done = state.phase === "COMPLETED"
  return {
    serverTime: iso(now),
    transportId,
    transportStatus: state.phase,
    plannedRoute: {
      segments: DEMO_LEGS.map((leg, index) => ({
        routePlanRouteId: leg.id,
        displayOrder: leg.order,
        status: legStatus(state, index, current),
        transportMode: "ROAD",
        fromLocation: stopOf(leg.from),
        toLocation: stopOf(leg.to),
      })),
    },
    nextStop: done ? null : stopOf(DEMO_LEGS[current].to),
    etaAt: done ? null : iso(now + (remainingKm / PLANNED_KMH) * 3_600_000),
    plannedRemainingDistanceKm: Math.round(remainingKm * 10) / 10,
    truck: state.lastSample,
  }
}

export async function demoSegments(transportId: string): Promise<SegmentsResponse> {
  const { state, path, current, now } = await context()
  const base = state.startedAt ?? now + 3_600_000
  const segments: SegmentDetail[] = DEMO_LEGS.map((leg, index) => {
    const startKm = (index === 0 ? 0 : path.legEnds[index - 1]) / 1000
    const endKm = path.legEnds[index] / 1000
    const status = legStatus(state, index, current)
    return {
      routePlanRouteId: leg.id,
      displayOrder: leg.order,
      routeType: "PRIMARY",
      transportMode: "ROAD",
      status,
      isCurrent: state.phase === "IN_TRANSIT" && index === current,
      fromLocation: stopOf(leg.from),
      toLocation: stopOf(leg.to),
      distanceKm: Math.round((endKm - startKm) * 10) / 10,
      plannedDepartureAt: iso(base + (startKm / PLANNED_KMH) * 3_600_000),
      plannedArrivalAt: iso(base + (endKm / PLANNED_KMH) * 3_600_000),
      actualDepartureAt: status === "PLANNED" ? null : iso(base + (startKm / PLANNED_KMH) * 3_600_000),
      actualArrivalAt: status === "COMPLETED" ? iso(base + (endKm / PLANNED_KMH) * 3_600_000) : null,
      driver: { employeeId: `demo-driver-${index + 1}`, employeeCode: `DRV-0${index + 1}`, fullName: ["Marc Dubois", "Luc Janssens", "Pieter de Vries"][index], role: "DRIVER", phone: "+33 6 00 00 00 0" + (index + 1) },
      escort: { employeeId: `demo-escort-${index + 1}`, employeeCode: `ESC-0${index + 1}`, fullName: ["Claire Martin", "Emma Peeters", "Sanne Bakker"][index], role: "ESCORT", phone: null },
      isOutsourced: index === 1,
      provider: index === 1 ? { providerName: "Benelux Horse Transport", serviceType: "ROAD_TRANSPORT", providerReference: "BHT-2291" } : null,
      vehicles: [{ vehicleCode: `VH-0${index + 1}`, licensePlate: ["AB-123-CD", "1-XYZ-789", "NL-45-HT"][index] }],
      note: index === 1 ? "Border check at Brussels; documents ready in the cab." : null,
    }
  })
  return { serverTime: iso(now), transportId, transportStatus: state.phase, segments }
}

export async function demoOverview(transportId: string): Promise<TransportOverview> {
  const { state, current, now } = await context()
  const completed = state.phase === "COMPLETED" ? DEMO_LEGS.length : state.phase === "READY" ? 0 : current
  return {
    serverTime: iso(now),
    transport: { transportId, transportCode: DEMO_TRANSPORT_CODE, status: state.phase },
    booking: { bookingCode: DEMO_BOOKING_CODE },
    totalSegments: DEMO_LEGS.length,
    completedSegments: completed,
    horseCount: 3,
    horseHealthSummary: { total: 3, normal: 2, observationRequired: 1, atRisk: 0, critical: 0, noData: 0 },
    activeIncidents: state.phase === "IN_TRANSIT" && state.silent ? [{ incidentReportId: "demo-incident-1" }] : [],
  }
}
