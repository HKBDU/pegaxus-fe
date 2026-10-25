import { z } from "zod";
import {
  complianceDocumentDetailSchema,
  dossierOverviewSchema,
  dossierTypeSchema,
  dossierRequirementSchema,
  dossierRequirementStatusSchema,
  dossierStatusSchema,
  documentVersionSchema,
  bookingSummarySchema,
  dossierLifecycleFields,
} from "../schemas";

const id = z.string();
const time = z.string().min(1);
export const backendEnvelopeSchema = z.object({
  isSuccess: z.literal(true),
  code: z.number().int().min(200).max(299),
  message: z.string(),
  value: z.unknown(),
});
const actions = z.object({ canUpload: z.boolean(), canReview: z.boolean() });
const requestDto = z.object({
  documentRequestId: id,
  requestCode: z.string(),
  status: z.string(),
  errorCategory: z.string().nullable(),
  message: z.string(),
  dueDate: z.string().nullable(),
  requestedAt: time,
});
const requirementDto = z.object({
  dossierRequirementId: id,
  complianceRequirementId: id,
  requirementCode: z.string(),
  requirementName: z.string(),
  horseId: id.nullable(),
  horseName: z.string().nullable(),
  isMandatory: z.boolean(),
  status: dossierRequirementStatusSchema,
  dueDate: z.string().nullable(),
  leadTimeDays: z.number().nullable(),
  instruction: z.string().nullable(),
  openDocumentRequest: requestDto.nullable().optional(),
});
const reviewDto = z.object({
  documentReviewId: id,
  reviewedByAccountId: id,
  result: z.string(),
  reviewComment: z.string().nullable(),
  reviewedAt: time,
});
const fileDto = z.object({
  fileName: z.string(),
  mimeType: z.string().nullable(),
  fileSizeBytes: z.number().nullable(),
});
const versionDto = fileDto.extend({
  documentVersionId: id,
  versionNo: z.number().int().positive(),
  previewUrl: z.string(),
  uploadNote: z.string().nullable(),
  uploadedAt: time,
  attachments: z.array(
    fileDto.extend({
      documentAttachmentId: id,
      previewUrl: z.string(),
      sortOrder: z.number().int(),
    }),
  ),
  reviews: z.array(reviewDto),
});
const documentDto = z.object({
  complianceDocumentId: id,
  documentCode: z.string(),
  documentName: z.string(),
  status: z.string(),
  documentNumber: z.string().nullable(),
  issuingAuthority: z.string().nullable(),
  issuedDate: z.string().nullable(),
  expiryDate: z.string().nullable(),
  note: z.string().nullable(),
  updatedAt: time,
  versions: z.array(versionDto),
});
export const overviewDtoSchema = z.object({
  ...dossierLifecycleFields,
  isInitialized: z.boolean(),
  message: z.string().nullable().optional(),
  bookingId: id,
  bookingCode: z.string(),
  bookingSummary: bookingSummarySchema,
  complianceDossierId: id.nullable(),
  dossierCode: z.string().nullable(),
  dossierType: dossierTypeSchema.nullish(),
  complianceDossiers: z
    .array(
      z.object({
        complianceDossierId: id,
        dossierCode: z.string(),
        dossierType: dossierTypeSchema.nullish(),
        status: z.string(),
      }),
    )
    .nullish(),
  status: dossierStatusSchema.nullable(),
  fulfilledCount: z.number(),
  requirementCount: z.number(),
  completionPercent: z.number(),
  tripRequirements: z.array(requirementDto),
  horseRequirements: z.array(
    z.object({
      horseId: id,
      horseName: z.string(),
      requirements: z.array(requirementDto),
    }),
  ),
  actions,
  writeLocked: z.boolean().optional(),
  writeLockReason: z.string().nullish(),
});
export const backendReminderEnvelopeSchema = backendEnvelopeSchema.extend({
  value: z.object({
    reminderId: id,
    requirements: z.array(requirementDto),
    emailSent: z.boolean(),
    deliveryWarning: z.string().nullish(),
  }),
});
export const requirementDetailDtoSchema = z.object({
  requirement: requirementDto,
  validUntil: z.string().nullable(),
  satisfiedAt: time.nullable(),
  waivedReason: z.string().nullable(),
  document: documentDto.nullable(),
  documentRequests: z.array(requestDto),
  actions,
});

