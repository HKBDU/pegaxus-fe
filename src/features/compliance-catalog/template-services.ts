import { bookingService } from "@/features/booking/services"
import { MOCK_COMPLIANCE_REQUIREMENTS } from "@/features/compliance-catalog/constants/compliance.mock"
import { getComplianceCountryCode } from "@/features/compliance-catalog/constants/countries"
import { MOCK_DOSSIER_TEMPLATES } from "@/features/compliance-catalog/constants/template.mock"
import { api, ComplianceApiError, unwrapValue, useComplianceMocks, wait } from "@/features/compliance-catalog/services"
import type {
  DossierTemplate,
  DossierTemplateListParams,
  DossierTemplateListResponse,
  DossierTemplatePayload,
  DossierTemplateSummary,
  SaveDossierTemplateResult,
  TemplateStatus,
} from "@/features/compliance-catalog/template-types"
import { createBaseService } from "@/shared/services"
import type { EntityId } from "@/shared/types"

const ENDPOINT = "dossier-templates"

const requirementById = (id: EntityId) => MOCK_COMPLIANCE_REQUIREMENTS.find((item) => String(item.complianceRequirementId) === String(id))

function withNames(template: DossierTemplate): DossierTemplate {
  return {
    ...template,
    items: template.items.map((item) => ({ ...item, requirementName: requirementById(item.complianceRequirementId)?.requirementName ?? item.requirementName })),
  }
}

let mockTemplates = structuredClone(MOCK_DOSSIER_TEMPLATES).map(withNames)

function toSummary(template: DossierTemplate): DossierTemplateSummary {
  return {
    dossierTemplateId: template.dossierTemplateId,
    templateCode: template.templateCode,
    templateName: template.templateName,
    versionNo: template.versionNo,
    status: template.status,
    effectiveFrom: template.effectiveFrom,
    effectiveTo: template.effectiveTo,
    itemCount: template.items.length,
    updatedAt: template.updatedAt,
  }
}

function findMock(id: EntityId) {
  const template = mockTemplates.find((item) => String(item.dossierTemplateId) === String(id))
  if (!template) throw new ComplianceApiError("NOT_FOUND")
  return template
}

function validateMockPayload(data: DossierTemplatePayload, ignoreId?: EntityId) {
  if (!data.items.length) throw new ComplianceApiError("TEMPLATE_NEEDS_ONE_ITEM")
  if (new Set(data.items.map((item) => String(item.complianceRequirementId))).size !== data.items.length || new Set(data.items.map((item) => item.sequenceNo)).size !== data.items.length) {
    throw new ComplianceApiError("DTI_DUPLICATE")
  }
  const code = data.templateCode.trim().toLowerCase()
  if (mockTemplates.some((item) => item.templateCode.toLowerCase() === code && String(item.dossierTemplateId) !== String(ignoreId))) {
    throw new ComplianceApiError("DUPLICATE_TEMPLATE_CODE")
  }
}

function applyPayload(target: DossierTemplate, data: DossierTemplatePayload) {
  Object.assign(target, {
    templateCode: data.templateCode,
    templateName: data.templateName,
    description: data.description ?? null,
    status: data.status,
    effectiveFrom: data.effectiveFrom ?? null,
    effectiveTo: data.effectiveTo ?? null,
    items: data.items
      .map((item) => ({
        complianceRequirementId: item.complianceRequirementId,
        requirementName: requirementById(item.complianceRequirementId)?.requirementName ?? "",
        sequenceNo: item.sequenceNo,
        isMandatory: item.isMandatory,
        appliesPerHorse: item.appliesPerHorse,
        instruction: item.instruction ?? null,
      }))
      .sort((left, right) => left.sequenceNo - right.sequenceNo),
  })
  target.itemCount = target.items.length
}

/** Mock of the T1 recommendation mode (API contract section 4, "Danh sách gợi ý"). */
async function getMockRecommendations(bookingId: EntityId) {
  const booking = await bookingService.getBooking(bookingId)
  const origin = getComplianceCountryCode(booking.originCountry)
  const destination = getComplianceCountryCode(booking.destinationCountry)
  const today = new Date().toISOString().slice(0, 10)

  const candidates = mockTemplates
    .filter((template) => template.status === "ACTIVE" && (!template.effectiveTo || template.effectiveTo >= today))
    .map((template) => {
      const countries = new Set(template.items.map((item) => requirementById(item.complianceRequirementId)?.country).filter(Boolean))
      const matched = [origin, destination].filter((code): code is string => Boolean(code) && countries.has(code))
      const group = matched.length === 2 ? 1 : matched.length === 1 ? 2 : countries.size === 0 ? 3 : 4
      return { template, matched: [...new Set(matched)], group }
    })
    .sort((left, right) => left.group - right.group || Date.parse(right.template.updatedAt) - Date.parse(left.template.updatedAt))

  return new Map(
    candidates.map(({ template, matched, group }, index) => [
      String(template.dossierTemplateId),
      {
        // Only the best match is flagged, like the single "Recommended" card of the design.
        isRecommended: index === 0 && group <= 2,
        recommendationRank: index + 1,
        matchedCountries: matched,
        recommendationReason:
          group === 1
            ? `Requirements in this template match both ${matched.join(" and ")} on the booking route`
            : group === 2
              ? `Requirements in this template match ${matched[0]} on the booking route`
              : group === 3
                ? "This template only holds shared requirements that apply to every route"
                : "Active template without a country match for this route",
      },
    ]),
  )
}

