import { z } from "zod"

export const entityIdSchema = z.union([z.string().trim().min(1), z.number().int().positive()])
export const transportScopeSchema = z.enum(["DOMESTIC", "INTERNATIONAL"])
export const depositStatusSchema = z.enum(["PENDING", "PAID"])
export const routePlanningStatusSchema = z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"])
export const approvedBookingSortSchema = z.enum([
  "requestedDepartureDate:asc", "requestedDepartureDate:desc", "approvedAt:asc", "approvedAt:desc",
])

export const approvedBookingsQuerySchema = z.object({
  pageIndex: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  search: z.string().trim().optional().transform((value) => value || undefined),
  transportScope: transportScopeSchema.optional(),
  depositStatus: depositStatusSchema.optional(),
  routePlanningStatus: routePlanningStatusSchema.optional(),
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
const bookingFields = {
  bookingId: entityIdSchema,
  bookingCode: z.string(),
  status: z.literal("APPROVED"),
  customer: customerSchema,
  originAddress: z.string(),
  originCountry: z.string(),
  destinationAddress: z.string(),
  destinationCountry: z.string(),
  transportScope: transportScopeSchema,
  totalHorses: z.number().int().nonnegative(),
  requestedDepartureDate: z.iso.date(),
  requestedArrivalDate: z.iso.date(),
  specialRequirements: optionalText,
  transport: transportSchema,
  depositStatus: depositStatusSchema,
  routePlanningStatus: routePlanningStatusSchema,
}

export const approvedBookingListItemSchema = z.object({
  ...bookingFields,
  approvedAt: z.iso.datetime({ offset: true }),
  transportPlanId: entityIdSchema.nullable(),
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
  transport: transportSchema.extend({ status: z.string().min(1) }),
  transportPlan: z.object({
    transportPlanId: entityIdSchema, planCode: z.string(), status: z.string().min(1),
  }).nullable(),
  // Display the API statuses without introducing another RoutePlan state machine.
  routePlans: z.array(z.object({
    routePlanId: entityIdSchema, routePlanCode: z.string(), routeType: z.string(), status: z.string().min(1),
  })),
})
