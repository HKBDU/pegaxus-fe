import {
  dossierRequirementsParamsSchema,
  approveDocumentReviewSchema,
  approveDocumentEnvelopeSchema,
  documentReviewSchema,
  missingDocumentReminderSchema,
  dossierUploadedAssetsSchema,
} from "../schemas";
import demoPdfUrl from "@/assets/a.pdf?url";
import demoImageUrl from "@/assets/horse-card.png?url";
import { isMissingDossierRequirement } from "../constants";
import { canMarkReadyForSubmission, getReviewBlockReason } from "../lib/document-review";
import type { ApproveDocumentResponse, ApproveDocumentReview, DocumentReviewPayload, DocumentReviewResponse, ReadyForSubmissionResponse, ComplianceDocumentDetail, DossierMockScenario, DossierOverview, DossierRequirement, DossierRequirementsParams, MissingDocumentReminderInput, MissingDocumentReminderResponse, SubmitDocumentVersionInput, UpdateDocumentMetadataInput, UploadDocumentMetadata, DossierUploadedAssetRef } from "../types";

// Local demonstration fixtures, not a guessed Cloudinary URL or the customer's uploaded bytes.
function mockFileProjection(files: DossierUploadedAssetRef[]) {
  return dossierUploadedAssetsSchema.parse(files).map((file, index) => ({
    fileName: file.fileName,
    fileUrl: new URL(file.mimeType === "application/pdf" ? demoPdfUrl : demoImageUrl,
      typeof window !== "undefined" ? window.location.origin : "http://localhost").href,
    mimeType: file.mimeType, fileSizeBytes: file.fileSizeBytes, sortOrder: index + 1,
  }));
}

class DossierMockHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const dossier: DossierOverview = {
  complianceDossierId: 501,
  dossierCode: "CD-20260925-7731",
  bookingId: 88,
  bookingCode: "REQ-20260925-1002",
  status: "IN_PREPARATION",
  openedAt: "2026-09-25T02:00:00Z",
  readyForSubmissionAt: null,
  approvedAt: null,
  rejectedAt: null,
  closedAt: null,
  rejectionReason: null,
  note: null,
  writeLocked: false,
  writeLockReason: null,
  progressPercent: 62.5,
  mandatoryTotal: 8,
  mandatorySatisfiedOrWaived: 5,
  bookingSummary: {
    bookingStatus: "APPROVED",
    originCountry: "GB",
    destinationCountry: "FR",
    requestedDepartureDate: "2026-10-02",
    customerName: "Nguyễn Minh Khang",
    horseCount: 2,
    horses: [
      { horseId: 71, horseName: "Pegaxus Star" },
      { horseId: 72, horseName: "Silver Arrow" },
    ],
  },
  requirementSummary: {
    total: 10, pending: 2, requested: 1, provided: 1,
    satisfied: 4, rejected: 1, waived: 1,
  },
  quarantineStatus: null,
  customsClearanceStatus: null,
};

