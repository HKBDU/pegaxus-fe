import type { DossierHorseOption, DossierOverview, DossierRequirement, DossierRequirementStatus, DossierRequirementsParams } from "./types";

export const UPLOAD_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const UPLOAD_ACCEPTED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const DOSSIER_REQUIREMENT_STATUSES = [
  "PENDING", "REQUESTED", "PROVIDED", "SATISFIED", "REJECTED", "WAIVED",
] as const;

export function canUploadInitialDocument(
  role: string | undefined,
  dossier: DossierOverview,
  requirement: DossierRequirement,
) {
  return role === "CUSTOMER" &&
    dossier.status === "IN_PREPARATION" &&
    !dossier.writeLocked &&
    requirement.document === null &&
    (requirement.status === "PENDING" || requirement.status === "REQUESTED");
}

export function getCustomerDocumentActions(
  dossier: Pick<DossierOverview, "status" | "writeLocked">,
  requirement: Pick<DossierRequirement, "status" | "document">,
): string[] {
  const document = requirement.document;
  if (!document) {
    return dossier.status === "IN_PREPARATION" && !dossier.writeLocked &&
      (requirement.status === "PENDING" || requirement.status === "REQUESTED")
      ? ["Upload Document"] : [];
  }
  const actions = ["View Document"];
  if (dossier.status === "IN_PREPARATION" && !dossier.writeLocked && requirement.status !== "SATISFIED") {
    if (document.status === "PROVIDED") actions.push("Edit Document");
    if (document.status === "REJECTED") actions.push("Update Document");
  }
  actions.push("View Version History");
  return actions;
}

export function canViewDossierAudit(roles: readonly string[] | undefined) {
  return roles?.includes("TRANSPORT_SPECIALIST") || roles?.includes("LOGISTICS_MANAGER") || false;
}

export function getDossierRequirementActionLabels(
  role: string | undefined,
  status: DossierRequirementStatus,
  hasDocument: boolean,
): string[] {
  if (role === "CUSTOMER") {
    if (status === "PENDING") return ["Upload Document"];
    if (status === "PROVIDED") return ["View Document", "Edit Uploaded Document"];
    if (status === "REQUESTED" && !hasDocument) return ["View Request", "Upload Document"];
    if (status === "REQUESTED" || status === "REJECTED") return ["View Request", "View Document", "Upload New Version"];
    return status === "SATISFIED" ? ["View Document"] : ["View Requirement"];
  }
  if (role === "TRANSPORT_SPECIALIST") {
    if (status === "PENDING") return ["View Requirement", "Request Missing Document"];
    if (status === "PROVIDED") return ["View Document", "Review Document"];
    if (status === "REQUESTED" || status === "REJECTED") return ["View Request", "View Review History"];
    return status === "SATISFIED" ? ["View Document", "View Review Result"] : ["View Requirement"];
  }
  if (role === "LOGISTICS_MANAGER") {
    return [
      "View Requirement",
      ...(hasDocument ? ["View Document"] : []),
      ...(hasDocument && (status === "SATISFIED" || status === "REJECTED") ? ["View Review Result"] : []),
    ];
  }
  return [];
}

export const initialDossierRequirementsParams: DossierRequirementsParams = {
  pageIndex: 1,
  pageSize: 20,
  sortBy: "createdAt:asc",
};

export function getDossierHorseFilterOptions(horses: readonly DossierHorseOption[]) {
  return [
    { value: "ALL", label: "All Horses" },
    ...horses.map(({ horseId, horseName }) => ({ value: String(horseId), label: horseName })),
  ];
}

export function updateDossierRequirementFilters(
  current: DossierRequirementsParams,
  filters: Pick<DossierRequirementsParams, "status" | "horseId" | "sortBy">,
): DossierRequirementsParams {
  return { ...current, ...filters, pageIndex: 1 };
}

export function resetDossierRequirementFilters(current: DossierRequirementsParams): DossierRequirementsParams {
  return { ...initialDossierRequirementsParams, pageSize: current.pageSize };
}

export function reconcileDossierHorseFilter(current: DossierRequirementsParams, horses: readonly DossierHorseOption[]) {
  if (current.horseId === undefined || horses.some(({ horseId }) => horseId === current.horseId)) return current;
  return updateDossierRequirementFilters(current, { horseId: undefined });
}

export const dossierStatusLabels: Record<DossierOverview["status"] | DossierRequirementStatus | "EXPIRED", string> = {
  DRAFT: "Draft",
  IN_PREPARATION: "In preparation",
  READY_FOR_SUBMISSION: "Ready for submission",
  SUBMITTED: "Submitted",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CLOSED: "Closed",
  REQUESTED: "Requested",
  PROVIDED: "In review",
  SATISFIED: "Completed",
  WAIVED: "Waived",
  EXPIRED: "Expired",
};

export const dossierStatusStyles: Record<keyof typeof dossierStatusLabels, string> = {
  DRAFT: "border-sky-300 bg-sky-50 text-sky-700",
  IN_PREPARATION: "border-sky-300 bg-sky-50 text-sky-700",
  READY_FOR_SUBMISSION: "border-amber-300 bg-amber-50 text-amber-700",
  SUBMITTED: "border-blue-300 bg-blue-50 text-blue-700",
  PENDING: "border-slate-300 bg-slate-100 text-slate-700",
  APPROVED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-300 bg-red-50 text-red-700",
  CLOSED: "border-slate-300 bg-slate-100 text-slate-700",
  REQUESTED: "border-amber-300 bg-amber-50 text-amber-700",
  PROVIDED: "border-blue-300 bg-blue-50 text-blue-700",
  SATISFIED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  WAIVED: "border-slate-300 bg-slate-100 text-slate-700",
  EXPIRED: "border-amber-300 bg-amber-50 text-amber-700",
};

export const dossierRequirementStatusOptions = [
  { value: "ALL", label: "All statuses" },
  ...DOSSIER_REQUIREMENT_STATUSES.map((status) => ({ value: status, label: dossierStatusLabels[status] })),
];

export const dossierRequirementSortOptions = [
  { value: "createdAt:asc", label: "Oldest created" },
  { value: "dueDate:asc", label: "Due date ascending" },
  { value: "dueDate:desc", label: "Due date descending" },
  { value: "status:asc", label: "Status ascending" },
  { value: "status:desc", label: "Status descending" },
];
