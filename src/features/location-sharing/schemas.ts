import { z } from "zod";

export const locationEnvelopeSchema = z.object({
  isSuccess: z.boolean(),
  code: z.number().int(),
  message: z.string(),
  errorCode: z.string().nullish(),
  value: z.unknown(),
});

export const driverLocationRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  recordedAt: z.iso.datetime({ offset: true }),
  speedKmh: z.number().nonnegative().nullable().optional(),
  headingDegrees: z.number().min(0).max(359).nullable().optional(),
  accuracyMeters: z.number().nonnegative().nullable().optional(),
  routePlanRouteId: z.string().nullable().optional(),
});

export const arrivalBoundarySchema = z.object({
  boundaryNo: z.number().int().positive(),
  fromRoutePlanRouteId: z.string().nullable(),
  toRoutePlanRouteId: z.string().nullable(),
  arrivalAt: z.iso.datetime({ offset: true }).nullable(),
  handoverRequired: z.boolean(),
  location: z.object({
    locationName: z.string(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  radiusMeters: z.number().positive(),
  existingHandover: z
    .object({
      handoverRecordId: z.string(),
      status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
    })
    .nullable(),
});

export const driverLocationAcceptedSchema = z.object({
  serverTime: z.iso.datetime({ offset: true }),
  // Missing fields belong to legacy GP2; they are not explicit acceptance.
  accepted: z.boolean().optional(),
  reason: z.literal("NOT_CURRENT_SEGMENT_DRIVER").nullish(),
  arrival: arrivalBoundarySchema.nullish(),
});

export const segmentArrivalRequestSchema = driverLocationRequestSchema.pick({
  latitude: true,
  longitude: true,
});
const arrivalSegmentSchema = z.object({
  routePlanRouteId: z.string(),
  actualDepartureAt: z.iso.datetime({ offset: true }),
  actualArrivalAt: z.iso.datetime({ offset: true }).nullable(),
});
export const segmentArrivalResultSchema = z.object({
  boundaryNo: z.number().int().positive(),
  from: arrivalSegmentSchema.extend({
    status: z.literal("COMPLETED"),
    actualArrivalAt: z.iso.datetime({ offset: true }),
  }),
  to: arrivalSegmentSchema.extend({ status: z.literal("IN_TRANSIT") }),
});

export const assignedLocationContextSchema = z.object({
  serverTime: z.iso.datetime({ offset: true }),
  items: z.array(
    z.object({
      transportId: z.string(),
      status: z.enum(["READY", "IN_TRANSIT", "COMPLETED"]),
      myRole: z.enum(["DRIVER", "ESCORT"]),
      currentSegment: z
        .object({
          routePlanRouteId: z.string(),
          status: z.enum(["PLANNED", "IN_TRANSIT", "COMPLETED"]),
          isMine: z.boolean().optional(),
        })
        .nullable(),
    }),
  ),
});

export const locationPermissionDeniedSchema = z.object({
  notified: z.boolean(),
});
