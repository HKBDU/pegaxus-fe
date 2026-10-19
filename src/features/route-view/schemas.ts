import { z } from "zod";
import {
  actionEntityIdSchema,
  dossierStatusSchema,
  entityIdSchema,
  routePlanStatusSchema,
} from "@/features/transport-plan/schemas";
import { employeeBriefSchema } from "@/features/transport-plan/schemas";

export const routePlanIdSchema = entityIdSchema;
export const routeTypeSchema = z.enum(["PRIMARY", "BACKUP", "RETURN"]);
const transportModeSchema = z.enum(["ROAD", "SEA", "AIR"]);
const timestamp = z.iso.datetime({ offset: true });
const text = z.string().nullish();
const durationMinutes = z.number().int().min(0).max(2_147_483_647);
const replacesSequenceNoSchema = z
  .object({
    from: z.number().int().positive(),
    to: z.number().int().positive(),
  })
  .refine(
    (range) => range.to >= range.from,
    "The replacement segment range is invalid.",
  )
  .nullish();
// Missing/invalid coordinates must not discard otherwise usable segment data.
const coordinate = z.union([z.number(), z.string()]).nullish();
export const routeLocationSchema = z.object({
  locationId: entityIdSchema,
  locationName: z.string(),
  locationType: text,
  city: text,
  country: text,
  latitude: coordinate,
  longitude: coordinate,
});
const providerSchema = z.object({
  transportProviderId: entityIdSchema,
  providerCode: z.string(),
  providerName: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  supportedModes: z.array(transportModeSchema),
});
export const routeSegmentSchema = z.object({
  routePlanRouteId: entityIdSchema,
  sequenceNo: z.number().int().positive(),
  routeType: routeTypeSchema,
  route: z.object({
    routeId: entityIdSchema,
    routeCode: z.string(),
    routeName: text,
    transportMode: transportModeSchema,
    distanceKm: z.number().nonnegative().nullish(),
    estimatedDurationMinutes: durationMinutes.nullish(),
  }),
  fromLocation: routeLocationSchema,
  toLocation: routeLocationSchema,
  plannedDepartureAt: timestamp.nullish(),
  plannedArrivalAt: timestamp.nullish(),
  actualDepartureAt: timestamp.nullish(),
  actualArrivalAt: timestamp.nullish(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
  dwellAfterMinutes: durationMinutes.nullish(),
  isOutsourced: z.boolean(),
  vehicles: z.array(
    z.object({
      vehicleId: entityIdSchema,
      vehicleCode: z.string(),
      vehicleName: text,
      licensePlate: text,
      transportMode: transportModeSchema,
      capacityHorses: z.number().int().nonnegative().nullish(),
    }),
  ),
  // Current BE returns ProviderResponse directly; keep the established UI/mock shape.
  outsourcing: z
    .union([
      z.object({ provider: providerSchema }),
      providerSchema.transform((provider) => ({ provider })),
    ])
    .nullable(),
  driver: employeeBriefSchema.nullable(),
  escort: employeeBriefSchema.nullable(),
  note: text,
});
export const routeLegalReviewSchema = z.object({
  isFeasible: z.boolean(),
  note: text,
  blockedSegments: z.array(z.number().int().positive()).nullish(),
  reviewedBy: employeeBriefSchema.nullish(),
  reviewedAt: timestamp.nullish(),
});
export const routePlanDetailSchema = z.object({
  routePlanId: entityIdSchema,
  routePlanCode: z.string(),
  transportPlanId: entityIdSchema,
  bookingId: entityIdSchema,
  bookingCode: z.string(),
  routeType: routeTypeSchema,
  status: routePlanStatusSchema,
  isCrossBorder: z.boolean(),
  totalDistanceKm: z.number().nonnegative(),
  estimatedDurationMinutes: durationMinutes,
  plannedDepartureAt: timestamp.nullish(),
  plannedArrivalAt: timestamp.nullish(),
  segments: z.array(routeSegmentSchema),
  isPersonnelComplete: z.boolean(),
  legalReview: routeLegalReviewSchema.nullable(),
  replacesSequenceNo: replacesSequenceNoSchema,
  routeNote: text,
  createdAt: timestamp,
  updatedAt: timestamp,
});
export const routePlanSummarySchema = routePlanDetailSchema
  .pick({
    routePlanId: true,
    routePlanCode: true,
    routeType: true,
    status: true,
    totalDistanceKm: true,
    estimatedDurationMinutes: true,
    isPersonnelComplete: true,
    updatedAt: true,
  })
  .extend({
    segmentCount: z.number().int().nonnegative(),
    replacesSequenceNo: replacesSequenceNoSchema,
    routeNote: text,
  });
export const routePlansSchema = z.object({
  items: z.array(routePlanSummarySchema),
});
export const routePlansQuerySchema = z.object({
  routeType: routeTypeSchema.optional(),
  status: routePlanStatusSchema.optional(),
  includeCancelled: z.boolean().optional(),
});
export const routeViewTabSchema = z.enum(["map", "segments", "contingency"]);

const optionalNote = z
  .string()
  .max(4000)
  .trim()
  .optional()
  .transform((value) => value || undefined);
const extraCost = z
  .number()
  .finite()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER)
  .refine(Number.isSafeInteger, {
    message: "Enter a whole amount in VND (no decimals).",
  });