async function getMockList(params: DossierTemplateListParams): Promise<DossierTemplateListResponse> {
  await wait()
  const search = params.search.trim().toLowerCase()
  const recommendations = params.bookingId !== undefined ? await getMockRecommendations(params.bookingId) : undefined
  const filtered = mockTemplates.filter(
    (item) =>
      (!recommendations || recommendations.has(String(item.dossierTemplateId))) &&
      (!search || item.templateCode.toLowerCase().includes(search) || item.templateName.toLowerCase().includes(search)) &&
      (params.status === "ALL" || item.status === params.status) &&
      (params.country === "ALL" || item.items.some((line) => requirementById(line.complianceRequirementId)?.country === params.country)),
  )

  filtered.sort((left, right) => {
    if (recommendations && params.sortBy === "recommendation:desc") {
      return recommendations.get(String(left.dossierTemplateId))!.recommendationRank - recommendations.get(String(right.dossierTemplateId))!.recommendationRank
    }
    if (params.sortBy === "templateName:asc") return left.templateName.localeCompare(right.templateName)
    if (params.sortBy === "templateName:desc") return right.templateName.localeCompare(left.templateName)
    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  })

  const totalItems = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalItems / params.pageSize))
  const currentPage = Math.min(params.pageIndex, totalPages)
  const start = (currentPage - 1) * params.pageSize

  return {
    data: filtered.slice(start, start + params.pageSize).map((template) => ({ ...toSummary(template), ...recommendations?.get(String(template.dossierTemplateId)) })),
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

const templateBaseService = createBaseService<
  DossierTemplate,
  DossierTemplatePayload,
  DossierTemplatePayload,
  DossierTemplateListParams,
  SaveDossierTemplateResult,
  SaveDossierTemplateResult,
  DossierTemplateSummary,
  DossierTemplate
>({
  endpoint: ENDPOINT,
  getAll: async (params) => {
    const query: DossierTemplateListParams = params ?? { pageIndex: 1, pageSize: 10, search: "", country: "ALL", status: "ALL", sortBy: "updatedAt:desc" }
    if (useComplianceMocks) return getMockList(query)

    const payload = await api.get<unknown>(ENDPOINT, {
      params: {
        pageIndex: query.pageIndex,
        pageSize: query.pageSize,
        search: query.search || undefined,
        country: query.country === "ALL" ? undefined : query.country,
        status: query.status === "ALL" ? undefined : query.status,
        sortBy: query.sortBy,
        bookingId: query.bookingId,
      },
    })
    const value = unwrapValue<{
      items: DossierTemplateSummary[]
      pageIndex: number
      pageSize: number
      totalItems: number
      totalPages: number
    }>(payload)
    return {
      // The BE list returns the lines in `items` and no `itemCount` (contract T1 says itemCount), so derive it.
      data: value.items.map((item) => ({
        ...item,
        itemCount: item.itemCount ?? (item as { items?: unknown[] }).items?.length ?? 0,
      })),
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
    return unwrapValue<DossierTemplate>(await api.get<unknown>(`${ENDPOINT}/${id}`))
  },
  create: async (data) => {
    if (useComplianceMocks) {
      await wait()
      validateMockPayload(data)
      const now = new Date().toISOString()
      const dossierTemplateId = Math.max(0, ...mockTemplates.map((item) => Number(item.dossierTemplateId))) + 1
      const template = { dossierTemplateId, versionNo: 1, updatedAt: now, isReferenced: false, referenceCount: { complianceDossierCount: 0 } } as DossierTemplate
      applyPayload(template, data)
      mockTemplates = [template, ...mockTemplates]
      return { dossierTemplateId, templateCode: template.templateCode }
    }
    return unwrapValue<SaveDossierTemplateResult>(await api.post<unknown>(ENDPOINT, data))
  },
  update: async (id, data) => {
    if (useComplianceMocks) {
      await wait()
      const template = findMock(id)
      if (template.isReferenced) throw new ComplianceApiError("TEMPLATE_IN_USE")
      validateMockPayload(data, id)
      applyPayload(template, data)
      template.versionNo += 1
      template.updatedAt = new Date().toISOString()
      return { dossierTemplateId: template.dossierTemplateId, templateCode: template.templateCode, versionNo: template.versionNo }
    }
    return unwrapValue<SaveDossierTemplateResult>(await api.put<unknown>(`${ENDPOINT}/${id}`, data))
  },
  remove: async (id) => {
    if (useComplianceMocks) {
      await wait()
      const template = findMock(id)
      if (template.isReferenced) throw new ComplianceApiError("TEMPLATE_IN_USE")
      mockTemplates = mockTemplates.filter((item) => item !== template)
      return
    }
    await api.delete(`${ENDPOINT}/${id}`)
  },
})

export const templateService = {
  getTemplates: (params: DossierTemplateListParams) => templateBaseService.getAll(params),
  getTemplate: (id: EntityId) => templateBaseService.getById(id),
  createTemplate: (data: DossierTemplatePayload) => templateBaseService.create(data),
  updateTemplate: (id: EntityId, data: DossierTemplatePayload) => templateBaseService.update(id, data),
  deleteTemplate: (id: EntityId) => templateBaseService.remove(id),

  async changeStatus(id: EntityId, status: TemplateStatus): Promise<void> {
    if (useComplianceMocks) {
      await wait()
      const template = findMock(id)
      const validDates = !template.effectiveTo || !template.effectiveFrom || template.effectiveTo >= template.effectiveFrom
      if (status === "ACTIVE" && (!template.items.length || !validDates)) throw new ComplianceApiError("TEMPLATE_NOT_ACTIVATABLE")
      template.status = status
      template.updatedAt = new Date().toISOString()
      return
    }
    await api.patch(`${ENDPOINT}/${id}/status`, { status })
  },
}
