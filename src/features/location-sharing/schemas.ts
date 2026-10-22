import { z } from "zod";
import {
  VALIDATION_LIMITS,
  countDecimalPlaces,
} from "@/shared/constants/validation-limits";

export const locationEnvelopeSchema = z.object({
  isSuccess: z.boolean(),
  code: z.number().int(),
  message: z.string(),
  errorCode: z.string().nullish(),
  value: z.unknown(),
});

const driverLocationRequestShape = {
    latitude: z
      .number()
      .min(VALIDATION_LIMITS.latitude.min)
      .max(VALIDATION_LIMITS.latitude.max)
      .refine(
        (val) => countDecimalPlaces(val) <= VALIDATION_LIMITS.coordinateScale,
        "Latitude must have at most 4 decimal places.",
      ),
    longitude: z
      .number()
      .min(VALIDATION_LIMITS.longitude.min)
      .max(VALIDATION_LIMITS.longitude.max)
      .refine(
        (val) => countDecimalPlaces(val) <= VALIDATION_LIMITS.coordinateScale,
        "Longitude must have at most 4 decimal places.",
      ),
    recordedAt: z.iso.datetime({ offset: true }),
    speedKmh: z
      .number()
      .min(VALIDATION_LIMITS.trackingSpeedKmh.min)
      .max(VALIDATION_LIMITS.trackingSpeedKmh.max)
      .refine(
        (val) =>
          countDecimalPlaces(val) <= VALIDATION_LIMITS.trackingSpeedKmh.scale,
        "Speed must have at most 1 decimal place.",
      )
      .nullable()
      .optional(),
    headingDegrees: z
      .number()
      .min(VALIDATION_LIMITS.headingDegrees.min)
      .max(VALIDATION_LIMITS.headingDegrees.max)
      .refine(
        (val) =>
          countDecimalPlaces(val) <= VALIDATION_LIMITS.headingDegrees.scale,
        "Heading must have at most 1 decimal place.",
      )
      .nullable()
      .optional(),
    accuracyMeters: z
      .number()
      .min(VALIDATION_LIMITS.trackingAccuracyMeters.min)
      .max(VALIDATION_LIMITS.trackingAccuracyMeters.max)
      .refine(
        (val) =>
          countDecimalPlaces(val) <=
          VALIDATION_LIMITS.trackingAccuracyMeters.scale,
        "Accuracy must have at most 1 decimal place.",
      )
      .nullable()
      .optional(),
    routePlanRouteId: z.string().nullable().optional(),
} satisfies z.ZodRawShape;

export const driverLocationRequestSchema = z
  .object(driverLocationRequestShape)
  .superRefine((data, ctx) => {
    if (data.latitude === 0 && data.longitude === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "Latitude and longitude must not both be 0.",
      });
    }
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

export const segmentArrivalRequestSchema = z.object({
  latitude: driverLocationRequestShape.latitude,
  longitude: driverLocationRequestShape.longitude,
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
      transportCode: z.string(),
      bookingCode: z.string(),
      complianceDossierId: z.string().nullish(),
      status: z.enum(["READY", "IN_TRANSIT", "COMPLETED"]),
      myRole: z.enum(["DRIVER", "ESCORT"]),
      horseCount: z.number().int().nonnegative(),
      departureAt: z.iso.datetime({ offset: true }).nullable(),
      etaAt: z.iso.datetime({ offset: true }).nullable(),
      currentSegment: z
        .object({
          routePlanRouteId: z.string(),
          displayOrder: z.number().int().positive(),
          fromLocationName: z.string(),
          toLocationName: z.string(),
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