export function unwrapBackendValue(payload: unknown): unknown {
  return backendEnvelopeSchema.parse(payload).value;
}

function mapRequest(request: z.infer<typeof requestDto>) {
  return { ...request };
}

export function mapBackendRequirement(payload: unknown) {
  const value = requirementDto.parse(payload);
  return dossierRequirementSchema.parse({
    ...value,
    validUntil: null,
    satisfiedAt: null,
    waivedReason: null,
    note: value.instruction,
    document: null,
    openRequest: value.openDocumentRequest
      ? mapRequest(value.openDocumentRequest)
      : null,
  });
}

export function mapBackendDossierOverview(payload: unknown) {
  const value = overviewDtoSchema.parse(unwrapBackendValue(payload));
  if (!value.isInitialized || !value.complianceDossierId || !value.status)
    throw new Error("DOSSIER_NOT_INITIALIZED");
  const dossierCode = z.string().trim().min(1).parse(value.dossierCode);
  const requirements = [
    ...value.tripRequirements,
    ...value.horseRequirements.flatMap((horse) => horse.requirements),
  ];
  const count = (status: string) =>
    requirements.filter((requirement) => requirement.status === status).length;
  const mandatory = requirements.filter(
    (requirement) => requirement.isMandatory,
  );
  const statusLocked = [
    "READY_FOR_SUBMISSION",
    "SUBMITTED",
    "PENDING",
    "APPROVED",
    "CLOSED",
  ].includes(
    value.status,
  );
  const bookingLocked = ["CANCELLED", "REJECTED"].includes(
    value.bookingSummary.bookingStatus ?? "",
  );
  const locked = value.writeLocked === true || statusLocked || bookingLocked;
  return dossierOverviewSchema.parse({
    complianceDossierId: value.complianceDossierId,
    dossierCode,
    dossierType: value.dossierType,
    complianceDossiers: value.complianceDossiers,
    bookingId: value.bookingId,
    bookingCode: value.bookingCode,
    status: value.status,
    isInitialized: value.isInitialized,
    actions: value.actions,
    openedAt: value.openedAt,
    readyForSubmissionAt: value.readyForSubmissionAt,
    approvedAt: value.approvedAt,
    rejectedAt: value.rejectedAt,
    closedAt: value.closedAt,
    rejectionReason: value.rejectionReason,
    note: value.note,
    writeLocked: locked,
    writeLockReason:
      value.writeLockReason ??
      (bookingLocked
        ? "BOOKING_UNAVAILABLE"
        : statusLocked
          ? `DOSSIER_${value.status}`
          : null),
    progressPercent: value.completionPercent,
    mandatoryTotal: mandatory.length,
    mandatorySatisfiedOrWaived: mandatory.filter((requirement) =>
      ["SATISFIED", "WAIVED"].includes(requirement.status),
    ).length,
    bookingSummary: value.bookingSummary,
    requirementSummary: {
      total: requirements.length,
      pending: count("PENDING"),
      requested: count("REQUESTED"),
      provided: count("PROVIDED"),
      satisfied: count("SATISFIED"),
      rejected: count("REJECTED"),
      waived: count("WAIVED"),
    },
    quarantineStatus: null,
    customsClearanceStatus: null,
  });
}

function mapReview(review: z.infer<typeof reviewDto>) {
  return {
    ...review,
    reviewedBy: { accountId: review.reviewedByAccountId },
  };
}

