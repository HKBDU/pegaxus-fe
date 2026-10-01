import { z } from "zod";
import { BOOKING_STATUSES } from "@/features/booking/types";
import { format } from "date-fns";
import { DOCUMENT_REQUEST_TYPES, DOSSIER_REQUIREMENT_STATUSES, UPLOAD_ACCEPTED_MIME_TYPES, UPLOAD_MAX_FILE_BYTES } from "./constants";
import type { UploadDocumentError } from "./types";

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

export const dossierRequirementStatusSchema = z.enum(DOSSIER_REQUIREMENT_STATUSES);
export const complianceDocumentStatusSchema = z.enum(["PROVIDED", "PENDING", "APPROVED", "REJECTED", "EXPIRED"]);

const acceptedUploadTypes = new Set<string>(UPLOAD_ACCEPTED_MIME_TYPES);

export function validateUploadFiles(files: readonly File[]): UploadDocumentError | null {
  if (!files.length) return { code: "FILES_REQUIRED", message: "Select at least one file." };
  for (const file of files) {
    if (!acceptedUploadTypes.has(file.type)) {
      return { code: "INVALID_FILE_TYPE", message: "Only PDF, JPG, JPEG, and PNG files are accepted." };
    }
    if (file.size > UPLOAD_MAX_FILE_BYTES) {
      return { code: "FILE_TOO_LARGE", message: "Each file must be 10MB or smaller." };
    }
  }
  return null;
}

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
    status: complianceDocumentStatusSchema,
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

export const uploadDocumentResultSchema = z.object({
  complianceDocumentId: entityId,
  documentCode: z.string(),
  documentVersionId: entityId,
  versionNo: z.literal(1),
});
export const uploadDocumentEnvelopeSchema = z.object({
  isSuccess: z.literal(true),
  code: z.literal(201),
  message: z.string(),
  value: uploadDocumentResultSchema,
});

export const documentVersionFileSchema = z.object({
  fileName: z.string(), fileUrl: z.string(), mimeType: z.string(),
  fileSizeBytes: z.number().nonnegative(), sortOrder: z.number().int().nonnegative(),
});
export const documentReviewSummarySchema = z.object({
  documentReviewId: entityId, result: z.string(), reviewComment: z.string().nullable(),
  reviewedBy: z.object({ accountId: entityId, fullName: z.string() }), reviewedAt: timestamp,
});
export const documentRequestSummarySchema = z.object({
  documentRequestId: entityId, requestCode: z.string(), requestType: z.string(),
  message: z.string(), dueDate: date.nullable(),
});
export const documentVersionSchema = z.object({
  documentVersionId: entityId, versionNo: z.number().int().positive(),
  uploadNote: z.string().nullable(), uploadedAt: timestamp,
  files: z.array(documentVersionFileSchema), review: documentReviewSummarySchema.nullable(),
});
export const complianceDocumentDetailSchema = z.object({
  complianceDocumentId: entityId, documentCode: z.string(), dossierRequirementId: entityId,
  documentName: z.string(), status: complianceDocumentStatusSchema,
  documentNumber: z.string().nullable(), issuingAuthority: z.string().nullable(),
  issuedDate: date.nullable(), expiryDate: date.nullable(), note: z.string().nullable(),
  updatedAt: timestamp, versions: z.array(documentVersionSchema),
  openRequest: documentRequestSummarySchema.nullable(),
});
export const complianceDocumentEnvelopeSchema = envelope(complianceDocumentDetailSchema);
const approvalReview = z.object({
  result: z.literal("APPROVED"),
  reviewComment: z.string().trim().optional(),
});
export const documentRequestFormSchema = z.object({
  requestType: z.enum(DOCUMENT_REQUEST_TYPES),
  message: z.string().trim().min(15, "Please provide detailed instructions of at least 15 characters."),
  dueDate: z.union([z.literal(""), date]).optional(),
});
const rejectionReview = z.object({
  result: z.literal("REJECTED"),
  reviewComment: z.string().trim().optional(),
  documentRequest: documentRequestFormSchema.transform(({ dueDate, ...request }) => ({
    ...request,
    ...(dueDate ? { dueDate } : {}),
  })),
});
export const approveDocumentReviewSchema = approvalReview.transform(({ result, reviewComment }) => ({
  result,
  ...(reviewComment ? { reviewComment } : {}),
}));
export const rejectDocumentReviewSchema = rejectionReview.transform(({ reviewComment, ...review }) => ({
  ...review,
  ...(reviewComment ? { reviewComment } : {}),
}));
export const documentReviewSchema = z.discriminatedUnion("result", [approvalReview, rejectionReview])
  .transform(({ reviewComment, ...review }) => ({
    ...review,
    ...(reviewComment ? { reviewComment } : {}),
  }));
