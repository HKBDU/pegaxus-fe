import { z } from "zod"
import {
  countDecimalPlaces,
  PHONE_MESSAGE,
  VALIDATION_LIMITS,
  isPhoneValid,
} from "@/shared/constants/validation-limits"

const id = z.string()
const timestamp = z.iso.datetime({ offset: true })

const latitudeSchema = z
  .number()
  .finite()
  .min(VALIDATION_LIMITS.latitude.min, "Latitude must be between -90 and 90 (up to 4 decimal places).")
  .max(VALIDATION_LIMITS.latitude.max, "Latitude must be between -90 and 90 (up to 4 decimal places).")
  .refine((value) => countDecimalPlaces(value) <= VALIDATION_LIMITS.coordinateScale, "Latitude must be between -90 and 90 (up to 4 decimal places).")

const longitudeSchema = z
  .number()
  .finite()
  .min(VALIDATION_LIMITS.longitude.min, "Longitude must be between -180 and 180 (up to 4 decimal places).")
  .max(VALIDATION_LIMITS.longitude.max, "Longitude must be between -180 and 180 (up to 4 decimal places).")
  .refine((value) => countDecimalPlaces(value) <= VALIDATION_LIMITS.coordinateScale, "Longitude must be between -180 and 180 (up to 4 decimal places).")

export const handoverCoordinatesSchema = z.object({ latitude: latitudeSchema, longitude: longitudeSchema })

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
  /** Point and radius the device must be in to complete (HO5); null for `OTHER`. */
  geofence: handoverCoordinatesSchema.extend({ radiusMeters: z.number() }).nullish(),
  /** Signed URLs that expire after 5 minutes: never cached for long. */
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
  latitude: latitudeSchema.nullish().transform((value) => value ?? null),
  longitude: longitudeSchema.nullish().transform((value) => value ?? null),
})

/** OT4, read only for the boundaries of the "create" picker and for the coordinates of the handover point. */
export const segmentsOverviewSchema = z.object({
  serverTime: timestamp,
  transportId: id,
  transportStatus: z.string(),
  segments: z.array(
    z.object({
      routePlanRouteId: id,
      /** Used to link to the route plan page when HO3-HO5 answer VEHICLE_STILL_ON_ANOTHER_TRIP. */
      routePlanId: id.optional(),
      displayOrder: z.number().int(),
      fromLocation: locationBriefSchema,
      toLocation: locationBriefSchema,
      /** Read by the OT4 handover shortcut to spot a boundary run by the same driver. */
      driver: z.object({ employeeId: id }).nullish(),
      isOutsourced: z.boolean().optional(),
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
      /** false: both legs have the same driver, so no record is needed (and HO3 answers 422 HANDOVER_NOT_REQUIRED). */
      handoverRequired: z.boolean().default(true),
      arrivalAt: timestamp.nullish(),
      /** START_NOW (LM, RC, DRV, ESC) and / or SCHEDULE (LM, RC, TS). Missing on an older BE. */
      createModes: z.array(z.string()).optional(),
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
  z.string().trim().min(1, `${label} is required.`).max(VALIDATION_LIMITS.noteMaxLength, `${label} must be at most ${VALIDATION_LIMITS.noteMaxLength} characters.`)

const partyDraftSchema = z.object({
  partyName: z.string().trim().max(200, "Name must be at most 200 characters."),
  contactName: z.string().trim().max(150, "Contact must be at most 150 characters."),
  contactPhone: z
    .string()
    .trim()
    .max(30, "Phone must be at most 30 characters.")
    .refine(isPhoneValid, PHONE_MESSAGE),
})

/** Shape checks only (required, length). Business rules (who may sign, status, signatures on the server) stay with the BE. */
export const completeFormSchema = z.object({
  horseConditionNote: noteSchema("Horse condition"),
  documentHandoverNote: noteSchema("Compliance document notes"),
  equipmentHandoverNote: noteSchema("Equipment notes"),
  discrepancyNote: z.string().trim().max(VALIDATION_LIMITS.noteMaxLength, `Discrepancy notes must be at most ${VALIDATION_LIMITS.noteMaxLength} characters.`),
  from: partyDraftSchema,
  to: partyDraftSchema,
  location: z.object({
    locationName: z.string().trim().max(200, "Place name must be at most 200 characters."),
    address: z.string().trim().max(500, "Address must be at most 500 characters."),
    country: z.string().trim().max(100, "Country must be at most 100 characters."),
  }),
})

export const cancelHandoverFormSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(10, "Cancellation reason must contain at least 10 characters after trimming.")
    .max(VALIDATION_LIMITS.noteMaxLength, `Cancellation reason must not exceed ${VALIDATION_LIMITS.noteMaxLength} characters.`),
})

