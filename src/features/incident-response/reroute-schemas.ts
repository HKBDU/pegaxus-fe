import { z } from "zod";
import {
  INCIDENT_CATEGORY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
} from "@/shared/constants/incident";

const id = z.string().min(1);
const time = z.iso.datetime({ offset: true });
export const rerouteIncidentIdSchema = z
  .uuid()
  .refine(
    (value) => value !== "00000000-0000-0000-0000-000000000000",
    "A valid, non-empty incident UUID is required.",
  );
const location = z.object({
  locationId: id,
  locationName: z.string(),
  locationType: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});
const planStatus = z.enum([
  "DRAFT",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "PENDING_LEGAL_REVIEW",
  "PENDING_MANAGER_APPROVAL",
  "REJECTED_BY_MANAGER",
  "APPROVED",
]);
const segment = z.object({
  routePlanRouteId: id,
  routePlanId: id,
  sequenceNo: z.number().int().positive(),
  routeType: z.enum(["PRIMARY", "BACKUP", "RETURN"]),
  fromLocation: location.nullable(),
  toLocation: location.nullable(),
  status: z.enum(["PLANNED", "IN_TRANSIT", "COMPLETED"]),
  plannedArrivalAt: time.nullable(),
  actualDepartureAt: time.nullable(),
  actualArrivalAt: time.nullable(),
});
const plan = z.object({
  routePlanId: id,
  routePlanCode: z.string(),
  status: planStatus,
  totalDistanceKm: z.number().nonnegative().nullable(),
  estimatedDurationMinutes: z.number().int().nonnegative().nullable(),
  plannedArrivalAt: time.nullable(),
  etaDelayMinutes: z.number().nullable(),
  isAvailable: z.boolean(),
  unavailableReason: z.string().nullable(),
  checks: z.array(
    z.object({ code: z.string(), passed: z.boolean(), message: z.string() }),
  ),
  branchSequenceNo: z.number().int().positive().nullish(),
  branchLocation: location.nullish(),
});
const employee = z.object({
  employeeId: id,
  employeeCode: z.string(),
  fullName: z.string(),
  role: z.string(),
});
export const rerouteContextSchema = z.object({
  serverTime: time,
  incident: z.object({
    incidentReportId: id,
    incidentCode: z.string(),
    category: z.enum(Object.values(INCIDENT_CATEGORY)),
    severity: z.enum(Object.values(INCIDENT_SEVERITY)),
    status: z.enum(Object.values(INCIDENT_STATUS)),
    title: z.string(),
    vehicleOperable: z.boolean().nullable(),
    occurredAt: time,
  }),
  transport: z.object({
    transportId: id,
    transportCode: z.string(),
    status: z.enum([
      "CREATED",
      "PLANNING",
      "READY",
      "IN_TRANSIT",
      "COMPLETED",
      "CANCELLED",
    ]),
    transportPlanId: id.nullable(),
  }),
  currentSegment: segment.nullable(),
  remainingSegments: z.array(segment),
  backupPlans: z.array(plan),
  returnPlan: plan.nullable(),
  complianceDossiers: z.array(
    z.object({
      complianceDossierId: id,
      dossierCode: z.string(),
      dossierType: z.enum(["MAIN", "EXTRA"]),
      status: z.enum([
        "DRAFT",
        "IN_PREPARATION",
        "READY_FOR_SUBMISSION",
        "SUBMITTED",
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CLOSED",
      ]),
    }),
  ),
  hold: z
    .object({
      status: z.enum(["ACTIVE", "EXPIRED"]),
      startedAt: time,
      holdUntil: time,
      holdMinutes: z.number().int().positive(),
      monitorIntervalMinutes: z.number().int().positive(),
      reason: z.string(),
      safeStopLocation: location.nullable(),
      decidedBy: employee,
    })
    .nullable(),
  // Unknown future capabilities stay descriptive; no action is executable in RT1.
  availableActions: z.array(z.string()),
});

export type RerouteContext = z.infer<typeof rerouteContextSchema>;
export type ReroutePlan = RerouteContext["backupPlans"][number];

export const rerouteEscalationRequestSchema = z
  .strictObject({
    reason: z
      .string()
      .trim()
      .min(10, "Enter at least 10 characters.")
      .max(2000, "Use at most 2,000 characters."),
    suggestedAction: z.enum(["HOLD", "RETURN"]).optional(),
    suggestedHoldMinutes: z
      .number()
      .int("Enter whole minutes.")
      .min(15)
      .max(240)
      .optional(),
    blockedRoutePlanIds: z.array(rerouteIncidentIdSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.suggestedHoldMinutes !== undefined &&
      value.suggestedAction !== "HOLD"
    )
      ctx.addIssue({
        code: "custom",
        path: ["suggestedHoldMinutes"],
        message: "A wait duration is only valid with HOLD.",
      });
    const ids =
      value.blockedRoutePlanIds?.map((value) => value.toLowerCase()) ?? [];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        path: ["blockedRoutePlanIds"],
        message: "Select each route plan only once.",
      });
  });

const rerouteEscalationFormBase = z.object({
  reason: z.string(),
  suggestedAction: z.enum(["NONE", "HOLD", "RETURN"]),
  suggestedHoldMinutes: z.string(),
  blockedRoutePlanIds: z.array(z.string()),
});

