import { z } from "zod"
import { entityIdSchema, routePlanStatusSchema } from "@/features/transport-plan/schemas"
import { employeeBriefSchema } from "@/features/transport-plan/transport-plan.schemas"

export const routePlanIdSchema = entityIdSchema
export const routeTypeSchema = z.enum(["PRIMARY", "BACKUP", "RETURN"])
const transportModeSchema = z.enum(["ROAD", "SEA", "AIR"])
const timestamp = z.iso.datetime({ offset: true })
const text = z.string().nullish()
// Missing/invalid coordinates must not discard otherwise usable segment data.
const coordinate = z.union([z.number(), z.string()]).nullish()
export const routeLocationSchema = z.object({
  locationId: entityIdSchema, locationName: z.string(), locationType: text,
  city: text, country: text, latitude: coordinate, longitude: coordinate,
})
const providerSchema = z.object({
  transportProviderId: entityIdSchema, providerCode: z.string(), providerName: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]), supportedModes: z.array(transportModeSchema),
})
export const routeSegmentSchema = z.object({
  routePlanRouteId: entityIdSchema, sequenceNo: z.number().int().positive(), routeType: routeTypeSchema,
  route: z.object({ routeId: entityIdSchema, routeCode: z.string(), routeName: z.string(), transportMode: transportModeSchema,
    distanceKm: z.number().nonnegative().nullish(), estimatedDurationMinutes: z.number().nonnegative().nullish() }),
  fromLocation: routeLocationSchema, toLocation: routeLocationSchema,
  plannedDepartureAt: timestamp, plannedArrivalAt: timestamp, actualDepartureAt: timestamp.nullish(), actualArrivalAt: timestamp.nullish(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]), dwellAfterMinutes: z.number().nonnegative().nullish(), isOutsourced: z.boolean(),
  vehicles: z.array(z.object({ vehicleId: entityIdSchema, vehicleCode: z.string(), vehicleName: z.string(), licensePlate: text,
    transportMode: transportModeSchema, capacityHorses: z.number().int().nonnegative() })),
  outsourcing: z.object({ provider: providerSchema }).nullable(), driver: employeeBriefSchema.nullable(), escort: employeeBriefSchema.nullable(), note: text,
})
export const routeLegalReviewSchema = z.object({
  isFeasible: z.boolean(), note: text, blockedSegments: z.array(z.number().int().positive()).nullish(),
  reviewedBy: employeeBriefSchema.nullish(), reviewedAt: timestamp.nullish(),
})
export const routePlanDetailSchema = z.object({
  routePlanId: entityIdSchema, routePlanCode: z.string(), transportPlanId: entityIdSchema, bookingId: entityIdSchema, bookingCode: z.string(),
  routeType: routeTypeSchema, status: routePlanStatusSchema, isCrossBorder: z.boolean(),
  totalDistanceKm: z.number().nonnegative(), estimatedDurationMinutes: z.number().nonnegative(),
  plannedDepartureAt: timestamp, plannedArrivalAt: timestamp, segments: z.array(routeSegmentSchema), isPersonnelComplete: z.boolean(),
  legalReview: routeLegalReviewSchema.nullable(), routeNote: text, createdAt: timestamp, updatedAt: timestamp,
})
export const routePlanSummarySchema = routePlanDetailSchema.pick({
  routePlanId: true, routePlanCode: true, routeType: true, status: true, totalDistanceKm: true, estimatedDurationMinutes: true, isPersonnelComplete: true, updatedAt: true,
}).extend({ segmentCount: z.number().int().nonnegative() })
export const routePlansSchema = z.object({ items: z.array(routePlanSummarySchema) })
export const routePlansQuerySchema = z.object({ routeType: z.enum(["PRIMARY", "BACKUP"]).optional(), status: routePlanStatusSchema.optional(), includeCancelled: z.boolean().optional() })
export const routeViewTabSchema = z.enum(["map", "segments", "contingency"])