export const backupChangeRequestSchema = z.object({
  reason: z
    .string()
    .max(4000)
    .trim()
    .min(10, "Explain the change in at least 10 characters."),
  newEstimatedArrivalAt: timestamp,
  // EC1 takes a whole VND amount; the BE has no currency field in the request.
  estimatedExtraCost: extraCost.optional(),
  note: optionalNote,
});
export const routeChangeDecisionSchema = z
  .object({
    lastUpdatedAt: timestamp,
    decision: z.enum(["APPROVE", "REJECT"]),
    note: optionalNote,
  })
  .refine(
    (input) => input.decision !== "REJECT" || (input.note?.length ?? 0) >= 10,
    {
      path: ["note"],
      message: "Explain the rejection in at least 10 characters.",
    },
  );
export const returnSegmentOverrideSchema = z
  .object({
    routePlanRouteId: actionEntityIdSchema.refine(
      (id) => id !== "00000000-0000-0000-0000-000000000000",
    ),
    vehicleIds: z
      .array(
        actionEntityIdSchema.refine(
          (id) => id !== "00000000-0000-0000-0000-000000000000",
        ),
      )
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Submit each vehicle only once.",
      })
      .optional(),
    outsourcing: z
      .object({
        transportProviderId: actionEntityIdSchema.refine(
          (id) => id !== "00000000-0000-0000-0000-000000000000",
        ),
        note: optionalNote,
      })
      .optional(),
  })
  .refine(
    (input) =>
      input.vehicleIds === undefined || input.outsourcing === undefined,
    {
      path: ["vehicleIds"],
      message: "A segment cannot receive both vehicles and outsourcing.",
    },
  );
export const returnActivationSchema = z
  .object({
    lastUpdatedAt: timestamp,
    segments: z.array(returnSegmentOverrideSchema).max(100).optional(),
    note: optionalNote,
  })
  .refine(
    (input) =>
      !input.segments ||
      new Set(input.segments.map((segment) => segment.routePlanRouteId))
        .size === input.segments.length,
    {
      path: ["segments"],
      message: "Submit each segment only once.",
    },
  );
export const driverNoticeSchema = z.object({ message: optionalNote });
export const backupChangeRequestResultSchema = z.object({
  routePlanId: entityIdSchema,
  routeType: z.literal("BACKUP"),
  status: z.literal("CONFIRMED"),
  requestedAt: timestamp,
});
export const routeChangeDecisionResultSchema = z.object({
  routePlanId: entityIdSchema,
  routeType: z.enum(["BACKUP", "RETURN"]),
  decision: z.enum(["APPROVE", "REJECT"]),
  status: routePlanStatusSchema,
  updatedAt: timestamp,
  complianceDossier: z
    .object({
      complianceDossierId: entityIdSchema,
      status: dossierStatusSchema,
    })
    .nullable(),
});
export const returnActivationResultSchema = z.object({
  routePlanId: entityIdSchema,
  routeType: z.literal("RETURN"),
  status: z.literal("ACTIVE"),
  segments: z.array(routeSegmentSchema),
  updatedAt: timestamp,
});
export const driverNoticeResultSchema = z.object({
  routePlanId: entityIdSchema,
  notifiedDrivers: z.array(employeeBriefSchema),
  sentAt: timestamp,
});
