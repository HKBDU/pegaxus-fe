import { z } from "zod";

export const guidSchema = z
  .string()
  .regex(
    /^(?!00000000-0000-0000-0000-000000000000$)[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i,
    "Enter a valid non-empty GUID.",
  );
export const dateSchema = z.iso.date();
const integer = z.number().finite().refine(Number.isSafeInteger);
const count = integer.refine((value) => value >= 0);
const rate = z.number().finite().min(0).max(100);
const signed = z.number().finite();
export const bucketSchema = z.enum(["ON_TIME", "MINOR_DELAY", "MAJOR_DELAY"]);
export const causeSchema = z.enum([
  "VEHICLE_INCIDENT",
  "HORSE_HEALTH_INCIDENT",
  "ROUTE_CHANGE",
  "UNKNOWN",
]);
export const sortSchema = z.enum([
  "delayMinutes:asc",
  "delayMinutes:desc",
  "completedAt:asc",
  "completedAt:desc",
]);
const optionalGuid = z.union([z.literal(""), guidSchema]);

export const filterShape = {
  dateFrom: dateSchema,
  dateTo: dateSchema,
  originCountry: z.string().trim().max(100),
  destinationCountry: z.string().trim().max(100),
  routeId: optionalGuid,
  transportProviderId: optionalGuid,
  driverEmployeeId: optionalGuid,
  trendBy: z.enum(["WEEK", "MONTH"]),
  bucket: z.union([z.literal(""), bucketSchema]),
  sortBy: sortSchema,
  pageIndex: integer.refine((value) => value > 0, "Page must be positive."),
  pageSize: integer.refine(
    (value) => value >= 1 && value <= 100,
    "Page size must be between 1 and 100.",
  ),
};
function validateReportWindow(
  value: {
    dateFrom: string;
    dateTo: string;
    pageIndex: number;
    pageSize: number;
  },
  context: z.RefinementCtx,
) {
  const days =
    (Date.parse(value.dateTo + "T00:00:00Z") -
      Date.parse(value.dateFrom + "T00:00:00Z")) /
      86400000 +
    1;
  if (days < 1 || days > 366)
    context.addIssue({
      code: "custom",
      path: ["dateTo"],
      message: "Choose an inclusive date range of 1–366 days.",
    });
  if ((value.pageIndex - 1) * value.pageSize > 2147483647)
    context.addIssue({
      code: "custom",
      path: ["pageIndex"],
      message: "The requested page is too large.",
    });
}
export const reportFiltersSchema = z
  .object(filterShape)
  .superRefine(validateReportWindow);
const metric = (value: z.ZodNumber, change: z.ZodNumber = signed) =>
  z.object({
    value: value.nullable(),
    previous: value.nullable(),
    change: change.nullable(),
  });
const time = z.iso.datetime({ offset: true });
export const onTimeReportSchema = z.object({
  period: z.object({
    dateFrom: dateSchema,
    dateTo: dateSchema,
    previousDateFrom: dateSchema,
    previousDateTo: dateSchema,
  }),
  generatedAt: time,
  kpi: z.object({
    totalTransports: metric(count, integer),
    onTimeRate: metric(rate),
    avgDelayMinutes: metric(signed),
    slaTargetRate: rate,
    meetsSla: z.boolean(),
  }),
  distribution: z.object({
    ON_TIME: count,
    MINOR_DELAY: count,
    MAJOR_DELAY: count,
  }),
  trend: z.array(
    z.object({
      label: z.string(),
      from: dateSchema,
      to: dateSchema,
      total: count,
      onTimeRate: rate.nullable(),
    }),
  ),
  byProvider: z.array(
    z.object({
      transportProviderId: guidSchema.nullable(),
      providerName: z.string(),
      total: count,
      onTimeRate: rate.nullable(),
    }),
  ),
  delayCauses: z.array(z.object({ cause: causeSchema, count })),
  excluded: z.object({
    count,
    reasons: z.object({
      MISSING_PLANNED_END: count,
      MISSING_ACTUAL_ARRIVAL: count,
    }),
  }),
  items: z.array(
    z.object({
      transportId: guidSchema,
      transportCode: z.string(),
      bookingCode: z.string(),
      originCountry: z.string(),
      destinationCountry: z.string(),
      plannedEndAt: time,
      actualArrivalAt: time,
      delayMinutes: integer,
      bucket: bucketSchema,
      mainCause: causeSchema.nullable(),
    }),
  ),
  pageIndex: integer.refine((v) => v > 0),
  pageSize: integer.refine((v) => v >= 1 && v <= 100),
  totalItems: count,
  totalPages: count,
});
export const envelopeSchema = z.object({
  isSuccess: z.boolean(),
  code: integer,
  message: z.string(),
  errorCode: z.string().nullish(),
  errors: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .nullish(),
  value: z.unknown(),
});
export type ReportFilters = z.infer<typeof reportFiltersSchema>;
export type OnTimeReport = z.infer<typeof onTimeReportSchema>;
export type ExportFormat = "xlsx" | "pdf";
export type LookupKind = "route" | "provider" | "driver" | "vehicle";

export const incidentCategorySchema = z.enum([
  "VEHICLE",
  "HORSE_HEALTH",
  "BOTH",
  "ROUTE_CHANGE",
]);
export const severitySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const claimTypeSchema = z.enum([
  "HORSE_INJURY",
  "HORSE_HEALTH",
  "LOSS",
  "DAMAGE",
  "DELAY",
  "DOCUMENT_ISSUE",
  "SERVICE_ISSUE",
  "OTHER",
]);
export const claimStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "RESOLVED",
  "CANCELLED",
]);
export const incidentStatusSchema = z.enum([
  "REPORTED",
  "PENDING",
  "RESOLVED",
  "CANCELLED",
]);
export const incidentTypeSchema = z.enum([
  "BREAKDOWN",
  "ACCIDENT",
  "TIRE_DAMAGE",
  "ENGINE_FAILURE",
  "TEMPERATURE_CONTROL_FAILURE",
  "EQUIPMENT_FAILURE",
  "INJURY",
  "DEHYDRATION",
  "RESPIRATORY_ISSUE",
  "FEVER",
  "STRESS",
  "COLIC",
  "FATIGUE",
  "OTHER",
]);
export const costCategorySchema = z.enum([
  "VETERINARY",
  "MEDICATION",
  "VEHICLE_REPAIR",
  "TOWING",
  "REPLACEMENT_VEHICLE",
  "EMERGENCY_STABLE",
  "ROUTE_CHANGE",
  "ACCOMMODATION",
  "OTHER",
]);
export const incidentSortSchema = z.enum(["occurredAt:asc", "occurredAt:desc"]);

