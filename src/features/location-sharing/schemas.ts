import { z } from "zod";

// Contract boundary only. Phase 1 does not acquire a position or submit either request.
export const driverLocationRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  recordedAt: z.iso.datetime({ offset: true }),
  speedKmh: z.number().nonnegative().nullable().optional(),
  headingDegrees: z.number().min(0).max(359).nullable().optional(),
  accuracyMeters: z.number().nonnegative().nullable().optional(),
  routePlanRouteId: z.string().nullable().optional(),
});

export const driverLocationAcceptedSchema = z.object({
  serverTime: z.iso.datetime({ offset: true }),
});

export const locationPermissionDeniedSchema = z.object({
  notified: z.boolean(),
});