const requirements: DossierRequirement[] = [
  {
    dossierRequirementId: 8101, complianceRequirementId: 31,
    requirementName: "Transport Permit", horseId: null, horseName: null,
    status: "SATISFIED", isMandatory: true, dueDate: "2026-10-01",
    validUntil: "2027-10-01", satisfiedAt: "2026-09-26T12:00:00Z",
    waivedReason: null, note: null,
    document: { complianceDocumentId: 9201, documentCode: "DOC-20260925-0001", status: "APPROVED", latestVersionNo: 1 },
  },
  {
    dossierRequirementId: 8102, complianceRequirementId: 32,
    requirementName: "Horse Passport", horseId: 71, horseName: "Pegaxus Star",
    status: "SATISFIED", isMandatory: true, dueDate: "2026-10-01",
    validUntil: "2027-10-01", satisfiedAt: "2026-09-26T12:10:00Z",
    waivedReason: null, note: null,
    document: { complianceDocumentId: 9202, documentCode: "DOC-20260925-0002", status: "APPROVED", latestVersionNo: 1 },
  },
  {
    dossierRequirementId: 8103, complianceRequirementId: 32,
    requirementName: "Horse Passport", horseId: 72, horseName: "Silver Arrow",
    status: "SATISFIED", isMandatory: true, dueDate: "2026-10-01",
    validUntil: "2027-10-01", satisfiedAt: "2026-09-26T12:20:00Z",
    waivedReason: null, note: null,
    document: { complianceDocumentId: 9203, documentCode: "DOC-20260925-0003", status: "APPROVED", latestVersionNo: 1 },
  },
  {
    dossierRequirementId: 8104, complianceRequirementId: 33,
    requirementName: "ATA Carnet", horseId: null, horseName: null,
    status: "WAIVED", isMandatory: true, dueDate: "2026-10-03",
    validUntil: null, satisfiedAt: null,
    waivedReason: "Not required for this route", note: null, document: null,
  },
  {
    dossierRequirementId: 8105, complianceRequirementId: 34,
    requirementName: "Vaccination Record", horseId: 71, horseName: "Pegaxus Star",
    status: "SATISFIED", isMandatory: true, dueDate: "2026-10-03",
    validUntil: "2027-01-01", satisfiedAt: "2026-09-27T10:00:00Z",
    waivedReason: null, note: null,
    document: { complianceDocumentId: 9205, documentCode: "DOC-20260925-0005", status: "APPROVED", latestVersionNo: 1 },
  },
  {
    dossierRequirementId: 8106, complianceRequirementId: 35,
    requirementName: "Export Health Certificate", horseId: null, horseName: null,
    status: "PENDING", isMandatory: true, dueDate: "2026-10-05",
    validUntil: null, satisfiedAt: null, waivedReason: null, note: null,
    document: null,
  },
  {
    dossierRequirementId: 8107, complianceRequirementId: 36,
    requirementName: "Coggins Test", horseId: 72, horseName: "Silver Arrow",
    status: "PROVIDED", isMandatory: true, dueDate: "2026-10-05",
    validUntil: "2027-01-01", satisfiedAt: null, waivedReason: null,
    note: "Awaiting document review",
    document: { complianceDocumentId: 9207, documentCode: "DOC-20260925-0007", status: "PROVIDED", latestVersionNo: 1 },
  },
  {
    dossierRequirementId: 8108, complianceRequirementId: 37,
    requirementName: "Microchip Certificate", horseId: 71, horseName: "Pegaxus Star",
    status: "REQUESTED", isMandatory: true, dueDate: "2026-10-07",
    validUntil: null, satisfiedAt: null, waivedReason: null,
    note: "Please provide the certificate before departure", document: null,
  },
  {
    dossierRequirementId: 8109, complianceRequirementId: 38,
    requirementName: "Import Declaration", horseId: 72, horseName: "Silver Arrow",
    status: "REJECTED", isMandatory: false, dueDate: "2026-10-07",
    validUntil: null, satisfiedAt: null, waivedReason: null,
    note: "The scan is unclear",
    document: { complianceDocumentId: 9209, documentCode: "DOC-20260925-0009", status: "REJECTED", latestVersionNo: 1 },
  },
  {
    dossierRequirementId: 8110, complianceRequirementId: 39,
    requirementName: "Insurance Confirmation", horseId: null, horseName: null,
    status: "PENDING", isMandatory: false, dueDate: null,
    validUntil: null, satisfiedAt: null, waivedReason: null, note: null,
    document: null,
  },
];

// Independent fixture state for final UC20–25 manual testing; IDs never overlap.
export const DOSSIER_MOCK_SCENARIOS = [
  { id: "501", label: "Mixed lifecycle — upload, edit, approve, reject, replace and remind" },
  { id: "502", label: "No missing requirements — empty reminder state" },
  { id: "503", label: "Booking change lock — all writes blocked" },
  { id: "504", label: "Mandatory complete — manual Mark Ready for Submission" },
  { id: "505", label: "Ready for submission — read-only, no missing reminders" },
  { id: "506", label: "Pagination — 103 pending and 101 requested requirements" },
] as const;