function csvSelection(options: readonly string[]) {
  return z.string().transform((input, context) => {
    if (!input.trim()) return "";
    const parts = input.split(",").map((value) => value.trim().toUpperCase());
    if (parts.some((value) => !options.includes(value))) {
      context.addIssue({
        code: "custom",
        message: `Choose only ${options.join(", ")}.`,
      });
      return z.NEVER;
    }
    return options.filter((value) => parts.includes(value)).join(",");
  });
}
export const incidentFiltersSchema = z
  .object({
    dateFrom: filterShape.dateFrom,
    dateTo: filterShape.dateTo,
    originCountry: filterShape.originCountry,
    destinationCountry: filterShape.destinationCountry,
    routeId: filterShape.routeId,
    transportProviderId: filterShape.transportProviderId,
    incidentCategory: csvSelection(incidentCategorySchema.options),
    severity: csvSelection(severitySchema.options),
    claimType: csvSelection(claimTypeSchema.options),
    vehicleId: optionalGuid,
    horseId: optionalGuid,
    sortBy: incidentSortSchema,
    pageIndex: filterShape.pageIndex,
    pageSize: filterShape.pageSize,
  })
  .superRefine(validateReportWindow);

export const incidentClaimReportSchema = z.object({
  period: onTimeReportSchema.shape.period,
  generatedAt: time,
  kpi: z.object({
    completedTransports: metric(count, integer),
    totalIncidents: metric(count, integer),
    incidentRate: metric(rate),
    totalClaims: metric(count, integer),
    claimRate: metric(rate),
    totalEmergencyCost: metric(integer, integer),
    currency: z.literal("VND"),
  }),
  incidentsByCategory: z.array(
    z.object({ category: incidentCategorySchema, count }),
  ),
  incidentsBySeverity: z.record(severitySchema, count),
  incidentsByType: z.array(
    z.object({ incidentType: incidentTypeSchema, count }),
  ),
  claimsByType: z.array(z.object({ claimType: claimTypeSchema, count })),
  claimsByStatus: z.record(claimStatusSchema, count),
  emergencyCostByCategory: z.array(
    z.object({ category: costCategorySchema, amount: integer }),
  ),
  vehicleReliability: z.array(
    z.object({
      vehicleId: guidSchema,
      vehicleCode: z.string(),
      licensePlate: z.string().nullable(),
      incidentCount: count,
      repairRequiredCount: count,
    }),
  ),
  items: z.array(
    z.object({
      incidentReportId: guidSchema,
      incidentCode: z.string(),
      occurredAt: time,
      category: incidentCategorySchema,
      incidentType: incidentTypeSchema.nullable(),
      severity: severitySchema,
      status: incidentStatusSchema,
      transportCode: z.string().nullable(),
      emergencyCost: integer,
      claimCodes: z.array(z.string()),
    }),
  ),
  pageIndex: onTimeReportSchema.shape.pageIndex,
  pageSize: onTimeReportSchema.shape.pageSize,
  totalItems: count,
  totalPages: count,
});
export type IncidentFilters = z.infer<typeof incidentFiltersSchema>;
export type IncidentClaimReport = z.infer<typeof incidentClaimReportSchema>;
