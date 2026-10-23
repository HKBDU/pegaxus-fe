import { z } from "zod"

import {
  EMERGENCY_COST_CATEGORY,
  EMERGENCY_COST_STATUS,
  INCIDENT_CATEGORY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
} from "@/shared/constants/incident"

/** Shapes follow api-contract/flow5.md (IN7-IN11) + DB v10; field presence follows the BE response records. */

export const apiEnvelopeSchema = z.object({
  isSuccess: z.boolean(),
  code: z.number().optional(),
  message: z.string().nullish(),
  errorCode: z.string().nullish(),
  errors: z.unknown().optional(),
  value: z.unknown().optional(),
})

const categorySchema = z.enum(INCIDENT_CATEGORY)
const severitySchema = z.enum(INCIDENT_SEVERITY)
const statusSchema = z.enum(INCIDENT_STATUS)

const locationSchema = z.object({
  locationId: z.string(),
  locationName: z.string(),
  locationType: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
})

const reporterSchema = z.object({
  employeeId: z.string(),
  employeeCode: z.string(),
  fullName: z.string(),
  role: z.string(),
})

const employeeBriefSchema = reporterSchema.extend({ phone: z.string().nullable() })

const transportBriefSchema = z.object({
  transportId: z.string(),
  transportCode: z.string(),
  status: z.string(),
  bookingCode: z.string(),
})

const vehicleBriefSchema = z.object({
  vehicleId: z.string(),
  vehicleCode: z.string(),
  licensePlate: z.string().nullable(),
  vehicleName: z.string().nullable(),
  status: z.string(),
})

const horseBriefSchema = z.object({
  horseId: z.string(),
  horseName: z.string(),
  microchipNumber: z.string().nullable(),
  breed: z.string().nullable(),
  stallNo: z.number().nullable(),
})

const photoSchema = z.object({
  photoId: z.string(),
  photoUrl: z.string(),
  caption: z.string().nullable(),
  horseHealthIncidentDetailId: z.string().nullable(),
  sortOrder: z.number(),
})

const vehicleDetailFields = {
  vehicleIncidentDetailId: z.string(),
  vehicle: vehicleBriefSchema,
  incidentType: z.string(),
  vehicleCondition: z.string().nullable(),
  damageDescription: z.string().nullable(),
  vehicleOperable: z.boolean(),
  repairRequired: z.boolean(),
  towingRequired: z.boolean(),
  replacementVehicleRequired: z.boolean(),
  estimatedRepairHours: z.number().nullable(),
  driverSafetyStatus: z.string().nullable(),
  cargoConditionNote: z.string().nullable(),
  repairNote: z.string().nullable(),
  updatedAt: z.string(),
}

const horseDetailSchema = z.object({
  horseHealthIncidentDetailId: z.string(),
  horse: horseBriefSchema,
  incidentType: z.string(),
  conditionDescription: z.string(),
  symptoms: z.string().nullable(),
  bodyTemperatureCelsius: z.number().nullable(),
  heartRateBpm: z.number().nullable(),
  respiratoryRateBpm: z.number().nullable(),
  firstAidProvided: z.string().nullable(),
  veterinarianRequired: z.boolean(),
  veterinarianContactedAt: z.string().nullable(),
  isolationRequired: z.boolean(),
  veterinarianInstruction: z.string().nullable(),
  medicationGiven: z.string().nullable(),
  outcomeNote: z.string().nullable(),
  horseTransportable: z.boolean().nullable(),
  updatedAt: z.string(),
})

const costDecisionSchema = z.object({
  decision: z.string(),
  approvedAmount: z.number().nullable(),
  decisionReason: z.string().nullable(),
  decidedBy: employeeBriefSchema,
  decidedAt: z.string(),
})

