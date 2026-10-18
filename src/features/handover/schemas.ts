import { z } from "zod"

const id = z.string().min(1)
const timestamp = z.iso.datetime({ offset: true })

/** Enums stay plain text: a value the BE adds later must not break a whole screen. */
const partySchema = z.object({
  type: z.string(),
  customerId: id.nullish(),
  employeeId: id.nullish(),
  transportProviderId: id.nullish(),
  partyName: z.string().nullish(),
  contactName: z.string().nullish(),
  contactPhone: z.string().nullish(),
})

const segmentBriefSchema = z.object({
  routePlanRouteId: id,
  displayOrder: z.number().int(),
  fromLocationName: z.string(),
  toLocationName: z.string(),
})

const effectsSchema = z.object({
  transportStatus: z.string(),
  routePlanStatus: z.string().nullish(),
  transportPlanStatus: z.string().nullish(),
  closedRoutePlanRouteId: id.nullish(),
  activatedRoutePlanRouteId: id.nullish(),
  claimWindowEndsAt: timestamp.nullish(),
})

/** HO2 and the `value` of HO3-HO6 (`effects` only after HO5). */
export const handoverRecordSchema = z.object({
  handoverRecordId: id,
  handoverCode: z.string(),
  transport: z.object({ transportId: id, transportCode: z.string(), status: z.string() }),
  bookingId: id.nullish(),
  sequenceNo: z.number().int(),
  handoverType: z.string(),
  status: z.string(),
  plannedHandoverAt: timestamp.nullish(),
  actualHandoverAt: timestamp.nullish(),
  completedAt: timestamp.nullish(),
  from: partySchema,
  to: partySchema,
  fromSegment: segmentBriefSchema.nullish(),
  toSegment: segmentBriefSchema.nullish(),
  location: z.object({ locationName: z.string().nullish(), address: z.string().nullish(), country: z.string().nullish() }),
  horseConditionNote: z.string().nullish(),
  documentHandoverNote: z.string().nullish(),
  equipmentHandoverNote: z.string().nullish(),
  discrepancyNote: z.string().nullish(),
  senderSignatureUrl: z.string().nullish(),
  receiverSignatureUrl: z.string().nullish(),
  cancelledAt: timestamp.nullish(),
  cancellationReason: z.string().nullish(),
  availableActions: z.array(z.string()).default([]),
  createdAt: timestamp,
  updatedAt: timestamp,
  effects: effectsSchema.nullish(),
})

/** HO1 item. */
export const handoverListItemSchema = z.object({
  handoverRecordId: id,
  handoverCode: z.string(),
  sequenceNo: z.number().int(),
  handoverType: z.string(),
  status: z.string(),
  fromPartyName: z.string().nullish(),
  toPartyName: z.string().nullish(),
  locationName: z.string().nullish(),
  plannedHandoverAt: timestamp.nullish(),
  actualHandoverAt: timestamp.nullish(),
})

export const handoverListSchema = z.object({
  serverTime: timestamp,
  items: z.array(handoverListItemSchema),
  pageIndex: z.number().int(),
  pageSize: z.number().int(),
  totalItems: z.number().int(),
  totalPages: z.number().int(),
})

const locationBriefSchema = z.object({
  locationId: id,
  locationName: z.string(),
  locationType: z.string().nullish(),
  city: z.string().nullish(),
  country: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
})

/** OT4, read only for the boundaries of the "create" picker and for the coordinates of the handover point. */
export const segmentsOverviewSchema = z.object({
  serverTime: timestamp,
  transportId: id,
  transportStatus: z.string(),
  segments: z.array(
    z.object({
      routePlanRouteId: id,
      displayOrder: z.number().int(),
      fromLocation: locationBriefSchema,
      toLocation: locationBriefSchema,
    }),
  ),
  handoverBoundaries: z.array(
    z.object({
      boundaryNo: z.number().int(),
      fromRoutePlanRouteId: id.nullish(),
      toRoutePlanRouteId: id.nullish(),
      location: z.object({ locationName: z.string(), address: z.string().nullish(), country: z.string().nullish() }),
      allowedHandoverTypes: z.array(z.string()).default([]),
      existingHandover: z
        .object({ handoverRecordId: id, handoverCode: z.string(), handoverType: z.string(), status: z.string() })
        .nullish(),
      canCreate: z.boolean(),
    }),
  ),
})

export const apiEnvelopeSchema = z.object({
  isSuccess: z.boolean(),
  code: z.number().optional(),
  message: z.string().nullish(),
  errorCode: z.string().nullish(),
  errors: z.unknown().optional(),
  value: z.unknown().optional(),
})

const noteSchema = (label: string) =>
  z.string().trim().min(1, `${label} is required.`).max(2000, `${label} must be at most 2000 characters.`)

const partyDraftSchema = z.object({
  partyName: z.string().trim().max(200, "Name must be at most 200 characters."),
  contactName: z.string().trim().max(150, "Contact must be at most 150 characters."),
  contactPhone: z.string().trim().max(30, "Phone must be at most 30 characters."),
})

/** Shape checks only (required, length). Business rules (who may sign, status, signatures on the server) stay with the BE. */
export const completeFormSchema = z.object({
  horseConditionNote: noteSchema("Horse condition"),
  documentHandoverNote: noteSchema("Compliance document notes"),
  equipmentHandoverNote: noteSchema("Equipment notes"),
  discrepancyNote: z.string().trim().max(2000, "Discrepancy notes must be at most 2000 characters."),
  from: partyDraftSchema,
  to: partyDraftSchema,
  location: z.object({
    locationName: z.string().trim().max(200, "Place name must be at most 200 characters."),
    address: z.string().trim().max(500, "Address must be at most 500 characters."),
    country: z.string().trim().max(100, "Country must be at most 100 characters."),
  }),
})