const mockDossiers = new Map<number, { dossier: DossierOverview; requirements: DossierRequirement[] }>([
  [501, { dossier, requirements }],
]);
for (const id of [502, 503, 504, 505]) {
  const offset = (id - 501) * 10000;
  const rows = requirements.map((item, index): DossierRequirement => {
    const row = { ...item, dossierRequirementId: item.dossierRequirementId + offset,
      document: item.document ? { ...item.document, complianceDocumentId: item.document.complianceDocumentId + offset, documentCode: `DOC-${id}-${index + 1}` } : null };
    if ((id === 502 || id === 505) && isMissingDossierRequirement(row)) {
      return { ...row, status: "WAIVED", waivedReason: "Not required for this test scenario" };
    }
    if ((id === 504 || id === 505) && row.isMandatory && row.status !== "WAIVED") {
      return { ...row, status: "SATISFIED", satisfiedAt: "2026-10-01T09:00:00Z",
        document: { complianceDocumentId: row.document?.complianceDocumentId ?? 9201 + index + offset,
          documentCode: row.document?.documentCode ?? `DOC-${id}-${index + 1}`, status: "APPROVED", latestVersionNo: 1 } };
    }
    return row;
  });
  mockDossiers.set(id, { dossier: {
    ...dossier, complianceDossierId: id, dossierCode: `CD-MOCK-${id}`, bookingId: id + 1000, bookingCode: `REQ-MOCK-${id}`,
    status: id === 505 ? "READY_FOR_SUBMISSION" : "IN_PREPARATION",
    readyForSubmissionAt: id === 505 ? "2026-10-01T09:30:00Z" : null,
    writeLocked: id === 503, writeLockReason: id === 503 ? "BOOKING_CHANGE_IN_PROGRESS" : null,
  }, requirements: rows });
}
mockDossiers.set(506, { dossier: {
  ...dossier, complianceDossierId: 506, dossierCode: "CD-MOCK-506", bookingId: 1506, bookingCode: "REQ-MOCK-506",
}, requirements: Array.from({ length: 204 }, (_, index): DossierRequirement => ({
  dossierRequirementId: 60000 + index, complianceRequirementId: 1000 + index,
  requirementName: `Additional travel document ${index + 1}`,
  horseId: index % 3 === 0 ? null : index % 3 === 1 ? 71 : 72,
  horseName: index % 3 === 0 ? null : index % 3 === 1 ? "Pegaxus Star" : "Silver Arrow",
  status: index < 103 ? "PENDING" : "REQUESTED", isMandatory: false,
  dueDate: null, validUntil: null, satisfiedAt: null, waivedReason: null, note: null, document: null,
})) });

function currentRequirements(id: string) {
  return mockDossiers.get(Number(id))!.requirements.map((item) => uploadedRequirements.get(item.dossierRequirementId) ?? item);
}

function requirementOwner(requirementId: number) {
  return [...mockDossiers.values()].find((state) => state.requirements.some((item) => item.dossierRequirementId === requirementId))!;
}

function currentRequirement(requirementId: number) {
  return uploadedRequirements.get(requirementId) ?? requirementOwner(requirementId)?.requirements.find((item) => item.dossierRequirementId === requirementId);
}

function assertWritableRequirement(requirementId: number, scenario: DossierMockScenario) {
  const owner = requirementOwner(requirementId);
  const overview = getMockDossier(String(owner.dossier.complianceDossierId), scenario);
  if (overview.writeLocked || overview.status !== "IN_PREPARATION") throw new DossierMockHttpError(409, "DOSSIER_LOCKED");
}