const costRequestSchema = z.object({
  emergencyCostRequestId: z.string(),
  requestCode: z.string(),
  category: z.enum(EMERGENCY_COST_CATEGORY),
  description: z.string(),
  justification: z.string(),
  requestedAmount: z.number(),
  approvedAmount: z.number().nullable(),
  currency: z.string(),
  status: z.enum(EMERGENCY_COST_STATUS),
  requestedAt: z.string(),
  requestedBy: employeeBriefSchema,
  decision: costDecisionSchema.nullable(),
  cancelledAt: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  invoiceRequired: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const routeChangeSchema = z.object({
  routePlanId: z.string(),
  routePlanCode: z.string(),
  routeType: z.string(),
  status: z.string(),
  updatedAt: z.string(),
})

const holdSchema = z.object({
  status: z.string(),
  startedAt: z.string(),
  holdUntil: z.string(),
  holdMinutes: z.number(),
  monitorIntervalMinutes: z.number(),
  reason: z.string(),
  safeStopLocation: locationSchema.nullable(),
  decidedBy: reporterSchema,
})

const incidentCore = {
  incidentReportId: z.string(),
  incidentCode: z.string(),
  transport: transportBriefSchema.nullable(),
  category: categorySchema,
  severity: severitySchema,
  status: statusSchema,
  title: z.string(),
  description: z.string(),
  immediateAction: z.string().nullable(),
  occurredAt: z.string(),
  reportedAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolutionSummary: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  location: locationSchema.nullable(),
  vehicle: vehicleBriefSchema.nullable(),
  horses: z.array(horseBriefSchema),
  horseDetails: z.array(horseDetailSchema),
  photos: z.array(photoSchema),
  photoCount: z.number(),
  routeChanges: z.array(routeChangeSchema),
  hold: holdSchema.nullable(),
  serverTime: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
}

/** IN8 for LM / RC / TS / DRV / ESC. `availableActions` is the only source of truth for buttons (contract R15). */
export const incidentSchema = z.object({
  ...incidentCore,
  reportedBy: employeeBriefSchema,
  vehicleDetail: z.object({ ...vehicleDetailFields, estimatedRepairCost: z.number().nullable() }).nullable(),
  emergencySettlementRequired: z.boolean(),
  costRequests: z.array(costRequestSchema),
  costRequestCount: z.number(),
  pendingCostCount: z.number(),
  approvedTotal: z.number(),
  costSummary: z.object({
    requestedTotal: z.number(),
    approvedTotal: z.number(),
    pendingCount: z.number(),
    currency: z.string(),
  }),
  canResolve: z.boolean(),
  availableActions: z.array(z.string()),
})

/** IN8 for the Customer: BE sends an allowlist DTO (no phone, costs, estimated cost, `availableActions`). */
export const customerIncidentSchema = z.object({
  ...incidentCore,
  reportedBy: z.object({ fullName: z.string(), role: z.string() }),
  vehicleDetail: z.object(vehicleDetailFields).nullable(),
})

export const incidentListItemSchema = z.object({
  incidentReportId: z.string(),
  incidentCode: z.string(),
  transport: transportBriefSchema,
  category: categorySchema,
  severity: severitySchema,
  status: statusSchema,
  title: z.string(),
  occurredAt: z.string(),
  reportedAt: z.string(),
  location: locationSchema.nullable(),
  reportedBy: reporterSchema,
  vehicle: z.object({ vehicleId: z.string(), vehicleCode: z.string(), licensePlate: z.string().nullable() }).nullable(),
  horses: z.array(z.object({ horseId: z.string(), horseName: z.string() })),
  emergencySettlementRequired: z.boolean(),
  costRequestCount: z.number(),
  pendingCostCount: z.number(),
  approvedTotal: z.number(),
  updatedAt: z.string(),
})

export const incidentListSchema = z.object({
  serverTime: z.string(),
  counts: z.object({ reported: z.number(), pending: z.number(), resolved: z.number(), urgentOpen: z.number() }),
  items: z.array(incidentListItemSchema),
  pageIndex: z.number(),
  pageSize: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
})

/** Write-side validation shared by the dialogs and the mock (contract IN9-IN11, BE validators). */
export const RESOLUTION_MIN = 20
export const RESOLUTION_MAX = 2000
export const CANCEL_REASON_MIN = 10
export const CANCEL_REASON_MAX = 2000

const resolutionSummary = z
  .string()
  .trim()
  .min(RESOLUTION_MIN, `Enter at least ${RESOLUTION_MIN} characters`)
  .max(RESOLUTION_MAX, `Use at most ${RESOLUTION_MAX} characters`)

export const resolveFormSchema = z.object({
  resolutionSummary,
  emergencySettlementConfirmed: z.boolean().refine((value) => value, "Confirm the emergency cost settlement to continue"),
})

/** IN11 has no settlement checkbox; the field stays in the form values so both dialogs share one form type. */
export const selfResolveFormSchema = z.object({ resolutionSummary, emergencySettlementConfirmed: z.boolean() })

export const cancelFormSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(CANCEL_REASON_MIN, `Enter at least ${CANCEL_REASON_MIN} characters`)
    .max(CANCEL_REASON_MAX, `Use at most ${CANCEL_REASON_MAX} characters`),
})
