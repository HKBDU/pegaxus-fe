import type { AxiosRequestConfig } from "axios"

import apiClient from "@/lib/axios"
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
  ExportFormat,
} from "@/features/dossier/types"

const ENDPOINT = "compliance-dossiers"
// Same switch as the catalog: the BE has no dossier endpoints yet, so the dev build answers from mock data.
// Keep dashboard/audit API integration enabled by default; mocks are opt-in for UI work.
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

export const dossierService = {
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
  async getOverview(dossierId: EntityId): Promise<DossierOverview> {
    if (useDossierMocks) {
      await wait()
      const item = MOCK_DASHBOARD_ITEMS.find((candidate) => String(candidate.complianceDossierId) === String(dossierId))
      if (!item && String(dossierId) === "502") {
        return {
          complianceDossierId: 502,
          dossierCode: "CD-20261004-7001",
          bookingId: 1023,
          bookingCode: "BK-FLOW2-1023",
          status: "IN_PREPARATION",
          openedAt: new Date().toISOString(),
          progressPercent: 0,
          mandatoryTotal: 0,
          mandatorySatisfiedOrWaived: 0,
          writeLocked: false,
          writeLockReason: null,
        }
      }
      if (!item) throw new Error("DOSSIER_NOT_FOUND")
      const mandatoryTotal = 8
      return {
        complianceDossierId: item.complianceDossierId,
        dossierCode: item.dossierCode ?? `CD-${item.complianceDossierId}`,
        bookingId: 1000 + Number(item.complianceDossierId),
        bookingCode: item.bookingCode,
        status: item.status,
        openedAt: new Date(Date.parse(item.requestedDepartureDate) - 14 * 24 * 60 * 60 * 1000).toISOString(),
        progressPercent: item.progressPercent,
        mandatoryTotal,
        mandatorySatisfiedOrWaived: Math.round((item.progressPercent / 100) * mandatoryTotal),
        writeLocked: item.status === "CLOSED" || item.status === "SUBMITTED" || item.status === "APPROVED",
        writeLockReason: item.status === "CLOSED" ? "DOSSIER_CLOSED" : null,
      }
    }
    const value = unwrapValue<{
      complianceDossierId: EntityId
      dossierCode: string | null
      bookingId: EntityId
      bookingCode: string
      status: DossierOverview["status"] | null
      completionPercent: number
      fulfilledCount: number
      requirementCount: number
    }>(await api.get<unknown>(`${ENDPOINT}/${dossierId}`))

    return {
      complianceDossierId: value.complianceDossierId,
      dossierCode: value.dossierCode ?? String(value.complianceDossierId),
      bookingId: value.bookingId,
      bookingCode: value.bookingCode,
      status: value.status ?? "IN_PREPARATION",
      openedAt: null,
      progressPercent: value.completionPercent,
      mandatoryTotal: value.requirementCount,
      mandatorySatisfiedOrWaived: value.fulfilledCount,
      writeLocked: value.status === "CLOSED" || value.status === "SUBMITTED" || value.status === "APPROVED",
      writeLockReason: value.status === "CLOSED" ? "DOSSIER_CLOSED" : null,
    }
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
