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
