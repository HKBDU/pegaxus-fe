import { z } from "zod";
import { BOOKING_STATUSES } from "@/features/booking/types";
import { DOSSIER_REQUIREMENT_STATUSES, UPLOAD_ACCEPTED_MIME_TYPES, UPLOAD_MAX_FILE_BYTES } from "./constants";
type DossierUploadedAssetRef = { publicId: string; fileName: string; mimeType: string; fileSizeBytes: number };
type UploadDocumentError = { code: string; message: string; field?: "expiryDate"; refresh?: "overview" | "requirements" };
type UploadDocumentMetadata = { documentNumber?: string | null; issuingAuthority?: string | null; issuedDate?: string | null; expiryDate?: string | null; uploadNote?: string };

// Mock data uses numeric identifiers; the real API uses opaque string IDs (the BE does not require UUID/GUID format).
// Keep the parsed contract compatible with both existing mock helpers and real responses.
const entityId: z.ZodType<any> = z.union([z.number().int().positive(), z.string()]);
const typedEntityId = z.union([z.number().int().positive(), z.string()]);
// System.Text.Json also returns DateTime values without an offset and with seven fractional digits.
const timestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/);
const date = z.iso.date();
const utcToday = () => new Date().toISOString().slice(0, 10);

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

export const dossierUploadedAssetSchema = z.object({
  publicId: z.string().trim().min(1, "A confirmed upload reference is required."),
  fileName: z.string().trim().min(1, "File name is required."),
  mimeType: z.enum(UPLOAD_ACCEPTED_MIME_TYPES, { error: "Only PDF, JPG, JPEG, and PNG files are accepted." }),
  fileSizeBytes: z.number().int().nonnegative().max(UPLOAD_MAX_FILE_BYTES, "Each file must be 5 MiB or smaller."),
});
export const dossierUploadedAssetsSchema = z.array(dossierUploadedAssetSchema).min(1, "Confirm at least one successfully uploaded file.")
  .max(10, "Submit at most 10 files.").refine((files) => new Set(files.map((file) => file.publicId)).size === files.length, "File references must be unique.");