export const approveDocumentEnvelopeSchema = envelope(z.object({
  documentReviewId: entityId,
  dossierRequirementStatus: z.literal("SATISFIED"),
})).extend({ code: z.literal(201) });
export const rejectDocumentEnvelopeSchema = envelope(z.object({
  documentReviewId: entityId,
  documentRequestId: entityId,
  requestCode: z.string(),
  dossierRequirementStatus: z.literal("REJECTED"),
  dossierStatus: z.literal("IN_PREPARATION"),
})).extend({ code: z.literal(201) });
export const documentReviewEnvelopeSchema = z.union([approveDocumentEnvelopeSchema, rejectDocumentEnvelopeSchema]);
export const readyForSubmissionEnvelopeSchema = envelope(z.null()).extend({ code: z.literal(200) });
export const submitDocumentVersionEnvelopeSchema = z.union([
  envelope(z.object({ documentVersionId: entityId, versionNo: z.number().int().positive(), mode: z.literal("EDIT_IN_PLACE") })).extend({ code: z.literal(200) }),
  envelope(z.object({ documentVersionId: entityId, versionNo: z.number().int().positive(), mode: z.literal("NEW_VERSION") })).extend({ code: z.literal(201) }),
]);
export const updateDocumentMetadataEnvelopeSchema = envelope(z.object({
  complianceDocumentId: entityId, updatedAt: timestamp,
})).extend({ code: z.literal(200) });

const optionalDate = z.union([z.literal(""), date]);
const documentMetadataShape = {
  documentName: z.string().trim().max(200, "Document name must be 200 characters or fewer."),
  documentNumber: z.string().trim(),
  issuingAuthority: z.string().trim(),
  issuedDate: optionalDate,
  expiryDate: optionalDate,
};
function validateMetadataDates(
  value: { issuedDate?: string; expiryDate?: string },
  context: z.RefinementCtx,
  validUntil: string | null,
  plannedDepartureDate?: string | null,
) {
  if (!value.expiryDate) return;
  if (value.expiryDate < format(new Date(), "yyyy-MM-dd")) {
    context.addIssue({ code: "custom", path: ["expiryDate"], message: "Expiry date cannot be in the past." });
  }
  if (value.issuedDate && value.expiryDate < value.issuedDate) {
    context.addIssue({ code: "custom", path: ["expiryDate"], message: "Expiry date cannot be before issued date." });
  }
  if (validUntil && value.expiryDate < validUntil) {
    context.addIssue({ code: "custom", path: ["expiryDate"], message: `Document must remain valid through ${validUntil}.` });
  }
  if (plannedDepartureDate && value.expiryDate < plannedDepartureDate.slice(0, 10)) {
    context.addIssue({ code: "custom", path: ["expiryDate"], message: "Expiry date cannot be before transport departure." });
  }
}
export const createUploadDocumentSchema = (
  validUntil: string | null,
  plannedDepartureDate?: string | null,
) => z.object(documentMetadataShape).superRefine((value, context) =>
  validateMetadataDates(value, context, validUntil, plannedDepartureDate));

export const createSubmitDocumentVersionSchema = (validUntil: string | null, plannedDepartureDate?: string | null) =>
  z.object({
    documentNumber: documentMetadataShape.documentNumber,
    issuingAuthority: documentMetadataShape.issuingAuthority,
    issuedDate: optionalDate,
    expiryDate: optionalDate,
    uploadNote: z.string().optional(),
  }).superRefine((value, context) => validateMetadataDates(value, context, validUntil, plannedDepartureDate));

export const createUpdateDocumentMetadataSchema = (validUntil: string | null, plannedDepartureDate?: string | null) =>
  z.object({ ...documentMetadataShape, note: z.string() }).partial()
    .superRefine((value, context) => validateMetadataDates(value, context, validUntil, plannedDepartureDate));

export const createDocumentSubmissionSchema = (validUntil: string | null, plannedDepartureDate?: string | null) =>
  z.object({ ...documentMetadataShape, uploadNote: z.string(), note: z.string() })
    .superRefine((value, context) => validateMetadataDates(value, context, validUntil, plannedDepartureDate));

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

