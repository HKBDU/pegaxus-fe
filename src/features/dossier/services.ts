import type { AxiosRequestConfig } from "axios"

import apiClient from "@/lib/axios"
import { z } from "zod"
import { mapBackendDossierOverview as mapActualOverview, mapBackendRequirement, mapBackendRequirementDetail, mapBackendDocumentVersions, overviewDtoSchema, protectedPreviewUrl, serializeDocumentMetadata, serializeDocumentSubmission, unwrapBackendValue, backendReminderEnvelopeSchema } from "./lib/backend-contract"
import {
  dossierIdSchema,
  dossierRequirementsParamsSchema,
  createUploadDocumentSchema,
  createSubmitDocumentVersionSchema,
  createUpdateDocumentMetadataSchema,
  updateDocumentMetadataEnvelopeSchema,
  documentReviewSchema,
  documentReviewEnvelopeSchema,
  readyForSubmissionEnvelopeSchema,
  missingDocumentReminderSchema,
  missingDocumentReminderEnvelopeSchema,
} from "./schemas"
import { bookingDossierLinkSchema, type BookingDossierLink } from "./schemas"
import type { EntityId, PaginationMeta } from "@/shared/types"
import { MOCK_AUDIT_EVENTS, MOCK_DASHBOARD_ITEMS } from "@/features/dossier/constants/dossier.mock"
import type {
  AuditEvent,
  AuditParams,
  AuditResponse,
  DashboardItem,
  DashboardKpi,
  DashboardParams,
  DashboardResponse,
  DossierOverview,
  DocumentReviewInput,
  DossierRequirementsParams,
  SendMissingDocumentReminderInput,
  SubmitDocumentVersionInput,
  UpdateDocumentMetadataInput,
  UploadDocumentInput,
  ExportFormat,
  RevokeDocumentReviewInput,
} from "@/features/dossier/types"

const ENDPOINT = "compliance-dossiers"
// Existing dashboard/audit mode is unchanged; UC20 dossier details always use APIs.
const useDossierMocks = import.meta.env.VITE_COMPLIANCE_API_MOCKS === "true"

const wait = (delay = 180) => new Promise((resolve) => window.setTimeout(resolve, delay))

interface ApiEnvelope<T> {
  value: T
}

function unwrapValue<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "value" in payload) return (payload as ApiEnvelope<T>).value
  return payload as T
}


/** Rethrows a BE error response as Error(errorCode) so the UI can react to codes like FORBIDDEN. */
async function callApi<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    const data = (error as { response?: { data?: { errorCode?: string } } }).response?.data
    if (data?.errorCode) throw new Error(data.errorCode, { cause: error })
    throw error
  }
}

const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) => callApi(apiClient.get<unknown, T>(url, config)),
}

function buildMeta(totalItems: number, pageIndex: number, pageSize: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(pageIndex, totalPages)
  return {
    totalItems,
    totalPages,
    itemsPerPage: pageSize,
    currentPage,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  }
}

function paginate<T>(items: T[], pageIndex: number, pageSize: number) {
  const meta = buildMeta(items.length, pageIndex, pageSize)
  const start = (meta.currentPage - 1) * pageSize
  return { data: items.slice(start, start + pageSize), meta }
}

function toMeta(value: { pageIndex: number; pageSize: number; totalItems: number; totalPages: number }): PaginationMeta {
  return {
    totalItems: value.totalItems,
    totalPages: value.totalPages,
    itemsPerPage: value.pageSize,
    currentPage: value.pageIndex,
    hasPreviousPage: value.pageIndex > 1,
    hasNextPage: value.pageIndex < value.totalPages,
  }
}

const dashboardQuery = (params: DashboardParams) => ({
  pageIndex: params.pageIndex,
  pageSize: params.pageSize,
  search: params.search || undefined,
  status: params.status === "ALL" ? undefined : params.status,
  risk: params.risk === "ALL" ? undefined : params.risk,
  routeType: params.routeType === "ALL" ? undefined : params.routeType,
  sortBy: params.sortBy,
})

