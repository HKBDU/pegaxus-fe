import type { AxiosRequestConfig } from "axios"

import apiClient from "@/lib/axios"
import { createBaseService } from "@/shared/services"
import type { EntityId } from "@/shared/types"
import { MOCK_COMPLIANCE_REQUIREMENTS } from "@/features/compliance-catalog/constants/compliance.mock"
import type {
  ApiEnvelope,
  ComplianceRequirement,
  ComplianceRequirementListParams,
  ComplianceRequirementListResponse,
  ComplianceRequirementPayload,
  ComplianceRequirementSummary,
  ComplianceStatus,
  CreateComplianceRequirementResult,
  ReferenceCount,
  UpdateComplianceRequirementResult,
} from "@/features/compliance-catalog/types"

const ENDPOINT = "compliance-requirements"
export const useComplianceMocks = import.meta.env.DEV && import.meta.env.VITE_COMPLIANCE_API_MOCKS !== "false"
let mockRequirements = structuredClone(MOCK_COMPLIANCE_REQUIREMENTS)

export function wait(delay = 180) {
  return new Promise((resolve) => window.setTimeout(resolve, delay))
}

export function unwrapValue<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "value" in payload) {
    return (payload as ApiEnvelope<T>).value
  }
  return payload as T
}

/** Error(errorCode) so the UI can react to codes; REFERENCE_IMPACT_CONFIRMATION_REQUIRED also carries the fresh counts. */
export class ComplianceApiError extends Error {
  referenceCount?: ReferenceCount

  constructor(code: string, options?: { cause?: unknown; referenceCount?: ReferenceCount }) {
    super(code, { cause: options?.cause })
    this.name = "ComplianceApiError"
    this.referenceCount = options?.referenceCount
  }
}

async function callApi<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    const data = (error as { response?: { data?: { errorCode?: string; value?: { referenceCount?: ReferenceCount } } } }).response?.data
    if (data?.errorCode) throw new ComplianceApiError(data.errorCode, { cause: error, referenceCount: data.value?.referenceCount })
    throw error
  }
}

export const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) => callApi(apiClient.get<unknown, T>(url, config)),
  post: <T = unknown>(url: string, data?: unknown) => callApi(apiClient.post<unknown, T>(url, data)),
  put: <T = unknown>(url: string, data?: unknown) => callApi(apiClient.put<unknown, T>(url, data)),
  patch: <T = unknown>(url: string, data?: unknown) => callApi(apiClient.patch<unknown, T>(url, data)),
  delete: <T = unknown>(url: string) => callApi(apiClient.delete<unknown, T>(url)),
}

function toSummary(requirement: ComplianceRequirement): ComplianceRequirementSummary {
  return {
    complianceRequirementId: requirement.complianceRequirementId,
    requirementCode: requirement.requirementCode,
    requirementName: requirement.requirementName,
    country: requirement.country,
    category: requirement.category,
    bcpCode: requirement.bcpCode,
    validityRequired: requirement.validityRequired,
    validityPeriodDays: requirement.validityPeriodDays,
    status: requirement.status,
    updatedAt: requirement.updatedAt,
  }
}

function findMock(id: EntityId) {
  const requirement = mockRequirements.find((item) => String(item.complianceRequirementId) === String(id))
  if (!requirement) throw new ComplianceApiError("NOT_FOUND")
  return requirement
}

function assertUniqueCode(code: string, ignoreId?: EntityId) {
  const normalized = code.trim().toLowerCase()
  const duplicated = mockRequirements.some(
    (item) => item.requirementCode.toLowerCase() === normalized && String(item.complianceRequirementId) !== String(ignoreId),
  )
  if (duplicated) throw new ComplianceApiError("DUPLICATE_REQUIREMENT_CODE")
}

function applyPayload(target: ComplianceRequirement, data: ComplianceRequirementPayload) {
  Object.assign(target, {
    requirementCode: data.requirementCode,
    requirementName: data.requirementName,
    description: data.description ?? null,
    country: data.country ?? null,
    category: data.category,
    issuingAuthority: data.issuingAuthority ?? null,
    bcpCode: data.bcpCode ?? null,
    legalBasis: data.legalBasis ?? null,
    validityRequired: data.validityRequired,
    validityPeriodDays: data.validityRequired ? (data.validityPeriodDays ?? null) : null,
    status: data.status,
  })
}

async function getMockList(params: ComplianceRequirementListParams): Promise<ComplianceRequirementListResponse> {
  await wait()
  const search = params.search.trim().toLowerCase()
  const filtered = mockRequirements.filter(
    (item) =>
      (!search || item.requirementCode.toLowerCase().includes(search) || item.requirementName.toLowerCase().includes(search)) &&
      (!params.country || params.country === "ALL" || item.country === params.country) &&
      (params.category === "ALL" || item.category === params.category) &&
      (params.status === "ALL" || item.status === params.status),
  )

  filtered.sort((left, right) => {
    if (params.sortBy === "requirementCode:asc") return left.requirementCode.localeCompare(right.requirementCode)
    const direction = params.sortBy === "updatedAt:desc" ? -1 : 1
    return direction * (Date.parse(left.updatedAt) - Date.parse(right.updatedAt))
  })

  const totalItems = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalItems / params.pageSize))
  const currentPage = Math.min(params.pageIndex, totalPages)
  const start = (currentPage - 1) * params.pageSize

  return {
    data: filtered.slice(start, start + params.pageSize).map(toSummary),
    meta: {
      totalItems,
      totalPages,
      itemsPerPage: params.pageSize,
      currentPage,
      hasPreviousPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
    },
  }
}

