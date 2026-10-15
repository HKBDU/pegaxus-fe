import { MOCK_COMPLIANCE_REQUIREMENTS } from "@/features/compliance-catalog/constants/compliance.mock"
import type { AddRequirementInput, DossierRequirementItem, DossierRequirementParams, UpdateRequirementInput, WaiveRequirementInput } from "@/features/compliance-catalog/dossier-types"
import { api, ComplianceApiError, unwrapValue, useComplianceMocks, useFlow2HttpMocks, wait } from "@/features/compliance-catalog/services"
import { dossierService as dossierReadService } from "@/features/dossier/services"
import type { EntityId, PaginationMeta } from "@/shared/types"

const HORSES = [
  { horseId: 71, horseName: "Golden Thunder" },
  { horseId: 72, horseName: "Night Horizon" },
]

const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

const mockStore = new Map<string, DossierRequirementItem[]>()

function seedRequirements(): DossierRequirementItem[] {
  let nextId = 8100
  const line = (
    complianceRequirementId: number,
    requirementName: string,
    horse: (typeof HORSES)[number] | null,
    status: DossierRequirementItem["status"],
    isMandatory: boolean,
    dueInDays: number | null,
    document: DossierRequirementItem["document"] = null,
    note: string | null = null,
  ): DossierRequirementItem => ({
    dossierRequirementId: nextId++,
    complianceRequirementId,
    requirementName,
    horseId: horse?.horseId ?? null,
    horseName: horse?.horseName ?? null,
    status,
    isMandatory,
    dueDate: dueInDays === null ? null : inDays(dueInDays),
    validUntil: document ? inDays(365) : null,
    note,
    document,
  })

  const doc = (code: string, status: string, versions = 1) => ({ complianceDocumentId: 9200 + nextId, documentCode: code, status, latestVersionNo: versions })
  const [thunder, horizon] = HORSES

  return [
    line(10, "Horse Passport", thunder, "SATISFIED", true, 10, doc("DOC-20260928-0001", "APPROVED")),
    line(9, "Export Health Certificate (EHC)", thunder, "REJECTED", true, 12, doc("DOC-20260928-0002", "REJECTED", 2), "Stamp is unclear on page 2"),
    line(1, "Equine Infectious Anemia (Coggins) Certificate", thunder, "PENDING", false, 14),
    line(10, "Horse Passport", horizon, "PROVIDED", true, 10, doc("DOC-20260929-0003", "PENDING")),
    line(9, "Export Health Certificate (EHC)", horizon, "PENDING", true, 12),
    line(1, "Equine Infectious Anemia (Coggins) Certificate", horizon, "WAIVED", false, null),
    line(11, "Common Health Entry Document (CHED-A)", null, "REQUESTED", true, 9),
    line(8, "Customs Carnet ATA Documentation", null, "PENDING", false, 15),
  ]
}

function storeOf(dossierId: EntityId) {
  const key = String(dossierId)
  if (!mockStore.has(key)) mockStore.set(key, seedRequirements())
  return mockStore.get(key) as DossierRequirementItem[]
}

/** Same rule the BE applies (UC-19 EXC-02): a dossier that was already sent to the authorities is read-only. */
async function assertMockWritable(dossierId: EntityId) {
  const overview = await dossierReadService.getOverview(dossierId)
  if (overview.writeLocked) throw new ComplianceApiError(overview.writeLockReason ?? "DOSSIER_LOCKED")
}

function buildMeta(totalItems: number, pageIndex: number, pageSize: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(pageIndex, totalPages)
  return { totalItems, totalPages, itemsPerPage: pageSize, currentPage, hasPreviousPage: currentPage > 1, hasNextPage: currentPage < totalPages }
}

