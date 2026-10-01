import { z } from "zod";
import { BOOKING_STATUSES } from "@/features/booking/types";

const entityId = z.number().int().positive();
const timestamp = z.iso.datetime({ offset: true });
const date = z.iso.date();

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

export const dossierRequirementStatusSchema = z.enum([
  "PENDING",
  "REQUESTED",
  "PROVIDED",
  "SATISFIED",
  "REJECTED",
  "WAIVED",
]);

const proofStatus = (statuses: readonly [string, ...string[]]) =>
  z.object({
    latestProofId: entityId,
    status: z.enum(statuses),
    verifiedAt: timestamp.nullable(),
  });

export const dossierHorseOptionSchema = z.object({
  horseId: entityId,
  horseName: z.string(),
});

export const bookingSummarySchema = z.object({
  bookingStatus: z.enum(BOOKING_STATUSES),
  originCountry: z.string(),
  destinationCountry: z.string(),
  requestedDepartureDate: date,
  customerName: z.string(),
  horseCount: z.number().int().nonnegative(),
  horses: z.array(dossierHorseOptionSchema),
});

export const requirementSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  requested: z.number().int().nonnegative(),
  provided: z.number().int().nonnegative(),
  satisfied: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  waived: z.number().int().nonnegative(),
}).refine(
  ({ total, pending, requested, provided, satisfied, rejected, waived }) =>
    total === pending + requested + provided + satisfied + rejected + waived,
  { message: "Requirement status counts must add up to total.", path: ["total"] },
);

export const dossierOverviewSchema = z.object({
  complianceDossierId: entityId,
  dossierCode: z.string(),
  bookingId: entityId,
  bookingCode: z.string(),
  status: dossierStatusSchema,
  openedAt: timestamp,
  readyForSubmissionAt: timestamp.nullable(),
  approvedAt: timestamp.nullable(),
  rejectedAt: timestamp.nullable(),
  closedAt: timestamp.nullable(),
  rejectionReason: z.string().nullable(),
  note: z.string().nullable(),
  writeLocked: z.boolean(),
  writeLockReason: z.string().nullable(),
  progressPercent: z.number(),
  mandatoryTotal: z.number().int().nonnegative(),
  mandatorySatisfiedOrWaived: z.number().int().nonnegative(),
  bookingSummary: bookingSummarySchema,
  requirementSummary: requirementSummarySchema,
  quarantineStatus: proofStatus([
    "PENDING_VERIFICATION", "PASSED", "PASSED_WITH_CONDITIONS",
    "HOLDBACK", "FAILED", "REJECTED",
  ]).nullable(),
  customsClearanceStatus: proofStatus([
    "PENDING_VERIFICATION", "CLEARED", "HELD", "REJECTED",
  ]).nullable(),
});

export const dossierRequirementSchema = z.object({
  dossierRequirementId: entityId,
  complianceRequirementId: entityId,
  requirementName: z.string(),
  horseId: entityId.nullable(),
  horseName: z.string().nullable(),
  status: dossierRequirementStatusSchema,
  isMandatory: z.boolean(),
  dueDate: date.nullable(),
  validUntil: date.nullable(),
  satisfiedAt: timestamp.nullable(),
  waivedReason: z.string().nullable(),
  note: z.string().nullable(),
  document: z.object({
    complianceDocumentId: entityId,
    documentCode: z.string(),
    status: z.enum(["PROVIDED", "PENDING", "APPROVED", "REJECTED", "EXPIRED"]),
    latestVersionNo: z.number().int().positive(),
  }).nullable(),
});

export const dossierRequirementsPageSchema = z.object({
  items: z.array(dossierRequirementSchema),
  pageIndex: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

const envelope = <T extends z.ZodType>(value: T) => z.object({
  isSuccess: z.literal(true),
  code: z.number().int(),
  message: z.string(),
  value,
});

export const dossierOverviewEnvelopeSchema = envelope(dossierOverviewSchema);
export const dossierRequirementsEnvelopeSchema = envelope(dossierRequirementsPageSchema);

export const dossierIdSchema = z.string().regex(/^[1-9]\d*$/);
export const dossierRequirementsParamsSchema = z.object({
  status: dossierRequirementStatusSchema.optional(),
  horseId: entityId.optional(),
  pageIndex: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum([
    "createdAt:asc", "dueDate:asc", "dueDate:desc",
    "status:asc", "status:desc",
  ]).default("createdAt:asc"),
});

