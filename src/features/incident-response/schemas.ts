import { z } from "zod";
import {
  EMERGENCY_COST_CATEGORY,
  EMERGENCY_COST_STATUS,
  INCIDENT_CATEGORY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
} from "@/shared/constants/incident";

export const emergencyCostStatuses = Object.values(EMERGENCY_COST_STATUS);
export const emergencyCostCategories = Object.values(EMERGENCY_COST_CATEGORY);
export const emergencyCostSortSchema = z.enum([
  "requestedAt:desc",
  "requestedAt:asc",
]);
const identifier = z.string().trim().min(1);
export const emergencyCostIdSchema = z.uuid().refine((id) => id !== "00000000-0000-0000-0000-000000000000", "A valid, non-empty UUID is required.");
const timestamp = z.iso.datetime({ offset: true });
const wholeAmount = z.number().nonnegative().refine(Number.isSafeInteger, {
  message: "Amounts must be safe whole numbers of VND.",
});

export const emergencyCostQuerySchema = z
  .object({
    status: z
      .string()
      .transform((value) => value.split(",").map((status) => status.trim()))
      .pipe(z.array(z.enum(emergencyCostStatuses)).min(1))
      .transform((selected) =>
        emergencyCostStatuses.filter((status) => selected.includes(status)).join(","),
      )
      .optional(),
    category: z.enum(emergencyCostCategories).optional(),
    incidentReportId: identifier.optional(),
    transportId: identifier.optional(),
    fromDate: z.iso.date().optional(),
    toDate: z.iso.date().optional(),
    keyword: z.string().trim().transform((value) => value || undefined).optional(),
    pageIndex: z.number().int().positive().default(1),
    pageSize: z.number().int().positive().default(20),
    sortBy: emergencyCostSortSchema.default("requestedAt:desc"),
  })
  .superRefine((query, ctx) => {
    if (query.fromDate && query.toDate && query.fromDate > query.toDate) {
      ctx.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "End date must not precede start date.",
      });
    }
  });

// CO2 wire projection, not a replacement for the shared incident domain model.
export const emergencyCostListItemSchema = z.object({
  emergencyCostRequestId: identifier,
  requestCode: z.string().min(1),
  incident: z.object({
    incidentReportId: identifier,
    incidentCode: z.string().min(1),
    category: z.enum(Object.values(INCIDENT_CATEGORY)),
    severity: z.enum(Object.values(INCIDENT_SEVERITY)),
    status: z.enum(Object.values(INCIDENT_STATUS)),
    transportId: identifier,
  }),
  transportCode: z.string(),
  category: z.enum(emergencyCostCategories),
  requestedAmount: wholeAmount.gt(0),
  approvedAmount: wholeAmount.nullable(),
  currency: z.literal("VND"),
  status: z.enum(emergencyCostStatuses),
  requestedAt: timestamp,
  requestedBy: z.object({
    employeeId: identifier,
    employeeCode: z.string(),
    fullName: z.string(),
    role: z.string(),
  }).nullable(),
  updatedAt: timestamp,
});

const optionalCount = z.number().int().nonnegative().nullish();
export const emergencyCostPageSchema = z.object({
  serverTime: timestamp,
  counts: z.object({
    pending: optionalCount,
    approved: optionalCount,
    rejected: optionalCount,
    cancelled: optionalCount,
  }).nullish(),
  items: z.array(emergencyCostListItemSchema),
  pageIndex: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
}).superRefine((page, ctx) => {
  if (page.items.length > page.pageSize || page.items.length > page.totalItems ||
      (page.totalItems > 0 && page.totalPages === 0)) {
    ctx.addIssue({
      code: "custom",
      path: ["items"],
      message: "Emergency cost pagination metadata is inconsistent.",
    });
  }
});

export const emergencyCostEnvelopeSchema = z.object({
  isSuccess: z.boolean(),
  code: z.number().int(),
  message: z.string(),
  errorCode: z.string().nullish(),
  errors: z.array(z.object({ field: z.string(), message: z.string() })).nullish(),
  value: z.unknown(),
});

export type EmergencyCostQuery = z.input<typeof emergencyCostQuerySchema>;
export type EmergencyCostParams = z.output<typeof emergencyCostQuerySchema>;
export type EmergencyCostListItem = z.infer<typeof emergencyCostListItemSchema>;
export type EmergencyCostPage = z.infer<typeof emergencyCostPageSchema>;

export const emergencyCostCreateSchema = z.object({
  category: z.enum(emergencyCostCategories),
  requestedAmount: wholeAmount.gt(0, "Enter a positive whole number of VND."),
  description: z.string().trim().min(10, "Enter at least 10 characters."),
  justification: z.string().trim().min(10, "Enter at least 10 characters."),
  invoiceRequired: z.boolean().optional(),
  photoFiles: z
    .array(z.object({ publicId: z.string().trim().min(1) }))
    .max(5)
    .optional(),
});

