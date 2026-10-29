import { z } from "zod";
import {
  dossierStatusSchema,
  entityIdSchema,
  routePlanStatusSchema,
} from "@/features/transport-plan/schemas";
import { employeeBriefSchema } from "@/features/transport-plan/schemas";

export const routePlanIdSchema = z.union([entityIdSchema, z.number()]).transform(String);
export const routeTypeSchema = z.enum(["PRIMARY", "BACKUP", "RETURN"]);
const responseTimestamp = z.iso.datetime({ offset: true });
const transportModeSchema = z.enum(["ROAD", "SEA", "AIR"]);
// Tolerant timestamp parser: accepts ISO strings with or without offset, Date objects
const timestamp = z.union([z.iso.datetime({ offset: true }), z.date()]).transform((val) => {
  if (val instanceof Date) return val.toISOString();
  return String(val);
});
const text = z.string().nullish();
const durationMinutes = z.number().int().nonnegative();
const replacesSequenceNoSchema = z
  .object({
    from: z.number().int().positive(),
    to: z.number().int().positive(),
  })
  .nullable()
  .optional()
  .transform((v) => v ?? null);
// Missing/invalid coordinates must not discard otherwise usable segment data.
const coordinate = z.union([z.number(), z.string()]).nullish();

export const routeLocationSchema = z.object({
  locationId: z.union([entityIdSchema, z.number()]).transform(String),
  locationName: z.string().min(1),
  locationType: text,
  city: text,
  country: text,
  latitude: coordinate,
  longitude: coordinate,
});
const providerSchema = z.object({
  transportProviderId: z.union([entityIdSchema, z.number()]).transform(String),
  providerCode: z.string(),
  providerName: z.string(),
  status: z.string().min(1),
  supportedModes: z.array(transportModeSchema),
});
export const routeSegmentSchema = z.object({
  routePlanRouteId: z.string().min(1),
  sequenceNo: z.number().int().positive(),
  routeType: routeTypeSchema,
  route: z
    .object({
      routeId: z.string().min(1),
      routeCode: z.string(),
      routeName: text,
      transportMode: transportModeSchema,
      distanceKm: z.number().nonnegative().nullable(),
      estimatedDurationMinutes: durationMinutes.nullable(),
    }),
  fromLocation: routeLocationSchema,
  toLocation: routeLocationSchema,
  plannedDepartureAt: responseTimestamp.nullable(),
  plannedArrivalAt: responseTimestamp.nullable(),
  actualDepartureAt: timestamp.nullable().optional().transform((v) => v ?? null),
  actualArrivalAt: timestamp.nullable().optional().transform((v) => v ?? null),
  status: z.enum(["PLANNED", "IN_TRANSIT", "COMPLETED", "PENDING", "IN_PROGRESS"]),
  dwellAfterMinutes: z
    .union([z.number(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "number" ? v : null)),
  isOutsourced: z.boolean(),
  vehicles: z
    .array(
      z.object({
        vehicleId: z.union([entityIdSchema, z.number()]).transform(String),
        vehicleCode: z.string(),
        vehicleName: text,
        licensePlate: text,
        transportMode: transportModeSchema,
        capacityHorses: z.number().nullish(),
      }),
    ),
  // Current BE returns ProviderResponse directly; keep the established UI/mock shape.
  outsourcing: z
    .union([
      z.object({ provider: providerSchema }),
      providerSchema.transform((provider) => ({ provider })),
    ])
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  driver: employeeBriefSchema.nullable().optional().transform((v) => v ?? null),
  escort: employeeBriefSchema.nullable().optional().transform((v) => v ?? null),
  note: text,
});
export const routeLegalReviewSchema = z.object({
  isFeasible: z.boolean(),
  note: text,
  blockedSegments: z.array(z.number().int()).nullish(),
  reviewedBy: z
    .object({
      employeeId: z.union([entityIdSchema, z.number()]).nullish().transform((v) => String(v ?? "")),
      employeeCode: text,
      fullName: z.string().nullish().transform((v) => v ?? ""),
      role: z.string().nullish().transform((v) => v ?? ""),
    })
    .nullish(),
  reviewedAt: timestamp.nullable().optional().transform((v) => v ?? null),
});
export const routePlanDetailSchema = z.object({
  routePlanId: z.string().min(1),
  routePlanCode: z.string(),
  transportPlanId: z.string().min(1),
  bookingId: z.string().min(1),
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
  branchSequenceNo: z.number().int().positive().nullish(),
  legalReview: routeLegalReviewSchema.nullable().optional().transform((v) => v ?? null),
  replacesSequenceNo: replacesSequenceNoSchema,
  routeNote: text,
  createdAt: responseTimestamp,
  updatedAt: responseTimestamp,
});
export const routePlanSummarySchema = z.object({
  routePlanId: z.string().min(1),
  routePlanCode: z.string(),
  routeType: routeTypeSchema,
  status: routePlanStatusSchema,
  totalDistanceKm: z.number().nonnegative(),
  estimatedDurationMinutes: durationMinutes,
  isPersonnelComplete: z.boolean(),
  segmentCount: z.number().int().nonnegative(),
  branchSequenceNo: z.number().int().positive().nullish(),
  replacesSequenceNo: replacesSequenceNoSchema,
  routeNote: text,
  updatedAt: responseTimestamp,
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
    routePlanRouteId: z.string(),
    vehicleIds: z
      .array(z.string())
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Submit each vehicle only once.",
      })
      .optional(),
    outsourcing: z
      .object({
        transportProviderId: z.string(),
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
  routePlanId: z.union([entityIdSchema, z.number()]).transform(String),
  routeType: z.literal("BACKUP"),
  status: z.literal("CONFIRMED"),
  requestedAt: timestamp,
});
export const routeChangeDecisionResultSchema = z.object({
  routePlanId: z.union([entityIdSchema, z.number()]).transform(String),
  routeType: z.enum(["BACKUP", "RETURN"]),
  decision: z.enum(["APPROVE", "REJECT"]),
  status: routePlanStatusSchema,
  updatedAt: timestamp,
  complianceDossier: z
    .object({
      complianceDossierId: entityIdSchema,
      status: dossierStatusSchema,
      dossierCode: z.string().optional(),
      dossierType: z.literal("EXTRA").optional(),
      inheritedRequirementCount: z.number().int().nonnegative().optional(),
    })
    .nullable(),
  branchSequenceNo: z.number().int().positive().nullish(),
  branchLocation: routeLocationSchema.nullish(),
});
export const returnActivationResultSchema = z.object({
  routePlanId: z.union([entityIdSchema, z.number()]).transform(String),
  routeType: z.literal("RETURN"),
  status: z.literal("ACTIVE"),
  segments: z.array(routeSegmentSchema),
  updatedAt: timestamp,
});
export const driverNoticeResultSchema = z.object({
  routePlanId: z.union([entityIdSchema, z.number()]).transform(String),
  notifiedDrivers: z.array(employeeBriefSchema),
  sentAt: timestamp,
});