export function sendMockMissingRequirementReminder(id: string, input: MissingDocumentReminderInput, scenario: DossierMockScenario): MissingDocumentReminderResponse {
  const body = missingDocumentReminderSchema.parse(input);
  const overview = getMockDossier(id, scenario);
  if (overview.writeLocked || overview.status !== "IN_PREPARATION") throw new DossierMockHttpError(409, "DOSSIER_LOCKED");
  const selected = new Set(body.dossierRequirementIds);
  const eligible = (scenario === "empty" ? [] : currentRequirements(id))
    .filter((item) => selected.has(item.dossierRequirementId) && isMissingDossierRequirement(item));
  if (!eligible.length) throw new DossierMockHttpError(400, "NO_MISSING_DR");
  for (const item of eligible) uploadedRequirements.set(item.dossierRequirementId, {
    ...item, status: "REQUESTED", ...(body.dueDate ? { dueDate: body.dueDate } : {}),
  });
  // note belongs to backend notification/email content, not DossierRequirement state.
  return { isSuccess: true, code: 200, message: "Missing DossierRequirement reminder sent successfully", value: { remindedCount: eligible.length } };
}

const uploadedRequirements = new Map<number, DossierRequirement>();
let nextMockDocumentId = 9300;
let nextMockVersionId = 9400;
const documentDetails = new Map<number, ComplianceDocumentDetail>();
let nextMockReviewId = 9500;
let nextMockRequestId = 9600;

export function approveMockDocument(id: string, versionId: number, review: ApproveDocumentReview, scenario: DossierMockScenario): ApproveDocumentResponse {
  approveDocumentReviewSchema.parse(review);
  return approveDocumentEnvelopeSchema.parse(reviewMockDocument(id, versionId, review, scenario));
}

export function reviewMockDocument(id: string, versionId: number, review: DocumentReviewPayload, scenario: DossierMockScenario): DocumentReviewResponse {
  const body = documentReviewSchema.parse(review);
  const current = getMockComplianceDocument(id, scenario);
  const owner = requirementOwner(current.dossierRequirementId);
  const overview = getMockDossier(String(owner.dossier.complianceDossierId), scenario);
  if (overview.writeLocked) throw new DossierMockHttpError(409, "DOSSIER_LOCKED");
  const latest = current.versions[0];
  if (!latest || latest.documentVersionId !== versionId) throw new DossierMockHttpError(409, "VERSION_NOT_LATEST");
  if (latest.review) throw new DossierMockHttpError(409, "VERSION_ALREADY_REVIEWED");
  const requirement = currentRequirement(current.dossierRequirementId)!;
  const block = getReviewBlockReason({ role: "TRANSPORT_SPECIALIST", dossier: overview, requirement, document: current, today: new Date().toISOString().slice(0, 10), result: body.result });
  if (block) throw new DossierMockHttpError(409, block.code);
  const reviewedAt = new Date().toISOString();
  const documentReviewId = nextMockReviewId++;
  const approved = body.result === "APPROVED";
  const openRequest = body.result === "REJECTED" ? {
    documentRequestId: nextMockRequestId++,
    requestCode: `DREQ-${reviewedAt.slice(0, 10).replaceAll("-", "")}-${nextMockRequestId - 1}`,
    requestType: body.documentRequest.requestType,
    message: body.documentRequest.message,
    dueDate: body.documentRequest.dueDate ?? null,
  } : null;
  documentDetails.set(current.complianceDocumentId, {
    ...current, status: approved ? "APPROVED" : "REJECTED", updatedAt: reviewedAt, openRequest,
    versions: [{ ...latest, review: {
      documentReviewId, result: body.result, reviewComment: body.reviewComment ?? null,
      reviewedBy: { accountId: 402, fullName: "Transport Specialist" }, reviewedAt,
    } }, ...current.versions.slice(1)],
  });
  uploadedRequirements.set(requirement.dossierRequirementId, {
    ...requirement, status: approved ? "SATISFIED" : "REJECTED", satisfiedAt: approved ? reviewedAt : null,
    document: { ...requirement.document!, status: approved ? "APPROVED" : "REJECTED" },
  });
  if (!approved && openRequest) {
    owner.dossier.status = "IN_PREPARATION";
    return {
      isSuccess: true, code: 201,
      message: "DocumentReview recorded: REJECTED. DocumentRequest created and customer notified.",
      value: { documentReviewId, documentRequestId: openRequest.documentRequestId, requestCode: openRequest.requestCode,
        dossierRequirementStatus: "REJECTED", dossierStatus: "IN_PREPARATION" },
    };
  }
  return {
    isSuccess: true, code: 201,
    message: "DocumentReview recorded: APPROVED. DossierRequirement status updated to SATISFIED.",
    value: { documentReviewId, dossierRequirementStatus: "SATISFIED" },
  };
}