export const emergencyCostFormSchema = emergencyCostCreateSchema
  .omit({ photoFiles: true })
  .extend({
    requestedAmount: z
      .string()
      .trim()
      .regex(
        /^(?:\d+|\d{1,3}(?:,\d{3})+)$/,
        "Enter whole VND only, without decimals or a sign.",
      )
      .transform((value) => Number(value.replaceAll(",", "")))
      .pipe(wholeAmount.gt(0, "Enter a positive whole number of VND.")),
  });

const employeeBrief = z.object({
  employeeId: identifier,
  employeeCode: z.string().nullish(),
  fullName: z.string(),
  role: z.string(),
});

export const emergencyCostRequestSchema = emergencyCostListItemSchema
  .omit({ transportCode: true })
  .extend({
    description: z.string(),
    justification: z.string(),
    decision: z
      .object({
        decision: z.enum(["APPROVED", "REJECTED"]),
        approvedAmount: wholeAmount,
        decisionReason: z.string().nullable(),
        decidedBy: employeeBrief.nullable(),
        decidedAt: timestamp,
      })
      .nullish(),
    cancelledAt: timestamp.nullish(),
    cancellationReason: z.string().nullish(),
    invoiceRequired: z.boolean().nullish(),
    createdAt: timestamp,
  });

export const emergencyCostDetailSchema = emergencyCostRequestSchema
  .extend({
    availableActions: z.array(z.string()),
    incidentSummary: z
      .object({
        incidentReportId: identifier,
        incidentCode: z.string().min(1),
        category: z.enum(Object.values(INCIDENT_CATEGORY)),
        severity: z.enum(Object.values(INCIDENT_SEVERITY)),
        status: z.enum(Object.values(INCIDENT_STATUS)),
        title: z.string(),
        occurredAt: timestamp,
        location: z
          .object({
            locationId: identifier,
            locationName: z.string(),
            locationType: z.string().nullish(),
            city: z.string().nullish(),
            country: z.string().nullish(),
            latitude: z.number().min(-90).max(90).nullish(),
            longitude: z.number().min(-180).max(180).nullish(),
          })
          .nullable(),
        vehicle: z
          .object({
            vehicleId: identifier,
            vehicleCode: z.string(),
            licensePlate: z.string(),
            status: z.string(),
          })
          .nullable(),
      })
      .nullish(),
    otherRequests: z.array(
      z.object({
        emergencyCostRequestId: identifier,
        requestCode: z.string(),
        category: z.enum(emergencyCostCategories),
        requestedAmount: wholeAmount.gt(0),
        approvedAmount: wholeAmount.nullable(),
        status: z.enum(emergencyCostStatuses),
      }),
    ),
    horseHealthSummary: z
      .object({
        total: z.number().int().nonnegative(),
        normal: z.number().int().nonnegative(),
        observationRequired: z.number().int().nonnegative(),
        atRisk: z.number().int().nonnegative(),
        critical: z.number().int().nonnegative(),
        noData: z.number().int().nonnegative(),
      })
      .nullish(),
    currentRoute: z
      .object({
        routePlanId: identifier,
        routePlanCode: z.string(),
        routeType: z.enum(["PRIMARY", "BACKUP", "RETURN"]),
        status: z.string(),
      })
      .nullish(),
    serverTime: timestamp,
  })
  .superRefine((value, ctx) => {
    if (
      value.incidentSummary &&
      value.incidentSummary.incidentReportId.toLowerCase() !==
        value.incident.incidentReportId.toLowerCase()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["incidentSummary"],
        message: "Incident context does not match this request.",
      });
    }
  });

// Read-only IN8 projection for direct CO1 URLs; no incident feature internals are imported.
export const emergencyCostIncidentSchema = z.object({
  incidentReportId: identifier,
  incidentCode: z.string().min(1),
  title: z.string(),
  category: z.enum(Object.values(INCIDENT_CATEGORY)),
  severity: z.enum(Object.values(INCIDENT_SEVERITY)),
  status: z.enum(Object.values(INCIDENT_STATUS)),
  transport: z.object({
    transportId: identifier,
    transportCode: z.string(),
    status: z.string(),
  }),
  availableActions: z.array(z.string()),
});

export type EmergencyCostCreateInput = z.infer<
  typeof emergencyCostCreateSchema
>;
export type EmergencyCostRequestDto = z.infer<
  typeof emergencyCostRequestSchema
>;
export type EmergencyCostDetail = z.infer<typeof emergencyCostDetailSchema>;
export type EmergencyCostIncident = z.infer<typeof emergencyCostIncidentSchema>;
