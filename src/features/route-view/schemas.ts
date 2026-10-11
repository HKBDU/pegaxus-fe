import { z } from "zod"
import { dossierStatusSchema, entityIdSchema, routePlanStatusSchema } from "@/features/transport-plan/schemas"
import { employeeBriefSchema } from "@/features/transport-plan/transport-plan.schemas"

export const routePlanIdSchema = entityIdSchema
export const routeTypeSchema = z.enum(["PRIMARY", "BACKUP", "RETURN"])
const transportModeSchema = z.enum(["ROAD", "SEA", "AIR"])
const timestamp = z.iso.datetime({ offset: true })
const text = z.string().nullish()
const replacesSequenceNoSchema = z.object({ from: z.number().int().positive(), to: z.number().int().positive() })
  .refine(range => range.to >= range.from, "The replacement segment range is invalid.").nullish()
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
  route: z.object({ routeId: entityIdSchema, routeCode: z.string(), routeName: text, transportMode: transportModeSchema,
    distanceKm: z.number().nonnegative().nullish(), estimatedDurationMinutes: z.number().nonnegative().nullish() }),
  fromLocation: routeLocationSchema, toLocation: routeLocationSchema,
  plannedDepartureAt: timestamp.nullish(), plannedArrivalAt: timestamp.nullish(), actualDepartureAt: timestamp.nullish(), actualArrivalAt: timestamp.nullish(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]), dwellAfterMinutes: z.number().nonnegative().nullish(), isOutsourced: z.boolean(),
  vehicles: z.array(z.object({ vehicleId: entityIdSchema, vehicleCode: z.string(), vehicleName: text, licensePlate: text,
    transportMode: transportModeSchema, capacityHorses: z.number().int().nonnegative().nullish() })),
  // Current BE returns ProviderResponse directly; keep the established UI/mock shape.
  outsourcing: z.union([z.object({ provider: providerSchema }), providerSchema.transform(provider => ({ provider }))]).nullable(), driver: employeeBriefSchema.nullable(), escort: employeeBriefSchema.nullable(), note: text,
})
export const routeLegalReviewSchema = z.object({
  isFeasible: z.boolean(), note: text, blockedSegments: z.array(z.number().int().positive()).nullish(),
  reviewedBy: employeeBriefSchema.nullish(), reviewedAt: timestamp.nullish(),
})
export const routePlanDetailSchema = z.object({
  routePlanId: entityIdSchema, routePlanCode: z.string(), transportPlanId: entityIdSchema, bookingId: entityIdSchema, bookingCode: z.string(),
  routeType: routeTypeSchema, status: routePlanStatusSchema, isCrossBorder: z.boolean(),
  totalDistanceKm: z.number().nonnegative(), estimatedDurationMinutes: z.number().nonnegative(),
  plannedDepartureAt: timestamp.nullish(), plannedArrivalAt: timestamp.nullish(), segments: z.array(routeSegmentSchema), isPersonnelComplete: z.boolean(),
  legalReview: routeLegalReviewSchema.nullable(), replacesSequenceNo: replacesSequenceNoSchema, routeNote: text, createdAt: timestamp, updatedAt: timestamp,
})
export const routePlanSummarySchema = routePlanDetailSchema.pick({
  routePlanId: true, routePlanCode: true, routeType: true, status: true, totalDistanceKm: true, estimatedDurationMinutes: true, isPersonnelComplete: true, updatedAt: true,
}).extend({ segmentCount: z.number().int().nonnegative(), replacesSequenceNo: replacesSequenceNoSchema, routeNote: text })
export const routePlansSchema = z.object({ items: z.array(routePlanSummarySchema) })
export const routePlansQuerySchema = z.object({ routeType: routeTypeSchema.optional(), status: routePlanStatusSchema.optional(), includeCancelled: z.boolean().optional() })
export const routeViewTabSchema = z.enum(["map", "segments", "contingency"])

const optionalNote = z.string().trim().optional().transform(value => value || undefined)
export const backupChangeRequestSchema = z.object({
  reason: z.string().trim().min(10, "Explain the change in at least 10 characters."),
  newEstimatedArrivalAt: timestamp,
  estimatedExtraCost: z.number().finite().optional(),
  currency: optionalNote,
  note: optionalNote,
}).refine(input => input.estimatedExtraCost === undefined || Boolean(input.currency), {
  path: ["currency"], message: "Currency is required when an extra cost is supplied.",
})
export const routeChangeDecisionSchema = z.object({
  lastUpdatedAt: timestamp, decision: z.enum(["APPROVE", "REJECT"]), note: optionalNote,
}).refine(input => input.decision !== "REJECT" || (input.note?.length ?? 0) >= 10, {
  path: ["note"], message: "Explain the rejection in at least 10 characters.",
})
export const returnSegmentOverrideSchema = z.object({
  routePlanRouteId: entityIdSchema,
  vehicleIds: z.array(entityIdSchema).optional(),
  outsourcing: z.object({ transportProviderId: entityIdSchema, note: optionalNote }).optional(),
}).refine(input => input.vehicleIds === undefined || input.outsourcing === undefined, {
  path: ["vehicleIds"], message: "A segment cannot receive both vehicles and outsourcing.",
})
export const returnActivationSchema = z.object({
  lastUpdatedAt: timestamp, segments: z.array(returnSegmentOverrideSchema).optional(), note: optionalNote,
}).refine(input => !input.segments || new Set(input.segments.map(segment => segment.routePlanRouteId)).size === input.segments.length, {
  path: ["segments"], message: "Submit each segment only once.",
})
export const driverNoticeSchema = z.object({ message: optionalNote })
export const backupChangeRequestResultSchema = z.object({
  routePlanId: entityIdSchema, routeType: z.literal("BACKUP"), status: z.literal("CONFIRMED"), requestedAt: timestamp,
})
export const routeChangeDecisionResultSchema = z.object({
  routePlanId: entityIdSchema, routeType: z.enum(["BACKUP", "RETURN"]), decision: z.enum(["APPROVE", "REJECT"]),
  status: routePlanStatusSchema, updatedAt: timestamp,
  complianceDossier: z.object({ complianceDossierId: entityIdSchema, status: dossierStatusSchema }).nullable(),
})
export const returnActivationResultSchema = z.object({
  routePlanId: entityIdSchema, routeType: z.literal("RETURN"), status: z.literal("ACTIVE"), segments: z.array(routeSegmentSchema), updatedAt: timestamp,
})
export const driverNoticeResultSchema = z.object({ routePlanId: entityIdSchema, notifiedDrivers: z.array(employeeBriefSchema), sentAt: timestamp })
