import { z } from "zod";
import {
  actionEntityIdSchema,
  dossierStatusSchema,
  entityIdSchema,
  routePlanStatusSchema,
} from "@/features/transport-plan/schemas";
import { employeeBriefSchema } from "@/features/transport-plan/schemas";

export const routePlanIdSchema = z.union([entityIdSchema, z.number()]).transform(String);
export const routeTypeSchema = z.enum(["PRIMARY", "BACKUP", "RETURN"]);
const transportModeSchema = z.enum(["ROAD", "SEA", "AIR"]);
// Tolerant timestamp parser: accepts ISO strings with or without offset, Date objects
const timestamp = z.union([z.string(), z.date()]).transform((val) => {
  if (val instanceof Date) return val.toISOString();
  return String(val);
});
const text = z.string().nullish();
const durationMinutes = z.number().nullish().transform((v) => Math.max(0, Math.round(v ?? 0)));
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
  locationId: z.union([entityIdSchema, z.number()]).nullish().transform((v) => String(v ?? "")),
  locationName: z.string().nullish().transform((v) => v ?? "Unknown Location"),
  locationType: text,
  city: text,
  country: text,
  latitude: coordinate,
  longitude: coordinate,
});
const providerSchema = z.object({
  transportProviderId: z.union([entityIdSchema, z.number()]).transform(String),
  providerCode: z.string().nullish().transform((v) => v ?? ""),
  providerName: z.string().nullish().transform((v) => v ?? ""),
  status: z.union([z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]), z.string()]).nullish().transform((v) => (v as any) ?? "ACTIVE"),
  supportedModes: z.array(transportModeSchema).nullish().transform((v) => v ?? []),
});
export const routeSegmentSchema = z.object({
  routePlanRouteId: z.union([entityIdSchema, z.number()]).nullish().transform((v) => String(v ?? "")),
  sequenceNo: z.number().int().nullish().transform((v) => v ?? 1),
  routeType: z.union([routeTypeSchema, z.string()]).nullish().transform((v) => (v as any) ?? "PRIMARY"),
  route: z
    .object({
      routeId: z.union([entityIdSchema, z.number()]).nullish().transform((v) => String(v ?? "")),
      routeCode: z.string().nullish().transform((v) => v ?? ""),
      routeName: text,
      transportMode: z.union([transportModeSchema, z.string()]).nullish().transform((v) => (v as any) ?? "ROAD"),
      distanceKm: z.number().nullish().transform((v) => v ?? 0),
      estimatedDurationMinutes: durationMinutes,
    })
    .nullish()
    .transform(
      (r) =>
        r ?? {
          routeId: "",
          routeCode: "",
          routeName: null,
          transportMode: "ROAD" as const,
          distanceKm: 0,
          estimatedDurationMinutes: 0,
        },
    ),
  fromLocation: routeLocationSchema,
  toLocation: routeLocationSchema,
  plannedDepartureAt: timestamp,
  plannedArrivalAt: timestamp,
  actualDepartureAt: timestamp.nullable().optional().transform((v) => v ?? null),
  actualArrivalAt: timestamp.nullable().optional().transform((v) => v ?? null),
  status: z.union([z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]), z.string()]).nullish().transform((v) => (v as any) ?? "PENDING"),
  dwellAfterMinutes: z
    .union([z.number(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "number" ? v : null)),
  isOutsourced: z.boolean().nullish().transform((v) => Boolean(v)),
  vehicles: z
    .array(
      z.object({
        vehicleId: z.union([entityIdSchema, z.number()]).nullish().transform((v) => String(v ?? "")),
        vehicleCode: z.string().nullish().transform((v) => v ?? ""),
        vehicleName: text,
        licensePlate: text,
        transportMode: z.union([transportModeSchema, z.string()]).nullish().transform((v) => (v as any) ?? "ROAD"),
        capacityHorses: z.number().nullish(),
      }),
    )
    .nullish()
    .transform((v) => v ?? []),
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
  isFeasible: z.boolean().nullish().transform((v) => Boolean(v)),
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
  routePlanId: z.union([entityIdSchema, z.number()]).transform(String),
  routePlanCode: z.string().nullish().transform((v) => v ?? ""),
  transportPlanId: z.union([entityIdSchema, z.number()]).nullish().transform((v) => String(v ?? "")),
  bookingId: z.union([entityIdSchema, z.number()]).nullish().transform((v) => String(v ?? "")),
  bookingCode: z.string().nullish().transform((v) => v ?? ""),
  routeType: z.union([routeTypeSchema, z.string()]).nullish().transform((v) => (v as any) ?? "PRIMARY"),
  status: z.union([routePlanStatusSchema, z.string()]).nullish().transform((v) => (v as any) ?? "DRAFT"),
  isCrossBorder: z.boolean().nullish().transform((v) => Boolean(v)),
  totalDistanceKm: z.number().nullish().transform((v) => v ?? 0),
  estimatedDurationMinutes: durationMinutes,
  plannedDepartureAt: timestamp.nullish(),
  plannedArrivalAt: timestamp.nullish(),
  segments: z.array(routeSegmentSchema).nullish().transform((v) => v ?? []),
  isPersonnelComplete: z.boolean().nullish().transform((v) => Boolean(v)),
  legalReview: routeLegalReviewSchema.nullable().optional().transform((v) => v ?? null),
  replacesSequenceNo: replacesSequenceNoSchema,
  routeNote: text,
  createdAt: timestamp,
  updatedAt: timestamp,
});
export const routePlanSummarySchema = z.object({
  routePlanId: z.union([entityIdSchema, z.number()]).transform(String),
  routePlanCode: z.string().nullish().transform((v) => v ?? ""),
  routeType: z.union([routeTypeSchema, z.string()]).nullish().transform((v) => (v as any) ?? "PRIMARY"),
  status: z.union([routePlanStatusSchema, z.string()]).nullish().transform((v) => (v as any) ?? "DRAFT"),
  totalDistanceKm: z.number().nullish().transform((v) => v ?? 0),
  estimatedDurationMinutes: durationMinutes,
  isPersonnelComplete: z.boolean().nullish().transform((v) => Boolean(v)),
  segmentCount: z.number().int().nonnegative(),
  replacesSequenceNo: replacesSequenceNoSchema,
  routeNote: text,
  updatedAt: timestamp,
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
    })
    .nullable(),
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
