import apiClient from "@/lib/axios"

import { fromBody, toIncidentError } from "./errors"
import {
  mockCancelIncident,
  mockGetCustomerIncident,
  mockGetIncident,
  mockListIncidents,
  mockResolveIncident,
  mockSelfResolveIncident,
} from "./mock"
import { apiEnvelopeSchema, customerIncidentSchema, incidentListSchema, incidentSchema } from "./schemas"
import type {
  CancelInput,
  CustomerIncident,
  Incident,
  IncidentList,
  IncidentListParams,
  ResolveInput,
  SelfResolveInput,
} from "./types"

export const isIncidentMockMode = () => import.meta.env.DEV && import.meta.env.VITE_INCIDENT_MOCK !== "false"

function unwrap(response: unknown): unknown {
  const failed = fromBody(response)
  if (failed) throw failed
  const parsed = apiEnvelopeSchema.safeParse(response)
  return parsed.success ? parsed.data.value : response
}

async function call<T>(request: () => Promise<unknown>, parse: (value: unknown) => T): Promise<T> {
  try {
    return parse(unwrap(await request()))
  } catch (error) {
    throw toIncidentError(error)
  }
}

const path = (incidentReportId: string) => `/incidents/${encodeURIComponent(incidentReportId)}`

/** Empty filters are left out of the query so the BE applies its defaults. */
function toQuery(params: IncidentListParams) {
  return {
    status: params.status || undefined,
    category: params.category || undefined,
    severity: params.severity || undefined,
    transportId: params.transportId,
    hasPendingCost: params.hasPendingCost,
    emergencySettlementRequired: params.emergencySettlementRequired,
    occurredFrom: params.occurredFrom || undefined,
    occurredTo: params.occurredTo || undefined,
    search: params.search.trim() || undefined,
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
    sortBy: params.sortBy,
  }
}

export const incidentService = {
  /** IN7 (LM, RC, TS). */
  list(params: IncidentListParams, signal?: AbortSignal): Promise<IncidentList> {
    if (isIncidentMockMode()) return mockListIncidents(params).then((value) => incidentListSchema.parse(value))
    return call(() => apiClient.get<unknown, unknown>("/incidents", { params: toQuery(params), signal }), (value) => incidentListSchema.parse(value))
  },

  /** IN8 for LM / RC / TS / DRV / ESC. DRV / ESC outside their transport get a 404. */
  get(incidentReportId: string, signal?: AbortSignal): Promise<Incident> {
    if (isIncidentMockMode()) return mockGetIncident(incidentReportId).then((value) => incidentSchema.parse(value))
    return call(() => apiClient.get<unknown, unknown>(path(incidentReportId), { signal }), (value) => incidentSchema.parse(value))
  },

  /** IN8 for the Customer: same route, the BE answers with the sanitized DTO. 404 for LOW / MEDIUM or someone else's booking. */
  getForCustomer(incidentReportId: string, signal?: AbortSignal): Promise<CustomerIncident> {
    if (isIncidentMockMode()) return mockGetCustomerIncident(incidentReportId)
    return call(() => apiClient.get<unknown, unknown>(path(incidentReportId), { signal }), (value) => customerIncidentSchema.parse(value))
  },

  /** IN9 (LM). */
  resolve(incidentReportId: string, input: ResolveInput): Promise<Incident> {
    if (isIncidentMockMode()) return mockResolveIncident(incidentReportId, input).then((value) => incidentSchema.parse(value))
    return call(() => apiClient.post<unknown, unknown>(`${path(incidentReportId)}/resolve`, input), (value) => incidentSchema.parse(value))
  },

  /** IN10 (LM). */
  cancel(incidentReportId: string, input: CancelInput): Promise<Incident> {
    if (isIncidentMockMode()) return mockCancelIncident(incidentReportId, input).then((value) => incidentSchema.parse(value))
    return call(() => apiClient.post<unknown, unknown>(`${path(incidentReportId)}/cancel`, input), (value) => incidentSchema.parse(value))
  },

  /** IN11 (DRV, ESC). */
  selfResolve(incidentReportId: string, input: SelfResolveInput): Promise<Incident> {
    if (isIncidentMockMode()) return mockSelfResolveIncident(incidentReportId, input).then((value) => incidentSchema.parse(value))
    return call(() => apiClient.post<unknown, unknown>(`${path(incidentReportId)}/self-resolve`, input), (value) => incidentSchema.parse(value))
  },
}
