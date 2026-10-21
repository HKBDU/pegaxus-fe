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

export const driverLocationRequestSchema = z
  .object({
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
  })
  .superRefine((data, ctx) => {
    if (data.latitude === 0 && data.longitude === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "Latitude and longitude must not both be 0.",
      });
    }
  });

export const driverLocationAcceptedSchema = z.object({
  serverTime: z.iso.datetime({ offset: true }),
});

export const locationPermissionDeniedSchema = z.object({
  notified: z.boolean(),
});