function filterMockDashboard(params: DashboardParams) {
  const search = params.search.trim().toLowerCase()
  const filtered = MOCK_DASHBOARD_ITEMS.filter(
    (item) =>
      (!search || [item.bookingCode, item.dossierCode ?? "", item.customerName].some((value) => value.toLowerCase().includes(search))) &&
      (params.status === "ALL" || item.status === params.status) &&
      (params.risk === "ALL" || (params.risk === "URGENT_RISK") === item.isUrgentRisk) &&
      (params.routeType === "ALL" || (params.routeType === "CROSS_BORDER") === (item.originCountry !== item.destinationCountry)),
  )

  const [field, direction] = params.sortBy.split(":") as [keyof DashboardItem, "asc" | "desc"]
  const sign = direction === "desc" ? -1 : 1
  filtered.sort((left, right) => {
    const a = left[field]
    const b = right[field]
    return sign * (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b)))
  })
  return filtered
}

function mockKpi(): DashboardKpi {
  const count = (predicate: (item: DashboardItem) => boolean) => MOCK_DASHBOARD_ITEMS.filter(predicate).length
  return {
    totalActive: count((item) => item.status !== "CLOSED" && item.status !== "APPROVED"),
    readyForDeparture: count((item) => item.status === "READY_FOR_SUBMISSION"),
    actionRequired: count((item) => item.status === "REJECTED" || item.status === "IN_PREPARATION"),
    submittedToAuthorities: count((item) => item.status === "SUBMITTED" || item.status === "PENDING"),
    urgentRisk: count((item) => item.isUrgentRisk),
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const dashboardService = {
  /** K1. */
  async getDashboard(params: DashboardParams): Promise<DashboardResponse> {
    if (useDossierMocks) {
      await wait()
      const { data, meta } = paginate(filterMockDashboard(params), params.pageIndex, params.pageSize)
      return { kpi: mockKpi(), data, meta }
    }
    const payload = await api.get<unknown>(`${ENDPOINT}/dashboard`, { params: dashboardQuery(params) })
    const value = unwrapValue<{ kpi: DashboardKpi; items: DashboardItem[]; pageIndex: number; pageSize: number; totalItems: number; totalPages: number }>(payload)
    return { kpi: value.kpi, data: value.items, meta: toMeta(value) }
  },

  /** K2: downloads the report for the current filters (the BE keeps the K1 query). */
  async exportDashboard(params: DashboardParams, format: ExportFormat): Promise<void> {
    if (useDossierMocks) {
      await wait(400)
      const lines = [
        "Dossier code,Booking code,Customer,Origin,Destination,Departure,Progress %,Status",
        ...filterMockDashboard(params).map((item) =>
          [item.dossierCode ?? item.complianceDossierId, item.bookingCode, `"${item.customerName}"`, item.originCountry, item.destinationCountry, item.requestedDepartureDate, item.progressPercent, item.status].join(","),
        ),
      ]
      downloadBlob(new Blob([lines.join("\n")], { type: "text/csv" }), "cdos-progress-report.csv")
      return
    }
    const { pageIndex: _pageIndex, pageSize: _pageSize, ...filters } = dashboardQuery(params)
    const blob = await api.get<Blob>(`${ENDPOINT}/dashboard/export`, { params: { ...filters, format }, responseType: "blob" })
    downloadBlob(blob, `cdos-progress-report.${format}`)
  },

  /** D7. */
  async getOverview(dossierId: EntityId, _signal?: AbortSignal): Promise<DossierOverview> {
    const payload = await apiClient.get<unknown, unknown>(`${ENDPOINT}/${dossierIdSchema.parse(String(dossierId))}`, { signal: _signal })
    return mapActualOverview(payload)
  },

  /** K3. The audit trail is append-only: this service only reads. */
  async getAuditHistory(dossierId: EntityId, params: AuditParams): Promise<AuditResponse> {
    if (useDossierMocks) {
      await wait()
      const search = params.search.trim().toLowerCase()
      const from = params.from ? Date.parse(`${params.from}T00:00:00Z`) : undefined
      const to = params.to ? Date.parse(`${params.to}T23:59:59Z`) : undefined
      const filtered = MOCK_AUDIT_EVENTS.filter((event) => {
        const time = Date.parse(event.occurredAt)
        return (
          (!search || event.actor.fullName.toLowerCase().includes(search) || (event.note ?? "").toLowerCase().includes(search)) &&
          (params.actionType === "ALL" || event.actionType === params.actionType) &&
          (from === undefined || time >= from) &&
          (to === undefined || time <= to)
        )
      })
      return paginate<AuditEvent>(filtered, params.pageIndex, params.pageSize)
    }
    const payload = await api.get<unknown>(`${ENDPOINT}/${dossierId}/audit-history`, {
      params: {
        pageIndex: params.pageIndex,
        pageSize: params.pageSize,
        search: params.search || undefined,
        actionType: params.actionType === "ALL" ? undefined : params.actionType,
        from: params.from ? `${params.from}T00:00:00Z` : undefined,
        to: params.to ? `${params.to}T23:59:59Z` : undefined,
        sortBy: "occurredAt:desc",
      },
    })
    const value = unwrapValue<{ items: AuditEvent[]; pageIndex: number; pageSize: number; totalItems: number; totalPages: number }>(payload)
    return { data: value.items, meta: toMeta(value) }
  },
}
function requirementEndpoint(
  dossierId: string,
  requirementId: string | number,
) {
  return `${ENDPOINT}/${encodeURIComponent(dossierIdSchema.parse(dossierId))}/requirements/${encodeURIComponent(dossierIdSchema.parse(String(requirementId)))}`;
}

const uploadResult = z.object({
  dossierRequirementId: z.string(),
  complianceDocumentId: z.string(),
  documentVersionId: z.string(),
  versionNo: z.number().int().positive(),
  isNewVersion: z.boolean(),
  status: z.string(),
  files: z.array(
    z.object({
      documentAttachmentId: z.string().nullable(),
      fileName: z.string(),
      mimeType: z.string(),
      fileSizeBytes: z.number().nonnegative(),
    }),
  ),
});

function mapUploadResult(
  payload: unknown,
  dossierId: string,
  requirementId: string | number,
) {
  const result = uploadResult.parse(unwrapBackendValue(payload));
  return {
    ...result,
    files: result.files.map((file, sortOrder) => ({
      ...file,
      sortOrder,
      fileUrl: protectedPreviewUrl(
        dossierId,
        String(requirementId),
        result.documentVersionId,
        file.documentAttachmentId,
      ),
    })),
  };
}

const documentServiceMethods = {
  async sendMissingRequirementReminder(
    input: SendMissingDocumentReminderInput,
  ) {
    const id = dossierIdSchema.parse(input.dossierId);
    const reminder = missingDocumentReminderSchema.parse(input.reminder);
    const payload = await apiClient.post<unknown, unknown>(
      `${ENDPOINT}/${id}/missing-document-reminders`,
      reminder,
    );
    const response = backendReminderEnvelopeSchema.parse(payload);
    return missingDocumentReminderEnvelopeSchema.parse({
      ...response,
      value: {
        ...response.value,
        requirements: response.value.requirements.map(mapBackendRequirement),
      },
    });
  },

  async reviewComplianceDocument(input: DocumentReviewInput) {
    const versionId = dossierIdSchema.parse(String(input.versionId));
    const { result, ...review } = documentReviewSchema.parse(input.review);
    const payload = await apiClient.post<unknown, unknown>(
      `${requirementEndpoint(input.dossierId, input.requirementId)}/versions/${versionId}/${result === "APPROVED" ? "approve" : "reject"}`,
      review,
    );
    return documentReviewEnvelopeSchema.parse(payload);
  },

  async markReadyForSubmission(dossierId: string) {
    const id = dossierIdSchema.parse(dossierId);
    const payload = await apiClient.post<unknown, unknown>(
      `${ENDPOINT}/${id}/ready-for-submission`,
    );
    return readyForSubmissionEnvelopeSchema.parse(payload);
  },

  async getRequirements(
    dossierId: string,
    params: DossierRequirementsParams,
    signal?: AbortSignal,
  ) {
    const id = dossierIdSchema.parse(dossierId);
    const query = dossierRequirementsParamsSchema.parse(params);
    const payload = await apiClient.get<unknown, unknown>(
      `${ENDPOINT}/${encodeURIComponent(id)}`,
      { params: { status: query.status, horseId: query.horseId }, signal },
    );
    const overview = overviewDtoSchema.parse(unwrapBackendValue(payload));
    const items = [
      ...overview.tripRequirements,
      ...overview.horseRequirements.flatMap((horse) => horse.requirements),
    ].map(mapBackendRequirement);
    const [field, direction] = query.sortBy.split(":");
    if (field !== "createdAt")
      items.sort((left, right) => {
        const a =
          field === "dueDate" ? (left.dueDate ?? "9999-12-31") : left.status;
        const b =
          field === "dueDate" ? (right.dueDate ?? "9999-12-31") : right.status;
        return (
          (direction === "desc" ? -1 : 1) *
          (a.localeCompare(b) ||
            String(left.dossierRequirementId).localeCompare(
              String(right.dossierRequirementId),
            ))
        );
      });
    const totalPages = Math.max(1, Math.ceil(items.length / query.pageSize));
    const pageIndex = Math.min(query.pageIndex, totalPages);
    const visible = items.slice(
      (pageIndex - 1) * query.pageSize,
      pageIndex * query.pageSize,
    );
    const hydrated = await Promise.all(
      visible.map((item) =>
        dossierService.getRequirement(
          id,
          String(item.dossierRequirementId),
          signal,
        ),
      ),
    );
    return {
      items: hydrated.map((item) => ({
        ...item,
        document: item.document
          ? {
              ...item.document,
              latestVersionNo: item.document.versions.length ? Math.max(...item.document.versions.map((version) => version.versionNo)) : null,
            }
          : null,
      })),
      pageIndex,
      pageSize: query.pageSize,
      totalItems: items.length,
      totalPages,
    };
  },

  async uploadComplianceDocument(input: UploadDocumentInput) {
    const dossierId = dossierIdSchema.parse(input.dossierId);
    const requirementId = dossierIdSchema.parse(String(input.requirementId));
    const metadata = createUploadDocumentSchema(null).parse(input.metadata);
    const payload = await apiClient.post<unknown, unknown>(
      `${requirementEndpoint(dossierId, requirementId)}/document`,
      serializeDocumentSubmission(input.files, metadata),
      { timeout: 120_000 },
    );
    return mapUploadResult(payload, dossierId, requirementId);
  },

  async getComplianceDocument(
    _documentId: string,
    signal?: AbortSignal,
    dossierId?: string,
    requirementId?: string,
  ) {
    if (!dossierId || !requirementId)
      throw new Error("DOSSIER_REQUIREMENT_CONTEXT_REQUIRED");
    const requirement = await dossierService.getRequirement(
      dossierId,
      requirementId,
      signal,
    );
    if (!requirement.document) throw new Error("DOCUMENT_NOT_FOUND");
    return requirement.document;
  },

  async submitDocumentVersion(input: SubmitDocumentVersionInput) {
    const metadata = createSubmitDocumentVersionSchema(null).parse(
      input.metadata,
    );
    const payload = await apiClient.post<unknown, unknown>(
      `${requirementEndpoint(input.dossierId, input.requirementId)}/document/versions`,
      serializeDocumentSubmission(input.files, metadata),
      { timeout: 120_000 },
    );
    const result = mapUploadResult(
      payload,
      input.dossierId,
      input.requirementId,
    );
    return {
      ...result,
      mode: result.isNewVersion
        ? ("NEW_VERSION" as const)
        : ("EDIT_IN_PLACE" as const),
    };
  },

  async updateComplianceDocumentMetadata(input: UpdateDocumentMetadataInput) {
    const changes = createUpdateDocumentMetadataSchema(null).parse(
      input.changes,
    );
    const payload = await apiClient.patch<unknown, unknown>(
      `${requirementEndpoint(input.dossierId, input.requirementId)}/document/metadata`,
      serializeDocumentMetadata(changes),
    );
    return updateDocumentMetadataEnvelopeSchema.parse(payload).value;
  },
  async getRequirement(
    dossierId: string,
    requirementId: string,
    signal?: AbortSignal,
  ) {
    return mapBackendRequirementDetail(
      await apiClient.get<unknown, unknown>(
        requirementEndpoint(dossierId, requirementId),
        { signal },
      ),
    );
  },
  async getDocumentVersions(
    dossierId: string,
    requirementId: string,
    signal?: AbortSignal,
  ) {
    return mapBackendDocumentVersions(
      await apiClient.get<unknown, unknown>(
        `${requirementEndpoint(dossierId, requirementId)}/document/versions`,
        { signal },
      ),
      dossierId,
      requirementId,
    );
  },
  async getMissingRequirements(dossierId: string, signal?: AbortSignal) {
    const payload = await apiClient.get<unknown, unknown>(
      `${ENDPOINT}/${dossierIdSchema.parse(dossierId)}/missing-requirements`,
      { signal },
    );
    return z
      .array(z.unknown())
      .parse(unwrapBackendValue(payload))
      .map(mapBackendRequirement);
  },
  async revokeDocumentReview(input: RevokeDocumentReviewInput) {
    const review = z
      .object({
        status: z.union([z.literal(3), z.literal(5)]),
        reason: z.string().trim().min(1).max(500),
      })
      .parse(input.review);
    return documentReviewEnvelopeSchema.parse(
      await apiClient.post<unknown, unknown>(
        `${requirementEndpoint(input.dossierId, input.requirementId)}/versions/${dossierIdSchema.parse(String(input.versionId))}/reviews/${dossierIdSchema.parse(input.reviewId)}/revoke`,
        review,
      ),
    );
  },
  async getDocumentRequestComments(
    dossierId: string,
    requirementId: string,
    requestId: string,
    signal?: AbortSignal,
  ) {
    const value = unwrapBackendValue(
      await apiClient.get<unknown, unknown>(
        `${requirementEndpoint(dossierId, requirementId)}/document-requests/${dossierIdSchema.parse(requestId)}/comments`,
        { signal },
      ),
    );
    return z
      .array(
        z.object({
          documentRequestCommentId: z.string(),
          authorAccountId: z.string(),
          message: z.string(),
          createdAt: z.string(),
        }),
      )
      .parse(value);
  },
  async addDocumentRequestComment(input: {
    dossierId: string;
    requirementId: string;
    requestId: string;
    message: string;
  }) {
    const body = z
      .object({ message: z.string().trim().min(1).max(2000) })
      .parse(input);
    return await apiClient.post<unknown, unknown>(
      `${requirementEndpoint(input.dossierId, input.requirementId)}/document-requests/${dossierIdSchema.parse(input.requestId)}/comments`,
      body,
    );
  },
  /**
   * D1: the dossiers of a booking (MAIN first). The customer never gets a DRAFT one, and a booking without any dossier
   * answers 404, which is just "nothing to open yet" here. Also accepts the older single-object answer.
   */
  async getDossierByBooking(bookingId: string, signal?: AbortSignal): Promise<BookingDossierLink[]> {
    let value: unknown;
    try {
      value = unwrapBackendValue(
        await apiClient.get<unknown, unknown>(`bookings/${dossierIdSchema.parse(bookingId)}/compliance-dossier`, { signal }),
      );
    } catch (error) {
      const response = (error as { response?: { status?: number; data?: { errorCode?: string } } }).response;
      if (response?.status === 404 && response.data?.errorCode === "DOSSIER_NOT_FOUND") return [];
      throw error;
    }
    const list = z.object({ items: z.array(bookingDossierLinkSchema) }).safeParse(value);
    let links: BookingDossierLink[];
    if (list.success) {
      links = list.data.items;
    } else {
      const overview = overviewDtoSchema.parse(value);
      if (!overview.isInitialized) return [];
      const current = bookingDossierLinkSchema.parse(overview);
      links = z.array(bookingDossierLinkSchema).parse(overview.complianceDossiers ?? [current]);
      if (!links.some((item) => item.complianceDossierId === current.complianceDossierId)) links.push(current);
    }
    return links.sort((a, b) => Number(b.dossierType === "MAIN") - Number(a.dossierType === "MAIN"));
  },
};

export const dossierService = Object.assign(
  dashboardService,
  documentServiceMethods,
);