// Temporary bridge until Dương's D8 list endpoint is merged. The IDs are from the real dossier
// created for booking 6a8a8d20-0755-4611-83c1-d6f275a69810, so mutations still call the real API.
const TEMP_DOSSIER_ID = "2d9a91e0-22aa-4a0d-bdc4-1127aa5bd252"
const TEMP_REQUIREMENTS: DossierRequirementItem[] = [
  {
    dossierRequirementId: "b26dd3c6-aa73-4190-9f71-8f51df1c7520",
    complianceRequirementId: "dfac6edb-5085-4a8b-9c3a-4fa5e2567676",
    requirementName: "Equine Infectious Anemia (Coggins) Certificate",
    horseId: null,
    horseName: null,
    status: "PENDING",
    isMandatory: true,
    dueDate: null,
    validUntil: null,
    note: "Provide the Coggins test result",
    document: null,
  },
  {
    dossierRequirementId: "fe94416d-d270-4a81-83b3-79ca26a5a3de",
    complianceRequirementId: "5793d611-3544-46af-b516-41770d12c30b",
    requirementName: "Export Health Certificate (EHC)",
    horseId: null,
    horseName: null,
    status: "PENDING",
    isMandatory: true,
    dueDate: null,
    validUntil: "2026-11-23",
    note: "Carnet must cover the whole trip",
    document: null,
  },
  {
    dossierRequirementId: "f9a6dad1-57e8-4dc7-bb77-d45a0994bf15",
    complianceRequirementId: "f9bb9e56-015b-4d72-a2ca-d313556f1004",
    requirementName: "Single Administrative Document (SAD)",
    horseId: null,
    horseName: null,
    status: "PENDING",
    isMandatory: false,
    dueDate: null,
    validUntil: "2027-01-12",
    note: null,
    document: null,
  },
]

async function temporaryRequirements(dossierId: EntityId, params: DossierRequirementParams) {
  void TEMP_DOSSIER_ID
  void TEMP_REQUIREMENTS
  const overview = await dossierReadService.getOverview(dossierId)
  const value = unwrapValue<{
    tripRequirements?: DossierRequirementItem[]
    horseRequirements?: DossierRequirementItem[]
  }>(await api.get<unknown>(`bookings/${overview.bookingId}/compliance-dossier`))
    const rows = [...(value.tripRequirements ?? []), ...(value.horseRequirements ?? [])].map((item) => ({
      ...item,
      validUntil: item.validUntil ?? null,
      note: item.note ?? null,
      document: item.document ?? null,
  }))
  const filtered = rows.filter(
    (item) => (params.status === "ALL" || item.status === params.status) && (params.horseId === "ALL" || String(item.horseId) === params.horseId),
  )
  const meta = buildMeta(filtered.length, params.pageIndex, params.pageSize)
  const start = (meta.currentPage - 1) * params.pageSize
  return { data: filtered.slice(start, start + params.pageSize), meta }
}

