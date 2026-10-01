import { normalizeRole } from "@/features/auth/access-control";
import type { ComplianceDocumentDetail, DocumentReviewError, DossierOverview, DossierRequirement } from "../types";

type ReviewContext = {
  role: string | undefined;
  dossier: DossierOverview;
  requirement: DossierRequirement;
  document: ComplianceDocumentDetail;
  today: string;
  result?: "APPROVED" | "REJECTED";
};

export function getLatestDocumentVersion(document: ComplianceDocumentDetail) {
  // U2 already orders versions newest first; version numbers are backend-owned.
  return document.versions[0];
}

export function canOpenDocumentReview(role: string | undefined, dossier: DossierOverview, requirement: DossierRequirement) {
  return Boolean(role && normalizeRole(role) === "TRANSPORT_SPECIALIST" &&
    !dossier.writeLocked && ["IN_PREPARATION", "READY_FOR_SUBMISSION"].includes(dossier.status) &&
    requirement.status === "PROVIDED" && requirement.document?.status === "PROVIDED");
}

export function getReviewBlockReason({ role, dossier, requirement, document, today, result = "APPROVED" }: ReviewContext): DocumentReviewError | null {
  const blocked = (code: string, message: string): DocumentReviewError => ({ code, message, refresh: false });
  if (!role || normalizeRole(role) !== "TRANSPORT_SPECIALIST") return blocked("FORBIDDEN", "Only a Transport Specialist can review this document.");
  if (dossier.writeLocked || !["IN_PREPARATION", "READY_FOR_SUBMISSION"].includes(dossier.status)) return blocked("DOSSIER_LOCKED", "This dossier can no longer be reviewed in its current state.");
  const latest = getLatestDocumentVersion(document);
  if (!latest) return blocked("NO_DOCUMENT_VERSION", "No submitted version is available for review.");
  if (latest.review) return blocked("VERSION_ALREADY_REVIEWED", "This version has already been reviewed.");
  if (document.status === "APPROVED") return blocked("DOCUMENT_ALREADY_VERIFIED", "Approved documents are read-only.");
  if (!canOpenDocumentReview(role, dossier, requirement) || document.status !== "PROVIDED" ||
    requirement.document?.complianceDocumentId !== document.complianceDocumentId ||
    requirement.dossierRequirementId !== document.dossierRequirementId ||
    requirement.document.latestVersionNo !== latest.versionNo) {
    return blocked("DOCUMENT_NOT_REVIEWABLE", "This document is no longer available for review. Refresh dossier requirements.");
  }
  // V1 alone requires valid expiry. V2 can ask the Customer to correct legacy invalid metadata.
  if (result === "REJECTED") return null;
  const expiry = document.expiryDate;
  const dates = [today, dossier.bookingSummary.requestedDepartureDate, requirement.validUntil].filter((date): date is string => Boolean(date));
  const expiryTimestamp = expiry ? Date.parse(`${expiry}T00:00:00Z`) : NaN;
  const validCalendarDate = expiry && /^\d{4}-\d{2}-\d{2}$/.test(expiry) &&
    !Number.isNaN(expiryTimestamp) && new Date(expiryTimestamp).toISOString().slice(0, 10) === expiry;
  if ((!expiry && requirement.validUntil) || (expiry &&
    (!validCalendarDate || dates.some((date) => expiry < date)))) {
    return blocked("DOCUMENT_EXPIRY_INVALID", "Document expiry is no longer valid. Customer must update/re-upload before approval.");
  }
  return null;
}

export function canReviewDocument(context: ReviewContext) {
  return getReviewBlockReason(context) === null;
}

export function isMandatoryDossierComplete(dossier: DossierOverview) {
  return dossier.mandatoryTotal > 0 && dossier.mandatorySatisfiedOrWaived === dossier.mandatoryTotal;
}

export function canMarkReadyForSubmission(role: string | undefined, dossier: DossierOverview) {
  return Boolean(role && normalizeRole(role) === "TRANSPORT_SPECIALIST" &&
    dossier.status === "IN_PREPARATION" && !dossier.writeLocked && isMandatoryDossierComplete(dossier));
}

export function mapDocumentReviewError(error: unknown): DocumentReviewError {
  const response = (error as { response?: { status?: number; data?: { errorCode?: string; code?: string | number; message?: string; data?: { errorCode?: string }; value?: { errorCode?: string; errors?: { field?: string; message: string }[] } } }; status?: number; message?: string }) ?? {};
  const data = response.response?.data;
  const status = response.response?.status ?? response.status;
  const code = data?.errorCode ?? data?.value?.errorCode ?? data?.data?.errorCode ??
    (typeof data?.code === "string" ? data.code : undefined) ??
    (status === 403 ? "FORBIDDEN" : status === 401 ? "UNAUTHORIZED" : status === 404 ? "NOT_FOUND" : response.message ?? "REVIEW_FAILED");
  const messages: Record<string, string> = {
    REQUEST_MESSAGE_TOO_SHORT: "Please provide detailed instructions of at least 15 characters.",
    DOCUMENT_REQUEST_REQUIRED: "A document request is required when rejecting a document.",
    VALIDATION_ERROR: "Check the request type, customer instructions and optional deadline.",
    DOCUMENT_EXPIRY_INVALID: "Document expiry is no longer valid. Customer must update/re-upload before approval.",
    VERSION_NOT_LATEST: "This is no longer the latest version. Refresh document data.",
    VERSION_ALREADY_REVIEWED: "This version has already been reviewed.",
    DOSSIER_LOCKED: "This dossier can no longer be reviewed in its current state.",
    BOOKING_CHANGE_IN_PROGRESS: "A booking change is in progress. Refresh the dossier before trying again.",
    DOSSIER_CLOSED: "This dossier is closed and cannot be changed.",
    MANDATORY_DR_NOT_DONE: "Mandatory requirements are not all complete. Refresh dossier progress.",
    INVALID_DOSSIER_STATUS: "This dossier is no longer in preparation. Refresh its current status.",
    FORBIDDEN: "You do not have permission to perform this action.",
    UNAUTHORIZED: "Your session has expired. Please sign in again.",
    NOT_FOUND: "This document, version or dossier is no longer available.",
  };
  const validation = data?.value?.errors?.map((item) => item.message).join(" ");
  return {
    code,
    message: validation || messages[code] || "Could not complete this action. Please try again.",
    backendMessage: data?.message ?? response.message,
    refresh: status === 409 || status === 404 || ["DOCUMENT_EXPIRY_INVALID", "VERSION_NOT_LATEST", "VERSION_ALREADY_REVIEWED", "DOSSIER_LOCKED", "BOOKING_CHANGE_IN_PROGRESS", "DOSSIER_CLOSED", "MANDATORY_DR_NOT_DONE", "INVALID_DOSSIER_STATUS"].includes(code),
  };
}

export function getDocumentFileHref(fileUrl: string): string | undefined {
  try {
    const url = new URL(fileUrl);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
