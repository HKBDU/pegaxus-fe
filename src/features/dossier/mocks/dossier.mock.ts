import {
  dossierRequirementsParamsSchema,
} from "../schemas";
import type { DossierMockScenario, DossierOverview, DossierRequirement, DossierRequirementsParams } from "../types";

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

function assertMockAvailable(id: string, scenario: DossierMockScenario) {
  if (id !== "501") throw new DossierMockHttpError(404, "DOSSIER_NOT_FOUND");
  if (scenario === "error") throw new DossierMockHttpError(500, "Simulated dossier load failure");
}

export function getMockDossier(id: string, scenario: DossierMockScenario): DossierOverview {
  assertMockAvailable(id, scenario);
  if (scenario === "locked") {
    return { ...dossier, writeLocked: true, writeLockReason: "BOOKING_CHANGE_IN_PROGRESS" };
  }
  if (scenario === "empty") {
    return {
      ...dossier, progressPercent: 0, mandatoryTotal: 0, mandatorySatisfiedOrWaived: 0,
      requirementSummary: { total: 0, pending: 0, requested: 0, provided: 0, satisfied: 0, rejected: 0, waived: 0 },
    };
  }
  return dossier;
}

export function getMockRequirements(
  id: string,
  params: DossierRequirementsParams,
  scenario: DossierMockScenario,
) {
  assertMockAvailable(id, scenario);
  const query = dossierRequirementsParamsSchema.parse(params);
  const matching = (scenario === "empty" ? [] : requirements)
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