export const requirementService = {
  /** D8. Only DRs that were not removed are returned. */
  async getRequirements(dossierId: EntityId, params: DossierRequirementParams): Promise<{ data: DossierRequirementItem[]; meta: PaginationMeta }> {
    if (useComplianceMocks) {
      await wait()
      const filtered = storeOf(dossierId).filter(
        (item) => (params.status === "ALL" || item.status === params.status) && (params.horseId === "ALL" || String(item.horseId) === params.horseId),
      )
      const meta = buildMeta(filtered.length, params.pageIndex, params.pageSize)
      const start = (meta.currentPage - 1) * params.pageSize
      return { data: filtered.slice(start, start + params.pageSize), meta }
    }
    let payload: unknown
    try {
      payload = await api.get<unknown>(`compliance-dossiers/${dossierId}/requirements`, {
        params: {
          pageIndex: params.pageIndex,
          pageSize: params.pageSize,
          status: params.status === "ALL" ? undefined : params.status,
          horseId: params.horseId === "ALL" ? undefined : params.horseId,
        },
      })
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status
      const fallback = status === 405 ? await temporaryRequirements(dossierId, params) : null
      if (fallback) return fallback
      throw error
    }
    const value = unwrapValue<{ items: DossierRequirementItem[]; pageIndex: number; pageSize: number; totalItems: number; totalPages: number }>(payload)
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

  /** D3. */
  async addRequirement(dossierId: EntityId, input: AddRequirementInput): Promise<{ dossierRequirementId: EntityId; status: string }> {
    if (useComplianceMocks && !useFlow2HttpMocks) {
      await wait(300)
      await assertMockWritable(dossierId)
      const store = storeOf(dossierId)
      const requirement = MOCK_COMPLIANCE_REQUIREMENTS.find((item) => String(item.complianceRequirementId) === String(input.complianceRequirementId))
      if (!requirement) throw new ComplianceApiError("NOT_FOUND")
      if (requirement.status !== "ACTIVE") throw new ComplianceApiError("REQUIREMENT_INACTIVE")
      if (store.some((item) => String(item.complianceRequirementId) === String(input.complianceRequirementId) && String(item.horseId) === String(input.horseId))) {
        throw new ComplianceApiError("DR_DUPLICATE")
      }
      const horse = HORSES.find((item) => String(item.horseId) === String(input.horseId))
      if (input.horseId !== null && !horse) throw new ComplianceApiError("HORSE_NOT_IN_BOOKING")
      const dossierRequirementId = Math.max(8099, ...store.map((item) => Number(item.dossierRequirementId))) + 1
      store.push({
        dossierRequirementId,
        complianceRequirementId: input.complianceRequirementId,
        requirementName: requirement.requirementName,
        horseId: horse?.horseId ?? null,
        horseName: horse?.horseName ?? null,
        status: "PENDING",
        isMandatory: input.isMandatory,
        dueDate: input.dueDate ?? null,
        validUntil: null,
        note: input.instruction ?? null,
        document: null,
      })
      return { dossierRequirementId, status: "PENDING" }
    }
    const { dueDate: _dueDate, leadTimeDays, reason, ...requirement } = input
    return unwrapValue<{ dossierRequirementId: EntityId; status: string }>(await api.post<unknown>(`compliance-dossiers/${dossierId}/requirements`, {
      ...requirement,
      leadTimeDays: leadTimeDays ?? 0,
      reason: reason?.trim() || "Added from dossier detail",
    }))
  },

  /** D4. Backend exposes PATCH for partial DossierRequirement updates. */
  async updateRequirement(dossierId: EntityId, dossierRequirementId: EntityId, input: UpdateRequirementInput): Promise<void> {
    if (useComplianceMocks && !useFlow2HttpMocks) {
      await wait(300)
      await assertMockWritable(dossierId)
      const item = storeOf(dossierId).find((candidate) => String(candidate.dossierRequirementId) === String(dossierRequirementId))
      if (!item) throw new ComplianceApiError("NOT_FOUND")
      item.isMandatory = input.isMandatory ?? item.isMandatory
      item.note = input.instruction ?? item.note
      return
    }
    await api.patch(`compliance-dossiers/${dossierId}/requirements/${dossierRequirementId}`, input)
  },

  async waiveRequirement(dossierId: EntityId, dossierRequirementId: EntityId, input: WaiveRequirementInput): Promise<void> {
    if (useComplianceMocks && !useFlow2HttpMocks) {
      await wait(300)
      await assertMockWritable(dossierId)
      const item = storeOf(dossierId).find((candidate) => String(candidate.dossierRequirementId) === String(dossierRequirementId))
      if (!item) throw new ComplianceApiError("NOT_FOUND")
      item.status = "WAIVED"
      item.note = input.waivedReason
      return
    }
    await api.patch(`compliance-dossiers/${dossierId}/requirements/${dossierRequirementId}/waive`, {
      waivedReason: input.waivedReason.trim(),
    })
  },

  /** D5. */
  async removeRequirement(dossierId: EntityId, dossierRequirementId: EntityId): Promise<void> {
    if (useComplianceMocks && !useFlow2HttpMocks) {
      await wait(300)
      await assertMockWritable(dossierId)
      const store = storeOf(dossierId)
      const index = store.findIndex((item) => String(item.dossierRequirementId) === String(dossierRequirementId))
      if (index < 0) throw new ComplianceApiError("NOT_FOUND")
      if (store[index].isMandatory) throw new ComplianceApiError("MANDATORY_DR_CANNOT_BE_REMOVED")
      if (store[index].document) throw new ComplianceApiError("DR_HAS_DOCUMENT")
      store.splice(index, 1)
      return
    }
    // The backend binds RemoveRequirementRequest from the JSON body.
    await api.delete(`compliance-dossiers/${dossierId}/requirements/${dossierRequirementId}`, {
      reason: "Removed during Flow 2 requirement management test",
    })
  },
}