const complianceBaseService = createBaseService<
  ComplianceRequirement,
  ComplianceRequirementPayload,
  ComplianceRequirementPayload,
  ComplianceRequirementListParams,
  CreateComplianceRequirementResult,
  UpdateComplianceRequirementResult,
  ComplianceRequirementSummary,
  ComplianceRequirement
>({
  endpoint: ENDPOINT,
  getAll: async (params) => {
    const query: ComplianceRequirementListParams = params ?? {
      pageIndex: 1,
      pageSize: 10,
      search: "",
      country: "ALL",
      category: "ALL",
      status: "ALL",
      sortBy: "updatedAt:desc",
    }
    if (useComplianceMocks) return getMockList(query)

    const payload = await api.get<unknown>(ENDPOINT, {
      params: {
        pageIndex: query.pageIndex,
        pageSize: query.pageSize,
        search: query.search || undefined,
        country: query.country === "ALL" ? undefined : query.country,
        category: query.category === "ALL" ? undefined : query.category,
        status: query.status === "ALL" ? undefined : query.status,
        sortBy: query.sortBy,
      },
    })
    const value = unwrapValue<{
      items: ComplianceRequirementSummary[]
      pageIndex: number
      pageSize: number
      totalItems: number
      totalPages: number
    }>(payload)
    return {
      data: value.items,
      meta: {
        totalItems: value.totalItems,
        totalPages: value.totalPages,
        itemsPerPage: value.pageSize,
        currentPage: value.pageIndex,
        hasPreviousPage: value.pageIndex > 1,
        hasNextPage: value.pageIndex < value.totalPages,
      },
    }
  },
  getById: async (id) => {
    if (useComplianceMocks) {
      await wait()
      return structuredClone(findMock(id))
    }
    return unwrapValue<ComplianceRequirement>(await api.get<unknown>(`${ENDPOINT}/${id}`))
  },
  create: async (data) => {
    if (useComplianceMocks) {
      await wait()
      assertUniqueCode(data.requirementCode)
      const now = new Date().toISOString()
      const complianceRequirementId = Math.max(0, ...mockRequirements.map((item) => Number(item.complianceRequirementId))) + 1
      const requirement = {
        complianceRequirementId,
        createdAt: now,
        updatedAt: now,
        isReferenced: false,
        referenceCount: { dossierTemplateItemCount: 0, dossierRequirementCount: 0, linkedDossierCount: 0 },
      } as ComplianceRequirement
      applyPayload(requirement, data)
      mockRequirements = [requirement, ...mockRequirements]
      return { complianceRequirementId, requirementCode: requirement.requirementCode }
    }
    return unwrapValue<CreateComplianceRequirementResult>(await api.post<unknown>(ENDPOINT, data))
  },
  update: async (id, data) => {
    if (useComplianceMocks) {
      await wait()
      const requirement = findMock(id)
      assertUniqueCode(data.requirementCode, id)
      if (requirement.isReferenced && !data.acknowledgeReferenceImpact) {
        throw new ComplianceApiError("REFERENCE_IMPACT_CONFIRMATION_REQUIRED", { referenceCount: requirement.referenceCount })
      }
      applyPayload(requirement, data)
      requirement.updatedAt = new Date().toISOString()
      return { complianceRequirementId: requirement.complianceRequirementId, updatedAt: requirement.updatedAt }
    }
    return unwrapValue<UpdateComplianceRequirementResult>(await api.put<unknown>(`${ENDPOINT}/${id}`, data))
  },
  remove: async (id) => {
    if (useComplianceMocks) {
      await wait()
      const requirement = findMock(id)
      if (requirement.isReferenced) throw new ComplianceApiError("REQUIREMENT_IN_USE")
      mockRequirements = mockRequirements.filter((item) => item !== requirement)
      return
    }
    await api.delete(`${ENDPOINT}/${id}`)
  },
})

export const complianceService = {
  getRequirements: (params: ComplianceRequirementListParams) => complianceBaseService.getAll(params),
  getRequirement: (id: EntityId) => complianceBaseService.getById(id),
  createRequirement: (data: ComplianceRequirementPayload) => complianceBaseService.create(data),
  updateRequirement: (id: EntityId, data: ComplianceRequirementPayload) => complianceBaseService.update(id, data),
  deleteRequirement: (id: EntityId) => complianceBaseService.remove(id),

  async changeStatus(id: EntityId, status: ComplianceStatus): Promise<void> {
    if (useComplianceMocks) {
      await wait()
      const requirement = findMock(id)
      requirement.status = status
      requirement.updatedAt = new Date().toISOString()
      return
    }
    await api.patch(`${ENDPOINT}/${id}/status`, { status })
  },
}