export function markMockDossierReady(id: string, scenario: DossierMockScenario): ReadyForSubmissionResponse {
  const overview = getMockDossier(id, scenario);
  if (overview.writeLocked) throw new DossierMockHttpError(409, "DOSSIER_LOCKED");
  if (overview.status !== "IN_PREPARATION") throw new DossierMockHttpError(409, "INVALID_DOSSIER_STATUS");
  if (!canMarkReadyForSubmission("TRANSPORT_SPECIALIST", overview)) throw new DossierMockHttpError(409, "MANDATORY_DR_NOT_DONE");
  const stored = mockDossiers.get(Number(id))!.dossier;
  stored.status = "READY_FOR_SUBMISSION";
  stored.readyForSubmissionAt = new Date().toISOString();
  return { isSuccess: true, code: 200, message: "ComplianceDossier is now READY_FOR_SUBMISSION", value: null };
}

function seedDocument(requirement: DossierRequirement): ComplianceDocumentDetail {
  const document = requirement.document!;
  const rejected = document.status === "REJECTED";
  return {
    complianceDocumentId: document.complianceDocumentId,
    documentCode: document.documentCode,
    dossierRequirementId: requirement.dossierRequirementId,
    documentName: requirement.requirementName,
    status: document.status,
    documentNumber: "HP-2026-001",
    issuingAuthority: "Weatherbys",
    issuedDate: "2025-03-01",
    expiryDate: requirement.validUntil && requirement.validUntil > "2027-03-01" ? requirement.validUntil : "2027-03-01",
    note: null,
    updatedAt: "2026-09-26T04:10:00Z",
    versions: [{
      documentVersionId: document.complianceDocumentId + 1000,
      versionNo: document.latestVersionNo,
      uploadNote: null,
      uploadedAt: "2026-09-25T02:30:00Z",
      files: mockFileProjection([{ publicId: "mock/document-page", fileName: "document-page.png", mimeType: "image/png", fileSizeBytes: 196621 }]),
      review: rejected ? {
        documentReviewId: 900,
        result: "REJECTED",
        reviewComment: "Stamp is unclear on page 2.",
        reviewedBy: { accountId: 402, fullName: "Transport Specialist" },
        reviewedAt: "2026-09-26T04:10:00Z",
      } : document.status === "APPROVED" ? {
        documentReviewId: 901,
        result: "APPROVED",
        reviewComment: null,
        reviewedBy: { accountId: 402, fullName: "Transport Specialist" },
        reviewedAt: "2026-09-26T04:10:00Z",
      } : null,
    }],
    openRequest: rejected ? {
      documentRequestId: 15,
      requestCode: "DREQ-20260926-0003",
      requestType: "REUPLOAD",
      message: "Upload a clearer scan of page 2 and include the full stamp.",
      dueDate: "2026-10-05",
    } : null,
  };
}

export function getMockComplianceDocument(id: string, scenario: DossierMockScenario): ComplianceDocumentDetail {
  const documentId = Number(id);
  const requirement = [...mockDossiers.keys()].flatMap((key) => currentRequirements(String(key)))
    .find((item) => item.document?.complianceDocumentId === documentId);
  if (!requirement) throw new DossierMockHttpError(404, "DOCUMENT_NOT_FOUND");
  assertMockAvailable(String(requirementOwner(requirement.dossierRequirementId).dossier.complianceDossierId), scenario);
  const current = documentDetails.get(documentId) ?? seedDocument(requirement);
  if (scenario === "locked") return current;
  return current;
}