function escalationRequestFromForm(
  values: z.infer<typeof rerouteEscalationFormBase>,
) {
  const minutes = values.suggestedHoldMinutes.trim();
  return {
    reason: values.reason,
    ...(values.suggestedAction !== "NONE"
      ? { suggestedAction: values.suggestedAction }
      : {}),
    ...(values.suggestedAction === "HOLD" && minutes
      ? { suggestedHoldMinutes: Number(minutes) }
      : {}),
    ...(values.blockedRoutePlanIds.length
      ? { blockedRoutePlanIds: values.blockedRoutePlanIds }
      : {}),
  };
}

export function parseRerouteEscalationForm(
  values: z.infer<typeof rerouteEscalationFormBase>,
) {
  return rerouteEscalationRequestSchema.parse(
    escalationRequestFromForm(values),
  );
}

export const rerouteEscalationFormSchema =
  rerouteEscalationFormBase.superRefine((values, ctx) => {
    const parsed = rerouteEscalationRequestSchema.safeParse(
      escalationRequestFromForm(values),
    );
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        ctx.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        });
    }
  });

export const rerouteEscalationResultSchema = z.object({
  incidentReportId: rerouteIncidentIdSchema,
  incidentStatus: z.literal("PENDING"),
  notifiedLogisticsManagers: z.array(
    z.object({
      ...employee.shape,
      employeeId: rerouteIncidentIdSchema,
      role: z.literal("LOGISTICS_MANAGER"),
    }),
  ),
  sentAt: time,
});

export type RerouteEscalationRequest = z.infer<
  typeof rerouteEscalationRequestSchema
>;
export type RerouteEscalationResult = z.infer<
  typeof rerouteEscalationResultSchema
>;

const holdMinutes = z
  .number({ error: "Enter whole minutes from 15 to 240." })
  .int()
  .min(15)
  .max(240);
const monitorMinutes = z
  .number({ error: "Enter whole minutes from 10 to 120." })
  .int()
  .min(10)
  .max(120);
export const rerouteHoldRequestSchema = z.strictObject({
  holdMinutes,
  reason: z
    .string()
    .trim()
    .min(10, "Enter at least 10 characters.")
    .max(2000, "Use at most 2,000 characters."),
  monitorIntervalMinutes: monitorMinutes.optional(),
  safeStopLocationId: rerouteIncidentIdSchema.optional(),
});
const holdFormBase = z.object({
  holdMinutes: z.string(),
  reason: z.string(),
  monitorIntervalMinutes: z.string(),
  safeStopLocationId: z.string(),
});
function holdRequestFromForm(values: z.infer<typeof holdFormBase>) {
  const integer = (value: string) =>
    /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;
  return {
    holdMinutes: integer(values.holdMinutes),
    reason: values.reason,
    ...(values.monitorIntervalMinutes.trim()
      ? { monitorIntervalMinutes: integer(values.monitorIntervalMinutes) }
      : {}),
    ...(values.safeStopLocationId
      ? { safeStopLocationId: values.safeStopLocationId }
      : {}),
  };
}
export const rerouteHoldFormSchema = holdFormBase.superRefine((values, ctx) => {
  const parsed = rerouteHoldRequestSchema.safeParse(
    holdRequestFromForm(values),
  );
  if (!parsed.success)
    for (const issue of parsed.error.issues)
      ctx.addIssue({
        code: "custom",
        path: issue.path,
        message: issue.message,
      });
});
export const parseRerouteHoldForm = (values: z.infer<typeof holdFormBase>) =>
  rerouteHoldRequestSchema.parse(holdRequestFromForm(values));

export const rerouteHoldLocationSchema = z.object({
  ...location.shape,
  locationId: rerouteIncidentIdSchema,
});
export const rerouteHoldLocationsSchema = z.object({
  items: z.array(rerouteHoldLocationSchema),
  pageIndex: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export const rerouteHoldResultSchema = z
  .object({
    incidentReportId: rerouteIncidentIdSchema,
    incidentStatus: z.literal("PENDING"),
    hold: z.object({
      ...rerouteContextSchema.shape.hold.unwrap().shape,
      status: z.literal("ACTIVE"),
      holdMinutes,
      monitorIntervalMinutes: monitorMinutes,
      safeStopLocation: rerouteHoldLocationSchema.nullable(),
      decidedBy: z.object({
        ...employee.shape,
        employeeId: rerouteIncidentIdSchema,
        role: z.literal("LOGISTICS_MANAGER"),
      }),
    }),
    notified: z.array(
      z.object({ ...employee.shape, employeeId: rerouteIncidentIdSchema }),
    ),
  })
  .superRefine((result, ctx) => {
    if (Date.parse(result.hold.holdUntil) <= Date.parse(result.hold.startedAt))
      ctx.addIssue({
        code: "custom",
        path: ["hold", "holdUntil"],
        message: "The hold end must follow its start.",
      });
  });
export type RerouteHoldRequest = z.infer<typeof rerouteHoldRequestSchema>;
export type RerouteHoldResult = z.infer<typeof rerouteHoldResultSchema>;
export type RerouteHold = NonNullable<RerouteContext["hold"]>;
export type RerouteHoldLocation = z.infer<typeof rerouteHoldLocationSchema>;
