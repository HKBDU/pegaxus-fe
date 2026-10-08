import { z } from "zod"
import { depositStatusSchema, entityIdSchema, routePlanningStatusSchema, transportScopeSchema } from "./schemas"

export const transportPlanIdSchema = z.union([
  z.number().int().positive(), z.uuid(), z.string().regex(/^[1-9]\d*$/),
])
export const transportPlanStatusSchema = z.enum(["DRAFT", "PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
export const transportPlanSortSchema = z.enum(["createdAt:asc", "createdAt:desc", "plannedStartAt:asc", "plannedStartAt:desc"])
export const transportPlanTabSchema = z.enum(["general", "quotation", "personnel"])
export const transportPlansQuerySchema = z.object({
  pageIndex: z.number().int().positive(), pageSize: z.number().int().positive(),
  search: z.string().trim().optional().transform((value) => value || undefined),
  status: transportPlanStatusSchema.optional(),
  routePlanningStatus: routePlanningStatusSchema.optional(),
  sortBy: transportPlanSortSchema,
})
const timestamp = z.iso.datetime({ offset: true })
const optionalTimestamp = timestamp.nullish()
const optionalText = z.string().nullish()
const money = z.number().nonnegative().nullish()
const currency = z.string().regex(/^[A-Za-z]{3}$/).nullish()
const transportModes = z.array(z.enum(["ROAD", "SEA", "AIR"])).nullish()
export const employeeBriefSchema = z.object({
  employeeId: entityIdSchema, employeeCode: z.string(), fullName: z.string(), role: z.string(),
})
const providerBriefSchema = z.object({
  transportProviderId: entityIdSchema, providerCode: z.string(), providerName: z.string(),
})
const quotationStatusSchema = z.enum(["DRAFT", "ISSUED"])

export const transportPlanListItemSchema = z.object({
  transportPlanId: entityIdSchema, planCode: z.string(), status: transportPlanStatusSchema,
  bookingId: entityIdSchema, bookingCode: z.string(), customerName: z.string(),
  plannedStartAt: optionalTimestamp, plannedEndAt: optionalTimestamp,
  transportModeOptions: transportModes,
  totalAmount: money, currency,
  depositStatus: depositStatusSchema, routePlanningStatus: routePlanningStatusSchema,
  updatedAt: timestamp,
})
export const transportPlansPageSchema = z.object({
  items: z.array(transportPlanListItemSchema),
  pageIndex: z.number().int().positive(), pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
})
export const transportPlanDetailSchema = z.object({
  transportPlanId: entityIdSchema, planCode: z.string(), status: transportPlanStatusSchema,
  booking: z.object({ bookingId: entityIdSchema, bookingCode: z.string(), status: z.string(), transportScope: transportScopeSchema }),
  transport: z.object({ transportId: entityIdSchema, transportCode: z.string(), status: z.string() }),
  plannedStartAt: optionalTimestamp, plannedEndAt: optionalTimestamp,
  // C08 remains inconsistent in the document: accept omission, do not fabricate modes.
  transportModeOptions: transportModes,
  planningNote: optionalText,
  estimatedDistanceKm: z.number().nonnegative().nullish(),
  estimatedDurationMinutes: z.number().nonnegative().nullish(),
  providers: z.array(z.object({
    provider: providerBriefSchema.extend({ status: z.string(), supportedModes: z.array(z.string()).optional() }),
    serviceType: z.string(), assignedAt: timestamp, note: optionalText,
  })),
  assignedEmployees: z.array(employeeBriefSchema.extend({ responsibility: z.string(), isPrimary: z.boolean(), assignedAt: timestamp })),
  quotation: z.object({ quotationId: entityIdSchema, status: quotationStatusSchema, currency, totalAmount: money, issuedAt: optionalTimestamp }).nullish(),
  depositStatus: depositStatusSchema, routePlanningStatus: routePlanningStatusSchema,
  approvedBy: employeeBriefSchema.nullish(), approvedAt: optionalTimestamp,
  createdAt: timestamp, updatedAt: timestamp,
})
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
export const transportPlanAssignmentsSchema = z.object({
  transportPlanId: entityIdSchema,
  phase1: z.object({ transportSpecialist: employeeBriefSchema.nullish(), routeCoordinator: employeeBriefSchema.nullish() }).nullish(),
  phase2: z.object({
    enabled: z.boolean(), routePlanId: entityIdSchema.nullish(),
    personnelStatus: z.enum(["NOT_ASSIGNED", "PARTIALLY_ASSIGNED", "FULLY_ASSIGNED"]).nullish(),
    segments: z.array(z.object({
      routePlanRouteId: entityIdSchema, sequenceNo: z.number().int().positive(),
      executionType: z.enum(["INTERNAL", "OUTSOURCED"]),
      plannedDepartureAt: optionalTimestamp, plannedArrivalAt: optionalTimestamp,
      driver: employeeBriefSchema.nullish(), escort: employeeBriefSchema.nullish(),
      provider: providerBriefSchema.nullish(), isComplete: z.boolean().nullish(),
    })).nullish(),
  }).nullish(),
})
