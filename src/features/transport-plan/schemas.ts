import { z } from "zod";
import { toLocalDateTime } from "./format";

export const apiEnvelopeSchema = z.object({
  isSuccess: z.boolean(),
  code: z.number().nullish().transform((v) => v ?? 200),
  message: z.string().nullish().transform((v) => v ?? ""),
  value: z.unknown().optional(),
  data: z.unknown().optional(),
  errorCode: z.string().nullish(),
  errors: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .nullish(),
});
export const apiErrorSchema = apiEnvelopeSchema
  .pick({ errorCode: true, message: true, errors: true })
  .partial();

// Backend identifiers are opaque strings. Require a usable ID only at action/query boundaries.
export const entityIdSchema = z.string();
export const actionEntityIdSchema = z.string();
export const transportPlanStatusSchema = z.enum([
  "DRAFT",
  "PENDING",
  "APPROVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);
export const routePlanStatusSchema = z.enum([
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
export const dossierStatusSchema = z.enum([
  "DRAFT",
  "IN_PREPARATION",
  "READY_FOR_SUBMISSION",
  "SUBMITTED",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CLOSED",
]);
export const approvedBookingSortSchema = z.enum([
  "requestedDepartureDate:asc",
  "requestedDepartureDate:desc",
  "approvedAt:asc",
  "approvedAt:desc",
  "createdAt:asc",
  "createdAt:desc",
]);

export const approvedBookingsQuerySchema = z
  .object({
    pageIndex: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    search: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    isInternational: z.boolean().optional(),
    transportPlanStatus: transportPlanStatusSchema.optional(),
    routePlanStatus: routePlanStatusSchema.optional(),
    hasRoutePlan: z.boolean().optional(),
    hasTransportPlan: z.boolean().optional(),
    hasComplianceDossier: z.boolean().optional(),
    complianceDossierStatus: dossierStatusSchema.optional(),
    departureFrom: z.iso.date().optional(),
    departureTo: z.iso.date().optional(),
    sortBy: approvedBookingSortSchema,
  })
  .refine(
    ({ departureFrom, departureTo }) =>
      !departureFrom || !departureTo || departureFrom <= departureTo,
    {
      message: "Departure end date must not precede the start date.",
      path: ["departureTo"],
    },
  );

const optionalText = z.string().nullish();
const customerSchema = z.object({
  customerId: entityIdSchema,
  customerCode: optionalText,
  fullName: z.string(),
});
const transportSchema = z.object({
  transportId: entityIdSchema,
  transportCode: z.string(),
});
export const planSummarySchema = z.object({
  transportPlanId: entityIdSchema,
  planCode: z.string(),
  status: transportPlanStatusSchema,
  plannedStartAt: z.iso.datetime({ offset: true }).nullish(),
  plannedEndAt: z.iso.datetime({ offset: true }).nullish(),
  estimatedDistanceKm: z.number().nonnegative().nullish(),
  estimatedDurationMinutes: z
    .number()
    .int()
    .min(0)
    .max(2_147_483_647)
    .nullish(),
  planningNote: optionalText,
});
const dossierSummarySchema = z.object({
  complianceDossierId: entityIdSchema,
  status: dossierStatusSchema,
});
const routeSummarySchema = z.object({
  routePlanId: entityIdSchema,
  routePlanCode: z.string(),
  status: routePlanStatusSchema,
});
const bookingFields = {
  bookingId: entityIdSchema,
  bookingCode: z.string(),
  status: z.literal("APPROVED"),
  originAddress: z.string(),
  originCountry: z.string(),
  destinationAddress: z.string(),
  destinationCountry: z.string(),
  isInternational: z.boolean(),
  totalHorses: z.number().int().nonnegative(),
  requestedDepartureDate: z.iso.date(),
  requestedArrivalDate: z.iso.date().nullish(),
  specialRequirements: optionalText,
  transportPlan: planSummarySchema.nullable(),
  complianceDossier: dossierSummarySchema.nullable(),
};

export const approvedBookingListItemSchema = z.object({
  ...bookingFields,
  transportPlan: planSummarySchema
    .extend({ planCode: z.string().optional() })
    .nullable(),
  customerName: z.string(),
  customerCode: optionalText,
  transportId: entityIdSchema.nullish(),
  // Proposed AB1 extension: older responses omit the genuine Transport code.
  // Nullability is not confirmed for AB1; do not inherit it from transportId.
  transportCode: z.string().optional(),
  routePlan: routeSummarySchema.nullable(),
  approvedAt: z.iso.datetime({ offset: true }).nullish(),
});
export const approvedBookingsPageSchema = z.object({
  items: z.array(approvedBookingListItemSchema),
  pageIndex: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

// AB2 lists every dossier of the transport (MAIN and EXTRA) in `complianceDossiers[]`; AB1 still sends the single MAIN one.
// Screens read `complianceDossier`, so the MAIN dossier (the first one when no type is sent) is derived from the list.
const dossierItemSchema = z.object({
  complianceDossierId: entityIdSchema,
  dossierCode: z.string().optional(),
  dossierType: z.enum(["MAIN", "EXTRA"]).nullish(),
  status: dossierStatusSchema,
});
export const approvedBookingDetailSchema = z
  .object({
    ...bookingFields,
    complianceDossier: dossierSummarySchema.nullish(),
    complianceDossiers: z.array(dossierItemSchema).default([]),
    customer: customerSchema.extend({ phone: optionalText }),
    customerNote: optionalText,
    horses: z.array(
      z.object({
        horseId: entityIdSchema,
        horseName: z.string(),
        sex: optionalText,
        breed: optionalText,
        microchipNumber: optionalText,
        passportNumber: optionalText,
        specialHandlingNotes: optionalText,
      }),
    ),
    transport: transportSchema.extend({ status: z.string().min(1) }).nullable(),
    // Display the API statuses without introducing another RoutePlan state machine.
    routePlans: z.array(
      routeSummarySchema.extend({
        routeType: z.enum(["PRIMARY", "BACKUP", "RETURN"]),
      }),
    ),
  })
  .transform(({ complianceDossier, complianceDossiers, ...booking }) => {
    const main =
      complianceDossiers.find((item) => item.dossierType === "MAIN") ??
      complianceDossiers[0];
    return {
      ...booking,
      complianceDossier:
        complianceDossier ??
        (main
          ? {
              complianceDossierId: main.complianceDossierId,
              status: main.status,
            }
          : null),
    };
  });

export const transportPlanIdSchema = entityIdSchema;
export const transportPlanSortSchema = z.enum([
  "createdAt:asc",
  "createdAt:desc",
  "plannedStartAt:asc",
  "plannedStartAt:desc",
]);
export const transportPlanTabSchema = z.enum([
  "general",
  "personnel",
  "invoices",
]);
const maxDurationMinutes = 2_147_483_647;
// Backend storage uses NUMERIC(10,2); do not submit a value it cannot persist.
const maxDistanceKm = 99_999_999.99;
export const transportPlansQuerySchema = z.object({
  pageIndex: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  search: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  status: transportPlanStatusSchema.optional(),
  routePlanStatus: routePlanStatusSchema.optional(),
  sortBy: transportPlanSortSchema,
});
const timestamp = z.iso.datetime({ offset: true });
const optionalTimestamp = timestamp.nullish();
export const employeeBriefSchema = z.object({
  employeeId: entityIdSchema,
  employeeCode: optionalText,
  fullName: z.string(),
  role: z.string(),
});
const quotationStatusSchema = z.enum(["DRAFT", "ISSUED"]);

export const transportPlanListItemSchema = z.object({
  transportPlanId: entityIdSchema,
  planCode: z.string(),
  status: transportPlanStatusSchema,
  bookingId: entityIdSchema,
  bookingCode: z.string(),
  customerName: z.string(),
  plannedStartAt: optionalTimestamp,
  plannedEndAt: optionalTimestamp,
  updatedAt: timestamp,
});
export const transportPlansPageSchema = z.object({
  items: z.array(transportPlanListItemSchema),
  pageIndex: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export const transportPlanDetailSchema = z.object({
  transportPlanId: entityIdSchema,
  planCode: z.string(),
  status: transportPlanStatusSchema,
  originLocationId: entityIdSchema.nullish(),
  destinationLocationId: entityIdSchema.nullish(),
  booking: z.object({
    bookingId: entityIdSchema,
    bookingCode: z.string(),
    status: z.string(),
    isInternational: z.boolean(),
    customerName: z.string(),
    originAddress: z.string(),
    originCountry: z.string(),
    destinationAddress: z.string(),
    destinationCountry: z.string(),
    originLocationId: entityIdSchema.nullish(),
    destinationLocationId: entityIdSchema.nullish(),
    totalHorses: z.number().int().nonnegative(),
    requestedDepartureDate: z.iso.date(),
    requestedArrivalDate: z.iso.date().nullish(),
    specialRequirements: optionalText,
  }),
  transport: z.object({
    transportId: entityIdSchema,
    transportCode: z.string(),
    status: z.string(),
  }),
  plannedStartAt: optionalTimestamp,
  plannedEndAt: optionalTimestamp,
  planningNote: optionalText,
  estimatedDistanceKm: z.number().nonnegative().nullish(),
  estimatedDurationMinutes: z
    .number()
    .int()
    .min(0)
    .max(maxDurationMinutes)
    .nullish(),
  // BE assignments use employeeName; route/fixture briefs use fullName. Map at the DTO boundary.
  assignedEmployees: z.array(
    employeeBriefSchema
      .extend({
        fullName: z.string().optional(),
        employeeName: z.string().optional(),
        responsibility: optionalText,
        isPrimary: z.boolean(),
        assignedAt: timestamp,
      })
      .refine((item) => Boolean(item.fullName || item.employeeName), {
        message: "An assigned employee name is required.",
      })
      .transform(({ employeeName, ...item }) => ({
        ...item,
        fullName: item.fullName || employeeName!,
      })),
  ),
  approvedBy: z
    .object({ employeeId: entityIdSchema, fullName: z.string() })
    .nullish(),
  approvedAt: optionalTimestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
});
const metadataFields = {
  plannedStartAt: timestamp,
  plannedEndAt: timestamp,
  estimatedDistanceKm: z
    .number()
    .finite()
    .nonnegative()
    .max(maxDistanceKm)
    .optional(),
  estimatedDurationMinutes: z
    .number()
    .finite()
    .int()
    .min(0)
    .max(maxDurationMinutes)
    .optional(),
  planningNote: z.string().optional(),
};
export const createTransportPlanSchema = z
  .object(metadataFields)
  .refine(
    (input) =>
      Date.parse(input.plannedEndAt) > Date.parse(input.plannedStartAt),
    {
      message: "Planned end must be after planned start.",
      path: ["plannedEndAt"],
    },
  );
export const updateTransportPlanSchema = z
  .object({
    plannedStartAt: timestamp.optional(),
    plannedEndAt: timestamp.optional(),
    estimatedDistanceKm: metadataFields.estimatedDistanceKm,
    estimatedDurationMinutes: metadataFields.estimatedDurationMinutes,
    planningNote: metadataFields.planningNote,
    lastUpdatedAt: timestamp,
    updateReason: z.string().optional(),
  })
  .refine(
    (input) =>
      !input.plannedStartAt ||
      !input.plannedEndAt ||
      Date.parse(input.plannedEndAt) > Date.parse(input.plannedStartAt),
    {
      message: "Planned end must be after planned start.",
      path: ["plannedEndAt"],
    },
  );

// Presentation contract retained for the existing quotation table only; no Flow 3 endpoint uses it.
export const transportPlanQuotationSchema = z.object({
  quotationId: entityIdSchema,
  transportPlanId: entityIdSchema,
  versionNo: z.number().int().positive(),
  status: quotationStatusSchema,
  currency: z.string().regex(/^[A-Za-z]{3}$/),
  totalAmount: z.number().nonnegative(),
  items: z.array(
    z.object({
      quotationItemId: entityIdSchema,
      category: z.enum([
        "TRANSPORT_FEE",
        "COMPLIANCE_FEE",
        "LABOR_FEE",
        "HORSE_CARE_FEE",
        "CONTINGENCY",
        "OTHER",
      ]),
      description: z.string(),
      amount: z.number().nonnegative(),
    }),
  ),
  note: optionalText,
  issuedAt: optionalTimestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
});

function validLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value))
    return false;
  const date = new Date(value);
  // Reject invalid calendar dates and nonexistent local times, including DST gaps.
  return (
    Number.isFinite(date.getTime()) &&
    toLocalDateTime(date.toISOString()).slice(0, value.length) === value
  );
}
const localDate = z
  .string()
  .refine(validLocalDate, "Enter a valid date and time.");
const optionalNumber = z
  .string()
  .refine(
    (value) =>
      !value.trim() ||
      (Number.isFinite(Number(value)) &&
        Number(value) >= 0 &&
        Number(value) <= maxDistanceKm),
    "Enter a distance between 0 and 99,999,999.99 km.",
  );
const optionalWholeNumber = z
  .string()
  .refine(
    (value) =>
      !value.trim() ||
      (Number.isInteger(Number(value)) &&
        Number(value) >= 0 &&
        Number(value) <= maxDurationMinutes),
    "Enter whole minutes between 0 and 2,147,483,647.",
  );
const formFields = {
  plannedStartAt: localDate,
  plannedEndAt: localDate,
  estimatedDistanceKm: optionalNumber,
  estimatedDurationMinutes: optionalWholeNumber,
  planningNote: z.string(),
  updateReason: z.string(),
};
export const transportPlanFormSchema = z
  .object(formFields)
  .refine(
    ({ plannedStartAt, plannedEndAt }) =>
      new Date(plannedEndAt) > new Date(plannedStartAt),
    {
      message: "Planned end must be after planned start.",
      path: ["plannedEndAt"],
    },
  );
export const editTransportPlanFormSchema = z
  .object({
    ...formFields,
    plannedStartAt: z.union([localDate, z.literal("")]),
    plannedEndAt: z.union([localDate, z.literal("")]),
  })
  .refine(
    ({ plannedStartAt, plannedEndAt }) =>
      !plannedStartAt ||
      !plannedEndAt ||
      new Date(plannedEndAt) > new Date(plannedStartAt),
    {
      message: "Planned end must be after planned start.",
      path: ["plannedEndAt"],
    },
  );