export function validateUploadedAssets(files: readonly DossierUploadedAssetRef[]): UploadDocumentError | null {
  const result = dossierUploadedAssetsSchema.safeParse(files);
  if (result.success) return null;
  const issue = result.error.issues[0];
  const code = !files.length ? "FILES_REQUIRED" : issue.path.includes("mimeType") ? "INVALID_FILE_TYPE"
    : issue.path.includes("fileSizeBytes") ? "FILE_TOO_LARGE" : "INVALID_UPLOAD_REFERENCE";
  return { code, message: issue.message };
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
  bookingStatus: z.enum(BOOKING_STATUSES).nullable(),
  originCountry: z.string().nullable(),
  destinationCountry: z.string().nullable(),
  requestedDepartureDate: date.nullable(),
  customerName: z.string().nullable(),
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

/** A transport holds at most one MAIN and one EXTRA dossier (DB v9). */
export const dossierTypeSchema = z.enum(["MAIN", "EXTRA"]);
/** One entry of the `complianceDossiers[]` list that D1/D7 send next to the dossier being read. */
export const dossierSiblingSchema = z.object({
  complianceDossierId: entityId,
  dossierCode: z.string(),
  dossierType: dossierTypeSchema.nullish(),
  status: z.string(),
});

export const dossierOverviewSchema = z.object({
  complianceDossierId: entityId,
  dossierCode: z.string(),
  dossierType: dossierTypeSchema.nullish(),
  /** Every dossier of the same transport (MAIN and EXTRA), so the page can switch between them. */
  complianceDossiers: z.array(dossierSiblingSchema).optional(),
  bookingId: entityId,
  bookingCode: z.string(),
  status: dossierStatusSchema,
  openedAt: timestamp.nullable(),
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
  isInitialized: z.boolean().optional(),
  actions: z.object({ canUpload: z.boolean(), canReview: z.boolean() }).optional(),
});

export const documentRequestSummarySchema = z.object({
  documentRequestId: entityId, requestCode: z.string(), requestType: z.string().nullable().default(null),
  message: z.string(), dueDate: date.nullable(),
  status: z.string().optional(), errorCategory: z.string().nullable().optional(), requestedAt: timestamp.optional(),
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
  requirementCode: z.string().optional(),
  instruction: z.string().nullable().optional(),
  leadTimeDays: z.number().nullable().optional(),
  actions: z.object({ canUpload: z.boolean(), canReview: z.boolean() }).optional(),
  openRequest: documentRequestSummarySchema.nullable().optional(),
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

export const missingDocumentReminderSchema = z.object({
  requirementIds: z.array(typedEntityId).min(1, "Select at least one missing requirement.").max(100)
    .refine((ids) => new Set(ids).size === ids.length, "Selected requirements must be unique."),
  dueDate: date.refine((value) => value >= utcToday(), "Due date cannot be in the past."),
  note: z.string().trim().max(2000).optional(),
}).transform(({ requirementIds, dueDate, note }) => ({
  requirementIds, dueDate,
  ...(note ? { note } : {}),
}));

export const missingDocumentReminderEnvelopeSchema = envelope(z.object({
  reminderId: entityId, requirements: z.array(dossierRequirementSchema), emailSent: z.boolean(), deliveryWarning: z.string().nullable().optional(),
}));

export const uploadDocumentResultSchema = z.object({
  complianceDocumentId: entityId,
  documentCode: z.string().optional(),
  documentVersionId: entityId,
  versionNo: z.number().int().positive(),
  dossierRequirementId: entityId.optional(), isNewVersion: z.boolean().optional(), status: z.string().optional(),
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
  documentAttachmentId: entityId.nullable().optional(),
});
export const documentReviewSummarySchema = z.object({
  documentReviewId: entityId, result: z.string(), reviewComment: z.string().nullable(),
  reviewedBy: z.object({ accountId: entityId, fullName: z.string() }), reviewedAt: timestamp,
});
export const documentVersionSchema = z.object({
  documentVersionId: entityId, versionNo: z.number().int().positive(),
  uploadNote: z.string().nullable(), uploadedAt: timestamp,
  files: z.array(documentVersionFileSchema), review: documentReviewSummarySchema.nullable(),
  reviews: z.array(documentReviewSummarySchema).optional(),
});
export const complianceDocumentDetailSchema = z.object({
  complianceDocumentId: entityId, documentCode: z.string(), dossierRequirementId: entityId,
  documentName: z.string(), status: complianceDocumentStatusSchema,
  documentNumber: z.string().nullable(), issuingAuthority: z.string().nullable(),
  issuedDate: date.nullable(), expiryDate: date.nullable(), note: z.string().nullable(),
  updatedAt: timestamp, versions: z.array(documentVersionSchema),
  openRequest: documentRequestSummarySchema.nullable(),
  documentRequests: z.array(documentRequestSummarySchema).optional(),
  actions: z.object({ canUpload: z.boolean(), canReview: z.boolean() }).optional(),
});
export const complianceDocumentEnvelopeSchema = envelope(complianceDocumentDetailSchema);
const approvalReview = z.object({
  result: z.literal("APPROVED"),
  metadataConfirmed: z.literal(true), versionUploadedAt: timestamp, documentUpdatedAt: timestamp,
  reviewNote: z.string().trim().max(2000).optional(), expiryExceptionReason: z.string().trim().max(2000).optional(),
});
const rejectionReview = z.object({
  result: z.literal("REJECTED"),
  errorCategory: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  rejectionNote: z.string().trim().min(15).max(2000), revisionDeadline: date.refine((value) => value >= utcToday(), "Revision deadline cannot be in the past."),
  requirementStatus: z.union([z.literal(2), z.literal(5)]), dossierStatus: z.union([z.literal(2), z.literal(7)]),
  versionUploadedAt: timestamp, documentUpdatedAt: timestamp,
});
export const approveDocumentReviewSchema = approvalReview;
export const rejectDocumentReviewSchema = rejectionReview;
export const documentRequestFormSchema = rejectionReview.omit({ result: true, versionUploadedAt: true, documentUpdatedAt: true });
export const documentReviewSchema = z.discriminatedUnion("result", [approvalReview, rejectionReview]);
const backendReviewValue = z.object({
  review: z.object({ documentReviewId: entityId, reviewedByAccountId: entityId, result: z.string(), reviewComment: z.string().nullable(), reviewedAt: timestamp }),
  requirementStatus: dossierRequirementStatusSchema, documentStatus: complianceDocumentStatusSchema, dossierStatus: dossierStatusSchema,
  documentVersionId: entityId.optional(), dossierRequirementId: entityId.optional(),
  documentRequest: z.object({ documentRequestId: entityId, requestCode: z.string(), status: z.string(), errorCategory: z.string().nullable(), message: z.string(), dueDate: date.nullable(), requestedAt: timestamp }).optional(), emailSent: z.boolean().optional(), deliveryWarning: z.string().nullable().optional(),
});
export const approveDocumentEnvelopeSchema = envelope(backendReviewValue);
export const rejectDocumentEnvelopeSchema = envelope(backendReviewValue);
export const documentReviewEnvelopeSchema = envelope(backendReviewValue);
export const readyForSubmissionEnvelopeSchema = envelope(z.object({ complianceDossierId: entityId, status: dossierStatusSchema, readyForSubmissionAt: timestamp.nullable() }));
export const submitDocumentVersionEnvelopeSchema = z.union([
  envelope(z.object({ documentVersionId: entityId, versionNo: z.number().int().positive(), mode: z.literal("EDIT_IN_PLACE") })).extend({ code: z.literal(200) }),
  envelope(z.object({ documentVersionId: entityId, versionNo: z.number().int().positive(), mode: z.literal("NEW_VERSION") })).extend({ code: z.literal(201) }),
]);
export const updateDocumentMetadataEnvelopeSchema = envelope(z.object({
  complianceDocumentId: entityId, documentNumber: z.string().nullable(), issuingAuthority: z.string().nullable(), issuedDate: date.nullable(), expiryDate: date.nullable(), status: complianceDocumentStatusSchema,
}));

const optionalDate = z.union([z.literal(""), date]);
const documentMetadataShape = {
  documentNumber: z.string().trim().max(150),
  issuingAuthority: z.string().trim().max(200),
  issuedDate: optionalDate,
  expiryDate: optionalDate,
};
function validateMetadataClears(
  value: UploadDocumentMetadata,
  context: z.RefinementCtx,
  existingMetadata?: UploadDocumentMetadata,
) {
  for (const field of ["documentNumber", "issuingAuthority", "issuedDate", "expiryDate"] as const) {
    if (value[field] !== undefined && !value[field]?.trim() &&
      (!existingMetadata || existingMetadata[field]?.trim())) {
      context.addIssue({ code: "custom", path: [field], message: "Clearing existing metadata is not supported. Keep its current value or enter a replacement." });
    }
  }
}
function validateMetadataDates(
  value: { issuedDate?: string | null; expiryDate?: string | null },
  context: z.RefinementCtx,
  validUntil: string | null,
  plannedDepartureDate?: string | null,
) {
  if (value.issuedDate && value.issuedDate > utcToday()) context.addIssue({ code: "custom", path: ["issuedDate"], message: "Issued date cannot be in the future." });
  if (!value.expiryDate) return;
  if (value.expiryDate < utcToday()) {
    context.addIssue({ code: "custom", path: ["expiryDate"], message: "Expiry date cannot be in the past." });
  }
  if (value.issuedDate && value.expiryDate < value.issuedDate) {
    context.addIssue({ code: "custom", path: ["expiryDate"], message: "Expiry date cannot be before issued date." });
  }
  if (validUntil && value.expiryDate < validUntil) {
    context.addIssue({ code: "custom", path: ["expiryDate"], message: `Document must remain valid through ${validUntil}.` });
  }
  if (plannedDepartureDate && value.expiryDate <= plannedDepartureDate.slice(0, 10)) {
    context.addIssue({ code: "custom", path: ["expiryDate"], message: "Expiry date cannot be before transport departure." });
  }
}
// Domain policy input, not a claim that the Customer read DTO exposes a flag.
export function getDocumentExpiryPolicy(validUntil: string | null, validityRequired?: boolean | null) {
  if (validUntil || validityRequired === true) return "required";
  if (validityRequired === false) return "optional";
  return validityRequired === null ? "unknown" : "not-provided";
}
export function isDocumentExpiryRequired(validUntil: string | null, validityRequired?: boolean | null) {
  return getDocumentExpiryPolicy(validUntil, validityRequired) === "required";
}
export const createUploadDocumentSchema = (
  validUntil: string | null,
  plannedDepartureDate?: string | null,
  validityRequired?: boolean | null,
) => createDocumentSubmissionSchema(validUntil, plannedDepartureDate, "initial", undefined, validityRequired);

export const createSubmitDocumentVersionSchema = (validUntil: string | null, plannedDepartureDate?: string | null, validityRequired?: boolean | null) =>
  createDocumentSubmissionSchema(validUntil, plannedDepartureDate, "update", undefined, validityRequired);

export const createUpdateDocumentMetadataSchema = (validUntil: string | null, plannedDepartureDate?: string | null, existingMetadata?: UploadDocumentMetadata, validityRequired?: boolean | null) =>
  z.object({ documentNumber: documentMetadataShape.documentNumber.nullable().optional(), issuingAuthority: documentMetadataShape.issuingAuthority.nullable().optional(), issuedDate: optionalDate.nullable().optional(), expiryDate: optionalDate.nullable().optional() })
    .superRefine((value, context) => {
      validateMetadataClears(value, context);
      const effectiveMetadata = { ...existingMetadata };
      for (const field of ["documentNumber", "issuingAuthority", "issuedDate", "expiryDate"] as const) {
        if (value[field] !== undefined) effectiveMetadata[field] = value[field];
      }
      if (isDocumentExpiryRequired(validUntil, validityRequired) && !effectiveMetadata.expiryDate) context.addIssue({ code: "custom", path: ["expiryDate"], message: "Expiry date is required for this requirement." });
      validateMetadataDates(effectiveMetadata, context, validUntil, plannedDepartureDate);
    });

export const createDocumentSubmissionSchema = (validUntil: string | null, plannedDepartureDate?: string | null, mode: "initial" | "edit" | "update" = "initial", existingMetadata?: UploadDocumentMetadata, validityRequired?: boolean | null) =>
  z.object({ ...documentMetadataShape, documentNumber: documentMetadataShape.documentNumber.nullable().optional(), issuingAuthority: documentMetadataShape.issuingAuthority.nullable().optional(), issuedDate: optionalDate.nullable().optional(), expiryDate: optionalDate.nullable().optional(), uploadNote: z.string().max(2000).optional() })
    .superRefine((value, context) => {
      if (mode === "initial") {
        for (const field of ["documentNumber", "issuingAuthority", "issuedDate"] as const) if (!value[field]) context.addIssue({ code: "custom", path: [field], message: "This field is required." });
      }
      if (isDocumentExpiryRequired(validUntil, validityRequired) && !value.expiryDate) context.addIssue({ code: "custom", path: ["expiryDate"], message: "Expiry date is required for this requirement." });
      if (mode !== "initial" && existingMetadata) validateMetadataClears(value, context, existingMetadata);
      validateMetadataDates(value, context, validUntil, plannedDepartureDate);
    });

// The BE does not require UUID/GUID format, so any non-empty string is accepted (empty only means "no id in the URL").
export const dossierIdSchema = z.string().min(1);
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

