import { z } from "zod"
import { entityIdSchema, routePlanStatusSchema, transportPlanStatusSchema } from "./schemas"

export const transportPlanIdSchema = entityIdSchema
export { transportPlanStatusSchema }
export const transportPlanSortSchema = z.enum(["createdAt:asc", "createdAt:desc", "plannedStartAt:asc", "plannedStartAt:desc"])
export const transportPlanTabSchema = z.enum(["general", "quotation", "personnel"])
export const transportPlansQuerySchema = z.object({
  pageIndex: z.number().int().positive(), pageSize: z.number().int().positive(),
  search: z.string().trim().optional().transform((value) => value || undefined),
  status: transportPlanStatusSchema.optional(),
  routePlanStatus: routePlanStatusSchema.optional(),
  sortBy: transportPlanSortSchema,
})
const timestamp = z.iso.datetime({ offset: true })
const optionalTimestamp = timestamp.nullish()
const optionalText = z.string().nullish()
export const employeeBriefSchema = z.object({
  employeeId: entityIdSchema, employeeCode: z.string(), fullName: z.string(), role: z.string(),
})
const quotationStatusSchema = z.enum(["DRAFT", "ISSUED"])

export const transportPlanListItemSchema = z.object({
  transportPlanId: entityIdSchema, planCode: z.string(), status: transportPlanStatusSchema,
  bookingId: entityIdSchema, bookingCode: z.string(), customerName: z.string(),
  plannedStartAt: optionalTimestamp, plannedEndAt: optionalTimestamp,
  updatedAt: timestamp,
})
export const transportPlansPageSchema = z.object({
  items: z.array(transportPlanListItemSchema),
  pageIndex: z.number().int().positive(), pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
})
export const transportPlanDetailSchema = z.object({
  transportPlanId: entityIdSchema, planCode: z.string(), status: transportPlanStatusSchema,
  booking: z.object({
    bookingId: entityIdSchema, bookingCode: z.string(), status: z.string(), isInternational: z.boolean(), customerName: z.string(),
    originAddress: z.string(), originCountry: z.string(), destinationAddress: z.string(), destinationCountry: z.string(),
    totalHorses: z.number().int().nonnegative(), requestedDepartureDate: z.iso.date(), requestedArrivalDate: z.iso.date(), specialRequirements: optionalText,
  }),
  transport: z.object({ transportId: entityIdSchema, transportCode: z.string(), status: z.string() }),
  plannedStartAt: optionalTimestamp, plannedEndAt: optionalTimestamp,
  planningNote: optionalText,
  estimatedDistanceKm: z.number().nonnegative().nullish(),
  estimatedDurationMinutes: z.number().nonnegative().nullish(),
  assignedEmployees: z.array(employeeBriefSchema.extend({ responsibility: z.string(), isPrimary: z.boolean(), assignedAt: timestamp })),
  approvedBy: employeeBriefSchema.nullish(), approvedAt: optionalTimestamp,
  createdAt: timestamp, updatedAt: timestamp,
})
const metadataFields = {
  plannedStartAt: timestamp,
  plannedEndAt: timestamp,
  estimatedDistanceKm: z.number().finite().nonnegative().optional(),
  estimatedDurationMinutes: z.number().finite().nonnegative().optional(),
  planningNote: z.string().optional(),
}
export const createTransportPlanSchema = z.object(metadataFields).refine(
  (input) => Date.parse(input.plannedEndAt) > Date.parse(input.plannedStartAt),
  { message: "Planned end must be after planned start.", path: ["plannedEndAt"] },
)
export const updateTransportPlanSchema = z.object({
  plannedStartAt: timestamp.optional(), plannedEndAt: timestamp.optional(),
  estimatedDistanceKm: metadataFields.estimatedDistanceKm, estimatedDurationMinutes: metadataFields.estimatedDurationMinutes,
  planningNote: metadataFields.planningNote, lastUpdatedAt: timestamp, updateReason: z.string().optional(),
}).refine((input) => !input.plannedStartAt || !input.plannedEndAt || Date.parse(input.plannedEndAt) > Date.parse(input.plannedStartAt),
  { message: "Planned end must be after planned start.", path: ["plannedEndAt"] })

// Presentation contract retained for the existing quotation table only; no Flow 3 endpoint uses it.
export const transportPlanQuotationSchema = z.object({
  quotationId: entityIdSchema, transportPlanId: entityIdSchema,
  versionNo: z.number().int().positive(), status: quotationStatusSchema,
  currency: z.string().regex(/^[A-Za-z]{3}$/), totalAmount: z.number().nonnegative(),
  items: z.array(z.object({
    quotationItemId: entityIdSchema,
    category: z.enum(["TRANSPORT_FEE", "COMPLIANCE_FEE", "LABOR_FEE", "HORSE_CARE_FEE", "CONTINGENCY", "OTHER"]),
    description: z.string(), amount: z.number().nonnegative(),
  })),
  note: optionalText, issuedAt: optionalTimestamp, createdAt: timestamp, updatedAt: timestamp,
})