export function mapBackendRequirementDetail(payload: unknown) {
  const value = requirementDetailDtoSchema.parse(unwrapBackendValue(payload));
  const requests = value.documentRequests.map(mapRequest);
  const openRequest =
    requests.find((request) => request.status === "OPEN") ??
    (value.requirement.openDocumentRequest
      ? mapRequest(value.requirement.openDocumentRequest)
      : null);
  const document = value.document
    ? complianceDocumentDetailSchema.parse({
        ...value.document,
        dossierRequirementId: value.requirement.dossierRequirementId,
        actions: value.actions,
        documentRequests: requests,
        openRequest,
        versions: value.document.versions.map((version) => {
          const reviews = version.reviews.map(mapReview);
          return {
            ...version,
            reviews,
            review: reviews[0] ?? null,
            files: [
              {
                fileName: version.fileName,
                fileUrl: version.previewUrl,
                mimeType: version.mimeType,
                fileSizeBytes: version.fileSizeBytes,
                sortOrder: 0,
                documentAttachmentId: null,
              },
              ...version.attachments.map((file) => ({
                ...file,
                fileUrl: file.previewUrl,
                mimeType: file.mimeType,
                fileSizeBytes: file.fileSizeBytes,
              })),
            ],
          };
        }),
      })
    : null;
  const requirement = dossierRequirementSchema.parse({
    ...mapBackendRequirement(value.requirement),
    validUntil: value.validUntil,
    satisfiedAt: value.satisfiedAt,
    waivedReason: value.waivedReason,
    actions: value.actions,
    openRequest,
    document: document
      ? {
          ...document,
          latestVersionNo: document.versions.length
            ? Math.max(...document.versions.map((version) => version.versionNo))
            : null,
        }
      : null,
  });
  return {
    ...requirement,
    document: document
      ? {
          ...document,
          latestVersionNo: document.versions.length
            ? Math.max(...document.versions.map((version) => version.versionNo))
            : null,
        }
      : null,
    documentRequests: requests,
    actions: value.actions,
  };
}

export function protectedPreviewUrl(
  dossierId: string,
  requirementId: string,
  versionId: string,
  attachmentId?: string | null,
) {
  const root = `/api/v1/compliance-dossiers/${encodeURIComponent(dossierId)}/requirements/${encodeURIComponent(requirementId)}/versions/${encodeURIComponent(versionId)}`;
  return attachmentId
    ? `${root}/attachments/${encodeURIComponent(attachmentId)}/preview`
    : `${root}/preview`;
}

// Do not store expiring readUrl credentials in the query cache.
export function mapBackendDocumentVersions(
  payload: unknown,
  dossierId: string,
  requirementId: string,
) {
  const history = z
    .array(
      z.object({
        documentVersionId: z.string(),
        versionNo: z.number(),
        uploadedAt: time,
        uploadNote: z.string().nullable(),
        reviews: z.array(reviewDto),
        files: z.array(
          fileDto.extend({ documentAttachmentId: z.string().nullable() }),
        ),
      }),
    )
    .parse(unwrapBackendValue(payload));
  return history.map((version) => {
    const reviews = version.reviews
      .map(mapReview)
      .sort((left, right) => right.reviewedAt.localeCompare(left.reviewedAt));
    return documentVersionSchema.parse({
      ...version,
      reviews,
      review: reviews[0] ?? null,
      files: version.files.map((file, sortOrder) => ({
        ...file,
        mimeType: file.mimeType,
        fileSizeBytes: file.fileSizeBytes,
        sortOrder,
        fileUrl: protectedPreviewUrl(
          dossierId,
          requirementId,
          version.documentVersionId,
          file.documentAttachmentId,
        ),
      })),
    });
  });
}

export function serializeDocumentMetadata(metadata: object) {
  const result: Record<string, string> = {};
  for (const field of [
    "documentNumber",
    "issuingAuthority",
    "issuedDate",
    "expiryDate",
  ] as const) {
    const value = (metadata as Record<string, unknown>)[field];
    if (typeof value === "string" && value.trim()) result[field] = value.trim();
  }
  return result;
}

export function serializeDocumentSubmission(
  files: readonly { publicId: string }[],
  metadata: object,
) {
  const references = z
    .array(z.object({ publicId: z.string().trim().min(1) }))
    .min(1)
    .max(10)
    .refine(
      (items) =>
        new Set(items.map((item) => item.publicId)).size === items.length,
    )
    .parse(files);
  const uploadNote = (metadata as { uploadNote?: string }).uploadNote?.trim();
  return {
    files: references,
    ...serializeDocumentMetadata(metadata),
    ...(uploadNote ? { uploadNote } : {}),
  };
}