export function submitMockDocumentVersion(
  id: string,
  files: DossierUploadedAssetRef[],
  metadata: SubmitDocumentVersionInput["metadata"],
  scenario: DossierMockScenario,
) {
  const current = getMockComplianceDocument(id, scenario);
  assertWritableRequirement(current.dossierRequirementId, scenario);
  if (current.status === "APPROVED") throw new DossierMockHttpError(409, "DOCUMENT_ALREADY_VERIFIED");
  const projectedFiles = mockFileProjection(files);
  const latest = current.versions[0];
  const reviewed = latest.review !== null;
  const versionNo = reviewed ? latest.versionNo + 1 : latest.versionNo;
  const documentVersionId = reviewed ? nextMockVersionId++ : latest.documentVersionId;
  const version = {
    documentVersionId,
    versionNo,
    uploadNote: metadata.uploadNote?.trim() || null,
    uploadedAt: new Date().toISOString(),
    files: projectedFiles,
    review: null,
  };
  documentDetails.set(current.complianceDocumentId, {
    ...current,
    status: "PROVIDED",
    documentNumber: metadata.documentNumber || null,
    issuingAuthority: metadata.issuingAuthority || null,
    issuedDate: metadata.issuedDate || null,
    expiryDate: metadata.expiryDate || null,
    updatedAt: version.uploadedAt,
    versions: reviewed ? [version, ...current.versions] : [version, ...current.versions.slice(1)],
    openRequest: null,
  });
  const requirement = currentRequirement(current.dossierRequirementId);
  if (requirement) uploadedRequirements.set(requirement.dossierRequirementId, {
    ...requirement, status: "PROVIDED",
    document: { ...requirement.document!, status: "PROVIDED", latestVersionNo: versionNo },
  });
  return { documentVersionId, versionNo, mode: reviewed ? "NEW_VERSION" as const : "EDIT_IN_PLACE" as const };
}

export function updateMockComplianceDocumentMetadata(
  id: string,
  changes: UpdateDocumentMetadataInput["changes"],
  scenario: DossierMockScenario,
) {
  const current = getMockComplianceDocument(id, scenario);
  assertWritableRequirement(current.dossierRequirementId, scenario);
  if (current.versions[0].review) throw new DossierMockHttpError(409, "DOCUMENT_ALREADY_REVIEWED");
  const updatedAt = new Date().toISOString();
  const metadataChanges = {
    ...(changes.documentName !== undefined ? { documentName: changes.documentName } : {}),
    ...(changes.documentNumber !== undefined ? { documentNumber: changes.documentNumber || null } : {}),
    ...(changes.issuingAuthority !== undefined ? { issuingAuthority: changes.issuingAuthority || null } : {}),
    ...(changes.issuedDate !== undefined ? { issuedDate: changes.issuedDate || null } : {}),
    ...(changes.expiryDate !== undefined ? { expiryDate: changes.expiryDate || null } : {}),
    ...(changes.note !== undefined ? { note: changes.note || null } : {}),
  };
  documentDetails.set(current.complianceDocumentId, {
    ...current,
    ...metadataChanges,
    updatedAt,
  });
  return { complianceDocumentId: current.complianceDocumentId, updatedAt };
}

export function uploadMockDocument(
  id: string,
  requirementId: number,
  files: DossierUploadedAssetRef[],
  scenario: DossierMockScenario,
  metadata?: UploadDocumentMetadata,
) {
  assertMockAvailable(id, scenario);
  const overview = getMockDossier(id, scenario);
  if (overview.writeLocked || overview.status !== "IN_PREPARATION") throw new DossierMockHttpError(409, "DOSSIER_LOCKED");
  const projectedFiles = mockFileProjection(files);
  const requirement = currentRequirements(id).find((item) => item.dossierRequirementId === requirementId);
  if (!requirement) throw new DossierMockHttpError(404, "DR_NOT_FOUND");
  if (requirement.document) throw new DossierMockHttpError(409, "DR_ALREADY_HAS_DOCUMENT");
  if (requirement.status !== "PENDING" && requirement.status !== "REQUESTED") {
    throw new DossierMockHttpError(409, "REQUIREMENT_NOT_UPLOADABLE");
  }
  const complianceDocumentId = nextMockDocumentId++;
  const result = {
    complianceDocumentId,
    documentCode: `DOC-MOCK-${complianceDocumentId}`,
    documentVersionId: nextMockVersionId++,
    versionNo: 1 as const,
  };
  const uploadedAt = new Date().toISOString();
  documentDetails.set(complianceDocumentId, {
    complianceDocumentId,
    documentCode: result.documentCode,
    dossierRequirementId: requirementId,
    documentName: metadata?.documentName || requirement.requirementName,
    status: "PROVIDED",
    documentNumber: metadata?.documentNumber || null,
    issuingAuthority: metadata?.issuingAuthority || null,
    issuedDate: metadata?.issuedDate || null,
    expiryDate: metadata?.expiryDate || null,
    note: null,
    updatedAt: uploadedAt,
    versions: [{
      documentVersionId: result.documentVersionId,
      versionNo: result.versionNo,
      uploadNote: null,
      uploadedAt,
      files: projectedFiles,
      review: null,
    }],
    openRequest: null,
  });
  uploadedRequirements.set(requirementId, {
    ...requirement,
    status: "PROVIDED",
    document: {
      complianceDocumentId,
      documentCode: result.documentCode,
      status: "PROVIDED",
      latestVersionNo: 1,
    },
  });
  return result;
}

