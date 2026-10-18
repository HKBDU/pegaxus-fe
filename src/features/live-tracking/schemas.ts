import { z } from "zod"

const id = z.string().min(1)
const timestamp = z.iso.datetime({ offset: true })

const locationBriefSchema = z.object({
  locationId: id,
  locationName: z.string(),
  locationType: z.string().nullish(),
  city: z.string().nullish(),
  country: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
})

const segmentSchema = z.object({
  routePlanRouteId: id,
  displayOrder: z.number().int(),
  // PLANNED | IN_TRANSIT | COMPLETED (B-06); kept as text so a new value does not break the whole tab.
  status: z.string(),
  transportMode: z.string(),
  fromLocation: locationBriefSchema,
  toLocation: locationBriefSchema,
})

const truckSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  headingDegrees: z.number().nullish(),
  speedKmh: z.number().nullish(),
  accuracyMeters: z.number().nullish(),
  recordedAt: timestamp,
  routePlanRouteId: id.nullish(),
})

/** GP1 `GET /transports/{transportId}/tracking`. `truck` is null until the BE received a sample. */
export const trackingSnapshotSchema = z.object({
  serverTime: timestamp,
  transportId: id,
  transportStatus: z.string(),
  plannedRoute: z.object({ segments: z.array(segmentSchema) }),
  nextStop: locationBriefSchema.nullish(),
  etaAt: timestamp.nullish(),
  plannedRemainingDistanceKm: z.number().nonnegative(),
  truck: truckSchema.nullish(),
})

/** Hub event `LocationUpdated` (API contract 7.3). */
export const locationUpdateSchema = truckSchema.extend({ transportId: id })

export const apiEnvelopeSchema = z.object({
  isSuccess: z.boolean(),
  code: z.number().optional(),
  message: z.string().nullish(),
  errorCode: z.string().nullish(),
  value: z.unknown().optional(),
})

const crewSchema = z.object({
  employeeId: id,
  employeeCode: z.string().nullish(),
  fullName: z.string(),
  role: z.string(),
  // Employee phone; always null for the Customer.
  phone: z.string().nullish(),
})

/** One leg of the effective journey (OT4 `TrackingSegment`); fields hidden from the Customer arrive as null/empty. */
export const segmentDetailSchema = z.object({
  routePlanRouteId: id,
  displayOrder: z.number().int(),
  routeType: z.string().nullish(),
  transportMode: z.string(),
  status: z.string(),
  isCurrent: z.boolean(),
  fromLocation: locationBriefSchema,
  toLocation: locationBriefSchema,
  distanceKm: z.number().nonnegative().nullish(),
  plannedDepartureAt: timestamp.nullish(),
  plannedArrivalAt: timestamp.nullish(),
  actualDepartureAt: timestamp.nullish(),
  actualArrivalAt: timestamp.nullish(),
  driver: crewSchema.nullish(),
  escort: crewSchema.nullish(),
  isOutsourced: z.boolean(),
  provider: z.object({ providerName: z.string(), serviceType: z.string().nullish(), providerReference: z.string().nullish() }).nullish(),
  vehicles: z.array(z.object({ vehicleCode: z.string().nullish(), licensePlate: z.string().nullish() })).default([]),
  note: z.string().nullish(),
})

/** OT4 `GET /transports/{id}/segments` (the handover boundaries of the same answer belong to the handover feature). */
export const segmentsResponseSchema = z.object({
  serverTime: timestamp,
  transportId: id,
  transportStatus: z.string(),
  segments: z.array(segmentDetailSchema),
})

/** OT3 `GET /transports/{id}/overview`: only what the GPS tab shows (code, status, welfare, incident count). */
export const overviewSchema = z.object({
  serverTime: timestamp,
  transport: z.object({ transportId: id, transportCode: z.string(), status: z.string() }),
  booking: z.object({ bookingCode: z.string() }),
  totalSegments: z.number().int().nonnegative(),
  completedSegments: z.number().int().nonnegative(),
  horseCount: z.number().int().nonnegative(),
  horseHealthSummary: z.object({
    total: z.number().int().nonnegative(),
    normal: z.number().int().nonnegative(),
    observationRequired: z.number().int().nonnegative(),
    atRisk: z.number().int().nonnegative(),
    critical: z.number().int().nonnegative(),
    noData: z.number().int().nonnegative(),
  }),
  activeIncidents: z.array(z.object({ incidentReportId: id })).default([]),
})
