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
