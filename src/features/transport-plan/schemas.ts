import { z } from "zod"

export const entityIdSchema = z.uuid()
export const transportPlanStatusSchema = z.enum(["DRAFT", "PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
export const routePlanStatusSchema = z.enum(["DRAFT", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"])
export const dossierStatusSchema = z.enum(["DRAFT", "IN_PREPARATION", "READY_FOR_SUBMISSION", "SUBMITTED", "PENDING", "APPROVED", "REJECTED", "CLOSED"])
export const approvedBookingSortSchema = z.enum([
  "requestedDepartureDate:asc", "requestedDepartureDate:desc", "approvedAt:asc", "approvedAt:desc", "createdAt:asc", "createdAt:desc",
])

export const approvedBookingsQuerySchema = z.object({
  pageIndex: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  search: z.string().trim().optional().transform((value) => value || undefined),
  isInternational: z.boolean().optional(),
  transportPlanStatus: transportPlanStatusSchema.optional(),
  routePlanStatus: routePlanStatusSchema.optional(),
  hasRoutePlan: z.boolean().optional(),
  hasTransportPlan: z.boolean().optional(),
  hasComplianceDossier: z.boolean().optional(),
  complianceDossierStatus: dossierStatusSchema.optional(),
  departureFrom: z.iso.date().optional(),
  departureTo: z.iso.date().optional(),
  sortBy: approvedBookingSortSchema,
}).refine(({ departureFrom, departureTo }) => !departureFrom || !departureTo || departureFrom <= departureTo, {
  message: "Departure end date must not precede the start date.", path: ["departureTo"],
})

const optionalText = z.string().nullish()
const customerSchema = z.object({
  customerId: entityIdSchema,
  customerCode: optionalText,
  fullName: z.string(),
})
const transportSchema = z.object({ transportId: entityIdSchema, transportCode: z.string() })
export const planSummarySchema = z.object({
  transportPlanId: entityIdSchema, planCode: z.string(), status: transportPlanStatusSchema,
  plannedStartAt: z.iso.datetime({ offset: true }).nullish(), plannedEndAt: z.iso.datetime({ offset: true }).nullish(),
  estimatedDistanceKm: z.number().nonnegative().nullish(), estimatedDurationMinutes: z.number().int().min(0).max(2_147_483_647).nullish(), planningNote: optionalText,
})
const dossierSummarySchema = z.object({ complianceDossierId: entityIdSchema, status: dossierStatusSchema })
const routeSummarySchema = z.object({ routePlanId: entityIdSchema, routePlanCode: z.string(), status: routePlanStatusSchema })
const bookingFields = {
  bookingId: entityIdSchema,
  bookingCode: z.string(),
  status: z.literal("APPROVED"),
  originAddress: z.string(),
  originCountry: z.string(),
  destinationAddress: z.string(),
  destinationCountry: z.string(),
  isInternational: z.boolean(),
  totalHorses: z.number().int().nonnegative(),
  requestedDepartureDate: z.iso.date(),
  requestedArrivalDate: z.iso.date().nullish(),
  specialRequirements: optionalText,
  transportPlan: planSummarySchema.nullable(),
  complianceDossier: dossierSummarySchema.nullable(),
}

export const approvedBookingListItemSchema = z.object({
  ...bookingFields,
  customerName: z.string(),
  customerCode: optionalText,
  transportId: entityIdSchema.nullish(),
  routePlan: routeSummarySchema.nullable(),
  approvedAt: z.iso.datetime({ offset: true }).nullish(),
})
export const approvedBookingsPageSchema = z.object({
  items: z.array(approvedBookingListItemSchema),
  pageIndex: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})

export const approvedBookingDetailSchema = z.object({
  ...bookingFields,
  customer: customerSchema.extend({ phone: optionalText }),
  customerNote: optionalText,
  horses: z.array(z.object({
    horseId: entityIdSchema,
    horseName: z.string(),
    sex: optionalText,
    breed: optionalText,
    microchipNumber: optionalText,
    passportNumber: optionalText,
    specialHandlingNotes: optionalText,
  })),
  transport: transportSchema.extend({ status: z.string().min(1) }).nullable(),
  // Display the API statuses without introducing another RoutePlan state machine.
  routePlans: z.array(routeSummarySchema.extend({ routeType: z.enum(["PRIMARY", "BACKUP", "RETURN"]) })),
})