function assertMockAvailable(id: string, scenario: DossierMockScenario) {
  if (!mockDossiers.has(Number(id))) throw new DossierMockHttpError(404, "DOSSIER_NOT_FOUND");
  if (scenario === "error") throw new DossierMockHttpError(500, "Simulated dossier load failure");
}

export function getMockDossier(id: string, scenario: DossierMockScenario): DossierOverview {
  assertMockAvailable(id, scenario);
  // Mock backend projection uses the complete dataset, never a paginated D8 page.
  const stored = mockDossiers.get(Number(id))!.dossier;
  const rows = currentRequirements(id);
  const requirementSummary = {
    total: rows.length,
    pending: 0, requested: 0, provided: 0, satisfied: 0, rejected: 0, waived: 0,
  };
  for (const item of rows) {
    const key = item.status.toLowerCase() as Exclude<keyof typeof requirementSummary, "total">;
    requirementSummary[key]++;
  }
  const mandatory = rows.filter((item) => item.isMandatory);
  const mandatorySatisfiedOrWaived = mandatory.filter((item) => item.status === "SATISFIED" || item.status === "WAIVED").length;
  const overview = {
    ...stored, requirementSummary, mandatoryTotal: mandatory.length, mandatorySatisfiedOrWaived,
    progressPercent: mandatory.length ? mandatorySatisfiedOrWaived / mandatory.length * 100 : 0,
  };
  if (scenario === "locked") {
    return { ...overview, writeLocked: true, writeLockReason: "BOOKING_CHANGE_IN_PROGRESS" };
  }
  if (scenario === "empty") {
    return {
      ...stored, progressPercent: 0, mandatoryTotal: 0, mandatorySatisfiedOrWaived: 0,
      requirementSummary: { total: 0, pending: 0, requested: 0, provided: 0, satisfied: 0, rejected: 0, waived: 0 },
    };
  }
  return overview;
}

export function getMockRequirements(
  id: string,
  params: DossierRequirementsParams,
  scenario: DossierMockScenario,
) {
  assertMockAvailable(id, scenario);
  const query = dossierRequirementsParamsSchema.parse(params);
  const matching = (scenario === "empty" ? [] : currentRequirements(id))
    .filter((item) => !query.status || item.status === query.status)
    .filter((item) => !query.horseId || item.horseId === query.horseId);

  if (query.sortBy !== "createdAt:asc") {
    const [field, direction] = query.sortBy.split(":") as ["dueDate" | "status", "asc" | "desc"];
    matching.sort((left, right) => {
      const comparison = String(left[field] ?? "").localeCompare(String(right[field] ?? ""));
      return direction === "asc" ? comparison : -comparison;
    });
  }

  const start = (query.pageIndex - 1) * query.pageSize;
  return {
    items: matching.slice(start, start + query.pageSize),
    pageIndex: query.pageIndex,
    pageSize: query.pageSize,
    totalItems: matching.length,
    totalPages: Math.ceil(matching.length / query.pageSize),
  };
}
